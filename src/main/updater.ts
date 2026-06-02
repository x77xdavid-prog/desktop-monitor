import { app, BrowserWindow } from 'electron'
import pkg from 'electron-updater'
import type { UpdateStatus } from '../shared/types'

// electron-updater는 CommonJS default export → 구조분해
const { autoUpdater } = pkg

let getWindow: () => BrowserWindow | null = () => null
let lastStatus: UpdateStatus = { state: 'idle' }

function emit(status: UpdateStatus): void {
  lastStatus = status
  const w = getWindow()
  if (w && !w.isDestroyed()) {
    w.webContents.send('update:status', status)
  }
}

/**
 * 자동 업데이트 초기화.
 * autoDownload=false → 사용자가 직접 '다운로드'를 눌러야 받는 "선택적" 업데이트.
 */
export function initUpdater(windowGetter: () => BrowserWindow | null): void {
  getWindow = windowGetter

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => emit({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => emit({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', (info) =>
    emit({ state: 'not-available', version: info.version })
  )
  autoUpdater.on('error', (err) =>
    emit({ state: 'error', message: err?.message ?? String(err) })
  )
  autoUpdater.on('download-progress', (p) =>
    emit({ state: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) =>
    emit({ state: 'downloaded', version: info.version })
  )
}

/** 현재 앱 버전 */
export function getAppVersion(): string {
  return app.getVersion()
}

/** 마지막 상태 (UI 초기 동기화용) */
export function getLastStatus(): UpdateStatus {
  return lastStatus
}

/** 업데이트 확인 (수동/자동 공통). 개발 모드에서는 동작하지 않음. */
export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    const status: UpdateStatus = { state: 'dev', version: app.getVersion() }
    emit(status)
    return status
  }
  try {
    await autoUpdater.checkForUpdates()
    return lastStatus
  } catch (e) {
    const status: UpdateStatus = { state: 'error', message: (e as Error).message }
    emit(status)
    return status
  }
}

/** 업데이트 다운로드 시작 (사용자 동의 후) */
export async function downloadUpdate(): Promise<void> {
  if (!app.isPackaged) return
  try {
    await autoUpdater.downloadUpdate()
  } catch (e) {
    emit({ state: 'error', message: (e as Error).message })
  }
}

/** 종료 후 설치 (다운로드 완료 시) */
export function quitAndInstall(): void {
  if (!app.isPackaged) return
  // 이벤트 루프가 끝난 뒤 실행해야 안전
  setImmediate(() => autoUpdater.quitAndInstall(false, true))
}

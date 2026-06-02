import { app, shell, BrowserWindow, ipcMain, nativeTheme, dialog } from 'electron'
import { join } from 'path'
import { monitor } from './monitor'
import { alertEngine } from './alertEngine'
import { loadPersisted, getSettings, updateSettings } from './settings'
import { createTray, updateTrayTooltip, destroyTray, showMainWindow } from './tray'
import { scanCleanup, runCleanup } from './actions/cleanup'
import { listPowerPlans, setPowerPlan, enableUltimatePerformance } from './actions/power'
import {
  listGpuPrefs,
  setGpuPref,
  removeGpuPref,
  getHagsState,
  setHags
} from './actions/gpu'
import { killProcess } from './actions/process'
import {
  openWindowsTool,
  openExternal,
  relaunchElevated,
  createDesktopShortcut
} from './actions/system'
import { isElevated } from './pwsh'
import {
  initUpdater,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getAppVersion,
  getLastStatus
} from './updater'
import type { SystemStats, AlertThresholds, AppSettings, CleanupId, GpuPreference } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let isQuitting = false
const isDev = !app.isPackaged

function windowIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b0f1a',
    title: 'Desktop Monitor',
    icon: windowIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 가시성에 따라 폴링 강도 조절 (숨김/최소화 시 부하 감소)
  mainWindow.on('hide', () => monitor.setMode(false))
  mainWindow.on('minimize', () => monitor.setMode(false))
  mainWindow.on('show', () => monitor.setMode(true))
  mainWindow.on('restore', () => monitor.setMode(true))
  mainWindow.on('focus', () => monitor.setMode(true))

  // 닫기: 설정에 따라 트레이로 숨김
  mainWindow.on('close', (e) => {
    if (!isQuitting && getSettings().closeToTray) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function quitApp(): void {
  isQuitting = true
  monitor.stop()
  destroyTray()
  app.quit()
}

function registerIpc(): void {
  // ---- 모니터링 ----
  ipcMain.handle('system:getStatic', () => monitor.getStaticInfo())
  ipcMain.handle('system:start', () => monitor.start())
  ipcMain.handle('system:stop', () => monitor.stop())

  // ---- 알림/테마 ----
  ipcMain.on('alerts:setThresholds', (_e, t: AlertThresholds) => alertEngine.setThresholds(t))
  ipcMain.on('app:setNativeTheme', (_e, theme: 'light' | 'dark') => {
    nativeTheme.themeSource = theme
  })

  // ---- 앱 설정 ----
  ipcMain.handle('app:isElevated', () => isElevated())
  ipcMain.on('app:relaunchElevated', () => relaunchElevated())
  ipcMain.handle('app:createDesktopShortcut', () => createDesktopShortcut())
  ipcMain.handle('app:getSettings', () => getSettings())
  ipcMain.handle('app:updateSettings', (_e, patch: Partial<AppSettings>) => updateSettings(patch))

  // ---- 시스템 도구 ----
  ipcMain.on('tools:open', (_e, tool) => openWindowsTool(tool))
  ipcMain.on('shell:openExternal', (_e, url: string) => openExternal(url))

  // ---- 정리 ----
  ipcMain.handle('cleanup:scan', () => scanCleanup())
  ipcMain.handle('cleanup:run', (_e, ids: CleanupId[]) => runCleanup(ids))

  // ---- 전원 ----
  ipcMain.handle('power:list', () => listPowerPlans())
  ipcMain.handle('power:set', (_e, guid: string) => setPowerPlan(guid))
  ipcMain.handle('power:ultimate', () => enableUltimatePerformance())

  // ---- GPU ----
  ipcMain.handle('gpu:listPrefs', () => listGpuPrefs())
  ipcMain.handle('gpu:pickAndSetPref', async (_e, pref: GpuPreference) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '프로그램(.exe) 선택',
      properties: ['openFile'],
      filters: [{ name: '실행 파일', extensions: ['exe'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    await setGpuPref(result.filePaths[0], pref)
    return listGpuPrefs()
  })
  ipcMain.handle('gpu:removePref', async (_e, exePath: string) => {
    await removeGpuPref(exePath)
    return listGpuPrefs()
  })
  ipcMain.handle('gpu:getHags', () => getHagsState())
  ipcMain.handle('gpu:setHags', (_e, enabled: boolean) => setHags(enabled))

  // ---- 프로세스 ----
  ipcMain.handle('process:kill', (_e, pid: number) => killProcess(pid))

  // ---- 자동 업데이트 ----
  ipcMain.handle('app:getVersion', () => getAppVersion())
  ipcMain.handle('update:getStatus', () => getLastStatus())
  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:download', () => downloadUpdate())
  ipcMain.on('update:install', () => quitAndInstall())
}

// 단일 인스턴스 보장
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())

  app.whenReady().then(() => {
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.desktopmonitor.app')
    }

    loadPersisted()
    registerIpc()

    // 모니터 → 렌더러 스트리밍 + 백그라운드 알림 + 트레이 툴팁
    monitor.onUpdate((stats: SystemStats) => {
      // 창이 보일 때만 렌더러로 전송 (숨김 시 직렬화·IPC 비용 절약)
      if (
        mainWindow &&
        !mainWindow.isDestroyed() &&
        mainWindow.isVisible() &&
        !mainWindow.isMinimized()
      ) {
        mainWindow.webContents.send('system:stats', stats)
      }
      // 알림·트레이는 숨김 상태에서도 동작
      alertEngine.process(stats)
      updateTrayTooltip(stats.cpu.load, stats.cpu.temperature)
    })
    monitor.start()

    createTray({ show: showMainWindow, quit: quitApp })
    createWindow()

    // 자동 업데이트 초기화 + 시작 5초 후 조용히 확인 (선택적: 알림만, 다운로드는 사용자 선택)
    initUpdater(() => mainWindow)
    setTimeout(() => void checkForUpdates(), 5000)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else showMainWindow()
    })
  })

  app.on('before-quit', () => {
    isQuitting = true
  })

  // 트레이 상주: 모든 창이 닫혀도 종료하지 않음 (트레이 메뉴로만 종료)
  app.on('window-all-closed', () => {
    // 의도적으로 비움 — 트레이로 계속 동작
  })
}

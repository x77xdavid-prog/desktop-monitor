import { app } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AppSettings, AlertThresholds } from '../shared/types'
import { DEFAULT_SETTINGS, DEFAULT_THRESHOLDS } from '../shared/types'

interface PersistedState {
  settings: AppSettings
  thresholds: AlertThresholds
}

const FILE = (): string => join(app.getPath('userData'), 'settings.json')

let state: PersistedState = {
  settings: { ...DEFAULT_SETTINGS },
  thresholds: { ...DEFAULT_THRESHOLDS }
}

export function loadPersisted(): void {
  try {
    const raw = readFileSync(FILE(), 'utf-8')
    const parsed = JSON.parse(raw)
    state = {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      thresholds: { ...DEFAULT_THRESHOLDS, ...(parsed.thresholds ?? {}) }
    }
  } catch {
    // 파일 없음 → 기본값 유지
  }
  // 로그인 항목 실제 상태와 동기화
  try {
    state.settings.autoStart = app.getLoginItemSettings().openAtLogin
  } catch {
    /* ignore */
  }
}

function persist(): void {
  try {
    writeFileSync(FILE(), JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    console.error('[settings] 저장 실패:', err)
  }
}

export function getSettings(): AppSettings {
  return state.settings
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  state.settings = { ...state.settings, ...patch }

  // autoStart 변경 시 OS 로그인 항목 반영
  // 포터블 빌드는 process.execPath가 임시 추출 경로이므로 안정 경로(PORTABLE_EXECUTABLE_FILE)를 사용
  if (patch.autoStart !== undefined) {
    try {
      const exePath = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
      app.setLoginItemSettings({ openAtLogin: patch.autoStart, path: exePath })
    } catch (err) {
      console.error('[settings] 로그인 항목 설정 실패:', err)
    }
  }

  persist()
  return state.settings
}

export function getThresholds(): AlertThresholds {
  return state.thresholds
}

export function setThresholds(t: AlertThresholds): void {
  state.thresholds = t
  persist()
}

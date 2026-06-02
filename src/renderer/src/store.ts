import { create } from 'zustand'
import type {
  StaticInfo,
  SystemStats,
  AlertThresholds,
  AlertEvent,
  MetricKey,
  AlertSeverity
} from '@shared/types'
import { DEFAULT_THRESHOLDS } from '@shared/types'
import { evaluateAlerts } from './lib/alerts'

export type Theme = 'light' | 'dark'

export interface HistoryPoint {
  t: number
  cpu: number
  mem: number
  gpu: number | null
  rx: number
  tx: number
  diskR: number
  diskW: number
}

const MAX_HISTORY = 60 // 약 60초 분량
const NOTIFY_COOLDOWN = 60_000 // 동일 메트릭 재알림 최소 간격(ms)

const THEME_KEY = 'dm:theme'
const THRESHOLD_KEY = 'dm:thresholds'

interface MonitorState {
  staticInfo: StaticInfo | null
  current: SystemStats | null
  history: HistoryPoint[]
  connected: boolean

  thresholds: AlertThresholds
  activeAlerts: AlertEvent[]
  alertLog: AlertEvent[]

  theme: Theme

  // 내부 추적용
  _alertSeverity: Partial<Record<MetricKey, AlertSeverity>>
  _lastNotified: Partial<Record<MetricKey, number>>

  // actions
  setStaticInfo: (info: StaticInfo) => void
  ingestStats: (stats: SystemStats) => void
  setConnected: (v: boolean) => void
  setThresholds: (t: AlertThresholds) => void
  resetThresholds: () => void
  syncThresholdsToMain: () => void
  clearAlertLog: () => void
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  initTheme: () => void
}

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* ignore */
  }
  return 'light' // 화이트톤 기본
}

function loadThresholds(): AlertThresholds {
  try {
    const raw = localStorage.getItem(THRESHOLD_KEY)
    if (raw) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULT_THRESHOLDS
}

function applyThemeToDom(theme: Theme): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  window.api?.setNativeTheme(theme)
}

export const useStore = create<MonitorState>((set, get) => ({
  staticInfo: null,
  current: null,
  history: [],
  connected: false,

  thresholds: loadThresholds(),
  activeAlerts: [],
  alertLog: [],

  theme: loadTheme(),

  _alertSeverity: {},
  _lastNotified: {},

  setStaticInfo: (info) => set({ staticInfo: info }),

  ingestStats: (stats) => {
    const state = get()

    // 1) 히스토리 갱신 (링버퍼)
    const worstGpu = stats.gpus.reduce<number | null>((acc, g) => {
      if (g.utilization === null) return acc
      return acc === null ? g.utilization : Math.max(acc, g.utilization)
    }, null)

    const point: HistoryPoint = {
      t: stats.timestamp,
      cpu: stats.cpu.load,
      mem: stats.mem.usedPercent,
      gpu: worstGpu,
      rx: stats.net.reduce((s, n) => s + n.rxSpeed, 0),
      tx: stats.net.reduce((s, n) => s + n.txSpeed, 0),
      diskR: stats.disk.io.readSpeed,
      diskW: stats.disk.io.writeSpeed
    }
    const history = [...state.history, point].slice(-MAX_HISTORY)

    // 2) 경고 평가
    const activeAlerts = evaluateAlerts(stats, state.thresholds)

    // 3) 앱 내 경고 이력 기록 (OS 토스트는 main의 AlertEngine이 담당 → 백그라운드에서도 동작)
    const nextSeverity: Partial<Record<MetricKey, AlertSeverity>> = {}
    const newLogEntries: AlertEvent[] = []

    for (const alert of activeAlerts) {
      nextSeverity[alert.metric] = alert.severity
      const prev = state._alertSeverity[alert.metric]
      const escalated = prev === 'warn' && alert.severity === 'danger'
      const isNew = !prev
      const lastTs = state._lastNotified[alert.metric] ?? 0
      const cooledDown = stats.timestamp - lastTs > NOTIFY_COOLDOWN

      if (isNew || escalated || (alert.severity === 'danger' && cooledDown)) {
        newLogEntries.push(alert)
      }
    }

    const nextNotified = { ...state._lastNotified }
    for (const e of newLogEntries) nextNotified[e.metric] = stats.timestamp

    const alertLog = newLogEntries.length
      ? [...newLogEntries, ...state.alertLog].slice(0, 100)
      : state.alertLog

    set({
      current: stats,
      history,
      connected: true,
      activeAlerts,
      alertLog,
      _alertSeverity: nextSeverity,
      _lastNotified: nextNotified
    })
  },

  setConnected: (v) => set({ connected: v }),

  setThresholds: (t) => {
    try {
      localStorage.setItem(THRESHOLD_KEY, JSON.stringify(t))
    } catch {
      /* ignore */
    }
    window.api?.setThresholds(t) // main 백그라운드 알림 동기화
    set({ thresholds: t })
  },

  resetThresholds: () => {
    try {
      localStorage.removeItem(THRESHOLD_KEY)
    } catch {
      /* ignore */
    }
    window.api?.setThresholds(DEFAULT_THRESHOLDS)
    set({ thresholds: DEFAULT_THRESHOLDS })
  },

  syncThresholdsToMain: () => {
    window.api?.setThresholds(get().thresholds)
  },

  clearAlertLog: () => set({ alertLog: [] }),

  setTheme: (t) => {
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {
      /* ignore */
    }
    applyThemeToDom(t)
    set({ theme: t })
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light'
    get().setTheme(next)
  },

  initTheme: () => {
    applyThemeToDom(get().theme)
  }
}))

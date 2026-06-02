import { contextBridge, ipcRenderer } from 'electron'
import type {
  StaticInfo,
  SystemStats,
  AlertThresholds,
  AppSettings,
  CleanupId,
  CleanupTarget,
  CleanupResult,
  PowerPlan,
  GpuPrefEntry,
  GpuPreference,
  HagsState,
  ProcessKillResult,
  ActionResult,
  UpdateStatus
} from '../shared/types'

type WindowsTool = 'taskmgr' | 'cleanmgr' | 'devmgmt' | 'windowsUpdate' | 'storage'

const api = {
  // ---- 모니터링 ----
  getStaticInfo: (): Promise<StaticInfo> => ipcRenderer.invoke('system:getStatic'),
  startMonitoring: (): Promise<void> => ipcRenderer.invoke('system:start'),
  stopMonitoring: (): Promise<void> => ipcRenderer.invoke('system:stop'),
  onStats: (cb: (stats: SystemStats) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, stats: SystemStats): void => cb(stats)
    ipcRenderer.on('system:stats', listener)
    return () => ipcRenderer.removeListener('system:stats', listener)
  },

  // ---- 알림/테마 ----
  setThresholds: (t: AlertThresholds): void => ipcRenderer.send('alerts:setThresholds', t),
  setNativeTheme: (theme: 'light' | 'dark'): void => ipcRenderer.send('app:setNativeTheme', theme),

  // ---- 앱 설정 ----
  isElevated: (): Promise<boolean> => ipcRenderer.invoke('app:isElevated'),
  relaunchElevated: (): void => ipcRenderer.send('app:relaunchElevated'),
  createDesktopShortcut: (): Promise<ActionResult> =>
    ipcRenderer.invoke('app:createDesktopShortcut'),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('app:getSettings'),
  updateSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('app:updateSettings', patch),

  // ---- 시스템 도구 ----
  openTool: (tool: WindowsTool): void => ipcRenderer.send('tools:open', tool),
  openExternal: (url: string): void => ipcRenderer.send('shell:openExternal', url),

  // ---- 정리 ----
  scanCleanup: (): Promise<CleanupTarget[]> => ipcRenderer.invoke('cleanup:scan'),
  runCleanup: (ids: CleanupId[]): Promise<CleanupResult> => ipcRenderer.invoke('cleanup:run', ids),

  // ---- 전원 ----
  listPowerPlans: (): Promise<PowerPlan[]> => ipcRenderer.invoke('power:list'),
  setPowerPlan: (guid: string): Promise<void> => ipcRenderer.invoke('power:set', guid),
  enableUltimatePower: (): Promise<string> => ipcRenderer.invoke('power:ultimate'),

  // ---- GPU ----
  listGpuPrefs: (): Promise<GpuPrefEntry[]> => ipcRenderer.invoke('gpu:listPrefs'),
  pickAndSetGpuPref: (pref: GpuPreference): Promise<GpuPrefEntry[] | null> =>
    ipcRenderer.invoke('gpu:pickAndSetPref', pref),
  removeGpuPref: (exePath: string): Promise<GpuPrefEntry[]> =>
    ipcRenderer.invoke('gpu:removePref', exePath),
  getHagsState: (): Promise<HagsState> => ipcRenderer.invoke('gpu:getHags'),
  setHags: (enabled: boolean): Promise<void> => ipcRenderer.invoke('gpu:setHags', enabled),

  // ---- 프로세스 ----
  killProcess: (pid: number): Promise<ProcessKillResult> => ipcRenderer.invoke('process:kill', pid),

  // ---- 자동 업데이트 ----
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  getUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:getStatus'),
  checkUpdate: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:check'),
  downloadUpdate: (): Promise<void> => ipcRenderer.invoke('update:download'),
  installUpdate: (): void => ipcRenderer.send('update:install'),
  onUpdateStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, status: UpdateStatus): void => cb(status)
    ipcRenderer.on('update:status', listener)
    return () => ipcRenderer.removeListener('update:status', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type MonitorApi = typeof api

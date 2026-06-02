// main <-> renderer 간 공유되는 타입 정의

export interface StaticInfo {
  os: {
    platform: string
    distro: string
    release: string
    arch: string
    hostname: string
  }
  cpu: {
    manufacturer: string
    brand: string
    cores: number
    physicalCores: number
    speed: number
  }
  mem: {
    total: number // bytes
  }
  gpus: {
    model: string
    vendor: string
    vram: number | null // MB
    driverVersion: string | null
  }[]
}

export interface CpuStat {
  load: number // 0-100 전체 사용률
  perCore: number[] // 코어별 사용률
  speed: number // GHz
  temperature: number | null // °C
}

export interface MemStat {
  total: number
  used: number // active 기준
  free: number
  available: number
  usedPercent: number
  swapTotal: number
  swapUsed: number
}

export interface DiskFs {
  fs: string
  mount: string
  type: string
  size: number
  used: number
  usedPercent: number
}

export interface DiskStat {
  filesystems: DiskFs[]
  io: {
    readSpeed: number // bytes/s
    writeSpeed: number // bytes/s
  }
}

export interface GpuStat {
  model: string
  vendor: string
  utilization: number | null // %
  memUsed: number | null // MB
  memTotal: number | null // MB
  temperature: number | null // °C
  fanSpeed: number | null // %
  powerDraw: number | null // W
}

export interface NetStat {
  iface: string
  rxSpeed: number // bytes/s 다운로드
  txSpeed: number // bytes/s 업로드
  rxTotal: number
  txTotal: number
}

export interface ProcessInfo {
  pid: number
  name: string
  cpu: number // %
  mem: number // %
}

export interface ProcessStat {
  all: number
  running: number
  topByCpu: ProcessInfo[]
  topByMem: ProcessInfo[]
}

export interface SystemStats {
  timestamp: number
  cpu: CpuStat
  mem: MemStat
  disk: DiskStat
  gpus: GpuStat[]
  net: NetStat[]
  processes: ProcessStat
  uptime: number // seconds
  battery: {
    hasBattery: boolean
    percent: number
    isCharging: boolean
  } | null
}

// 경고 시스템
export type AlertSeverity = 'warn' | 'danger'
export type MetricKey = 'cpu' | 'mem' | 'disk' | 'gpu' | 'cpuTemp' | 'gpuTemp'

export interface AlertThresholds {
  cpuLoad: { warn: number; danger: number }
  memPercent: { warn: number; danger: number }
  diskPercent: { warn: number; danger: number }
  cpuTemp: { warn: number; danger: number }
  gpuTemp: { warn: number; danger: number }
  gpuLoad: { warn: number; danger: number }
}

export interface AlertEvent {
  id: string
  metric: MetricKey
  severity: AlertSeverity
  message: string
  value: number
  threshold: number
  timestamp: number
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  cpuLoad: { warn: 80, danger: 92 },
  memPercent: { warn: 85, danger: 93 },
  diskPercent: { warn: 85, danger: 93 },
  cpuTemp: { warn: 80, danger: 90 },
  gpuTemp: { warn: 83, danger: 92 },
  gpuLoad: { warn: 90, danger: 97 }
}

// ===== 최적화 액션 =====

export type CleanupId = 'userTemp' | 'systemTemp' | 'recycleBin' | 'windowsUpdate' | 'thumbnails'

export interface CleanupTarget {
  id: CleanupId
  label: string
  description: string
  size: number // bytes (best-effort, 휴지통은 0일 수 있음)
  count: number // 항목 수 (주로 휴지통)
  requiresAdmin: boolean
}

export interface CleanupResult {
  freed: number // bytes
  errors: string[]
}

export interface PowerPlan {
  guid: string
  name: string
  active: boolean
}

export type GpuPreference = 'high' | 'low' | 'auto'

export interface GpuPrefEntry {
  app: string // exe 경로
  name: string // 파일명
  preference: GpuPreference
}

export type HagsState = 'on' | 'off' | 'unsupported' | 'unknown'

export interface ProcessKillResult {
  success: boolean
  message: string
}

export interface ActionResult {
  success: boolean
  message: string
}

// ===== 자동 업데이트 =====

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'dev' // 개발 모드(패키징 안 됨)

export interface UpdateStatus {
  state: UpdateState
  version?: string // 새 버전 또는 현재 버전
  percent?: number // 다운로드 진행률 0-100
  message?: string // 에러 메시지 등
}

export interface AppSettings {
  closeToTray: boolean
  autoStart: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  closeToTray: true,
  autoStart: false
}

import si from 'systeminformation'
import type {
  StaticInfo,
  SystemStats,
  CpuStat,
  MemStat,
  DiskStat,
  GpuStat,
  NetStat,
  ProcessStat
} from '../shared/types'

type Mode = 'active' | 'background'

interface CpuExtra {
  temperature: number | null
  speed: number
}

/**
 * 시스템 정보 수집기 — 부하 최소화 설계.
 *
 * 부하 원인이 되는 무거운 호출(graphics→nvidia-smi, processes→전체 열거,
 * cpuTemperature→WMI)은 느린 틱으로 분리하고, 창이 트레이로 숨겨지면
 * background 모드로 폴링 주기를 크게 늘려 유휴 부하를 낮춘다.
 *
 * - 빠른 틱: currentLoad / mem / networkStats (상대적으로 가벼움)
 * - 느린 틱: cpuTemperature·speed / fsSize·fsStats / graphics / battery
 *   + processes(활성 모드에서만, 느린 틱 N회마다)
 */
export class SystemMonitor {
  private fastTimer: NodeJS.Timeout | null = null
  private slowTimer: NodeJS.Timeout | null = null
  private listeners = new Set<(stats: SystemStats) => void>()
  private mode: Mode = 'active'
  private slowCount = 0

  // 느린 메트릭 캐시 (빠른 틱에서 병합)
  private cachedCpuExtra: CpuExtra = { temperature: null, speed: 0 }
  private cachedDisk: DiskStat = { filesystems: [], io: { readSpeed: 0, writeSpeed: 0 } }
  private cachedGpus: GpuStat[] = []
  private cachedProcesses: ProcessStat = { all: 0, running: 0, topByCpu: [], topByMem: [] }
  private cachedBattery: SystemStats['battery'] = null

  // 폴링 주기 (ms). procEvery: 느린 틱 몇 회마다 프로세스 열거(0=중단)
  private readonly RATES: Record<Mode, { fast: number; slow: number; procEvery: number }> = {
    active: { fast: 1000, slow: 3000, procEvery: 2 }, // 프로세스 ~6초
    background: { fast: 4000, slow: 12000, procEvery: 0 } // 숨김 시 대폭 감속 + 프로세스 중단
  }

  /** 정적 시스템 정보 (1회 조회) */
  async getStaticInfo(): Promise<StaticInfo> {
    const [osInfo, cpu, mem, graphics] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.graphics()
    ])

    return {
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        hostname: osInfo.hostname
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed
      },
      mem: { total: mem.total },
      gpus: graphics.controllers.map((c) => ({
        model: c.model || 'Unknown GPU',
        vendor: c.vendor || '',
        vram: c.vram ?? null,
        driverVersion: c.driverVersion || null
      }))
    }
  }

  start(): void {
    if (this.fastTimer) return
    void this.tickSlow()
    void this.tickFast()
    this.startTimers()
  }

  stop(): void {
    if (this.fastTimer) clearInterval(this.fastTimer)
    if (this.slowTimer) clearInterval(this.slowTimer)
    this.fastTimer = null
    this.slowTimer = null
  }

  /** 창 가시성에 따라 폴링 강도 조절 (트레이 숨김 시 background) */
  setMode(active: boolean): void {
    const next: Mode = active ? 'active' : 'background'
    if (next === this.mode) return
    this.mode = next
    if (this.fastTimer) {
      this.restartTimers()
      // 활성 복귀 시 즉시 갱신
      if (active) {
        void this.tickSlow()
        void this.tickFast()
      }
    }
  }

  private startTimers(): void {
    const r = this.RATES[this.mode]
    this.fastTimer = setInterval(() => void this.tickFast(), r.fast)
    this.slowTimer = setInterval(() => void this.tickSlow(), r.slow)
  }

  private restartTimers(): void {
    if (this.fastTimer) clearInterval(this.fastTimer)
    if (this.slowTimer) clearInterval(this.slowTimer)
    this.startTimers()
  }

  onUpdate(cb: (stats: SystemStats) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  hasListeners(): boolean {
    return this.listeners.size > 0
  }

  // ---- 빠른 틱: CPU 부하 / 메모리 / 네트워크 ----
  private async tickFast(): Promise<void> {
    try {
      const [cpuLoad, mem, net] = await Promise.all([
        this.collectCpuLoad(),
        this.collectMem(),
        this.collectNet()
      ])

      const cpu: CpuStat = {
        load: cpuLoad.load,
        perCore: cpuLoad.perCore,
        speed: this.cachedCpuExtra.speed,
        temperature: this.cachedCpuExtra.temperature
      }

      this.emit({
        timestamp: Date.now(),
        cpu,
        mem,
        disk: this.cachedDisk,
        gpus: this.cachedGpus,
        net,
        processes: this.cachedProcesses,
        uptime: si.time().uptime ?? 0,
        battery: this.cachedBattery
      })
    } catch (err) {
      console.error('[monitor] fast tick 실패:', err)
    }
  }

  // ---- 느린 틱: 온도·클럭 / 디스크 / GPU / 배터리 (+조건부 프로세스) ----
  private async tickSlow(): Promise<void> {
    try {
      const r = this.RATES[this.mode]
      this.slowCount++

      const [extra, disk, gpus, battery] = await Promise.all([
        this.collectCpuExtra(),
        this.collectDisk(),
        this.collectGpu(),
        this.collectBattery()
      ])
      this.cachedCpuExtra = extra
      this.cachedDisk = disk
      this.cachedGpus = gpus
      this.cachedBattery = battery

      // 프로세스 열거는 가장 무거우므로 활성 모드에서만, 일정 간격으로
      if (r.procEvery > 0 && this.slowCount % r.procEvery === 0) {
        this.cachedProcesses = await this.collectProcesses()
      }
    } catch (err) {
      console.error('[monitor] slow tick 실패:', err)
    }
  }

  private async collectCpuLoad(): Promise<{ load: number; perCore: number[] }> {
    const load = await si.currentLoad()
    return {
      load: round(load.currentLoad),
      perCore: load.cpus.map((c) => round(c.load))
    }
  }

  private async collectCpuExtra(): Promise<CpuExtra> {
    const [temp, speed] = await Promise.all([
      si.cpuTemperature().catch(() => null),
      si.cpuCurrentSpeed().catch(() => null)
    ])
    const mainTemp = temp && typeof temp.main === 'number' && temp.main > 0 ? temp.main : null
    return { temperature: mainTemp, speed: speed?.avg ?? 0 }
  }

  private async collectMem(): Promise<MemStat> {
    const mem = await si.mem()
    const used = mem.active
    return {
      total: mem.total,
      used,
      free: mem.free,
      available: mem.available,
      usedPercent: round((used / mem.total) * 100),
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused
    }
  }

  private async collectNet(): Promise<NetStat[]> {
    const stats = await si.networkStats('*').catch(() => [])
    return stats
      .filter((s) => s.operstate === 'up' || s.rx_sec > 0 || s.tx_sec > 0)
      .map((s) => ({
        iface: s.iface,
        rxSpeed: Math.max(0, s.rx_sec || 0),
        txSpeed: Math.max(0, s.tx_sec || 0),
        rxTotal: s.rx_bytes || 0,
        txTotal: s.tx_bytes || 0
      }))
  }

  private async collectDisk(): Promise<DiskStat> {
    const [fsSize, fsStats] = await Promise.all([
      si.fsSize().catch(() => []),
      si.fsStats().catch(() => null)
    ])

    const filesystems = fsSize
      .filter((f) => f.size > 0 && f.mount)
      .map((f) => ({
        fs: f.fs,
        mount: f.mount,
        type: f.type,
        size: f.size,
        used: f.used,
        usedPercent: round(f.use)
      }))

    return {
      filesystems,
      io: {
        readSpeed: fsStats && fsStats.rx_sec && fsStats.rx_sec > 0 ? fsStats.rx_sec : 0,
        writeSpeed: fsStats && fsStats.wx_sec && fsStats.wx_sec > 0 ? fsStats.wx_sec : 0
      }
    }
  }

  private async collectGpu(): Promise<GpuStat[]> {
    const graphics = await si.graphics().catch(() => null)
    if (!graphics) return []

    return graphics.controllers
      .filter((c) => c.model && !/microsoft|basic|remote/i.test(c.model))
      .map((c) => ({
        model: c.model || 'Unknown GPU',
        vendor: c.vendor || '',
        utilization: numOrNull(c.utilizationGpu),
        memUsed: numOrNull(c.memoryUsed),
        memTotal: numOrNull(c.memoryTotal) ?? numOrNull(c.vram),
        temperature: numOrNull(c.temperatureGpu),
        fanSpeed: numOrNull(c.fanSpeed),
        powerDraw: numOrNull(c.powerDraw)
      }))
  }

  private async collectProcesses(): Promise<ProcessStat> {
    const proc = await si.processes().catch(() => null)
    if (!proc) return { all: 0, running: 0, topByCpu: [], topByMem: [] }

    const list = proc.list.map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: round(p.cpu),
      mem: round(p.mem)
    }))

    return {
      all: proc.all,
      running: proc.running,
      topByCpu: [...list].sort((a, b) => b.cpu - a.cpu).slice(0, 8),
      topByMem: [...list].sort((a, b) => b.mem - a.mem).slice(0, 8)
    }
  }

  private async collectBattery(): Promise<SystemStats['battery']> {
    const bat = await si.battery().catch(() => null)
    if (!bat || !bat.hasBattery) return { hasBattery: false, percent: 0, isCharging: false }
    return { hasBattery: true, percent: bat.percent, isCharging: bat.isCharging }
  }

  private emit(stats: SystemStats): void {
    for (const cb of this.listeners) {
      try {
        cb(stats)
      } catch (err) {
        console.error('[monitor] listener 오류:', err)
      }
    }
  }
}

function round(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 10) / 10
}

function numOrNull(n: number | null | undefined): number | null {
  if (n === null || n === undefined) return null
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export const monitor = new SystemMonitor()

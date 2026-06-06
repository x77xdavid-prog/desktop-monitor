import si from 'systeminformation'
import { runPwsh } from './pwsh'
import type {
  StaticInfo,
  SystemStats,
  CpuStat,
  MemStat,
  DiskStat,
  GpuStat,
  NetStat,
  ProcessStat,
  ThermalInfo,
  TempSensor
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
  private running = false
  private epoch = 0
  private listeners = new Set<(stats: SystemStats) => void>()
  private mode: Mode = 'active'
  private slowCount = 0

  // 느린 메트릭 캐시 (빠른 틱에서 병합)
  private cachedCpuExtra: CpuExtra = { temperature: null, speed: 0 }
  private cachedDisk: DiskStat = { filesystems: [], io: { readSpeed: 0, writeSpeed: 0 } }
  private cachedGpus: GpuStat[] = []
  private cachedProcesses: ProcessStat = { all: 0, running: 0, topByCpu: [], topByMem: [] }
  private cachedBattery: SystemStats['battery'] = null
  private cachedThermal: ThermalInfo = { zones: [], disks: [], cpuSource: 'none' }

  // 폴링 주기 (ms). procEvery/thermalEvery: 느린 틱 N회마다 수집(0=중단)
  private readonly RATES: Record<
    Mode,
    { fast: number; slow: number; procEvery: number; thermalEvery: number; gpuEvery: number }
  > = {
    // 프로세스 ~6초, GPU ~9초, 온도 ~9초
    active: { fast: 1000, slow: 3000, procEvery: 2, thermalEvery: 3, gpuEvery: 3 },
    // 숨김 시: 프로세스 중단, GPU ~24초, 온도 12초
    background: { fast: 4000, slow: 12000, procEvery: 0, thermalEvery: 1, gpuEvery: 2 }
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
    if (this.running) return
    this.running = true
    const gen = ++this.epoch
    void this.fastLoop(gen)
    void this.slowLoop(gen)
  }

  stop(): void {
    this.running = false
    this.epoch++ // 진행 중인 루프 무효화 → 다음 틱 재예약 차단
    if (this.fastTimer) clearTimeout(this.fastTimer)
    if (this.slowTimer) clearTimeout(this.slowTimer)
    this.fastTimer = null
    this.slowTimer = null
  }

  /** 창 가시성에 따라 폴링 강도 조절 (트레이 숨김 시 background) */
  setMode(active: boolean): void {
    const next: Mode = active ? 'active' : 'background'
    if (next === this.mode) return
    this.mode = next
    if (!this.running) return
    // 새 주기로 루프 재시작 (기존 세대 루프는 epoch 불일치로 스스로 종료 → 중복 루프 방지)
    const gen = ++this.epoch
    if (this.fastTimer) clearTimeout(this.fastTimer)
    if (this.slowTimer) clearTimeout(this.slowTimer)
    void this.fastLoop(gen)
    void this.slowLoop(gen)
  }

  /**
   * 자기 예약(self-scheduling) 루프: 이전 틱이 "끝난 뒤에만" 다음 틱을 예약한다.
   * setInterval과 달리, 비동기 수집이 주기를 초과해도 틱이 겹쳐 쌓이지 않아
   * 프로세스 폭주(CPU 100%)를 구조적으로 차단한다.
   */
  private async fastLoop(gen: number): Promise<void> {
    if (!this.running || gen !== this.epoch) return
    await this.tickFast()
    if (!this.running || gen !== this.epoch) return
    this.fastTimer = setTimeout(() => void this.fastLoop(gen), this.RATES[this.mode].fast)
  }

  private async slowLoop(gen: number): Promise<void> {
    if (!this.running || gen !== this.epoch) return
    await this.tickSlow()
    if (!this.running || gen !== this.epoch) return
    this.slowTimer = setTimeout(() => void this.slowLoop(gen), this.RATES[this.mode].slow)
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

      // CPU 온도: 센서(si) 우선, 없으면 ACPI 열 존(무권한)으로 대체
      const sensorTemp = this.cachedCpuExtra.temperature
      const zoneMax = this.cachedThermal.zones.length
        ? Math.max(...this.cachedThermal.zones.map((z) => z.temp))
        : null
      const cpuTemp = sensorTemp ?? zoneMax
      const cpuSource: ThermalInfo['cpuSource'] =
        sensorTemp != null ? 'sensor' : zoneMax != null ? 'zone' : 'none'

      const cpu: CpuStat = {
        load: cpuLoad.load,
        perCore: cpuLoad.perCore,
        speed: this.cachedCpuExtra.speed,
        temperature: cpuTemp
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
        thermal: { ...this.cachedThermal, cpuSource },
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

      // 가벼운 메트릭은 매 느린 틱마다 수집
      const [extra, disk, battery] = await Promise.all([
        this.collectCpuExtra(),
        this.collectDisk(),
        this.collectBattery()
      ])
      this.cachedCpuExtra = extra
      this.cachedDisk = disk
      this.cachedBattery = battery

      // GPU 열거(nvidia-smi execSync 등 무거움)는 더 낮은 빈도로
      if (r.gpuEvery > 0 && this.slowCount % r.gpuEvery === 0) {
        this.cachedGpus = await this.collectGpu()
      }

      // 프로세스 열거는 가장 무거우므로 활성 모드에서만, 일정 간격으로
      if (r.procEvery > 0 && this.slowCount % r.procEvery === 0) {
        this.cachedProcesses = await this.collectProcesses()
      }

      // 온도(열 존 + 디스크 SMART) - 변화가 느리므로 더 낮은 빈도
      if (r.thermalEvery > 0 && this.slowCount % r.thermalEvery === 0) {
        this.cachedThermal = await this.collectThermal()
      }
    } catch (err) {
      console.error('[monitor] slow tick 실패:', err)
    }
  }

  // ACPI 열 존(무권한) + 디스크 SMART(관리자 시) 온도 수집
  private async collectThermal(): Promise<ThermalInfo> {
    const script = `
$zones=@()
try { Get-CimInstance -ClassName Win32_PerfFormattedData_Counters_ThermalZoneInformation -ErrorAction Stop | Where-Object { $_.Temperature -gt 200 -and $_.Temperature -lt 400 } | ForEach-Object { $zones += [pscustomobject]@{ name=[string]$_.Name; temp=[math]::Round($_.Temperature-273.15,1) } } } catch {}
$disks=@()
try { Get-PhysicalDisk -ErrorAction Stop | ForEach-Object { $rc=$_ | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue; if($rc -and $rc.Temperature -gt 0){ $disks += [pscustomobject]@{ name=[string]$_.FriendlyName; temp=[double]$rc.Temperature } } } } catch {}
[pscustomobject]@{ zones=@($zones); disks=@($disks) } | ConvertTo-Json -Compress -Depth 4
`
    try {
      const out = (await runPwsh(script, 6_000)).trim()
      if (!out) return this.cachedThermal
      const parsed = JSON.parse(out) as { zones?: unknown; disks?: unknown }
      return {
        zones: normalizeSensors(parsed.zones),
        disks: normalizeSensors(parsed.disks),
        cpuSource: 'none'
      }
    } catch {
      return this.cachedThermal // 실패 시 마지막 값 유지
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

  // 기본(활성 경로) 인터페이스만 조회한다. '*'(전체 열거)는 Windows에서
  // 인터페이스 N개당 1+2N개의 PowerShell/WMI 프로세스를 매초 띄워 CPU 폭주의 주원인이었다.
  private async collectNet(): Promise<NetStat[]> {
    const stats = await si.networkStats().catch(() => [])
    return stats
      .filter((s) => Boolean(s.iface))
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

// PowerShell JSON(단일 객체 또는 배열)을 TempSensor[]로 정규화
function normalizeSensors(val: unknown): TempSensor[] {
  if (!val) return []
  const arr = Array.isArray(val) ? val : [val]
  const out: TempSensor[] = []
  for (const item of arr) {
    if (item && typeof item === 'object' && 'temp' in item) {
      const t = Number((item as { temp: unknown }).temp)
      const name = String((item as { name?: unknown }).name ?? '')
      if (Number.isFinite(t) && t > 0 && t < 150) {
        out.push({ name, temp: Math.round(t * 10) / 10 })
      }
    }
  }
  return out
}

export const monitor = new SystemMonitor()

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import os from 'os'

/**
 * CPU 사용률 샘플러.
 *
 * 배경: `systeminformation.currentLoad()`는 내부적으로 Node의 `os.cpus()`
 * 틱 카운터 델타로 사용률을 계산한다. 일부 Windows 환경(특정 CPU/전원 구성/VM)
 * 에서는 `os.cpus()`의 idle 시간이 갱신되지 않아 idle 델타가 0이 되고, 결과적으로
 * 사용률이 항상 100%로 잘못 계산되는 문제가 있다.
 *
 * 해결: Windows에서는 `os.cpus()`에 의존하지 않고 성능 카운터(WMI)에서 직접
 * 사용률을 읽는다. 매 틱마다 PowerShell을 새로 띄우면 그 자체가 부하이므로,
 * 앱 수명 동안 단일 PowerShell 프로세스가 1초마다 JSON 한 줄씩 출력하도록 하고
 * 이를 스트리밍 파싱한다.
 *
 * 폴백: 비(非)Windows(개발 환경) 또는 PowerShell 실행 실패 시에는 `os.cpus()`
 * 델타를 직접 계산한다.
 */

export interface CpuLoadSample {
  load: number // 0-100 전체 사용률
  perCore: number[] // 코어별 사용률
}

// PowerShell 스트리머: 1초마다 _Total/코어별 사용률을 JSON 한 줄로 출력
const STREAM_SCRIPT = `
$ProgressPreference='SilentlyContinue'
$e=New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding=$e
while($true){
  try{
    $d=Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -ErrorAction Stop
    $total=0
    $cores=New-Object System.Collections.ArrayList
    foreach($i in ($d | Sort-Object {if($_.Name -eq '_Total'){-1}else{[int]$_.Name}})){
      $v=[int]$i.PercentProcessorTime
      if($v -lt 0){$v=0}
      if($v -gt 100){$v=100}
      if($i.Name -eq '_Total'){$total=$v}else{[void]$cores.Add($v)}
    }
    ([pscustomobject]@{t=$total;c=@($cores)} | ConvertTo-Json -Compress)
  }catch{}
  Start-Sleep -Milliseconds 1000
}
`

const STREAM_MAX_AGE = 4000 // 이 시간보다 오래된 PowerShell 샘플은 신뢰하지 않음(ms)
const RESTART_DELAY = 5000 // 스트리머 비정상 종료 시 재시작 지연(ms)

interface CoreTicks {
  idle: number
  total: number
}

export class CpuLoadSampler {
  private child: ChildProcessWithoutNullStreams | null = null
  private buffer = ''
  private latest: CpuLoadSample | null = null
  private latestAt = 0
  private running = false
  private restartTimer: NodeJS.Timeout | null = null

  // os.cpus() 폴백용 직전 스냅샷
  private prevTicks: CoreTicks[] | null = null

  start(): void {
    if (this.running) return
    this.running = true
    if (process.platform === 'win32') this.spawnStreamer()
  }

  stop(): void {
    this.running = false
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
    if (this.child) {
      this.child.kill()
      this.child = null
    }
    this.latest = null
    this.prevTicks = null
  }

  /** 최신 CPU 사용률 반환 (스트리머 샘플 우선, 없으면 os.cpus() 델타) */
  read(): CpuLoadSample {
    if (this.latest && Date.now() - this.latestAt <= STREAM_MAX_AGE) {
      return this.latest
    }
    return this.readFromOsCpus()
  }

  private spawnStreamer(): void {
    const encoded = Buffer.from(STREAM_SCRIPT, 'utf16le').toString('base64')
    try {
      this.child = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
        { windowsHide: true }
      )
    } catch (err) {
      console.error('[cpuLoad] 스트리머 시작 실패:', err)
      this.child = null
      return
    }

    this.child.stdout.setEncoding('utf8')
    this.child.stdout.on('data', (chunk: string) => this.onData(chunk))
    this.child.on('error', (err) => console.error('[cpuLoad] 스트리머 오류:', err))
    this.child.on('exit', () => {
      this.child = null
      // 실행 중인데 죽었으면 일정 시간 후 재시작 (그동안은 os.cpus() 폴백)
      if (this.running && !this.restartTimer) {
        this.restartTimer = setTimeout(() => {
          this.restartTimer = null
          if (this.running) this.spawnStreamer()
        }, RESTART_DELAY)
      }
    })
  }

  private onData(chunk: string): void {
    this.buffer += chunk
    let nl: number
    while ((nl = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, nl).trim()
      this.buffer = this.buffer.slice(nl + 1)
      if (line) this.parseLine(line)
    }
    // 버퍼가 비정상적으로 커지면 방어적으로 초기화
    if (this.buffer.length > 64 * 1024) this.buffer = ''
  }

  private parseLine(line: string): void {
    try {
      const obj = JSON.parse(line) as { t?: unknown; c?: unknown }
      const total = clampPct(Number(obj.t))
      const cores = Array.isArray(obj.c) ? obj.c.map((v) => clampPct(Number(v))) : []
      this.latest = { load: total, perCore: cores }
      this.latestAt = Date.now()
    } catch {
      /* 부분 출력/잡음 무시 */
    }
  }

  // os.cpus() 틱 델타로 사용률 계산 (폴백)
  private readFromOsCpus(): CpuLoadSample {
    const cpus = os.cpus()
    const ticks: CoreTicks[] = cpus.map((c) => {
      const t = c.times
      return { idle: t.idle, total: t.user + t.nice + t.sys + t.idle + t.irq }
    })

    const prev = this.prevTicks
    this.prevTicks = ticks

    if (!prev || prev.length !== ticks.length) {
      // 기준이 없으면 0으로 시작 (다음 틱부터 정상값)
      return { load: 0, perCore: ticks.map(() => 0) }
    }

    const perCore: number[] = []
    let totalDelta = 0
    let idleDelta = 0
    for (let i = 0; i < ticks.length; i++) {
      const dTotal = ticks[i].total - prev[i].total
      const dIdle = ticks[i].idle - prev[i].idle
      totalDelta += dTotal
      idleDelta += dIdle
      perCore.push(dTotal > 0 ? clampPct((1 - dIdle / dTotal) * 100) : 0)
    }

    const load = totalDelta > 0 ? clampPct((1 - idleDelta / totalDelta) * 100) : 0
    return { load, perCore }
  }
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return Math.round(n * 10) / 10
}

export const cpuLoadSampler = new CpuLoadSampler()

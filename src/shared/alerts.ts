import type {
  SystemStats,
  AlertThresholds,
  AlertEvent,
  AlertSeverity,
  MetricKey
} from './types'

interface Candidate {
  metric: MetricKey
  label: string
  value: number | null
  warn: number
  danger: number
  unit: '%' | '°C'
}

/**
 * 현재 통계와 임계값으로 활성 경고 목록을 산출한다.
 * main(백그라운드 알림)·renderer(앱 내 표시) 양쪽에서 공유.
 */
export function evaluateAlerts(stats: SystemStats, t: AlertThresholds): AlertEvent[] {
  const gpuTop = pickWorstGpu(stats)

  const candidates: Candidate[] = [
    {
      metric: 'cpu',
      label: 'CPU 사용률',
      value: stats.cpu.load,
      warn: t.cpuLoad.warn,
      danger: t.cpuLoad.danger,
      unit: '%'
    },
    {
      metric: 'mem',
      label: '메모리 사용률',
      value: stats.mem.usedPercent,
      warn: t.memPercent.warn,
      danger: t.memPercent.danger,
      unit: '%'
    },
    {
      metric: 'disk',
      label: '디스크 사용률',
      value: worstDiskPercent(stats),
      warn: t.diskPercent.warn,
      danger: t.diskPercent.danger,
      unit: '%'
    },
    {
      metric: 'cpuTemp',
      label: 'CPU 온도',
      value: stats.cpu.temperature,
      warn: t.cpuTemp.warn,
      danger: t.cpuTemp.danger,
      unit: '°C'
    },
    {
      metric: 'gpu',
      label: 'GPU 사용률',
      value: gpuTop?.utilization ?? null,
      warn: t.gpuLoad.warn,
      danger: t.gpuLoad.danger,
      unit: '%'
    },
    {
      metric: 'gpuTemp',
      label: 'GPU 온도',
      value: gpuTop?.temperature ?? null,
      warn: t.gpuTemp.warn,
      danger: t.gpuTemp.danger,
      unit: '°C'
    }
  ]

  const events: AlertEvent[] = []

  for (const c of candidates) {
    if (c.value === null || !Number.isFinite(c.value)) continue
    let severity: AlertSeverity | null = null
    let threshold = 0
    if (c.value >= c.danger) {
      severity = 'danger'
      threshold = c.danger
    } else if (c.value >= c.warn) {
      severity = 'warn'
      threshold = c.warn
    }
    if (!severity) continue

    events.push({
      id: `${c.metric}`,
      metric: c.metric,
      severity,
      message: `${c.label} ${c.value.toFixed(c.unit === '°C' ? 0 : 1)}${c.unit} (임계 ${threshold}${c.unit})`,
      value: c.value,
      threshold,
      timestamp: stats.timestamp
    })
  }

  return events
}

function worstDiskPercent(stats: SystemStats): number | null {
  if (stats.disk.filesystems.length === 0) return null
  return Math.max(...stats.disk.filesystems.map((f) => f.usedPercent))
}

function pickWorstGpu(
  stats: SystemStats
): { utilization: number | null; temperature: number | null } | null {
  if (stats.gpus.length === 0) return null
  let worst = stats.gpus[0]
  for (const g of stats.gpus) {
    if ((g.utilization ?? -1) > (worst.utilization ?? -1)) worst = g
  }
  return { utilization: worst.utilization, temperature: worst.temperature }
}

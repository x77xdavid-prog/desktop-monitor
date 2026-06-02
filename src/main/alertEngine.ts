import { Notification } from 'electron'
import { evaluateAlerts } from '../shared/alerts'
import type { SystemStats, AlertThresholds, MetricKey, AlertSeverity } from '../shared/types'
import { getThresholds, setThresholds } from './settings'

const NOTIFY_COOLDOWN = 60_000 // 동일 메트릭 재알림 최소 간격(ms)

/**
 * 백그라운드 알림 엔진.
 * 창이 숨겨져 있어도(트레이) 모니터가 계속 도는 한 OS 토스트를 발화한다.
 */
class AlertEngine {
  private severityByMetric: Partial<Record<MetricKey, AlertSeverity>> = {}
  private lastNotified: Partial<Record<MetricKey, number>> = {}

  setThresholds(t: AlertThresholds): void {
    setThresholds(t)
  }

  process(stats: SystemStats): void {
    const thresholds = getThresholds()
    const active = evaluateAlerts(stats, thresholds)
    const nextSeverity: Partial<Record<MetricKey, AlertSeverity>> = {}

    for (const alert of active) {
      nextSeverity[alert.metric] = alert.severity
      const prev = this.severityByMetric[alert.metric]
      const escalated = prev === 'warn' && alert.severity === 'danger'
      const isNew = !prev
      const lastTs = this.lastNotified[alert.metric] ?? 0
      const cooledDown = stats.timestamp - lastTs > NOTIFY_COOLDOWN

      if (isNew || escalated || (alert.severity === 'danger' && cooledDown)) {
        if (cooledDown || escalated || isNew) {
          this.fire(alert.severity, alert.message)
          this.lastNotified[alert.metric] = stats.timestamp
        }
      }
    }

    this.severityByMetric = nextSeverity
  }

  private fire(severity: AlertSeverity, message: string): void {
    if (!Notification.isSupported()) return
    const prefix = severity === 'danger' ? '🔴 위험' : '🟠 주의'
    const n = new Notification({
      title: `${prefix} · Desktop Monitor`,
      body: message,
      silent: false
    })
    n.show()
  }
}

export const alertEngine = new AlertEngine()

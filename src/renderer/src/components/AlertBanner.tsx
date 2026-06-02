import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { useStore } from '../store'

export function AlertBanner(): JSX.Element | null {
  const activeAlerts = useStore((s) => s.activeAlerts)

  if (activeAlerts.length === 0) return null

  const hasDanger = activeAlerts.some((a) => a.severity === 'danger')
  const accent = hasDanger ? 'var(--color-danger)' : 'var(--color-warn)'

  return (
    <div
      className="animate-in mx-5 mt-3 rounded-xl border px-4 py-2.5 flex items-center gap-3"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--color-surface))`
      }}
    >
      <span
        className={`grid place-items-center w-8 h-8 rounded-lg shrink-0 ${hasDanger ? 'alert-pulse' : ''}`}
        style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)` }}
      >
        {hasDanger ? <ShieldAlert size={18} /> : <AlertTriangle size={18} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold" style={{ color: accent }}>
          {hasDanger ? '위험 상태 감지' : '주의 필요'} · {activeAlerts.length}건
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {activeAlerts.map((a) => (
            <span key={a.id} className="text-[12px] text-text-muted tnum">
              {a.message}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

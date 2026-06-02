import { Bell, Trash2, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store'
import { Card } from './ui/Card'
import { formatTime } from '../lib/format'

export function AlertLog(): JSX.Element {
  const alertLog = useStore((s) => s.alertLog)
  const clearAlertLog = useStore((s) => s.clearAlertLog)

  return (
    <Card
      title="경고 이력"
      icon={<Bell size={16} />}
      accent="var(--color-warn)"
      className="col-span-12 lg:col-span-6"
      right={
        alertLog.length > 0 ? (
          <button
            onClick={clearAlertLog}
            className="flex items-center gap-1 text-[11px] text-text-muted hover:text-danger transition-colors"
          >
            <Trash2 size={13} /> 지우기
          </button>
        ) : undefined
      }
    >
      <div className="space-y-1 max-h-[220px] overflow-y-auto -mr-2 pr-2">
        {alertLog.length === 0 ? (
          <div className="h-[180px] grid place-items-center text-center text-[12px] text-text-muted">
            <div>
              <CheckCircle2 size={28} className="mx-auto mb-2 text-ok opacity-70" />
              기록된 경고가 없습니다
              <div className="text-[11px] mt-0.5 opacity-70">시스템이 정상 범위에서 동작 중입니다</div>
            </div>
          </div>
        ) : (
          alertLog.map((a, i) => {
            const accent = a.severity === 'danger' ? 'var(--color-danger)' : 'var(--color-warn)'
            return (
              <div
                key={`${a.id}-${a.timestamp}-${i}`}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5"
                style={{ backgroundColor: `color-mix(in srgb, ${accent} 8%, transparent)` }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                <span className="text-[12px] flex-1 min-w-0 truncate">{a.message}</span>
                <span className="text-[10.5px] tnum text-text-muted shrink-0">
                  {formatTime(a.timestamp)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}

import { useState } from 'react'
import { ListOrdered, X, Check } from 'lucide-react'
import { useStore } from '../store'
import { Card } from './ui/Card'
import { useChartColors } from '../hooks/useChartColors'
import { useToast } from '../hooks/useToast'
import { formatPercent } from '../lib/format'
import type { ProcessInfo } from '@shared/types'

type Tab = 'cpu' | 'mem'

export function ProcessPanel(): JSX.Element {
  const current = useStore((s) => s.current)
  const c = useChartColors()
  const push = useToast((s) => s.push)
  const [tab, setTab] = useState<Tab>('cpu')
  const [confirmPid, setConfirmPid] = useState<number | null>(null)

  const kill = async (pid: number): Promise<void> => {
    setConfirmPid(null)
    try {
      const result = await window.api.killProcess(pid)
      push(result.message, result.success ? 'success' : 'error')
    } catch {
      push('프로세스 종료 실패', 'error')
    }
  }

  const proc = current?.processes
  const list: ProcessInfo[] = tab === 'cpu' ? (proc?.topByCpu ?? []) : (proc?.topByMem ?? [])
  const accent = tab === 'cpu' ? c.cpu : c.mem
  const maxVal = Math.max(1, ...list.map((p) => (tab === 'cpu' ? p.cpu : p.mem)))

  return (
    <Card
      title="프로세스"
      icon={<ListOrdered size={16} />}
      accent="var(--color-cpu)"
      className="col-span-12 lg:col-span-6"
      right={
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">
            전체 {proc?.all ?? 0}개
            {proc && proc.running > 0 ? ` · 실행 ${proc.running}` : ''}
          </span>
          <div className="flex rounded-lg bg-surface-2 p-0.5">
            <TabButton active={tab === 'cpu'} onClick={() => setTab('cpu')}>
              CPU
            </TabButton>
            <TabButton active={tab === 'mem'} onClick={() => setTab('mem')}>
              메모리
            </TabButton>
          </div>
        </div>
      }
    >
      <div className="space-y-1">
        {list.map((p, i) => {
          const val = tab === 'cpu' ? p.cpu : p.mem
          return (
            <div
              key={`${p.pid}-${i}`}
              className="group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 overflow-hidden"
            >
              {/* 배경 바 */}
              <div
                className="absolute inset-y-0 left-0 rounded-lg"
                style={{
                  width: `${(val / maxVal) * 100}%`,
                  backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                  transition: 'width 0.5s ease'
                }}
              />
              <div className="relative flex items-center gap-2 min-w-0">
                <span className="text-[10px] tnum text-text-muted w-4">{i + 1}</span>
                <span className="text-[12.5px] truncate" title={p.name}>
                  {p.name}
                </span>
                <span className="text-[10px] tnum text-text-muted">#{p.pid}</span>
              </div>
              <div className="relative flex items-center gap-2 shrink-0">
                {confirmPid === p.pid ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10.5px] text-text-muted">종료?</span>
                    <button
                      onClick={() => kill(p.pid)}
                      className="grid place-items-center w-5 h-5 rounded bg-danger/15 text-danger hover:bg-danger/25 transition-colors"
                      title="종료 확인"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => setConfirmPid(null)}
                      className="grid place-items-center w-5 h-5 rounded bg-surface-2 text-text-muted hover:text-text transition-colors"
                      title="취소"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="tnum text-[12.5px] font-semibold" style={{ color: accent }}>
                      {formatPercent(val, 1)}
                    </span>
                    <button
                      onClick={() => setConfirmPid(p.pid)}
                      className="grid place-items-center w-5 h-5 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="프로세스 종료"
                    >
                      <X size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {list.length === 0 && (
          <div className="text-[12px] text-text-muted text-center py-6">프로세스 정보 로딩 중…</div>
        )}
      </div>
    </Card>
  )
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
        active ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

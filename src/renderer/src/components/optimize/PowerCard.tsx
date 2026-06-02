import { useEffect, useState } from 'react'
import { Zap, Check, Loader2, Gauge } from 'lucide-react'
import { Card } from '../ui/Card'
import { useToast } from '../../hooks/useToast'
import type { PowerPlan } from '@shared/types'

export function PowerCard(): JSX.Element {
  const [plans, setPlans] = useState<PowerPlan[]>([])
  const [busy, setBusy] = useState(false)
  const push = useToast((s) => s.push)

  const load = async (): Promise<void> => {
    try {
      setPlans(await window.api.listPowerPlans())
    } catch {
      push('전원 계획을 불러오지 못했습니다', 'error')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const select = async (guid: string): Promise<void> => {
    setBusy(true)
    try {
      await window.api.setPowerPlan(guid)
      await load()
      push('전원 계획을 변경했습니다', 'success')
    } catch {
      push('전원 계획 변경 실패', 'error')
    } finally {
      setBusy(false)
    }
  }

  const enableUltimate = async (): Promise<void> => {
    setBusy(true)
    try {
      await window.api.enableUltimatePower()
      await load()
      push('궁극의 성능 모드를 활성화했습니다 ⚡', 'success')
    } catch {
      push('궁극의 성능 활성화 실패 (관리자 권한이 필요할 수 있음)', 'error')
    } finally {
      setBusy(false)
    }
  }

  const hasUltimate = plans.some((p) => /ultimate|궁극/i.test(p.name))

  return (
    <Card
      title="전원 / 성능 모드"
      icon={<Zap size={16} />}
      accent="var(--color-cpu)"
      className="col-span-12 lg:col-span-6"
    >
      <div className="flex flex-col h-full">
        <div className="space-y-1.5 flex-1">
          {plans.map((p) => (
            <button
              key={p.guid}
              onClick={() => !p.active && select(p.guid)}
              disabled={busy || p.active}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left ${
                p.active ? 'bg-cpu/10 border border-cpu/30' : 'hover:bg-surface-2 border border-transparent'
              }`}
            >
              <Gauge size={16} className={p.active ? 'text-cpu' : 'text-text-muted'} />
              <span className="flex-1 text-[13px] font-medium">{p.name}</span>
              {p.active && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-cpu">
                  <Check size={14} /> 사용 중
                </span>
              )}
            </button>
          ))}
          {plans.length === 0 && (
            <div className="text-[12px] text-text-muted text-center py-4">불러오는 중…</div>
          )}
        </div>

        {!hasUltimate && (
          <button
            onClick={enableUltimate}
            disabled={busy}
            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold text-white bg-cpu hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            궁극의 성능 모드 추가
          </button>
        )}
        <p className="mt-2 text-[11px] text-text-muted leading-relaxed">
          데스크탑은 <b>고성능</b> 또는 <b>궁극의 성능</b>을 권장합니다. CPU 부스트 클럭을 더 오래 유지합니다.
        </p>
      </div>
    </Card>
  )
}

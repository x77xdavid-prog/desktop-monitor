import { useEffect, useState } from 'react'
import { Settings2, ShieldCheck, ShieldAlert, MonitorDown } from 'lucide-react'
import { Card } from '../ui/Card'
import { useToast } from '../../hooks/useToast'
import type { AppSettings } from '@shared/types'

export function AppSettingsCard(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({ closeToTray: true, autoStart: false })
  const [elevated, setElevated] = useState<boolean | null>(null)
  const push = useToast((s) => s.push)

  useEffect(() => {
    window.api.getSettings().then(setSettings).catch(() => undefined)
    window.api.isElevated().then(setElevated).catch(() => setElevated(false))
  }, [])

  const update = async (patch: Partial<AppSettings>): Promise<void> => {
    try {
      const next = await window.api.updateSettings(patch)
      setSettings(next)
    } catch {
      push('설정 저장 실패', 'error')
    }
  }

  return (
    <Card
      title="앱 설정 / 상주"
      icon={<Settings2 size={16} />}
      accent="var(--color-mem)"
      className="col-span-12 lg:col-span-6"
    >
      <div className="flex flex-col h-full gap-1">
        <Toggle
          label="닫을 때 트레이로 최소화"
          desc="창을 닫아도 백그라운드에서 계속 감시 + 알림"
          value={settings.closeToTray}
          onChange={(v) => update({ closeToTray: v })}
        />
        <Toggle
          label="부팅 시 자동 시작"
          desc="Windows 로그인 시 자동 실행"
          value={settings.autoStart}
          onChange={(v) => update({ autoStart: v })}
        />

        {/* 바탕화면 바로가기 */}
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-2 transition-colors">
          <div className="min-w-0 pr-3">
            <div className="text-[13px] font-medium">바탕화면 바로가기</div>
            <div className="text-[11px] text-text-muted">바탕화면에 실행 아이콘 생성</div>
          </div>
          <button
            onClick={async () => {
              const r = await window.api.createDesktopShortcut()
              push(r.message, r.success ? 'success' : 'error')
            }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-mem/15 text-mem hover:bg-mem/25 transition-colors"
          >
            <MonitorDown size={14} /> 만들기
          </button>
        </div>

        {/* 관리자 권한 상태 */}
        <div className="mt-auto pt-2 flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {elevated ? (
              <ShieldCheck size={16} className="text-ok shrink-0" />
            ) : (
              <ShieldAlert size={16} className="text-warn shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium">
                {elevated === null ? '권한 확인 중…' : elevated ? '관리자 권한으로 실행 중' : '일반 권한'}
              </div>
              <div className="text-[11px] text-text-muted">
                일부 정리·GPU 기능은 관리자 권한이 필요합니다
              </div>
            </div>
          </div>
          {elevated === false && (
            <button
              onClick={() => window.api.relaunchElevated()}
              className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-warn/15 text-warn hover:bg-warn/25 transition-colors"
            >
              관리자로 재실행
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}

function Toggle({
  label,
  desc,
  value,
  onChange
}: {
  label: string
  desc: string
  value: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-2 transition-colors">
      <div className="min-w-0 pr-3">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11px] text-text-muted">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          value ? 'bg-mem' : 'bg-border'
        }`}
        aria-pressed={value}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
          style={{ left: value ? '22px' : '2px' }}
        />
      </button>
    </div>
  )
}

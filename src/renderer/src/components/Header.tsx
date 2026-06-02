import { Activity, Moon, Sun, Settings, Clock, Circle, Gauge, Wrench } from 'lucide-react'
import { useStore } from '../store'
import { useUpdate, isUpdateActionable } from '../hooks/useUpdate'
import { formatUptime } from '../lib/format'

export type View = 'monitor' | 'optimize'

interface HeaderProps {
  onOpenSettings: () => void
  view: View
  onChangeView: (v: View) => void
}

export function Header({ onOpenSettings, view, onChangeView }: HeaderProps): JSX.Element {
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const staticInfo = useStore((s) => s.staticInfo)
  const current = useStore((s) => s.current)
  const connected = useStore((s) => s.connected)
  const updateState = useUpdate((s) => s.status.state)
  const hasUpdate = isUpdateActionable(updateState)

  return (
    <header className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface/60 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-cpu/15 text-cpu">
          <Activity size={20} strokeWidth={2.4} />
        </span>
        <div className="leading-tight">
          <h1 className="text-[15px] font-bold tracking-tight">Desktop Monitor</h1>
          <p className="text-[11px] text-text-muted">
            {staticInfo ? `${staticInfo.os.distro} · ${staticInfo.os.hostname}` : '시스템 정보 로딩 중…'}
          </p>
        </div>
      </div>

      {/* 뷰 전환 탭 */}
      <nav className="flex rounded-xl bg-surface-2 p-1">
        <TabButton active={view === 'monitor'} onClick={() => onChangeView('monitor')} icon={<Gauge size={15} />}>
          모니터
        </TabButton>
        <TabButton
          active={view === 'optimize'}
          onClick={() => onChangeView('optimize')}
          icon={<Wrench size={15} />}
          badge={hasUpdate}
        >
          최적화
        </TabButton>
      </nav>

      <div className="flex items-center gap-2">
        {/* 연결 상태 */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 text-[11px] text-text-muted">
          <Circle
            size={8}
            className={connected ? 'fill-ok text-ok' : 'fill-text-muted text-text-muted'}
          />
          {connected ? '실시간 연결됨' : '연결 대기'}
        </div>

        {/* 가동 시간 */}
        {current && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 text-[11px] text-text-muted tnum">
            <Clock size={13} />
            {formatUptime(current.uptime)}
          </div>
        )}

        {/* 테마 토글 */}
        <button
          onClick={toggleTheme}
          className="relative grid place-items-center w-9 h-9 rounded-lg bg-surface-2 hover:bg-border transition-colors"
          title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
          aria-label="테마 전환"
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        {/* 설정 */}
        <button
          onClick={onOpenSettings}
          className="grid place-items-center w-9 h-9 rounded-lg bg-surface-2 hover:bg-border transition-colors"
          title="경고 임계값 설정"
          aria-label="설정"
        >
          <Settings size={17} />
        </button>
      </div>
    </header>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  badge = false,
  children
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  badge?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
        active ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
      }`}
    >
      {icon}
      {children}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gpu ring-2 ring-surface-2" />
      )}
    </button>
  )
}

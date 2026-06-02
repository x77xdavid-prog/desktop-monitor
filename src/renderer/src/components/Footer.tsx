import { Activity } from 'lucide-react'
import { useUpdate } from '../hooks/useUpdate'

export function Footer(): JSX.Element {
  const version = useUpdate((s) => s.version)

  return (
    <footer className="flex items-center justify-between px-5 py-2 border-t border-border bg-surface/40 backdrop-blur-sm text-[11px] text-text-muted">
      <span className="flex items-center gap-1.5 tnum">
        <Activity size={12} className="text-cpu" />
        Desktop Monitor{version ? ` v${version}` : ''}
      </span>
      <span>
        Made by <span className="font-semibold text-text">david choi</span>
      </span>
    </footer>
  )
}

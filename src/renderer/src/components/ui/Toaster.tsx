import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToast, type ToastKind } from '../../hooks/useToast'

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />
}

const COLORS: Record<ToastKind, string> = {
  success: 'var(--color-ok)',
  error: 'var(--color-danger)',
  info: 'var(--color-cpu)'
}

export function Toaster(): JSX.Element {
  const toasts = useToast((s) => s.toasts)
  const remove = useToast((s) => s.remove)

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[min(360px,90vw)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-in flex items-center gap-3 rounded-xl border border-border bg-surface shadow-card px-3.5 py-3"
        >
          <span style={{ color: COLORS[t.kind] }}>{ICONS[t.kind]}</span>
          <span className="text-[13px] flex-1">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="text-text-muted hover:text-text transition-colors"
            aria-label="닫기"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

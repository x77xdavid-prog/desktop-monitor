import { ReactNode } from 'react'

interface CardProps {
  title?: string
  icon?: ReactNode
  accent?: string // CSS 변수 또는 색상값
  right?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ title, icon, accent, right, className = '', children }: CardProps): JSX.Element {
  return (
    <section
      className={`bg-surface border border-border rounded-card shadow-card overflow-hidden flex flex-col ${className}`}
    >
      {(title || right) && (
        <header className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            {icon && (
              <span
                className="grid place-items-center w-7 h-7 rounded-lg"
                style={{
                  color: accent,
                  backgroundColor: accent ? `color-mix(in srgb, ${accent} 14%, transparent)` : undefined
                }}
              >
                {icon}
              </span>
            )}
            {title && (
              <h2 className="text-[13px] font-semibold tracking-wide text-text-muted uppercase">
                {title}
              </h2>
            )}
          </div>
          {right}
        </header>
      )}
      <div className="flex-1 px-4 pb-4 pt-1 min-h-0">{children}</div>
    </section>
  )
}

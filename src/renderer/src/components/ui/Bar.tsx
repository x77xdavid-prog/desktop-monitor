interface BarProps {
  percent: number
  color: string
  height?: number
  /** 임계값에 따라 색을 자동 전환할지 여부 */
  trackClassName?: string
}

/** 가로 진행률 바 */
export function Bar({ percent, color, height = 8, trackClassName = '' }: BarProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div
      className={`w-full rounded-full overflow-hidden bg-surface-2 ${trackClassName}`}
      style={{ height }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${clamped}%`,
          backgroundColor: color,
          transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.4s ease'
        }}
      />
    </div>
  )
}

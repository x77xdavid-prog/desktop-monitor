interface RadialGaugeProps {
  value: number // 0-100
  color: string
  size?: number
  thickness?: number
  label?: string
  sublabel?: string
}

/** SVG 원형 게이지 (270° 아크) */
export function RadialGauge({
  value,
  color,
  size = 132,
  thickness = 11,
  label,
  sublabel
}: RadialGaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const arc = 270 // 도
  const circumference = 2 * Math.PI * radius
  const arcLength = (arc / 360) * circumference
  const dash = (clamped / 100) * arcLength
  const rotation = 135 // 시작 각도 (하단 좌측)

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-0">
        {/* 배경 트랙 */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
        {/* 값 아크 */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(${rotation} ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className="text-[30px] font-bold tnum" style={{ color }}>
            {label ?? `${Math.round(clamped)}%`}
          </div>
          {sublabel && <div className="text-[11px] text-text-muted mt-1.5">{sublabel}</div>}
        </div>
      </div>
    </div>
  )
}

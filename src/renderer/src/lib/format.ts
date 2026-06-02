/** 바이트를 사람이 읽기 쉬운 단위로 변환 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const idx = Math.min(i, sizes.length - 1)
  return `${(bytes / Math.pow(k, idx)).toFixed(decimals)} ${sizes[idx]}`
}

/** 초당 바이트를 속도 문자열로 (예: 12.4 MB/s) */
export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec, 1)}/s`
}

/** MB 단위 숫자를 GB 등으로 변환 (GPU VRAM 등) */
export function formatMB(mb: number | null): string {
  if (mb === null || mb === undefined) return '—'
  return formatBytes(mb * 1024 * 1024, 0)
}

/** 퍼센트 포맷 */
export function formatPercent(n: number | null, decimals = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return `${n.toFixed(decimals)}%`
}

/** 온도 포맷 */
export function formatTemp(c: number | null): string {
  if (c === null || c === undefined || !Number.isFinite(c) || c <= 0) return '—'
  return `${Math.round(c)}°`
}

/** 가동 시간(초)을 d h m 형식으로 */
export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}일`)
  if (h > 0) parts.push(`${h}시간`)
  parts.push(`${m}분`)
  return parts.join(' ')
}

/** 시각 포맷 HH:MM:SS */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('ko-KR', { hour12: false })
}

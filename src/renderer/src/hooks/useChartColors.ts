import { useEffect, useState } from 'react'
import { useStore } from '../store'

export interface ChartColors {
  cpu: string
  mem: string
  disk: string
  gpu: string
  net: string
  ok: string
  warn: string
  danger: string
  grid: string
  textMuted: string
  surface: string
}

function readColors(): ChartColors {
  const s = getComputedStyle(document.documentElement)
  const v = (name: string): string => s.getPropertyValue(name).trim()
  return {
    cpu: v('--color-cpu'),
    mem: v('--color-mem'),
    disk: v('--color-disk'),
    gpu: v('--color-gpu'),
    net: v('--color-net'),
    ok: v('--color-ok'),
    warn: v('--color-warn'),
    danger: v('--color-danger'),
    grid: v('--grid-line'),
    textMuted: v('--color-text-muted'),
    surface: v('--color-surface')
  }
}

/** 현재 테마의 실제 색상값을 반환. 테마 변경 시 자동 갱신. */
export function useChartColors(): ChartColors {
  const theme = useStore((s) => s.theme)
  const [colors, setColors] = useState<ChartColors>(() => readColors())

  useEffect(() => {
    // 테마 전환 트랜지션(0.4s) 이후 최종 색상 반영
    setColors(readColors())
    const id = setTimeout(() => setColors(readColors()), 450)
    return () => clearTimeout(id)
  }, [theme])

  return colors
}

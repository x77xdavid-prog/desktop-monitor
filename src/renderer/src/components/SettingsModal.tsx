import { useState } from 'react'
import { X, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useStore } from '../store'
import type { AlertThresholds } from '@shared/types'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

interface Row {
  key: keyof AlertThresholds
  label: string
  unit: string
  max: number
}

const ROWS: Row[] = [
  { key: 'cpuLoad', label: 'CPU 사용률', unit: '%', max: 100 },
  { key: 'memPercent', label: '메모리 사용률', unit: '%', max: 100 },
  { key: 'diskPercent', label: '디스크 사용률', unit: '%', max: 100 },
  { key: 'gpuLoad', label: 'GPU 사용률', unit: '%', max: 100 },
  { key: 'cpuTemp', label: 'CPU 온도', unit: '°C', max: 110 },
  { key: 'gpuTemp', label: 'GPU 온도', unit: '°C', max: 110 }
]

export function SettingsModal({ open, onClose }: SettingsModalProps): JSX.Element | null {
  const thresholds = useStore((s) => s.thresholds)
  const setThresholds = useStore((s) => s.setThresholds)
  const resetThresholds = useStore((s) => s.resetThresholds)

  const [draft, setDraft] = useState<AlertThresholds>(thresholds)

  if (!open) return null

  const update = (key: keyof AlertThresholds, field: 'warn' | 'danger', value: number): void => {
    setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: value } }))
  }

  const save = (): void => {
    setThresholds(draft)
    onClose()
  }

  const reset = (): void => {
    resetThresholds()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm animate-in"
      onClick={onClose}
    >
      <div
        className="w-[min(560px,92vw)] max-h-[88vh] overflow-y-auto bg-surface border border-border rounded-2xl shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-cpu/15 text-cpu">
              <SlidersHorizontal size={17} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold">경고 임계값 설정</h2>
              <p className="text-[11px] text-text-muted">주의/위험 단계 기준값을 조정하세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid place-items-center w-8 h-8 rounded-lg hover:bg-surface-2 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </header>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 items-center text-[11px] text-text-muted font-medium px-1">
            <span>항목</span>
            <span className="w-[88px] text-center text-warn">주의</span>
            <span className="w-[88px] text-center text-danger">위험</span>
          </div>
          {ROWS.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center">
              <span className="text-[13px] font-medium">{row.label}</span>
              <NumberInput
                value={draft[row.key].warn}
                unit={row.unit}
                max={row.max}
                onChange={(v) => update(row.key, 'warn', v)}
              />
              <NumberInput
                value={draft[row.key].danger}
                unit={row.unit}
                max={row.max}
                onChange={(v) => update(row.key, 'danger', v)}
              />
            </div>
          ))}
        </div>

        <footer className="flex items-center justify-between px-5 py-4 border-t border-border sticky bottom-0 bg-surface">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text transition-colors"
          >
            <RotateCcw size={14} /> 기본값으로 초기화
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-surface-2 hover:bg-border transition-colors"
            >
              취소
            </button>
            <button
              onClick={save}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-cpu hover:opacity-90 transition-opacity"
            >
              저장
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function NumberInput({
  value,
  unit,
  max,
  onChange
}: {
  value: number
  unit: string
  max: number
  onChange: (v: number) => void
}): JSX.Element {
  return (
    <div className="relative w-[88px]">
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value))))}
        className="w-full tnum text-[13px] text-center bg-surface-2 border border-border rounded-lg py-1.5 pr-6 focus:outline-none focus:ring-2 focus:ring-cpu/40"
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-text-muted pointer-events-none">
        {unit}
      </span>
    </div>
  )
}

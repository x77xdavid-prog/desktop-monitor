import { useEffect, useState } from 'react'
import { Trash2, RefreshCw, ShieldAlert, Sparkles, Loader2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { useToast } from '../../hooks/useToast'
import { formatBytes } from '../../lib/format'
import type { CleanupId, CleanupTarget } from '@shared/types'

export function CleanupCard(): JSX.Element {
  const [targets, setTargets] = useState<CleanupTarget[]>([])
  const [selected, setSelected] = useState<Set<CleanupId>>(new Set())
  const [scanning, setScanning] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const push = useToast((s) => s.push)

  const scan = async (): Promise<void> => {
    setScanning(true)
    try {
      const result = await window.api.scanCleanup()
      setTargets(result)
      // 기본 선택: 관리자 불필요 + 용량이 있는 항목
      setSelected(
        new Set(result.filter((t) => !t.requiresAdmin && (t.size > 0 || t.count > 0)).map((t) => t.id))
      )
    } catch {
      push('정리 항목 스캔에 실패했습니다', 'error')
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    void scan()
  }, [])

  const toggle = (id: CleanupId): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedSize = targets
    .filter((t) => selected.has(t.id))
    .reduce((sum, t) => sum + t.size, 0)

  const clean = async (): Promise<void> => {
    if (selected.size === 0) return
    setCleaning(true)
    try {
      const result = await window.api.runCleanup([...selected])
      if (result.freed > 0) {
        push(`${formatBytes(result.freed)} 정리 완료 🧹`, 'success')
      } else {
        push('정리를 완료했습니다', 'success')
      }
      result.errors.forEach((e) => push(e, 'info'))
      await scan()
    } catch {
      push('정리 중 오류가 발생했습니다', 'error')
    } finally {
      setCleaning(false)
    }
  }

  return (
    <Card
      title="디스크 정리"
      icon={<Sparkles size={16} />}
      accent="var(--color-disk)"
      className="col-span-12 lg:col-span-6"
      right={
        <button
          onClick={scan}
          disabled={scanning || cleaning}
          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} /> 다시 스캔
        </button>
      }
    >
      <div className="flex flex-col h-full">
        <div className="space-y-1.5 flex-1">
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-surface-2 transition-colors text-left"
            >
              <span
                className={`grid place-items-center w-5 h-5 rounded-md border-2 shrink-0 transition-colors ${
                  selected.has(t.id) ? 'bg-disk border-disk' : 'border-border'
                }`}
              >
                {selected.has(t.id) && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6.5L5 9L9.5 3.5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] font-medium">
                  {t.label}
                  {t.requiresAdmin && (
                    <span
                      className="flex items-center gap-0.5 text-[10px] text-warn"
                      title="관리자 권한 필요"
                    >
                      <ShieldAlert size={11} /> 관리자
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-muted truncate">{t.description}</div>
              </div>
              <span className="tnum text-[12px] text-text-muted shrink-0">
                {t.id === 'recycleBin' && t.count > 0
                  ? `${t.count}개`
                  : t.size > 0
                    ? formatBytes(t.size)
                    : '—'}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={clean}
          disabled={selected.size === 0 || cleaning || scanning}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold text-white bg-disk hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {cleaning ? (
            <>
              <Loader2 size={16} className="animate-spin" /> 정리 중…
            </>
          ) : (
            <>
              <Trash2 size={16} />
              {selectedSize > 0 ? `${formatBytes(selectedSize)} 정리하기` : '선택 항목 정리'}
            </>
          )}
        </button>
      </div>
    </Card>
  )
}

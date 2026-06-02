import { useEffect, useState } from 'react'
import { Microchip, Plus, Trash2, ExternalLink, Cpu, Loader2, Info } from 'lucide-react'
import { Card } from '../ui/Card'
import { useStore } from '../../store'
import { useToast } from '../../hooks/useToast'
import type { GpuPrefEntry, HagsState } from '@shared/types'

function driverLink(vendor: string): string {
  const v = vendor.toLowerCase()
  if (v.includes('nvidia')) return 'https://www.nvidia.com/Download/index.aspx'
  if (v.includes('amd') || v.includes('advanced micro')) return 'https://www.amd.com/en/support'
  if (v.includes('intel')) return 'https://www.intel.com/content/www/us/en/download-center/home.html'
  return 'https://www.google.com/search?q=' + encodeURIComponent(vendor + ' graphics driver download')
}

export function GpuOptimizeCard(): JSX.Element {
  const staticInfo = useStore((s) => s.staticInfo)
  const [prefs, setPrefs] = useState<GpuPrefEntry[]>([])
  const [hags, setHags] = useState<HagsState>('unknown')
  const [busy, setBusy] = useState(false)
  const push = useToast((s) => s.push)

  const load = async (): Promise<void> => {
    try {
      const [p, h] = await Promise.all([window.api.listGpuPrefs(), window.api.getHagsState()])
      setPrefs(p)
      setHags(h)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const addApp = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await window.api.pickAndSetGpuPref('high')
      if (result) {
        setPrefs(result)
        push('선택한 앱을 고성능 GPU로 지정했습니다 🎮', 'success')
      }
    } catch {
      push('GPU 지정 실패', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (exePath: string): Promise<void> => {
    try {
      setPrefs(await window.api.removeGpuPref(exePath))
    } catch {
      push('삭제 실패', 'error')
    }
  }

  const toggleHags = async (): Promise<void> => {
    const enable = hags !== 'on'
    setBusy(true)
    try {
      await window.api.setHags(enable)
      push(
        `하드웨어 가속 GPU 스케줄링을 ${enable ? '켰' : '껐'}습니다. 재부팅 후 적용됩니다.`,
        'success'
      )
      setTimeout(load, 1500)
    } catch {
      push('HAGS 변경 취소 또는 실패 (관리자 권한 필요)', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="GPU 최적화"
      icon={<Microchip size={16} />}
      accent="var(--color-gpu)"
      className="col-span-12 lg:col-span-6"
    >
      <div className="flex flex-col h-full gap-3">
        {/* 드라이버 정보 */}
        <div className="space-y-1.5">
          {(staticInfo?.gpus ?? []).map((g, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium truncate">{g.model}</div>
                <div className="text-[11px] text-text-muted">
                  드라이버 {g.driverVersion ?? '정보 없음'}
                </div>
              </div>
              <button
                onClick={() => window.api.openExternal(driverLink(g.vendor || g.model))}
                className="flex items-center gap-1 text-[11px] text-gpu hover:underline shrink-0"
              >
                업데이트 <ExternalLink size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* 앱별 GPU 지정 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-text-muted">앱별 외장 GPU 지정</span>
            <button
              onClick={addApp}
              disabled={busy}
              className="flex items-center gap-1 text-[11px] text-gpu hover:underline disabled:opacity-50"
            >
              <Plus size={13} /> 앱 추가
            </button>
          </div>
          <div className="space-y-1">
            {prefs.length === 0 && (
              <p className="text-[11px] text-text-muted leading-relaxed">
                게임/작업 프로그램(.exe)을 추가하면 내장 그래픽 대신 <b>NVIDIA 외장 GPU</b>를 강제로
                사용합니다.
              </p>
            )}
            {prefs.map((p) => (
              <div
                key={p.app}
                className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5"
              >
                <Cpu size={13} className="text-gpu shrink-0" />
                <span className="text-[12px] flex-1 truncate" title={p.app}>
                  {p.name}
                </span>
                <span className="text-[10px] text-text-muted">
                  {p.preference === 'high' ? '고성능' : p.preference === 'low' ? '절전' : '자동'}
                </span>
                <button
                  onClick={() => remove(p.app)}
                  className="text-text-muted hover:text-danger transition-colors"
                  aria-label="삭제"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* HAGS */}
        <div className="mt-auto flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2.5">
          <div className="min-w-0 pr-2">
            <div className="text-[12.5px] font-medium">하드웨어 가속 GPU 스케줄링</div>
            <div className="text-[11px] text-text-muted">
              {hags === 'unsupported' ? '미지원 GPU' : '입력 지연 개선 (재부팅 필요)'}
            </div>
          </div>
          {hags === 'unsupported' ? (
            <span className="text-[11px] text-text-muted flex items-center gap-1">
              <Info size={12} /> 불가
            </span>
          ) : (
            <button
              onClick={toggleHags}
              disabled={busy}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                hags === 'on' ? 'bg-gpu' : 'bg-border'
              }`}
            >
              {busy ? (
                <Loader2 size={12} className="animate-spin absolute inset-0 m-auto text-white" />
              ) : (
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: hags === 'on' ? '22px' : '2px' }}
                />
              )}
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}

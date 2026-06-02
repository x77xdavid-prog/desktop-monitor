import { useState } from 'react'
import {
  DownloadCloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Loader2,
  Sparkles
} from 'lucide-react'
import { Card } from '../ui/Card'
import { useUpdate } from '../../hooks/useUpdate'
import { useToast } from '../../hooks/useToast'

export function UpdateCard(): JSX.Element {
  const status = useUpdate((s) => s.status)
  const version = useUpdate((s) => s.version)
  const setStatus = useUpdate((s) => s.setStatus)
  const push = useToast((s) => s.push)
  const [busy, setBusy] = useState(false)

  const check = async (): Promise<void> => {
    setBusy(true)
    setStatus({ state: 'checking' })
    try {
      await window.api.checkUpdate()
    } catch {
      push('업데이트 확인 실패', 'error')
    } finally {
      setBusy(false)
    }
  }

  const download = async (): Promise<void> => {
    setStatus({ state: 'downloading', percent: 0 })
    try {
      await window.api.downloadUpdate()
    } catch {
      push('다운로드 실패', 'error')
    }
  }

  const install = (): void => {
    window.api.installUpdate()
  }

  return (
    <Card
      title="앱 업데이트"
      icon={<DownloadCloud size={16} />}
      accent="var(--color-gpu)"
      className="col-span-12 lg:col-span-6"
      right={
        <span className="text-[11px] text-text-muted tnum">
          현재 v{version || '—'}
        </span>
      }
    >
      <div className="flex flex-col h-full justify-center min-h-[120px]">
        <Body
          state={status.state}
          newVersion={status.version}
          percent={status.percent}
          message={status.message}
          busy={busy}
          onCheck={check}
          onDownload={download}
          onInstall={install}
        />
      </div>
    </Card>
  )
}

interface BodyProps {
  state: string
  newVersion?: string
  percent?: number
  message?: string
  busy: boolean
  onCheck: () => void
  onDownload: () => void
  onInstall: () => void
}

function Body({
  state,
  newVersion,
  percent,
  message,
  busy,
  onCheck,
  onDownload,
  onInstall
}: BodyProps): JSX.Element {
  switch (state) {
    case 'checking':
      return (
        <Centered>
          <Loader2 size={26} className="animate-spin text-gpu" />
          <span className="text-[13px] text-text-muted">업데이트 확인 중…</span>
        </Centered>
      )

    case 'available':
      return (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-gpu">
            <Sparkles size={20} />
            <span className="text-[15px] font-bold">새 버전 v{newVersion} 사용 가능</span>
          </div>
          <PrimaryButton onClick={onDownload}>
            <DownloadCloud size={16} /> 다운로드 및 설치
          </PrimaryButton>
        </div>
      )

    case 'downloading':
      return (
        <div className="space-y-2.5">
          <div className="flex justify-between text-[12px]">
            <span className="text-text-muted">다운로드 중…</span>
            <span className="tnum font-semibold text-gpu">{percent ?? 0}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gpu transition-all"
              style={{ width: `${percent ?? 0}%` }}
            />
          </div>
        </div>
      )

    case 'downloaded':
      return (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-ok">
            <CheckCircle2 size={20} />
            <span className="text-[14px] font-semibold">v{newVersion} 다운로드 완료</span>
          </div>
          <PrimaryButton onClick={onInstall}>
            <RotateCw size={16} /> 지금 재시작하여 설치
          </PrimaryButton>
        </div>
      )

    case 'error':
      return (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-danger">
            <AlertCircle size={18} />
            <span className="text-[13px]">확인 실패</span>
          </div>
          <p className="text-[11px] text-text-muted truncate px-2" title={message}>
            {message}
          </p>
          <SecondaryButton onClick={onCheck} busy={busy}>
            <RefreshCw size={15} /> 다시 시도
          </SecondaryButton>
        </div>
      )

    case 'dev':
      return (
        <Centered>
          <AlertCircle size={22} className="text-text-muted opacity-60" />
          <span className="text-[12.5px] text-text-muted text-center">
            개발 모드에서는 업데이트를 확인할 수 없습니다
            <br />
            (설치된 버전에서만 동작)
          </span>
        </Centered>
      )

    case 'not-available':
      return (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-ok">
            <CheckCircle2 size={20} />
            <span className="text-[14px] font-semibold">최신 버전입니다</span>
          </div>
          <SecondaryButton onClick={onCheck} busy={busy}>
            <RefreshCw size={15} /> 다시 확인
          </SecondaryButton>
        </div>
      )

    default: // idle
      return (
        <div className="text-center space-y-3">
          <p className="text-[12.5px] text-text-muted">
            GitHub에서 새 버전을 확인합니다
          </p>
          <SecondaryButton onClick={onCheck} busy={busy}>
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> 업데이트 확인
          </SecondaryButton>
        </div>
      )
  }
}

function Centered({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="flex flex-col items-center justify-center gap-2.5">{children}</div>
}

function PrimaryButton({
  onClick,
  children
}: {
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-gpu hover:opacity-90 transition-opacity"
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  onClick,
  busy,
  children
}: {
  onClick: () => void
  busy: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-surface-2 hover:bg-border transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  )
}

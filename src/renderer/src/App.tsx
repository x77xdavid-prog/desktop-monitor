import { useEffect, useState } from 'react'
import { useStore } from './store'
import { Header, type View } from './components/Header'
import { AlertBanner } from './components/AlertBanner'
import { CpuPanel } from './components/CpuPanel'
import { MemoryPanel } from './components/MemoryPanel'
import { GpuPanel } from './components/GpuPanel'
import { TemperaturePanel } from './components/TemperaturePanel'
import { DiskPanel } from './components/DiskPanel'
import { NetworkPanel } from './components/NetworkPanel'
import { ProcessPanel } from './components/ProcessPanel'
import { AlertLog } from './components/AlertLog'
import { SettingsModal } from './components/SettingsModal'
import { OptimizeView } from './components/optimize/OptimizeView'
import { Footer } from './components/Footer'
import { Toaster } from './components/ui/Toaster'
import { useUpdate } from './hooks/useUpdate'

function App(): JSX.Element {
  const initTheme = useStore((s) => s.initTheme)
  const setStaticInfo = useStore((s) => s.setStaticInfo)
  const ingestStats = useStore((s) => s.ingestStats)
  const setConnected = useStore((s) => s.setConnected)
  const syncThresholdsToMain = useStore((s) => s.syncThresholdsToMain)
  const setUpdateStatus = useUpdate((s) => s.setStatus)
  const setVersion = useUpdate((s) => s.setVersion)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [view, setView] = useState<View>('monitor')

  useEffect(() => {
    initTheme()
  }, [initTheme])

  useEffect(() => {
    let mounted = true

    window.api
      .getStaticInfo()
      .then((info) => {
        if (mounted) setStaticInfo(info)
      })
      .catch((err) => console.error('정적 정보 조회 실패:', err))

    const unsubscribe = window.api.onStats((stats) => ingestStats(stats))
    void window.api.startMonitoring()
    syncThresholdsToMain() // 백그라운드 알림용 임계값 동기화

    // 버전 + 업데이트 상태 구독
    window.api.getVersion().then(setVersion).catch(() => undefined)
    window.api.getUpdateStatus().then(setUpdateStatus).catch(() => undefined)
    const unsubUpdate = window.api.onUpdateStatus(setUpdateStatus)

    return () => {
      mounted = false
      unsubscribe()
      unsubUpdate()
      setConnected(false)
    }
  }, [setStaticInfo, ingestStats, setConnected, syncThresholdsToMain, setUpdateStatus, setVersion])

  return (
    <div className="h-full flex flex-col bg-bg text-text">
      <Header onOpenSettings={() => setSettingsOpen(true)} view={view} onChangeView={setView} />
      {view === 'monitor' && <AlertBanner />}

      <main className="flex-1 overflow-y-auto px-5 py-4">
        {view === 'monitor' ? (
          <div className="grid grid-cols-12 gap-4 max-w-[1400px] mx-auto">
            <CpuPanel />
            <MemoryPanel />
            <GpuPanel />
            <TemperaturePanel />
            <DiskPanel />
            <NetworkPanel />
            <ProcessPanel />
            <AlertLog />
          </div>
        ) : (
          <OptimizeView />
        )}
      </main>

      <Footer />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toaster />
    </div>
  )
}

export default App

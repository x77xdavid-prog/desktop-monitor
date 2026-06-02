import { Wrench, ListChecks, HardDrive, Cpu, RefreshCw, Database } from 'lucide-react'
import { Card } from '../ui/Card'

type Tool = 'taskmgr' | 'cleanmgr' | 'devmgmt' | 'windowsUpdate' | 'storage'

const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: 'taskmgr', label: '작업 관리자', icon: <ListChecks size={18} /> },
  { id: 'cleanmgr', label: '디스크 정리', icon: <HardDrive size={18} /> },
  { id: 'devmgmt', label: '장치 관리자', icon: <Cpu size={18} /> },
  { id: 'windowsUpdate', label: 'Windows 업데이트', icon: <RefreshCw size={18} /> },
  { id: 'storage', label: '저장소 센스', icon: <Database size={18} /> }
]

export function SystemToolsCard(): JSX.Element {
  return (
    <Card
      title="Windows 도구 바로가기"
      icon={<Wrench size={16} />}
      accent="var(--color-net)"
      className="col-span-12 lg:col-span-6"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => window.api.openTool(t.id)}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-surface-2 hover:bg-border transition-colors py-3.5 px-2"
          >
            <span className="text-net">{t.icon}</span>
            <span className="text-[11.5px] font-medium text-center leading-tight">{t.label}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

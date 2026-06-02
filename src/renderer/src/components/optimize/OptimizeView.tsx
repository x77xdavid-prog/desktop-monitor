import { Lightbulb } from 'lucide-react'
import { CleanupCard } from './CleanupCard'
import { PowerCard } from './PowerCard'
import { GpuOptimizeCard } from './GpuOptimizeCard'
import { AppSettingsCard } from './AppSettingsCard'
import { SystemToolsCard } from './SystemToolsCard'
import { UpdateCard } from './UpdateCard'

export function OptimizeView(): JSX.Element {
  return (
    <div className="grid grid-cols-12 gap-4 max-w-[1400px] mx-auto">
      {/* 메모리 정리에 대한 솔직한 안내 */}
      <div className="col-span-12 flex items-start gap-3 rounded-xl border border-cpu/25 bg-cpu/5 px-4 py-3">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-cpu/15 text-cpu shrink-0">
          <Lightbulb size={17} />
        </span>
        <p className="text-[12.5px] text-text leading-relaxed">
          <b>실제로 효과 있는 최적화</b>만 모았습니다. 흔한 "RAM 부스터"는 윈도우 성능을 오히려 떨어뜨릴 수
          있어 제외했고, 대신 <b>불필요한 파일 정리 · 고성능 전원 · 외장 GPU 강제 지정 · 리소스 점유 프로세스
          종료</b>처럼 체감되는 항목으로 구성했습니다. 메모리는 모니터 탭의 프로세스 목록에서 많이 쓰는
          프로그램을 종료하는 게 가장 확실합니다.
        </p>
      </div>

      <UpdateCard />
      <CleanupCard />
      <PowerCard />
      <GpuOptimizeCard />
      <AppSettingsCard />
      <SystemToolsCard />
    </div>
  )
}

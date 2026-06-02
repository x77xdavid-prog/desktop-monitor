import { runPwsh, runPwshJson } from '../pwsh'
import type { PowerPlan } from '../../shared/types'

const GUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
const ULTIMATE_TEMPLATE = 'e9a42b02-d5df-448d-aa00-03f14749eb61'

// powercfg 출력은 OEM 코드페이지(한국어=CP949)이므로, 캡처 시 OEM으로 디코딩한 뒤
// JSON은 UTF-8로 출력한다. (UTF-8로 바로 읽으면 한글이 깨짐)
const LIST_SCRIPT = `
$utf8=New-Object System.Text.UTF8Encoding $false
$oem=[System.Text.Encoding]::GetEncoding((Get-Culture).TextInfo.OEMCodePage)
[Console]::OutputEncoding=$oem
$txt=(powercfg /list | Out-String)
$active=(powercfg /getactivescheme | Out-String)
[Console]::OutputEncoding=$utf8
$ag=([regex]::Match($active,'[0-9a-fA-F\\-]{36}')).Value
$plans=@()
foreach($m in [regex]::Matches($txt,'([0-9a-fA-F\\-]{36})\\s+\\(([^)]+)\\)')){
  $plans+=[pscustomobject]@{ guid=$m.Groups[1].Value; name=$m.Groups[2].Value.Trim(); active=($m.Groups[1].Value -eq $ag) }
}
$plans | ConvertTo-Json -Compress
`

/** 전원 계획 목록 + 활성 여부 */
export async function listPowerPlans(): Promise<PowerPlan[]> {
  const parsed = await runPwshJson<PowerPlan | PowerPlan[]>(LIST_SCRIPT, [])
  const arr = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
  return arr.filter((p) => p && p.guid)
}

/** 활성 전원 계획 변경 */
export async function setPowerPlan(guid: string): Promise<void> {
  if (!GUID_RE.test(guid)) throw new Error('잘못된 전원 계획 GUID')
  await runPwsh(`powercfg /setactive ${guid}`)
}

/**
 * '궁극의 성능' 전원 계획을 생성하고 활성화한다.
 * 이미 존재하면 그것을 활성화.
 */
export async function enableUltimatePerformance(): Promise<string> {
  const existing = await listPowerPlans()
  const found = existing.find((p) => /ultimate|궁극/i.test(p.name))
  if (found) {
    await setPowerPlan(found.guid)
    return found.guid
  }

  const out = await runPwsh(`powercfg -duplicatescheme ${ULTIMATE_TEMPLATE}`)
  const newGuid = out.match(GUID_RE)?.[1]
  if (!newGuid) throw new Error('궁극의 성능 계획 생성 실패')
  await setPowerPlan(newGuid)
  return newGuid
}

import { runPwsh, runPwshElevated } from '../pwsh'
import type { GpuPrefEntry, GpuPreference, HagsState } from '../../shared/types'

const PREF_KEY = 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences'

function prefToValue(pref: GpuPreference): string {
  const code = pref === 'high' ? 2 : pref === 'low' ? 1 : 0
  return `GpuPreference=${code};`
}

function valueToPref(value: string): GpuPreference {
  if (/GpuPreference=2/.test(value)) return 'high'
  if (/GpuPreference=1/.test(value)) return 'low'
  return 'auto'
}

/** 앱별 GPU 선호 설정 목록 */
export async function listGpuPrefs(): Promise<GpuPrefEntry[]> {
  const script = `
$path='${PREF_KEY}'
if(Test-Path $path){
  $item=Get-ItemProperty -Path $path
  (Get-Item $path).Property | Where-Object { $_ -ne '(default)' } | ForEach-Object {
    [pscustomobject]@{ app=$_; value=[string]$item.$_ }
  } | ConvertTo-Json -Compress
}`
  try {
    const out = (await runPwsh(script)).trim()
    if (!out) return []
    const parsed = JSON.parse(out)
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    return arr.map((e: { app: string; value: string }) => ({
      app: e.app,
      name: e.app.split('\\').pop() ?? e.app,
      preference: valueToPref(e.value)
    }))
  } catch {
    return []
  }
}

/** 앱의 GPU 선호 설정 */
export async function setGpuPref(exePath: string, pref: GpuPreference): Promise<void> {
  const safePath = exePath.replace(/'/g, "''")
  const value = prefToValue(pref)
  const script = `
$path='${PREF_KEY}'
if(-not(Test-Path $path)){ New-Item -Path $path -Force | Out-Null }
New-ItemProperty -Path $path -Name '${safePath}' -Value '${value}' -PropertyType String -Force | Out-Null`
  await runPwsh(script)
}

/** 앱의 GPU 선호 설정 제거 */
export async function removeGpuPref(exePath: string): Promise<void> {
  const safePath = exePath.replace(/'/g, "''")
  const script = `
$path='${PREF_KEY}'
if(Test-Path $path){ Remove-ItemProperty -Path $path -Name '${safePath}' -ErrorAction SilentlyContinue }`
  await runPwsh(script)
}

/** 하드웨어 가속 GPU 스케줄링(HAGS) 상태 */
export async function getHagsState(): Promise<HagsState> {
  const script = `(Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name HwSchMode -ErrorAction SilentlyContinue).HwSchMode`
  try {
    const out = (await runPwsh(script)).trim()
    if (out === '2') return 'on'
    if (out === '1') return 'off'
    if (out === '') return 'unsupported'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/** HAGS 토글 (관리자 권한 + 재부팅 필요) */
export async function setHags(enabled: boolean): Promise<void> {
  const val = enabled ? 2 : 1
  const script = `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name HwSchMode -Value ${val} -Type DWord`
  await runPwshElevated(script)
}

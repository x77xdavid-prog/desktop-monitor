import { execFile } from 'child_process'

// 한글 깨짐 방지: PowerShell이 생성한 문자열을 UTF-8(BOM 없음)로 출력하도록 강제.
// 진행률 스트림(CLIXML)이 stderr로 새는 것도 차단.
const UTF8_PRELUDE =
  "$ProgressPreference='SilentlyContinue';$e=New-Object System.Text.UTF8Encoding $false;[Console]::OutputEncoding=$e;$OutputEncoding=$e;"

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

/**
 * PowerShell 스크립트를 실행하고 stdout을 반환한다.
 * 인코딩 문제를 피하기 위해 -EncodedCommand(UTF-16LE base64) + UTF-8 출력 사용.
 */
export function runPwsh(script: string, timeoutMs = 60_000): Promise<string> {
  const encoded = Buffer.from(`${UTF8_PRELUDE}\n${script}`, 'utf16le').toString('base64')
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { maxBuffer: 16 * 1024 * 1024, windowsHide: true, timeout: timeoutMs, encoding: 'utf8' },
      (err, stdout, stderr) => {
        if (err) reject(new Error(stderr?.trim() || err.message))
        else resolve(stripBom(stdout))
      }
    )
  })
}

/** JSON을 반환하는 스크립트 실행 후 파싱 (빈 출력은 fallback 반환) */
export async function runPwshJson<T>(script: string, fallback: T, timeoutMs = 60_000): Promise<T> {
  try {
    const out = (await runPwsh(script, timeoutMs)).trim()
    if (!out) return fallback
    return JSON.parse(out) as T
  } catch {
    return fallback
  }
}

/**
 * 관리자 권한으로 PowerShell 스크립트 실행 (UAC 프롬프트 발생).
 * 출력은 캡처하지 않으며, 사용자가 승인하지 않으면 reject된다.
 */
export function runPwshElevated(innerScript: string): Promise<void> {
  const encodedInner = Buffer.from(`${UTF8_PRELUDE}\n${innerScript}`, 'utf16le').toString('base64')
  const launcher = `try {
    $p = Start-Process powershell -Verb RunAs -WindowStyle Hidden -PassThru -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand','${encodedInner}'
    if ($p.ExitCode -ne 0) { Write-Error "exit $($p.ExitCode)" }
  } catch { Write-Error $_.Exception.Message; exit 1 }`
  return runPwsh(launcher, 120_000).then(() => undefined)
}

/** 현재 프로세스가 관리자 권한인지 */
export async function isElevated(): Promise<boolean> {
  try {
    const out = await runPwsh(
      `[bool](([System.Security.Principal.WindowsPrincipal][System.Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([System.Security.Principal.WindowsBuiltinRole]::Administrator))`
    )
    return out.trim().toLowerCase() === 'true'
  } catch {
    return false
  }
}

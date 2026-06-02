import { runPwsh, runPwshElevated, isElevated } from '../pwsh'
import type { CleanupId, CleanupTarget, CleanupResult } from '../../shared/types'

interface ScanRaw {
  userTemp: number | null
  systemTemp: number | null
  windowsUpdate: number | null
  thumbnails: number | null
  recycleBinCount: number | null
  recycleBinSize: number | null
}

const SCAN_SCRIPT = `
function DirSize($p){ if(Test-Path -LiteralPath $p){ try{ ([int64]((Get-ChildItem -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum)) }catch{ 0 } } else { 0 } }
$rbCount=0; $rbSize=0
try { $sh=New-Object -ComObject Shell.Application; $rb=$sh.NameSpace(0x0a); foreach($i in $rb.Items()){ $rbCount++; try{ $rbSize+=[int64]$i.ExtendedProperty('System.Size') }catch{} } } catch {}
[pscustomobject]@{
  userTemp=DirSize $env:TEMP
  systemTemp=DirSize "$env:WINDIR\\Temp"
  windowsUpdate=DirSize "$env:WINDIR\\SoftwareDistribution\\Download"
  thumbnails=[int64]((Get-ChildItem "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer\\thumbcache_*.db" -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum)
  recycleBinCount=[int64]$rbCount
  recycleBinSize=[int64]$rbSize
} | ConvertTo-Json -Compress
`

const META: Record<CleanupId, { label: string; description: string; requiresAdmin: boolean }> = {
  userTemp: { label: '사용자 임시 파일', description: '%TEMP% 폴더의 임시 파일', requiresAdmin: false },
  recycleBin: { label: '휴지통 비우기', description: '휴지통의 모든 항목 삭제', requiresAdmin: false },
  thumbnails: {
    label: '썸네일 캐시',
    description: '탐색기 미리보기 캐시 (자동 재생성)',
    requiresAdmin: false
  },
  systemTemp: {
    label: '시스템 임시 파일',
    description: 'Windows\\Temp 폴더 (관리자 권한 필요)',
    requiresAdmin: true
  },
  windowsUpdate: {
    label: 'Windows 업데이트 캐시',
    description: '다운로드된 업데이트 캐시 (관리자 권한 필요)',
    requiresAdmin: true
  }
}

const ORDER: CleanupId[] = ['userTemp', 'recycleBin', 'thumbnails', 'systemTemp', 'windowsUpdate']

export async function scanCleanup(): Promise<CleanupTarget[]> {
  let raw: ScanRaw
  try {
    const out = (await runPwsh(SCAN_SCRIPT, 90_000)).trim()
    raw = JSON.parse(out)
  } catch {
    raw = {
      userTemp: 0,
      systemTemp: 0,
      windowsUpdate: 0,
      thumbnails: 0,
      recycleBinCount: 0,
      recycleBinSize: 0
    }
  }

  const sizeOf = (id: CleanupId): number => {
    switch (id) {
      case 'userTemp':
        return raw.userTemp ?? 0
      case 'systemTemp':
        return raw.systemTemp ?? 0
      case 'windowsUpdate':
        return raw.windowsUpdate ?? 0
      case 'thumbnails':
        return raw.thumbnails ?? 0
      case 'recycleBin':
        return raw.recycleBinSize ?? 0
    }
  }

  return ORDER.map((id) => ({
    id,
    label: META[id].label,
    description: META[id].description,
    requiresAdmin: META[id].requiresAdmin,
    size: sizeOf(id),
    count: id === 'recycleBin' ? (raw.recycleBinCount ?? 0) : 0
  }))
}

// 각 항목 삭제 후 "FREED:<bytes>"를 출력하는 스니펫
function snippet(id: CleanupId): string {
  switch (id) {
    case 'userTemp':
      return folderSnippet('$env:TEMP')
    case 'systemTemp':
      return folderSnippet('"$env:WINDIR\\Temp"')
    case 'windowsUpdate':
      return `Stop-Service wuauserv -Force -ErrorAction SilentlyContinue; ${folderSnippet(
        '"$env:WINDIR\\SoftwareDistribution\\Download"'
      )}; Start-Service wuauserv -ErrorAction SilentlyContinue`
    case 'thumbnails':
      return `$g="$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer\\thumbcache_*.db"; $b=[int64]((Get-ChildItem $g -Force -ErrorAction SilentlyContinue|Measure-Object Length -Sum).Sum); Get-ChildItem $g -Force -ErrorAction SilentlyContinue|Remove-Item -Force -ErrorAction SilentlyContinue; $a=[int64]((Get-ChildItem $g -Force -ErrorAction SilentlyContinue|Measure-Object Length -Sum).Sum); Write-Output ("FREED:"+($b-$a))`
    case 'recycleBin':
      return `$sz=0; try{$sh=New-Object -ComObject Shell.Application;$rb=$sh.NameSpace(0x0a);foreach($i in $rb.Items()){try{$sz+=[int64]$i.ExtendedProperty('System.Size')}catch{}}}catch{}; try{Clear-RecycleBin -Force -ErrorAction Stop}catch{}; Write-Output ("FREED:"+[int64]$sz)`
  }
}

function folderSnippet(pathExpr: string): string {
  return `$p=${pathExpr}; $b=[int64]((Get-ChildItem -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue|Measure-Object Length -Sum).Sum); Get-ChildItem -LiteralPath $p -Force -ErrorAction SilentlyContinue|Remove-Item -Recurse -Force -ErrorAction SilentlyContinue; $a=[int64]((Get-ChildItem -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue|Measure-Object Length -Sum).Sum); Write-Output ("FREED:"+($b-$a))`
}

function parseFreed(output: string): number {
  let total = 0
  for (const line of output.split(/\r?\n/)) {
    const m = line.match(/FREED:(-?\d+)/)
    if (m) total += Math.max(0, parseInt(m[1], 10))
  }
  return total
}

export async function runCleanup(ids: CleanupId[]): Promise<CleanupResult> {
  const errors: string[] = []
  let freed = 0

  const adminIds = ids.filter((id) => META[id].requiresAdmin)
  const userIds = ids.filter((id) => !META[id].requiresAdmin)
  const elevated = adminIds.length > 0 ? await isElevated() : false

  // 권한 불필요 항목 (+ 이미 관리자면 전부 한 번에)
  const directIds = elevated ? ids : userIds
  if (directIds.length > 0) {
    try {
      const script = directIds.map(snippet).join('\n')
      const out = await runPwsh(script, 180_000)
      freed += parseFreed(out)
    } catch (e) {
      errors.push(`정리 중 오류: ${(e as Error).message}`)
    }
  }

  // 관리자 필요 항목 (비관리자 상태) → UAC 승격 실행 (정리량 측정 불가)
  if (!elevated && adminIds.length > 0) {
    try {
      const script = adminIds.map(snippet).join('\n')
      await runPwshElevated(script)
      errors.push('관리자 항목은 권한 승인 후 정리되었습니다 (정리량 미표시)')
    } catch {
      errors.push('관리자 권한 정리가 취소되었거나 실패했습니다')
    }
  }

  return { freed, errors }
}

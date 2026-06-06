import { app, shell } from 'electron'
import { execFile } from 'child_process'
import { join } from 'path'
import type { ActionResult } from '../../shared/types'

export type WindowsTool = 'taskmgr' | 'cleanmgr' | 'devmgmt' | 'windowsUpdate' | 'storage'

/**
 * ShellExecute("open") 의미로 도구를 실행한다.
 * taskmgr.exe·cleanmgr.exe 등은 매니페스트에 autoElevate가 있어 CreateProcess(=execFile)로는
 * "권한 상승 필요(740)" 오류로 조용히 실패한다. `cmd /c start`는 ShellExecute 경로라 UAC 자동 승격이
 * 정상 동작한다. start 첫 인자는 창 제목으로 소비되므로 빈 문자열("")을 둔다.
 */
function shellStart(target: string): void {
  const child = execFile('cmd', ['/c', 'start', '', target], { windowsHide: true })
  // 콜백/리스너가 없으면 spawn 실패가 처리되지 않은 예외로 터진다 → 반드시 핸들링.
  child.on('error', (err) => console.error(`[openWindowsTool] ${target} 실행 실패:`, err))
  child.unref()
}

/** 윈도우 기본 도구 실행 */
export function openWindowsTool(tool: WindowsTool): void {
  switch (tool) {
    case 'taskmgr':
      shellStart('taskmgr.exe')
      break
    case 'cleanmgr':
      shellStart('cleanmgr.exe')
      break
    case 'devmgmt':
      shellStart('devmgmt.msc')
      break
    case 'windowsUpdate':
      void shell.openExternal('ms-settings:windowsupdate')
      break
    case 'storage':
      void shell.openExternal('ms-settings:storagesense')
      break
  }
}

/** 외부 URL 열기 (드라이버 다운로드 등) */
export function openExternal(url: string): void {
  if (/^https?:\/\//i.test(url) || /^ms-settings:/i.test(url)) {
    void shell.openExternal(url)
  }
}

/** 바탕화면에 이 앱 바로가기(.lnk) 생성 */
export function createDesktopShortcut(): ActionResult {
  try {
    const desktop = app.getPath('desktop')
    const linkPath = join(desktop, 'Desktop Monitor.lnk')
    const ok = shell.writeShortcutLink(linkPath, 'create', {
      target: process.execPath,
      cwd: process.env.PORTABLE_EXECUTABLE_DIR || undefined,
      icon: process.execPath,
      iconIndex: 0,
      description: 'Desktop Monitor · 실시간 성능 대시보드',
      appUserModelId: 'com.desktopmonitor.app'
    })
    return ok
      ? { success: true, message: '바탕화면에 바로가기를 만들었습니다 ✨' }
      : { success: false, message: '바로가기 생성에 실패했습니다' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

/** 관리자 권한으로 앱 재실행 */
export function relaunchElevated(): void {
  const exePath = process.execPath
  const args = app.isPackaged ? [] : [app.getAppPath()]
  const argList = args.map((a) => `'${a.replace(/'/g, "''")}'`).join(',')
  const launcher = argList
    ? `Start-Process -FilePath '${exePath.replace(/'/g, "''")}' -ArgumentList ${argList} -Verb RunAs`
    : `Start-Process -FilePath '${exePath.replace(/'/g, "''")}' -Verb RunAs`

  execFile(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', launcher],
    { windowsHide: true },
    (err) => {
      if (!err) {
        app.quit()
      }
    }
  )
}

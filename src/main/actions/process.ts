import { execFile } from 'child_process'
import type { ProcessKillResult } from '../../shared/types'

/** PID로 프로세스 종료 (트리 포함, 강제) */
export function killProcess(pid: number): Promise<ProcessKillResult> {
  return new Promise((resolve) => {
    if (!Number.isInteger(pid) || pid <= 0) {
      resolve({ success: false, message: '잘못된 PID' })
      return
    }
    execFile('taskkill', ['/PID', String(pid), '/F', '/T'], { windowsHide: true }, (err, _o, stderr) => {
      if (err) {
        // taskkill의 한글 stderr는 OEM 인코딩이라 깨질 수 있어 원문을 노출하지 않는다.
        const msg = (stderr || err.message || '').trim()
        if (/Access is denied|액세스가 거부/i.test(msg)) {
          resolve({ success: false, message: '권한이 부족합니다. 관리자 권한으로 재실행 후 시도하세요.' })
        } else if (/not found|찾을 수 없/i.test(msg)) {
          resolve({ success: false, message: '이미 종료된 프로세스입니다.' })
        } else {
          resolve({
            success: false,
            message: '종료할 수 없습니다. 시스템·관리자 권한 프로세스일 수 있습니다.'
          })
        }
        return
      }
      resolve({ success: true, message: '프로세스를 종료했습니다.' })
    })
  })
}

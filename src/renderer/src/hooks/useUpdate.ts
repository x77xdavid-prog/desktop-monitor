import { create } from 'zustand'
import type { UpdateStatus } from '@shared/types'

interface UpdateStore {
  status: UpdateStatus
  version: string
  setStatus: (s: UpdateStatus) => void
  setVersion: (v: string) => void
}

export const useUpdate = create<UpdateStore>((set) => ({
  status: { state: 'idle' },
  version: '',
  setStatus: (status) => set({ status }),
  setVersion: (version) => set({ version })
}))

/** 업데이트 알림 점을 표시할 상태인지 */
export function isUpdateActionable(state: UpdateStatus['state']): boolean {
  return state === 'available' || state === 'downloaded'
}

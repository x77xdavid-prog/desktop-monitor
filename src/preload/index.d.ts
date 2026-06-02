import type { MonitorApi } from './index'

declare global {
  interface Window {
    api: MonitorApi
  }
}

export {}

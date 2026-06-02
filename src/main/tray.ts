import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

function iconPath(): string {
  // 패키징: resources/icon.png, 개발: 프로젝트 build/icon.png
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')
}

interface TrayCallbacks {
  show: () => void
  quit: () => void
}

export function createTray(cb: TrayCallbacks): Tray {
  if (tray) return tray

  let image = nativeImage.createFromPath(iconPath())
  if (!image.isEmpty()) {
    image = image.resize({ width: 16, height: 16 })
  }

  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  tray.setToolTip('Desktop Monitor')

  const menu = Menu.buildFromTemplate([
    { label: '대시보드 열기', click: () => cb.show() },
    { type: 'separator' },
    { label: '종료', click: () => cb.quit() }
  ])
  tray.setContextMenu(menu)

  tray.on('click', () => cb.show())
  tray.on('double-click', () => cb.show())

  return tray
}

/** 트레이 툴팁에 현재 CPU/온도 요약 갱신 */
export function updateTrayTooltip(cpuLoad: number, cpuTemp: number | null): void {
  if (!tray) return
  const temp = cpuTemp ? ` · ${Math.round(cpuTemp)}°C` : ''
  tray.setToolTip(`Desktop Monitor\nCPU ${Math.round(cpuLoad)}%${temp}`)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

/** 모든 창을 찾아 표시/포커스 */
export function showMainWindow(): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    if (win.isMinimized()) win.restore()
    if (!win.isVisible()) win.show()
    win.focus()
  }
}

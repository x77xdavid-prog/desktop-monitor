# Desktop Monitor · 데스크탑 성능 대시보드

> Made by **david choi**

실시간으로 PC 상태(CPU·메모리·디스크·GPU·네트워크·프로세스)를 모니터링하고,
이상 상황 발생 시 시스템 알림과 앱 내 경고로 알려주는 데스크탑 대시보드입니다.

화이트톤 기반의 깔끔한 시각화와 **라이트/다크 테마 전환**을 지원하며,
주변 사람에게도 배포할 수 있도록 **설치 프로그램(.exe)** 과 **포터블 실행 파일**로 빌드됩니다.

---

## ✨ 주요 기능

- **실시간 모니터링** (1초 주기 빠른 메트릭 / 2.5초 주기 무거운 메트릭)
  - CPU: 전체·코어별 사용률, 클럭 속도, 온도
  - 메모리: 사용량, 사용 가능, 스왑
  - 디스크: 드라이브별 용량, 읽기/쓰기 속도
  - GPU: 사용률, VRAM, 온도, 팬, 전력 (지원되는 카드)
  - 네트워크: 업로드/다운로드 속도, 누적 전송량
  - 프로세스: CPU·메모리 상위 프로세스
- **경고 시스템**: 임계값(주의/위험) 초과 시
  - 🔔 Windows 시스템 알림(토스트)
  - 🟠 앱 상단 경고 배너 + 경고 이력 로그
  - ⚙️ 임계값 사용자 조정 (설정 모달)
- **테마**: 화이트톤 기본 + 다크 모드, 부드러운 전환, 선택 기억(localStorage)

### 🧹 최적화 탭 (성능 개선 도구)

상단 **최적화** 탭에서 실제 체감되는 성능 개선 작업을 수행합니다:

- **디스크 정리**: 사용자 임시파일 · 휴지통 · 썸네일 캐시 · (관리자) 시스템 임시파일 · Windows 업데이트 캐시
  를 스캔해 용량 표시 후 선택 정리
- **전원/성능 모드**: 전원 계획 전환, '궁극의 성능' 모드 추가
- **GPU 최적화**: 앱별 **외장 GPU 강제 지정**(내장 그래픽 회피), 하드웨어 가속 GPU 스케줄링(HAGS) 토글,
  드라이버 버전 표시 + 제조사 다운로드 링크
- **프로세스 종료**: 모니터 탭 프로세스 목록에서 리소스 많이 쓰는 프로그램을 직접 종료
- **앱 상주**: 닫을 때 트레이로 최소화, 부팅 시 자동 시작, 관리자 권한으로 재실행
- **Windows 도구 바로가기**: 작업 관리자 · 디스크 정리 · 장치 관리자 · Windows 업데이트 · 저장소 센스

> ℹ️ **메모리 "RAM 부스터"는 일부러 넣지 않았습니다.** 강제 메모리 정리는 윈도우 성능을 오히려 떨어뜨릴 수
> 있습니다. 메모리는 프로세스 종료로 관리하는 것이 가장 확실합니다.

### 🔔 트레이 상주 & 백그라운드 알림

- 창을 닫아도 **트레이에 상주**하며 계속 모니터링합니다(트레이 메뉴 → 종료로 완전 종료).
- 알림은 **메인 프로세스**가 발화하므로, 창이 닫혀 있어도 이상 상황 시 토스트 알림이 옵니다.

---

## 🚀 개발 실행

```bash
npm install
npm run dev
```

## 🔍 타입 체크

```bash
npm run typecheck
```

## 📦 배포 빌드 (Windows)

```bash
# 설치 프로그램(NSIS) + 포터블 모두 빌드
npm run build:win

# 포터블 실행 파일만
npm run build:portable
```

결과물은 `dist/` 폴더에 생성됩니다:

- `Desktop Monitor-Setup-1.0.0.exe` — 설치 프로그램 (시작 메뉴·바탕화면 바로가기, 설치 경로 선택 가능)
- `Desktop Monitor-1.0.0-portable.exe` — 설치 없이 바로 실행 (USB 등에서 사용 가능)

> 주변 사람에게는 위 두 파일 중 하나를 전달하면 됩니다.
> **자동 업데이트는 설치 프로그램(Setup) 버전에서만 동작합니다.**

---

## 🔄 자동 업데이트 & GitHub 배포

GitHub Releases(`x77xdavid-prog/desktop-monitor`)를 통해 **선택적 자동 업데이트**를 지원합니다.

- 앱 실행 시 조용히 새 버전을 확인하고, 있으면 **최적화 탭에 알림 점**이 표시됩니다.
- **최적화 탭 → 앱 업데이트** 카드에서 직접 확인/다운로드/설치할 수 있습니다. (강제 설치 없음 — 사용자가 선택)

### 새 버전 배포하기 (GitHub Actions, 권장)

```bash
# 1) package.json 버전 올리기 (예: 1.0.0 → 1.0.1)
npm version patch    # 또는 minor / major

# 2) 태그 푸시 → GitHub Actions가 Windows에서 빌드 후 Release 발행
git push && git push --tags
```

`v*` 태그가 푸시되면 `.github/workflows/release.yml`이 자동으로:
1. Windows 러너에서 빌드
2. 설치 프로그램 + `latest.yml`(업데이트 메타데이터)을 GitHub Release에 업로드

설치된 사용자 앱은 다음 실행 시 새 버전을 감지합니다.

### 로컬에서 직접 배포하기

```bash
# GitHub 토큰 필요 (gh 로그인되어 있으면 토큰 자동 사용)
# PowerShell:  $env:GH_TOKEN = (gh auth token)
# bash:        export GH_TOKEN=$(gh auth token)
npm run release
```

---

## 🎨 커스텀 아이콘 (선택)

기본은 Electron 아이콘을 사용합니다. 직접 만든 아이콘을 쓰려면:

1. `build/` 폴더 생성
2. `build/icon.ico` (256×256 이상) 또는 `build/icon.png` (512×512 이상) 추가
3. 다시 빌드하면 자동 적용됩니다.

---

## 🏗 기술 스택

| 영역 | 기술 |
|------|------|
| 런타임 | Electron 33 |
| UI | React 18 + TypeScript |
| 빌드 | electron-vite (Vite 5) |
| 시각화 | Recharts |
| 상태 관리 | Zustand |
| 스타일 | Tailwind CSS + CSS 변수 (테마) |
| 시스템 정보 | systeminformation |
| 패키징 | electron-builder (NSIS / portable) |

---

## 📁 구조

```
src/
├── main/           # Electron 메인 프로세스
│   ├── index.ts    # 윈도우·IPC·알림
│   └── monitor.ts  # systeminformation 수집 (2단계 폴링)
├── preload/        # contextBridge IPC 안전 노출
├── shared/         # main↔renderer 공유 타입
└── renderer/       # React 앱
    └── src/
        ├── components/  # 패널·UI 프리미티브
        ├── hooks/       # useChartColors 등
        ├── lib/         # 포맷·경고 평가
        ├── store.ts     # Zustand 스토어
        └── App.tsx
```

---

## 📌 참고 사항

- **GPU 사용률/온도**: NVIDIA(nvidia-smi)는 대부분 지원됩니다. 내장 그래픽이나 일부 AMD는
  사용률/온도가 표시되지 않을 수 있으며, 이 경우 모델명·VRAM 정보만 노출됩니다.
- **CPU 온도**: 메인보드/드라이버에 따라 표시되지 않을 수 있습니다(특히 일부 데스크탑).
- **관리자 권한**: 일부 센서 값은 관리자 권한 실행 시 더 정확히 수집됩니다.

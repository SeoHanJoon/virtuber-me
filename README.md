# Virtuber Me

웹 기반 VTuber 플랫폼 - VRM 아바타 + 실시간 얼굴 & 상체 추적

## 📌 프로젝트 현황

### ✅ 완료된 기능

1. **VRM 모델 뷰어** - 3D 아바타 로드 및 표시
2. **실시간 얼굴 추적** - MediaPipe Face Landmarker (468 landmarks + 52 ARKit BlendShapes)
3. **MoveNet 상체 트래킹** - TensorFlow.js 기반 17 keypoints 추적
4. **VRM 수동 제어** - 슬라이더로 본 회전 직접 조절
5. **BlendShapes 모니터** - 실시간 표정 파라미터 시각화
6. **랜드마크 시각화** - 얼굴/상체 keypoints 오버레이

### 🔄 실패한 기능 (MoveNet 상체 트래킹 안정화)

**시도한 접근 방법**:

- ❌ **BlazePose (MediaPipe Runtime)**: Webpack 호환성 문제로 실패
- ❌ **BlazePose (TFjs Runtime, full model)**: `null` 값 반환 문제
- ❌ **BlazePose (TFjs Runtime, lite model)**: 워밍업 단계에서 포즈 감지 실패
- ✅ **MoveNet (TFjs Runtime, Lightning)**: **현재 채택** - 안정적이고 빠름 (>50FPS), 자연스럽지 않음

### 📊 기술적 도전 과제 및 해결

| 문제                            | 원인                                                                  | 해결 방법                                  |
| ------------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| BlazePose MediaPipe 런타임 오류 | Next.js Webpack이 `@mediapipe/pose` 패키지를 올바르게 번들링하지 못함 | TFjs 런타임으로 전환                       |
| BlazePose TFjs `null` 값 반환   | 브라우저 환경에서 'full' 모델이 초기화 실패                           | MoveNet으로 전환                           |
| VRM 아바타 접힘/사라짐          | 회전값이 항상 적용되어 기본 포즈 손상                                 | 트래킹 비활성화 시 리셋 로직 추가          |
| `NaN` 회전값                    | Z축 값 `undefined`, 벡터 길이 0                                       | `?? 0` 및 `isFinite()` 체크 추가           |
| 좌표계 불일치                   | MoveNet은 픽셀 좌표, 정규화 필요                                      | `x / videoWidth`, `y / videoHeight` 변환   |
| 웹캠 초기화 실패                | `loadedmetadata` 전에 `play()` 호출                                   | 이벤트 리스너를 `srcObject` 할당 전에 설정 |

## 🚀 주요 기능

### 1. 얼굴 추적

- **468개 랜드마크** 실시간 추적
- **52개 ARKit BlendShapes** 지원
- 눈 깜빡임, 입 모양, 시선, 미소, 감정 표현 인식
- 정밀 스무딩 및 정규화

### 2. 상체 트래킹 (MoveNet)

- **17개 keypoints** 추적
- 양쪽 팔 회전 (상완/전완)
- 척추, 가슴, 머리 회전
- Pseudo-3D 좌표 변환 (Y 기반 깊이 근사)
- EMA 스무딩으로 떨림 방지

### 3. VRM 수동 제어

- 슬라이더로 각 본 회전 직접 조절
- 척추, 가슴, 양팔, 머리 제어
- 실시간 반영 및 리셋 기능

### 4. 멀티플레이어

- Socket.IO 기반 실시간 동기화
- 최대 100명 동시 접속
- 얼굴 추적 데이터만 전송 (이미지/비디오 전송 없음)
- WASD 이동 및 시점 회전

## 📦 기술 스택

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS 4
- **빌드**: Webpack (TensorFlow.js 호환성)
- **3D**: Three.js + @pixiv/three-vrm
- **추적**:
  - MediaPipe Face Landmarker (얼굴)
  - TensorFlow.js + MoveNet Lightning (상체)
- **멀티플레이어**: Socket.IO + Express
- **코드 품질**: ESLint + Prettier + Husky
- **Node.js**: 22.20.0

## 🛠️ 설치 및 실행

### 1. Node.js 버전 설정

```bash
nvm use  # .nvmrc 파일 사용 (Node 22.20.0)
```

### 2. 의존성 설치

```bash
npm install
npm run server:install  # 멀티플레이어 서버용
```

### 3. 개발 서버 실행

```bash
# 클라이언트
npm run dev  # http://localhost:3000

# 멀티플레이어 서버 (별도 터미널)
npm run server:dev  # http://localhost:3001
```

### 4. 페이지별 기능

| 경로                  | 기능                    |
| --------------------- | ----------------------- |
| `/`                   | 메인 페이지 (기능 목록) |
| `/vrm`                | VRM 뷰어                |
| `/face-tracking`      | 얼굴 추적 + VRM         |
| `/body-tracking-test` | 상체 추적 + VRM         |
| `/multiplayer`        | 멀티플레이어 월드       |

## ⚙️ 설정 옵션

### MoveNet 상체 추적

```typescript
{
  depthScale: 0.3,        // Z축 깊이 스케일 (0.1~0.5)
  smoothingFactor: 0.3,   // EMA 스무딩 (0~1, 높을수록 부드러움)
  maxFPS: 30,             // FPS 제한
  minConfidence: 0.3      // 최소 keypoint 신뢰도
}
```

### 얼굴 추적

```typescript
{
  smoothingFactor: 0.7,   // 스무딩 강도
  multipliers: {
    blink: 1.5,           // 눈 깜빡임 강도
    mouthOpen: 1.0,       // 입 벌림 강도
    mouthSmile: 1.0,      // 미소 강도
    eyeLook: 1.0          // 시선 강도
  }
}
```

## 📁 프로젝트 구조

```
virtuber-me/
├── app/                      # Next.js 페이지
│   ├── page.tsx
│   ├── vrm/
│   ├── face-tracking/
│   ├── body-tracking-test/
│   └── multiplayer/
├── components/               # React 컴포넌트
│   ├── VRMViewer.tsx
│   ├── FaceTrackingVRMViewer.tsx
│   ├── VRMBodyController.tsx
│   ├── BodyTrackingTestPage.tsx
│   └── MultiplayerVRMWorld.tsx
├── hooks/                    # Custom Hooks
│   ├── useBodyTracking.ts   # MoveNet 상체 추적
│   ├── useFaceTracking.ts   # 얼굴 추적
│   ├── useWebcam.ts
│   └── useVRMScene.ts
├── utils/                    # 유틸리티 함수
│   ├── faceStateCalculator.ts
│   ├── bodyStateCalculator.ts
│   └── vrmTracking.ts
├── types/                    # TypeScript 타입
│   ├── bodyTracking.ts
│   ├── tracking.ts
│   └── vrm.ts
├── server/                   # Socket.IO 서버
│   ├── index.ts
│   └── types.ts
└── public/models/            # VRM 파일 저장
```

## 🎯 사용 방법

### VRM 모델 추가

1. VRM 파일을 `public/models/` 디렉토리에 추가
2. 서버 재시작 없이 자동으로 목록에 추가됨
3. 각 페이지에서 드롭다운으로 선택 가능

### VRM 다운로드

- **VRoid Hub**: https://hub.vroid.com/
- **VRoid Studio**: https://vroid.com/studio
- **샘플 모델**: https://github.com/pixiv/three-vrm

### 상체 트래킹 사용 팁

- 상체 전체(어깨~손목)가 화면에 보이도록 조정
- 밝은 조명 권장
- 웹캠과 1~2m 거리 유지
- 천천히 움직이면 더 정확함

## 📊 성능

| 항목       | MoveNet | MediaPipe Face |
| ---------- | ------- | -------------- |
| FPS        | 50+     | 30+            |
| 지연 시간  | ~33ms   | ~50ms          |
| CPU 사용률 | 낮음    | 중간           |
| 메모리     | ~50MB   | ~100MB         |
| 모델 크기  | 2MB     | 10MB           |

## 🐛 문제 해결

### 웹캠이 작동하지 않음

- 브라우저 권한 확인 (설정 → 개인정보 → 카메라)
- HTTPS 환경 필요 (localhost는 HTTP 허용)

### 상체 트래킹이 반응 없음

- "트래킹 시작" 버튼 클릭 확인
- 콘솔에서 `[useBodyTracking]` 로그 확인
- 웹캠에 상체 전체가 보이는지 확인

### VRM 아바타가 이상하게 움직임

- 다른 VRM 모델로 테스트
- "리셋" 버튼으로 기본 포즈로 복귀
- 수동 제어 모드 OFF 확인

## 📚 추가 문서

- **Face State Calculator**: `utils/README.md`
- **멀티플레이어 서버**: `server/README.md`

## 🎯 향후 계획

- [x] ✅ 1단계. 얼굴 트래킹 완성
- ~~[ ] 🔄 2단계. 상체 트래킹 안정화~~
  - 실패. 단일 카메라로는 깊이감을 표시하기 어려움.
- [ ] 🚀 3단계. 네트워크 아바타 동기화
- [ ] 🌎 4단계. 가상 공간 내 이동 및 카메라 조작
- [ ] ✨ 5단계. 감정 표현과 제스처 시스템
- [ ] ☁️ 6단계. 서버/클라우드 배포 및 세션 관리

## 📄 라이선스

MIT License

---

## 🙏 크레딧

- **Three.js** - 3D 렌더링 엔진
- **@pixiv/three-vrm** - VRM 모델 로더
- **MediaPipe** - 얼굴 추적 AI
- **TensorFlow.js** - 머신러닝 프레임워크
- **Socket.IO** - 실시간 통신

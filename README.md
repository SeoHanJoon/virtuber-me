# Virtuber Me

웹 기반 VTuber 플랫폼 - VRM 아바타 + 실시간 얼굴 추적 + 멀티플레이어

## 🚀 주요 기능

- **VRM 모델 뷰어**: 3D 아바타 확인 및 탐색
- **실시간 얼굴 추적**: 웹캠으로 아바타 실시간 조종 (정밀 표정 인식 🎯)
- **상체 및 손 추적**: MediaPipe Pose/Hand로 상체 움직임 및 손가락 제스처 추적 🙆✋
- **VRM 수동 제어**: 슬라이더로 각 본(Bone) 회전을 직접 조절 🎮🆕
- **멀티플레이어 월드**: 최대 100명이 동시 접속 가능한 VRM 아바타 월드 🎉
- **고급 얼굴 분석**: 입 모양, 눈 깜빡임, 시선, 미소 감지 (468+ 랜드마크)
- **ARKit BlendShapes 지원**: MediaPipe의 52개 BlendShapes로 미세한 표정 제어 🆕
- **실시간 시각화**: 얼굴 랜드마크 오버레이 및 BlendShapes 모니터 🆕

## 📦 기술 스택

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS 4
- **3D 렌더링**: Three.js + @pixiv/three-vrm
- **추적**: MediaPipe Face/Pose/Hand Landmarker
- **멀티플레이어**: Socket.IO + Express
- **코드 품질**: ESLint + Prettier + Husky
- **Node.js**: 22.20.0

## 📁 프로젝트 구조

\`\`\`
virtuber-me/
├── app/
│ ├── page.tsx # 메인 페이지
│ ├── vrm/ # VRM 뷰어
│ ├── face-tracking/ # 얼굴 추적
│ ├── multiplayer/ # 멀티플레이어 월드 ✨
│ └── api/vrm-models/ # VRM 파일 목록 API
├── components/
│ ├── VRMViewer.tsx # VRM 뷰어 컴포넌트
│ ├── FaceTrackingVRMViewer.tsx # 얼굴 추적 메인 컴포넌트 (리팩토링됨 🆕)
│ ├── MultiplayerVRMWorld.tsx # 멀티플레이어 컴포넌트 ✨
│ ├── TrackingStatusIndicator.tsx # 추적 상태 표시 UI 🆕
│ ├── ExpressionSettingsPanel.tsx # 통합 설정 패널 (모델 변형, 추적, 표정, BlendShapes) 🔄
│ ├── VRMManualControl.tsx # VRM 수동 제어 패널 (슬라이더) 🎮🆕
│ └── LandmarkVisualizer.tsx # 랜드마크 시각화 🆕
├── hooks/
│ ├── useWebcam.ts # 웹캠 관리 훅 🆕
│ ├── useMediaPipeLandmarkers.ts # MediaPipe 초기화 훅 🆕
│ ├── useVRMScene.ts # Three.js Scene 관리 훅 🆕
│ ├── useFaceTracking.ts # 얼굴 추적 훅 ✨
│ ├── useExpressionMapping.ts # 표정 매핑 훅 ✨
│ ├── useNetworkSync.ts # 네트워크 동기화 훅 ✨
│ └── useControls.ts # WASD 컨트롤 훅 ✨
├── utils/
│ ├── faceStateCalculator.ts # 정밀 얼굴 상태 계산기 🎯
│ ├── bodyStateCalculator.ts # 상체 및 손 추적 계산기 🙆✋
│ ├── mediapipeBlendShapes.ts # MediaPipe BlendShapes 매핑 🆕
│ ├── vrmTracking.ts # VRM 추적 적용 함수 🆕
│ ├── vrmTransforms.ts # VRM 변형 유틸 🆕
│ └── README.md # 상세 사용법 문서
├── types/
│ ├── vrm.ts # VRM 타입 정의
│ ├── multiplayer.ts # 멀티플레이어 타입 정의
│ ├── tracking.ts # 추적 타입 정의
│ └── components.ts # 컴포넌트 Props 타입
├── server/ # 멀티플레이어 서버 ✨
│ ├── index.ts # Socket.IO 서버
│ ├── types.ts # 타입 정의
│ └── package.json # 서버 의존성
└── public/models/ # VRM 파일 저장
\`\`\`

### 📐 최신 아키텍처 (리팩토링됨) 🆕

**컴포넌트 분리 원칙**:

- **단일 책임 원칙 (SRP)**: 각 파일이 하나의 명확한 책임만 가짐
- **재사용성**: Custom Hooks로 로직 분리 → 다른 컴포넌트에서도 사용 가능
- **테스트 용이성**: 작은 단위로 분리되어 개별 테스트 가능
- **가독성**: 각 파일이 200줄 이하로 유지

**FaceTrackingVRMViewer 구조** (952줄 → 355줄로 축소):
\`\`\`
FaceTrackingVRMViewer.tsx (메인)
├─ useWebcam() ← 웹캠 관리
├─ useMediaPipeLandmarkers() ← MediaPipe 초기화
├─ useVRMScene() ← Three.js Scene 관리
├─ vrmTracking 함수들 ← 추적 데이터 적용
├─ TrackingStatusIndicator ← 상태 UI
├─ ExpressionSettingsPanel ← 통합 설정 UI (모델 변형, 추적, 표정 강도, BlendShapes) 🔄
└─ LandmarkVisualizer ← 랜드마크 시각화 🆕
\`\`\`

## 🛠️ 설치 및 실행

### 1. Node.js 버전 설정

\`\`\`bash
nvm use # .nvmrc 파일 사용 (Node 22.20.0)
\`\`\`

### 2. 의존성 설치

\`\`\`bash

# 클라이언트 의존성

npm install

# 서버 의존성

npm run server:install
\`\`\`

### 3. 개발 서버 실행

#### 클라이언트만 실행 (VRM 뷰어, 얼굴 추적)

\`\`\`bash
npm run dev
\`\`\`

브라우저에서 접속: \`http://localhost:3000\`

#### 멀티플레이어 서버 실행 (별도 터미널)

\`\`\`bash
npm run server:dev
\`\`\`

서버 실행: \`http://localhost:3001\`

#### 두 서버 모두 실행 (멀티플레이어 사용)

터미널 1:
\`\`\`bash
npm run dev
\`\`\`

터미널 2:
\`\`\`bash
npm run server:dev
\`\`\`

이제 \`http://localhost:3000/multiplayer\`에서 멀티플레이어 월드에 접속할 수 있습니다!

## 🎯 고급 기능: FaceStateCalculator

MediaPipe의 468개 랜드마크를 분석하여 정밀한 얼굴 상태를 계산합니다.

### 특징

- 🎯 **9가지 상태 추적**: 입 벌림, 입 너비, 미소, 양쪽 눈 깜빡임, 시선 4방향
- 🎬 **스무딩**: Lerp를 통한 부드러운 애니메이션
- ⚡ **고성능**: 30fps 이상 유지
- 🔄 **자동 decay**: 얼굴 미감지 시 중립 상태로 자동 전환
- 📐 **정규화**: 얼굴 크기 무관한 일관된 값

### 사용 예제

```typescript
import {
  FaceStateCalculator,
  mapFaceStateToVRM,
} from '@/utils/faceStateCalculator';

// 계산기 생성 (스무딩 강도: 0.7)
const calculator = new FaceStateCalculator(0.7);

// MediaPipe 결과로부터 얼굴 상태 계산
const faceState = calculator.calculateFaceState(landmarks);

// VRM 표정으로 변환 및 적용
const vrmMapping = mapFaceStateToVRM(faceState);
vrm.expressionManager.setValue(
  vrmMapping.mouth.expression,
  vrmMapping.mouth.value
);
```

자세한 사용법은 [`utils/README.md`](./utils/README.md)를 참고하세요.

## 📝 사용 방법

### VRM 모델 추가

1. VRM 파일을 \`public/models/\` 디렉토리에 추가
2. 서버 재시작 없이 자동으로 목록에 추가됨
3. VRM 뷰어 또는 얼굴 추적 페이지에서 선택 가능

### VRM 모델 다운로드

- **VRoid Hub**: https://hub.vroid.com/
- **VRoid Studio**: https://vroid.com/studio
- **Three-VRM 샘플**: https://github.com/pixiv/three-vrm

## 🎭 얼굴 추적 기능

### 지원 표정

- **눈 깜빡임**: 좌/우 독립 추적 (\`blinkLeft\`, \`blinkRight\`)
- **입 모양**: 다양한 발음 형태 (\`aa\`, \`ih\`, \`ou\`, \`ee\`, \`oh\`)
- **머리 회전**: Yaw, Pitch, Roll 3축 추적
- **시선 방향**: 위/아래/좌/우 (\`lookUp\`, \`lookDown\`, \`lookLeft\`, \`lookRight\`)
- **감정 표현**: 행복, 슬픔, 화남, 편안함 (\`happy\`, \`sad\`, \`angry\`, \`relaxed\`)

### 사용 팁

- 밝은 조명에서 사용
- 얼굴을 카메라 정면에 위치
- 과장된 표정으로 더 잘 인식
- HTTPS 환경 권장 (웹캠 접근용, localhost는 예외)

## 🎮 VRM 수동 제어

### 기능

- **슬라이더 제어**: 각 본(Bone)의 회전을 슬라이더로 직접 조절
- **실시간 반영**: 값 변경 시 즉시 VRM 모델에 적용
- **정밀 조정**: 라디안 값을 도(°) 단위로 표시
- **자동 추적 비활성화**: 수동 제어 활성화 시 자동 추적 중지

### 제어 가능한 본

| 본              | 축      | 설명               |
| --------------- | ------- | ------------------ |
| **척추**        | X, Y, Z | 상체 기울임        |
| **가슴**        | X, Y, Z | 상체 상단 회전     |
| **왼팔 상완**   | X, Y, Z | 왼쪽 어깨~팔꿈치   |
| **왼팔 전완**   | X, Y, Z | 왼쪽 팔꿈치~손목   |
| **오른팔 상완** | X, Y, Z | 오른쪽 어깨~팔꿈치 |
| **오른팔 전완** | X, Y, Z | 오른쪽 팔꿈치~손목 |
| **머리**        | X, Y, Z | 머리 회전          |

### 사용 방법

1. `/face-tracking` 페이지 접속
2. 우측 상단 "🎮 수동 제어" 버튼 클릭
3. "▶" 버튼 클릭하여 패널 확장
4. 슬라이더로 원하는 포즈 조정
5. "리셋" 버튼으로 초기화

📖 자세한 사용법은 [`VRM_MANUAL_CONTROL_GUIDE.md`](./VRM_MANUAL_CONTROL_GUIDE.md)를 참고하세요.

## 🌐 멀티플레이어 월드

### 기능

- **실시간 동기화**: Socket.IO로 최대 100명 동시 접속
- **얼굴 추적**: 각 사용자의 표정이 실시간으로 동기화
- **WASD 이동**: 키보드로 월드 내 이동
- **성능 최적화**: 거리 기반 LOD 및 렌더링 컬링

### 조작법

- **W/A/S/D**: 캐릭터 이동 (앞/왼쪽/뒤/오른쪽)
- **Shift**: 달리기
- **마우스 이동**: 시점 회전

### 주의 사항

⚠️ **개인정보 보호**: 이 시스템은 **이미지나 비디오를 전송하지 않으며**, 오직 얼굴 추적 결과(표정 데이터, 머리 회전 등)만 서버로 전송합니다.

⚠️ **HTTPS 필수**: 웹캠 사용을 위해 HTTPS 환경이 필요합니다 (localhost는 HTTP 허용).

⚠️ **서버 실행**: 멀티플레이어 기능을 사용하려면 서버가 실행 중이어야 합니다.

## 📜 스크립트

### 클라이언트

\`\`\`bash
npm run dev # 개발 서버 시작
npm run build # 프로덕션 빌드
npm run start # 프로덕션 서버 시작
npm run lint # ESLint 실행
npm run lint:fix # ESLint 자동 수정
npm run format # Prettier 포맷팅
\`\`\`

### 서버

\`\`\`bash
npm run server:install # 서버 의존성 설치
npm run server:dev # 서버 개발 모드 실행
npm run server:build # 서버 빌드
npm run server:start # 서버 프로덕션 실행
\`\`\`

## 🏗️ 아키텍처

### 멀티플레이어 동기화

```
[클라이언트 1]                    [서버]                    [클라이언트 2]
     |                               |                               |
     |-- join (modelPath) --------→ |                               |
     |                               |←-- snapshot (모든 사용자) ----|
     |                               |                               |
     |-- update (pos, rot, expr) -→ |                               |
     |                               |-- broadcast update --------→ |
     |                               |                               |
     |←-- user_update (다른사용자) --|                               |
```

### 데이터 페이로드 (최적화)

\`\`\`typescript
{
id: "user-uuid",
pos: [x, y, z], // 위치 (Float32)
rot: [x, y, z, w], // 회전 (Quaternion)
expr: "aa", // 현재 표정
blinkL: 0.8, // 왼쪽 눈 깜빡임 (0~1)
blinkR: 0.9, // 오른쪽 눈 깜빡임 (0~1)
mood: "happy" // 감정 상태
}
\`\`\`

- **전송 주기**: 10Hz (100ms)
- **전송 데이터**: 약 100 bytes/update
- **네트워크 대역폭**: ~1KB/s per user

## 🔧 성능 최적화

### 클라이언트

- **거리 기반 컬링**: 50m 이상 떨어진 아바타는 렌더링 제외
- **LOD (Level of Detail)**: 거리에 따른 모델 디테일 조정 (향후 구현)
- **보간 (Interpolation)**: 네트워크 지연을 부드럽게 처리

### 서버

- **Rate Limiting**: 각 소켓당 10Hz (100ms) 제한
- **브로드캐스트 최적화**: 변경된 데이터만 전송
- **자동 정리**: 5분 이상 비활성 세션 자동 제거

## 🎯 향후 개발 계획

- [ ] 보이스 채팅 (WebRTC)
- [ ] 프라이빗 룸 생성
- [ ] 제스처 및 이모트
- [ ] 파티클 이펙트
- [ ] 커스텀 월드 맵
- [ ] 데이터베이스 연동 (사용자 프로필)

## 📄 라이선스

MIT License

---

**Made with ❤️ for VTubers**

## 🙏 크레딧

- **Three.js**: 3D 렌더링 엔진
- **@pixiv/three-vrm**: VRM 모델 로더
- **MediaPipe**: 얼굴 추적 AI
- **Socket.IO**: 실시간 통신

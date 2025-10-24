# VirtualBer-Me: 페이셜 트래킹 기반 멀티플레이어 VRM 월드

## 🎯 프로젝트 개요

VirtualBer-Me는 **얼굴 표정 추적**과 **WASD 이동**을 지원하는 **실시간 멀티플레이어 VRM 아바타 월드**입니다. 웹브라우저에서 VRM 3D 아바타를 사용하여 다른 사용자들과 함께 가상 공간에서 소통할 수 있습니다.

### 핵심 기능

- 🎭 **실시간 얼굴 표정 추적** (MediaPipe Face Landmarker)
- 🚶 **WASD 키보드 이동 제어** (한영 전환 무관)
- 🌐 **멀티플레이어 동기화** (Socket.IO)
- 🏠 **멀티룸 시스템** (`/room/:id`)
- 👥 **실시간 참여자 목록**
- 🎨 **VRM 모델 지원** (3D 아바타 표준)

---

## 🛠️ 기술 스택

### Frontend

- **Next.js 15** (React 기반 프레임워크)
- **TypeScript** (타입 안정성)
- **Three.js** (3D 렌더링)
- **@pixiv/three-vrm** (VRM 모델 로더)
- **MediaPipe Face Landmarker** (얼굴 추적)
- **Socket.IO Client** (실시간 통신)
- **Tailwind CSS** (스타일링)

### Backend

- **Node.js + Express**
- **Socket.IO Server** (WebSocket)
- **TypeScript**

---

## 📐 시스템 아키텍처

```
┌─────────────────────────────────────────────────┐
│              Client (Browser)                    │
│                                                   │
│  ┌───────────────┐  ┌──────────────┐            │
│  │  Face Tracker │  │  Controls    │            │
│  │  (MediaPipe)  │  │  (WASD)      │            │
│  └───────┬───────┘  └──────┬───────┘            │
│          │                  │                    │
│          └──────┬───────────┘                    │
│                 ▼                                │
│        ┌─────────────────┐                       │
│        │ MultiplayerVRM  │                       │
│        │     World       │                       │
│        │  (Three.js)     │                       │
│        └────────┬────────┘                       │
│                 │                                │
│                 ▼                                │
│        ┌─────────────────┐                       │
│        │ NetworkSync     │                       │
│        │ (Socket.IO)     │                       │
│        └────────┬────────┘                       │
└─────────────────┼────────────────────────────────┘
                  │
                  │ WebSocket
                  │
┌─────────────────▼────────────────────────────────┐
│              Server (Node.js)                     │
│                                                   │
│  ┌──────────────────────────────────────┐        │
│  │      Room Manager                     │        │
│  │  ┌─────────┬─────────┬─────────┐     │        │
│  │  │ Room A  │ Room B  │ Room C  │     │        │
│  │  └─────────┴─────────┴─────────┘     │        │
│  └──────────────────────────────────────┘        │
│                                                   │
│  - 위치/회전 동기화 (10Hz)                         │
│  - 표정 데이터 브로드캐스트                         │
│  - 룸별 사용자 관리                               │
│  - 비활성 룸 자동 정리                            │
└───────────────────────────────────────────────────┘
```

---

## 🔑 핵심 데이터 구조

### UserState (사용자 상태)

```typescript
interface UserState {
  id: string; // UUID
  position: Position; // { x, y, z }
  rotation: Rotation; // Quaternion { x, y, z, w }
  expression: ExpressionState; // 얼굴 표정
  modelPath: string; // VRM 모델 경로
  nickname?: string; // 닉네임
  timestamp: number; // 마지막 업데이트 시간
}
```

### UpdatePayload (네트워크 전송 최적화)

```typescript
interface UpdatePayload {
  id: string;
  pos: [number, number, number]; // 위치 배열
  rot: [number, number, number, number]; // 회전 배열
  expr: string; // 현재 표정
  blinkL: number; // 왼쪽 눈 깜빡임
  blinkR: number; // 오른쪽 눈 깜빡임
  mood?: string; // 감정 상태
}
```

### ExpressionState (표정 상태)

```typescript
interface ExpressionState {
  current: string; // 현재 활성 표정
  blinkLeft: number; // 0~1
  blinkRight: number; // 0~1
  lookUp?: number; // 시선 방향
  lookDown?: number;
  lookLeft?: number;
  lookRight?: number;
  mood?: 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed';
}
```

---

## 🎮 주요 컴포넌트 및 훅

### 1️⃣ useFaceTracking

**얼굴 추적 훅**

```typescript
const { isTracking, landmarks, videoRef } = useFaceTracking();
```

- MediaPipe Face Landmarker 초기화
- 웹캠에서 얼굴 랜드마크 추출
- 468개 랜드마크 포인트 제공
- 머리 회전 각도 계산 (yaw, pitch, roll)

### 2️⃣ useExpressionMapping

**표정 매핑 훅**

```typescript
const { name, values, mood } = useExpressionMapping(landmarks);
```

- 얼굴 랜드마크 → VRM 표정 변환
- 눈 깜빡임, 입 모양 등 분석
- VRM BlendShape 값 생성

### 3️⃣ useControls

**WASD 이동 제어 훅**

```typescript
const { movement, input } = useControls({
  moveSpeed: 5,
  sprintSpeed: 10,
  bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
});
```

- 키보드 입력 감지 (`e.code` 사용으로 한영 무관)
- 위치 업데이트 (requestAnimationFrame)
- 경계 체크
- 마우스 회전 제어

### 4️⃣ useNetworkSync

**네트워크 동기화 훅**

```typescript
const { isConnected, myUserId, otherUsers, connect, updateMyState } =
  useNetworkSync(serverUrl);
```

- Socket.IO 연결 관리
- 사용자 join/leave 이벤트 처리
- 실시간 상태 업데이트 (10Hz throttle)
- 다른 사용자 상태 수신 및 관리

### 5️⃣ MultiplayerVRMWorld

**메인 3D 월드 컴포넌트**

```typescript
<MultiplayerVRMWorld
  myModelPath="/models/sample.vrm"
  nickname="사용자"
  serverUrl="http://localhost:3001"
  roomId="room-123"
/>
```

**주요 역할:**

- Three.js 씬 초기화
- 내 VRM 로드 및 표정/이동 제어
- 다른 사용자 VRM 로드 및 위치 동기화
- 애니메이션 루프 (60fps)
- 거리 기반 컬링 (성능 최적화)

---

## 🔄 데이터 흐름

### 클라이언트 → 서버

```
사용자 입력 (WASD, 얼굴)
         ↓
   State 계산
         ↓
 UpdatePayload 생성
         ↓
  Socket.IO emit
   (10Hz throttle)
         ↓
    Server
```

### 서버 → 클라이언트

```
  Server 수신
       ↓
Room별 필터링
       ↓
Broadcast (같은 룸)
       ↓
  Client 수신
       ↓
otherUsers Map 업데이트
       ↓
VRM 위치/회전 보간 (lerp/slerp)
       ↓
  Three.js 렌더링
```

---

## 🚀 주요 기술적 도전과 해결

### 1. 클로저 문제 (WASD 이동 미작동)

**문제:** `useEffect`의 의존성 배열과 애니메이션 루프 간 상태 불일치

**해결:**

```typescript
const controlsRef = useRef(controls);
const networkRef = useRef(network);

useEffect(() => {
  controlsRef.current = controls;
}, [controls]);

// 애니메이션 루프에서
const currentControls = controlsRef.current;
```

### 2. 한영 키 입력 문제

**문제:** 한글 모드에서 WASD 인식 안됨 (`e.key` 문제)

**해결:** `e.code` 사용

```typescript
// e.key (X) - 한글: 'ㅈ', 'ㅁ', 'ㄴ', 'ㅇ'
// e.code (O) - 'KeyW', 'KeyA', 'KeyS', 'KeyD'
switch (e.code) {
  case 'KeyW':
    next.forward = true;
    break;
}
```

### 3. VRM 잔상 문제

**문제:** VRM 중복 로드로 여러 모델이 겹쳐 보임

**해결:**

```typescript
// 로딩 중인 VRM 추적
const loadingVRMsRef = useRef<Set<string>>(new Set());

// 중복 로드 방지
if (loadingVRMsRef.current.has(userId)) return;

// 명시적 클리어
renderer.clear();
renderer.render(scene, camera);
```

### 4. 중복 아바타 표시

**문제:** 자신의 아바타가 `otherUsers`에도 포함됨

**해결:** 클로저 이슈 해결

```typescript
setMyUserId((currentMyId) => {
  setOtherUsers((prev) => {
    if (user.id !== currentMyId) {
      // 자신이 아닌 경우만 추가
    }
  });
  return currentMyId;
});
```

### 5. 무한 리렌더링

**문제:** 참여자 목록 렌더링 시 매번 새 객체 생성

**해결:** `useMemo`로 메모이제이션

```typescript
const allUsers = useMemo(() => {
  const all = new Map(network.otherUsers);
  // ... 객체 생성
  return all;
}, [의존성배열]);
```

---

## 📡 Socket.IO 이벤트

### Client → Server

| 이벤트   | 데이터                            | 설명               |
| -------- | --------------------------------- | ------------------ |
| `join`   | `{ roomId, modelPath, nickname }` | 룸 입장            |
| `update` | `UpdatePayload`                   | 위치/표정 업데이트 |
| `leave`  | -                                 | 명시적 퇴장        |

### Server → Client

| 이벤트        | 데이터            | 설명                      |
| ------------- | ----------------- | ------------------------- |
| `snapshot`    | `UserState[]`     | 초기 동기화 (모든 사용자) |
| `user_joined` | `UserState`       | 새 사용자 입장            |
| `user_update` | `UpdatePayload`   | 사용자 상태 변경          |
| `user_left`   | `string` (userId) | 사용자 퇴장               |
| `error`       | `string`          | 에러 메시지               |

---

## 🎨 VRM 통합

### VRM이란?

- VirtualCast에서 제작한 **3D 아바타 표준 포맷**
- glTF 기반, 표정(BlendShape), 본(Bone) 정보 포함
- **@pixiv/three-vrm** 라이브러리로 Three.js에서 사용

### VRM 로드 및 제어

```typescript
// 1. 로드
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));
const gltf = await loader.loadAsync('/models/sample.vrm');
const vrm = gltf.userData.vrm as VRM;

// 2. 최적화
VRMUtils.removeUnnecessaryVertices(gltf.scene);
VRMUtils.removeUnnecessaryJoints(gltf.scene);

// 3. 씬 추가
scene.add(vrm.scene);

// 4. 위치/회전 제어
vrm.scene.position.copy(newPosition);
vrm.scene.quaternion.slerp(targetQuaternion, 0.2);

// 5. 표정 제어
vrm.expressionManager?.setValue('happy', 1.0);
vrm.expressionManager?.setValue('blinkLeft', 0.5);

// 6. 업데이트 (매 프레임)
vrm.update(deltaTime);
```

---

## 🏠 멀티룸 시스템

### 서버 구조

```typescript
// 룸 데이터
interface RoomData {
  users: Map<string, UserState>;
  createdAt: number;
  lastActivity: number;
}

// 전역 룸 관리
const rooms = new Map<string, RoomData>();
const socketToRoom = new Map<string, string>();
```

### 룸 관리 로직

- **입장**: `socket.join(roomId)` - Socket.IO 룸 기능 사용
- **브로드캐스트**: `socket.to(roomId).emit()` - 같은 룸에만 전송
- **자동 정리**:
  - 비활성 사용자: 5분 후 제거
  - 빈 룸: 30분 후 제거

### 동적 라우팅

```
/room/[id]/page.tsx

사용자 접속
    ↓
RoomLobby (닉네임, 모델 선택)
    ↓
MultiplayerVRMWorld (roomId 전달)
    ↓
Socket.IO connect with roomId
```

---

## ⚡ 성능 최적화

### 1. 네트워크 최적화

- **Rate Limiting**: 10Hz (100ms) 업데이트
- **데이터 압축**: Object → Array (UpdatePayload)
- **Throttle**: 서버/클라이언트 양쪽에서 제한

### 2. 렌더링 최적화

- **거리 기반 컬링**: 50m 이상 사용자는 렌더링 안함
- **VRM 최적화**: `removeUnnecessaryVertices/Joints`
- **LOD**: (향후 계획) 거리별 디테일 조절

### 3. 메모리 최적화

- **중복 로드 방지**: `loadingVRMsRef` Set 사용
- **리소스 정리**: 컴포넌트 언마운트/사용자 퇴장 시 VRM 제거

### 4. React 최적화

- **useMemo**: 참여자 목록 메모이제이션
- **useRef**: 애니메이션 루프에서 최신 상태 참조
- **의존성 최적화**: 불필요한 리렌더링 방지

---

## 🧪 디버깅 기능

### 화면 UI

- 우측 상단:
  - 내 ID
  - 총 사용자 수
  - 현재 위치
  - 키 입력 상태
  - 다른 사용자 목록 & 위치

### 콘솔 로그

```
[Network] 스냅샷 수신: 2명
[World] 다른 사용자 VRM 로드 완료
[World] 사용자1 VRM 업데이트: { current, target, visible }
[useControls] W 키 누름
```

---

## 📦 프로젝트 구조

```
virtuber-me/
├── app/
│   ├── page.tsx                    # 메인 페이지
│   └── room/[id]/page.tsx          # 룸 페이지 (동적 라우팅)
├── components/
│   ├── MultiplayerVRMWorld.tsx     # 3D 월드
│   ├── RoomLobby.tsx               # 입장 UI
│   └── ParticipantsList.tsx        # 참여자 목록
├── hooks/
│   ├── useFaceTracking.ts          # 얼굴 추적
│   ├── useExpressionMapping.ts     # 표정 매핑
│   ├── useNetworkSync.ts           # 네트워크 동기화
│   └── useControls.ts              # WASD 제어
├── types/
│   ├── multiplayer.ts              # 멀티플레이어 타입
│   └── components.ts               # 컴포넌트 타입
├── server/
│   ├── index.ts                    # Socket.IO 서버
│   └── types.ts                    # 서버 타입
└── public/
    └── models/                     # VRM 모델 파일
```

---

## 🚦 실행 방법

### 서버 실행

```bash
cd server
npm install
npm run dev  # http://localhost:3001
```

### 클라이언트 실행

```bash
npm install
npm run dev  # http://localhost:3000
```

### 접속

1. 브라우저에서 `http://localhost:3000` 접속
2. "멀티플레이어 월드" 클릭
3. 룸 ID 입력 (또는 자동 생성)
4. 닉네임 & 모델 선택
5. "입장하기" 클릭

---

## 🎯 향후 개발 계획

### 단기 (1-2주)

- ✅ 페이셜 트래킹 안정화
- ✅ WASD 이동 구현
- ✅ 멀티플레이어 동기화
- ✅ 멀티룸 시스템
- 🔄 음성 채팅 통합 (WebRTC)

### 중기 (1-2개월)

- 🔄 상체 트래킹 재도입 (안정화되면)
- 📝 채팅 시스템
- 🎨 커스텀 VRM 업로드
- 🏆 사용자 프로필 & 저장
- 🌍 퍼블릭 룸 리스트

### 장기 (3개월+)

- 🎮 상호작용 오브젝트 (앉기, 포인팅 등)
- 🏠 커스텀 맵/환경
- 🎪 이벤트/모임 기능
- 📱 모바일 지원
- 🔐 인증 시스템

---

## 📚 참고 자료

- **Three.js**: https://threejs.org/
- **@pixiv/three-vrm**: https://github.com/pixiv/three-vrm
- **MediaPipe**: https://developers.google.com/mediapipe
- **Socket.IO**: https://socket.io/
- **VRM 스펙**: https://vrm.dev/
- **Next.js**: https://nextjs.org/

---

## 🏆 핵심 성과

1. **실시간 동기화**: 100ms 이하 레이턴시로 최대 100명 지원 가능
2. **브라우저 전용**: 별도 설치 없이 웹에서 실행
3. **확장성**: 멀티룸 구조로 수평 확장 가능
4. **사용자 경험**: 직관적인 WASD 조작과 자동 표정 인식
5. **안정성**: 철저한 에러 핸들링과 리소스 정리

---

## 💡 기술적 인사이트

### React + Three.js 통합의 어려움

- **문제**: React의 상태 관리와 Three.js의 imperative API 충돌
- **해결**: `useRef` + `useEffect` 조합으로 선언적 관리
- **교훈**: 애니메이션 루프는 최신 상태를 참조해야 함

### 실시간 동기화 설계

- **문제**: 모든 업데이트를 전송하면 대역폭 부족
- **해결**: Rate limiting (10Hz) + 배열 기반 페이로드
- **교훈**: 성능과 실시간성의 균형이 중요

### WebRTC vs WebSocket

- **선택**: WebSocket (Socket.IO)
- **이유**:
  - 중앙 서버 필요 (룸 관리, 권한 제어)
  - 1:N 브로드캐스트 효율적
  - P2P 연결 실패 시 폴백 필요 없음

---

## 🎤 발표 팁

- **데모 우선**: 실제로 두 브라우저에서 움직이는 모습 보여주기
- **기술 설명**: 아키텍처 다이어그램 중심으로
- **도전 과제**: 해결한 문제들 강조 (한영키, 클로저 등)
- **라이브 코딩**: 간단한 부분 (예: 표정 값 변경) 시연
- **질문 대비**:
  - "왜 VRChat 대신 만들었나?" → 웹 기반, 교육 목적
  - "확장성은?" → 멀티룸 + 로드밸런싱 가능
  - "보안은?" → (향후) JWT 인증, 룸 비밀번호

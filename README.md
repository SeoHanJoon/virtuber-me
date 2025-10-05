# Virtuber Me

웹 기반 VTuber 플랫폼 - VRM 아바타 + 실시간 얼굴 추적 + 멀티플레이어(예정)

## 🚀 주요 기능

- **VRM 모델 뷰어**: 3D 아바타 확인 및 탐색
- **실시간 얼굴 추적**: 웹캠으로 아바타 실시간 조종
- **멀티플레이어**: VRChat처럼 다른 사람들과 소통 (개발 예정)

## 📦 기술 스택

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS 4
- **3D 렌더링**: Three.js + @pixiv/three-vrm
- **얼굴 추적**: MediaPipe Face Landmarker
- **코드 품질**: ESLint + Prettier + Husky
- **Node.js**: 22.20.0

## 📁 프로젝트 구조

\`\`\`
virtuber-me/
├── app/
│ ├── page.tsx # 메인 페이지
│ ├── vrm/ # VRM 뷰어
│ ├── face-tracking/ # 얼굴 추적
│ └── api/vrm-models/ # VRM 파일 목록 API
├── components/
│ ├── VRMViewer.tsx # VRM 뷰어 컴포넌트
│ └── FaceTrackingVRMViewer.tsx # 얼굴 추적 컴포넌트
└── public/models/ # VRM 파일 저장
\`\`\`

## 🛠️ 설치 및 실행

### 1. Node.js 버전 설정

\`\`\`bash
nvm use # .nvmrc 파일 사용 (Node 22.20.0)
\`\`\`

### 2. 의존성 설치

\`\`\`bash
npm install
\`\`\`

### 3. 개발 서버 실행

\`\`\`bash
npm run dev
\`\`\`

### 4. 브라우저에서 접속

\`\`\`
http://localhost:3000
\`\`\`

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

- **눈 깜빡임**: 좌/우 독립 추적
- **입 모양**: 입 벌림 정도 감지
- **머리 회전**: Yaw, Pitch, Roll 3축 추적

### 사용 팁

- 밝은 조명에서 사용
- 얼굴을 카메라 정면에 위치
- 과장된 표정으로 더 잘 인식

## 📜 스크립트

\`\`\`bash
npm run dev # 개발 서버 시작
npm run build # 프로덕션 빌드
npm run start # 프로덕션 서버 시작
npm run lint # ESLint 실행
npm run lint:fix # ESLint 자동 수정
npm run format # Prettier 포맷팅
\`\`\`

## 🔜 개발 예정 기능

- [ ] WebRTC 멀티플레이어
- [ ] 보이스 채팅
- [ ] 방 생성 및 입장
- [ ] 사용자 간 상호작용
- [ ] 화면 공유

## 📄 라이선스

MIT License

---

**Made with ❤️ for VTubers**

# VRM 멀티플레이어 서버

Socket.IO를 사용한 실시간 멀티플레이어 VRM 아바타 월드 서버

## 🚀 실행 방법

### 개발 모드

\`\`\`bash
npm install
npm run dev
\`\`\`

서버가 \`http://localhost:3001\`에서 실행됩니다.

### 프로덕션 빌드

\`\`\`bash
npm run build
npm start
\`\`\`

## 📡 API

### Socket.IO 이벤트

#### 클라이언트 → 서버

- **\`join\`**: 월드 접속
  \`\`\`typescript
  socket.emit('join', {
  modelPath: string,
  nickname?: string
  });
  \`\`\`

- **\`update\`**: 상태 업데이트
  \`\`\`typescript
  socket.emit('update', {
  id: string,
  pos: [number, number, number],
  rot: [number, number, number, number],
  expr: string,
  blinkL: number,
  blinkR: number,
  mood?: string
  });
  \`\`\`

- **\`leave\`**: 명시적 퇴장
  \`\`\`typescript
  socket.emit('leave');
  \`\`\`

#### 서버 → 클라이언트

- **\`snapshot\`**: 초기 사용자 목록
- **\`user_joined\`**: 새 사용자 접속
- **\`user_update\`**: 사용자 상태 업데이트
- **\`user_left\`**: 사용자 퇴장
- **\`error\`**: 에러 메시지

### HTTP 엔드포인트

- **GET \`/health\`**: 서버 상태 체크
  \`\`\`json
  {
  "status": "ok",
  "users": 5,
  "timestamp": "2025-10-05T00:00:00.000Z"
  }
  \`\`\`

## ⚙️ 설정

환경 변수 (\`.env\` 파일):

\`\`\`env
PORT=3001
\`\`\`

## 🔒 보안

- Rate limiting: 각 소켓당 10Hz (100ms) 제한
- 자동 세션 정리: 5분 이상 비활성 제거
- CORS: 기본적으로 모든 origin 허용 (프로덕션에서는 제한 필요)

## 📊 성능

- **최대 동시 접속**: ~100명 (테스트 필요)
- **메모리 사용량**: ~50MB (기본) + ~1MB per user
- **네트워크 대역폭**: ~1KB/s per user

## 🐛 디버깅

서버 로그:

\`\`\`
[연결] 새 클라이언트 연결: socket-id
[접속] 사용자\_abcd (user-uuid) - 총 5명
[퇴장] 사용자\_abcd (user-uuid) - 남은 인원: 4명
\`\`\`

## 📝 주의사항

⚠️ **개인정보 보호**: 이 서버는 **이미지나 비디오를 전송하지 않으며**, 오직 표정 데이터(블렌드셰이프 값)만 전송합니다.

⚠️ **프로덕션 배포**: CORS 설정을 특정 도메인으로 제한하세요.

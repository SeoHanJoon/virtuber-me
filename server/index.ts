/**
 * VRM 멀티플레이어 월드 서버
 *
 * Socket.IO를 사용하여 최대 100명의 사용자가 실시간으로
 * 위치, 회전, 표정 데이터를 동기화합니다.
 *
 * 주의: 이 서버는 얼굴 이미지나 비디오를 전송하지 않으며,
 * 오직 표정 데이터(블렌드셰이프 값)만 전송합니다.
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  UserState,
  UpdatePayload,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../types/multiplayer';

// Express 앱 생성
const app = express();
app.use(cors());
app.use(express.json());

// HTTP 서버 생성
const httpServer = createServer(app);

// Socket.IO 서버 생성
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*', // 개발 환경용 - 프로덕션에서는 특정 도메인으로 제한
    methods: ['GET', 'POST'],
  },
  // 연결 설정
  pingTimeout: 60000,
  pingInterval: 25000,
});

// 사용자 상태 저장소
const users = new Map<string, UserState>();

// Rate limiting: 각 소켓당 마지막 업데이트 시간 추적
const lastUpdateTime = new Map<string, number>();
const UPDATE_RATE_LIMIT = 100; // 최소 100ms 간격 (10Hz)

/**
 * 클라이언트 연결 처리
 */
io.on(
  'connection',
  (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`[연결] 새 클라이언트 연결: ${socket.id}`);

    let userId: string | null = null;

    /**
     * 월드 접속 처리
     */
    socket.on('join', (data) => {
      try {
        // UUID 생성
        userId = uuidv4();

        // 초기 사용자 상태 생성
        const newUser: UserState = {
          id: userId,
          position: { x: 0, y: 0, z: 0 }, // 스폰 지점
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          expression: {
            current: 'neutral',
            blinkLeft: 0,
            blinkRight: 0,
            mood: 'neutral',
          },
          modelPath: data.modelPath,
          nickname: data.nickname || `사용자_${userId.slice(0, 4)}`,
          timestamp: Date.now(),
        };

        // 사용자 저장
        users.set(userId, newUser);

        console.log(
          `[접속] ${newUser.nickname} (${userId}) - 총 ${users.size}명`
        );

        // 1. 새 사용자에게 현재 월드 상태 전송 (스냅샷)
        socket.emit('snapshot', Array.from(users.values()));

        // 2. 다른 사용자들에게 새 사용자 입장 알림
        socket.broadcast.emit('user_joined', newUser);
      } catch (error) {
        console.error('[에러] join 처리 중 오류:', error);
        socket.emit('error', '접속 처리 중 오류가 발생했습니다.');
      }
    });

    /**
     * 사용자 상태 업데이트 처리
     */
    socket.on('update', (payload: UpdatePayload) => {
      if (!userId) {
        socket.emit('error', '먼저 join 이벤트를 보내주세요.');
        return;
      }

      try {
        // Rate limiting 체크
        const now = Date.now();
        const lastUpdate = lastUpdateTime.get(socket.id) || 0;

        if (now - lastUpdate < UPDATE_RATE_LIMIT) {
          // 너무 빠른 업데이트는 무시
          return;
        }

        lastUpdateTime.set(socket.id, now);

        // 사용자 상태 업데이트
        const user = users.get(userId);
        if (user) {
          user.position = {
            x: payload.pos[0],
            y: payload.pos[1],
            z: payload.pos[2],
          };
          user.rotation = {
            x: payload.rot[0],
            y: payload.rot[1],
            z: payload.rot[2],
            w: payload.rot[3],
          };
          user.expression = {
            current: payload.expr,
            blinkLeft: payload.blinkL,
            blinkRight: payload.blinkR,
            mood: payload.mood,
          };
          user.timestamp = now;

          // 다른 모든 사용자에게 브로드캐스트
          socket.broadcast.emit('user_update', payload);
        }
      } catch (error) {
        console.error('[에러] update 처리 중 오류:', error);
      }
    });

    /**
     * 명시적 퇴장 처리
     */
    socket.on('leave', () => {
      handleDisconnect();
    });

    /**
     * 연결 끊김 처리
     */
    socket.on('disconnect', () => {
      handleDisconnect();
    });

    /**
     * 퇴장/연결 끊김 처리 헬퍼
     */
    function handleDisconnect() {
      if (userId) {
        const user = users.get(userId);
        if (user) {
          console.log(
            `[퇴장] ${user.nickname} (${userId}) - 남은 인원: ${users.size - 1}명`
          );

          // 사용자 제거
          users.delete(userId);
          lastUpdateTime.delete(socket.id);

          // 다른 사용자들에게 퇴장 알림
          socket.broadcast.emit('user_left', userId);
        }
      }
      console.log(`[연결 끊김] ${socket.id}`);
    }
  }
);

/**
 * 헬스 체크 엔드포인트
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    users: users.size,
    timestamp: new Date().toISOString(),
  });
});

/**
 * 서버 시작
 */
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 VRM 멀티플레이어 서버 시작`);
  console.log(`📡 포트: ${PORT}`);
  console.log(`🔒 주의: 이 서버는 표정 데이터만 전송하며,`);
  console.log(`   이미지나 비디오는 전송하지 않습니다.`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

/**
 * 주기적인 정리 작업 (5분마다)
 * 오래된 연결이나 좀비 세션 제거
 */
setInterval(
  () => {
    const now = Date.now();
    const TIMEOUT = 5 * 60 * 1000; // 5분

    users.forEach((user, id) => {
      if (now - user.timestamp > TIMEOUT) {
        console.log(`[타임아웃] ${user.nickname} (${id}) - 비활성 세션 제거`);
        users.delete(id);
        io.emit('user_left', id);
      }
    });
  },
  5 * 60 * 1000
);

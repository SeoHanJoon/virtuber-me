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
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
  // 연결 설정
  pingTimeout: 60000,
  pingInterval: 25000,
});

// 룸별 사용자 관리
interface RoomData {
  users: Map<string, UserState>;
  createdAt: number;
  lastActivity: number;
}

const rooms = new Map<string, RoomData>();
const socketToRoom = new Map<string, string>(); // socket.id -> roomId
const socketToUser = new Map<string, string>(); // socket.id -> userId

// Rate limiting
const lastUpdateTime = new Map<string, number>();
const UPDATE_RATE_LIMIT = 100; // 10Hz

/**
 * 클라이언트 연결 처리
 */
io.on(
  'connection',
  (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`[연결] 새 클라이언트 연결: ${socket.id}`);

    let userId: string | null = null;

    /**
     * 룸 접속 처리
     */
    socket.on('join', (data) => {
      try {
        // 입력 유효성 검증
        if (
          !data ||
          typeof data.modelPath !== 'string' ||
          data.modelPath.length > 200
        ) {
          socket.emit('error', 'Invalid join payload');
          return;
        }
        if (
          data.nickname &&
          (typeof data.nickname !== 'string' || data.nickname.length > 50)
        ) {
          socket.emit('error', 'Invalid nickname');
          return;
        }

        const roomId = data.roomId || 'default';
        userId = uuidv4();

        // 룸이 없으면 생성
        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            users: new Map(),
            createdAt: Date.now(),
            lastActivity: Date.now(),
          });
          console.log(`[룸 생성] ${roomId}`);
        }

        const room = rooms.get(roomId)!;
        room.lastActivity = Date.now();

        // 스폰 지점 랜덤 배치 (같은 위치에 겹치지 않도록)
        const spawnRadius = 3;
        const angle = Math.random() * Math.PI * 2;
        const spawnX = Math.cos(angle) * spawnRadius;
        const spawnZ = Math.sin(angle) * spawnRadius;

        // 사용자 상태 생성
        const newUser: UserState = {
          id: userId,
          position: { x: spawnX, y: 0, z: spawnZ },
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

        // 룸에 사용자 추가
        room.users.set(userId, newUser);
        socketToRoom.set(socket.id, roomId);
        socketToUser.set(socket.id, userId);

        // 소켓을 룸에 join
        socket.join(roomId);

        console.log(
          `[접속] ${newUser.nickname} → 룸 "${roomId}" (총 ${room.users.size}명)`
        );

        // 1. 새 사용자에게 현재 룸 상태 전송
        socket.emit('snapshot', Array.from(room.users.values()));

        // 2. 같은 룸의 다른 사용자들에게 입장 알림
        socket.to(roomId).emit('user_joined', newUser);
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

      // 입력 유효성 검증
      if (
        !payload ||
        !Array.isArray(payload.pos) ||
        payload.pos.length !== 3 ||
        !payload.pos.every((n) => typeof n === 'number' && isFinite(n))
      ) {
        return;
      }

      try {
        const now = Date.now();
        const lastUpdate = lastUpdateTime.get(socket.id) || 0;

        if (now - lastUpdate < UPDATE_RATE_LIMIT) {
          return;
        }

        lastUpdateTime.set(socket.id, now);

        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        const user = room.users.get(userId);
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
          room.lastActivity = now;

          // 같은 룸의 다른 사용자들에게만 브로드캐스트
          socket.to(roomId).emit('user_update', payload);
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
        const roomId = socketToRoom.get(socket.id);
        if (roomId) {
          const room = rooms.get(roomId);
          if (room) {
            const user = room.users.get(userId);
            if (user) {
              console.log(
                `[퇴장] ${user.nickname} ← 룸 "${roomId}" (남은 ${room.users.size - 1}명)`
              );

              // 사용자 제거
              room.users.delete(userId);
              room.lastActivity = Date.now();

              // 같은 룸의 다른 사용자들에게 퇴장 알림
              socket.to(roomId).emit('user_left', userId);

              // 룸이 비었으면 5분 후 삭제 (타임아웃에서 처리)
            }
          }
          socketToRoom.delete(socket.id);
        }
        socketToUser.delete(socket.id);
        lastUpdateTime.delete(socket.id);
      }
      console.log(`[연결 끊김] ${socket.id}`);
    }
  }
);

/**
 * 헬스 체크 엔드포인트
 */
app.get('/health', (req, res) => {
  const totalUsers = Array.from(rooms.values()).reduce(
    (sum, room) => sum + room.users.size,
    0
  );
  res.json({
    status: 'ok',
    rooms: rooms.size,
    totalUsers,
    timestamp: new Date().toISOString(),
  });
});

/**
 * 룸 목록 조회
 */
app.get('/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([id, data]) => ({
    id,
    userCount: data.users.size,
    createdAt: new Date(data.createdAt).toISOString(),
    lastActivity: new Date(data.lastActivity).toISOString(),
  }));
  res.json(roomList);
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
 */
setInterval(
  () => {
    const now = Date.now();
    const USER_TIMEOUT = 5 * 60 * 1000; // 5분
    const EMPTY_ROOM_TIMEOUT = 30 * 60 * 1000; // 30분

    rooms.forEach((room, roomId) => {
      // 비활성 사용자 제거
      room.users.forEach((user, userId) => {
        if (now - user.timestamp > USER_TIMEOUT) {
          console.log(
            `[타임아웃] ${user.nickname} (룸: ${roomId}) - 비활성 세션 제거`
          );
          room.users.delete(userId);
          io.to(roomId).emit('user_left', userId);
        }
      });

      // 빈 룸 제거 (30분 이상 비활성)
      if (
        room.users.size === 0 &&
        now - room.lastActivity > EMPTY_ROOM_TIMEOUT
      ) {
        console.log(`[룸 삭제] "${roomId}" - 비활성 빈 룸 제거`);
        rooms.delete(roomId);
      }
    });
  },
  5 * 60 * 1000
);

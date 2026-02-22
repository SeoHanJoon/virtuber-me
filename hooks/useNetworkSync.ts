/**
 * Socket.IO를 사용한 네트워크 동기화 훅
 *
 * 서버와 실시간으로 사용자 위치, 회전, 표정을 동기화합니다.
 * 10Hz (100ms) 주기로 업데이트를 전송하며, 다른 사용자들의 상태를 수신합니다.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  UserState,
  UpdatePayload,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../server/types';
import * as THREE from 'three';

/**
 * 로컬 플레이어 상태
 */
export interface LocalPlayerState {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  expression: string;
  blinkLeft: number;
  blinkRight: number;
  mood?: 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed';
}

/**
 * 훅 반환 타입
 */
export interface UseNetworkSyncReturn {
  isConnected: boolean;
  myUserId: string | null;
  otherUsers: Map<string, UserState>;
  connect: (modelPath: string, nickname?: string, roomId?: string) => void;
  disconnect: () => void;
  updateMyState: (state: LocalPlayerState) => void;
  error: string | null;
}

/**
 * 네트워크 동기화 훅
 *
 * @param serverUrl - Socket.IO 서버 URL (기본값: http://localhost:3001)
 */
export function useNetworkSync(
  serverUrl: string = 'http://localhost:3001'
): UseNetworkSyncReturn {
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const UPDATE_INTERVAL = 100; // 10Hz (100ms)

  const [isConnected, setIsConnected] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [otherUsers, setOtherUsers] = useState<Map<string, UserState>>(
    new Map()
  );
  const [error, setError] = useState<string | null>(null);

  /**
   * 서버에 연결
   */
  const connect = useCallback(
    (modelPath: string, nickname?: string, roomId?: string) => {
      if (socketRef.current) {
        console.warn('[Network] 이미 연결되어 있습니다.');
        return;
      }

      console.log(
        '[Network] 서버 연결 중:',
        serverUrl,
        '룸:',
        roomId || 'default'
      );

      const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
        serverUrl,
        {
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 10,
        }
      );

      socketRef.current = socket;

      // 연결 성공
      socket.on('connect', () => {
        console.log('[Network] 연결 성공');
        setIsConnected(true);
        setError(null);

        // 룸 접속
        socket.emit('join', { roomId, modelPath, nickname });
      });

      // 연결 실패
      socket.on('connect_error', (err) => {
        console.error('[Network] 연결 오류:', err);
        setError(`서버 연결 실패: ${err.message}`);
        setIsConnected(false);
      });

      // 연결 끊김
      socket.on('disconnect', (reason) => {
        console.log('[Network] 연결 끊김:', reason);
        setIsConnected(false);
        setMyUserId(null);
      });

      // 초기 스냅샷 수신 (모든 사용자 목록)
      socket.on('snapshot', (users: UserState[]) => {
        console.log('[Network] 스냅샷 수신:', users.length, '명');

        // 마지막 사용자가 자신 (방금 join한 사용자)
        if (users.length > 0) {
          const myId = users[users.length - 1].id;
          setMyUserId(myId);

          console.log('[Network] 내 ID:', myId);

          // 자신을 제외한 다른 사용자들만 추가
          const usersMap = new Map<string, UserState>();
          users.forEach((user) => {
            if (user.id !== myId) {
              usersMap.set(user.id, user);
              console.log(
                '[Network] 다른 사용자 추가:',
                user.nickname,
                user.id
              );
            }
          });

          setOtherUsers(usersMap);
          console.log('[Network] 다른 사용자 수:', usersMap.size);
        }
      });

      // 새 사용자 접속
      socket.on('user_joined', (user: UserState) => {
        console.log('[Network] 사용자 접속:', user.nickname, user.id);

        setMyUserId((currentMyId) => {
          setOtherUsers((prev) => {
            // 자신이 아닌 경우에만 추가
            if (user.id !== currentMyId) {
              const next = new Map(prev);
              next.set(user.id, user);
              console.log('[Network] 사용자 추가됨:', user.nickname);
              return next;
            }
            console.log('[Network] 자신이므로 추가 안함:', user.nickname);
            return prev;
          });
          return currentMyId;
        });
      });

      // 사용자 상태 업데이트
      socket.on('user_update', (payload: UpdatePayload) => {
        setMyUserId((currentMyId) => {
          // 자신의 업데이트는 무시
          if (payload.id === currentMyId) {
            return currentMyId;
          }

          setOtherUsers((prev) => {
            const user = prev.get(payload.id);
            if (!user) {
              console.warn(
                '[Network] 업데이트할 사용자를 찾을 수 없음:',
                payload.id
              );
              return prev;
            }

            const next = new Map(prev);
            next.set(payload.id, {
              ...user,
              position: {
                x: payload.pos[0],
                y: payload.pos[1],
                z: payload.pos[2],
              },
              rotation: {
                x: payload.rot[0],
                y: payload.rot[1],
                z: payload.rot[2],
                w: payload.rot[3],
              },
              expression: {
                current: payload.expr,
                blinkLeft: payload.blinkL,
                blinkRight: payload.blinkR,
                mood: payload.mood,
              },
              timestamp: Date.now(),
            });

            return next;
          });

          return currentMyId;
        });
      });

      // 사용자 퇴장
      socket.on('user_left', (userId: string) => {
        console.log('[Network] 사용자 퇴장:', userId);

        setOtherUsers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      });

      // 에러
      socket.on('error', (message: string) => {
        console.error('[Network] 서버 에러:', message);
        setError(message);
      });
    },
    [serverUrl, myUserId]
  );

  /**
   * 연결 해제
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[Network] 연결 해제');
      socketRef.current.emit('leave');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setMyUserId(null);
    setOtherUsers(new Map());
  }, []);

  /**
   * 내 상태 업데이트 전송 (10Hz throttle)
   */
  const updateMyState = useCallback(
    (state: LocalPlayerState) => {
      const socket = socketRef.current;
      if (!socket || !isConnected || !myUserId) return;

      // Rate limiting
      const now = Date.now();
      if (now - lastUpdateTimeRef.current < UPDATE_INTERVAL) {
        return;
      }

      lastUpdateTimeRef.current = now;

      // 페이로드 생성
      const payload: UpdatePayload = {
        id: myUserId,
        pos: [state.position.x, state.position.y, state.position.z],
        rot: [
          state.rotation.x,
          state.rotation.y,
          state.rotation.z,
          state.rotation.w,
        ],
        expr: state.expression,
        blinkL: state.blinkLeft,
        blinkR: state.blinkRight,
        mood: state.mood,
      };

      // 서버로 전송
      socket.emit('update', payload);
    },
    [isConnected, myUserId]
  );

  /**
   * 정리
   */
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    myUserId,
    otherUsers,
    connect,
    disconnect,
    updateMyState,
    error,
  };
}

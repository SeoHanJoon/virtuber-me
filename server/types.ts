/**
 * 멀티플레이어 VRM 월드의 타입 정의
 */

/**
 * 사용자 위치 (3D 공간)
 */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * 사용자 회전 (쿼터니언)
 */
export interface Rotation {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * VRM 표정 상태
 */
export interface ExpressionState {
  // 현재 활성 표정
  current: string; // 'neutral' | 'aa' | 'ih' | 'ou' | 'ee' | 'oh' | 'blink' | 'happy' | 'angry' | 'sad' | 'relaxed'

  // 눈 깜빡임
  blinkLeft: number; // 0~1
  blinkRight: number; // 0~1

  // 시선 방향
  lookUp?: number;
  lookDown?: number;
  lookLeft?: number;
  lookRight?: number;

  // 감정 상태 (옵션)
  mood?: 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed';
}

/**
 * 사용자 상태 (전체)
 */
export interface UserState {
  id: string; // UUID
  position: Position;
  rotation: Rotation;
  expression: ExpressionState;
  modelPath: string; // VRM 모델 경로
  nickname?: string; // 닉네임 (옵션)
  timestamp: number; // 마지막 업데이트 시간
}

/**
 * 네트워크 업데이트 페이로드 (최적화된 형태)
 */
export interface UpdatePayload {
  id: string;
  pos: [number, number, number]; // [x, y, z]
  rot: [number, number, number, number]; // [x, y, z, w]
  expr: string; // 현재 표정
  blinkL: number; // 왼쪽 눈 깜빡임
  blinkR: number; // 오른쪽 눈 깜빡임
  mood?: 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed'; // 감정 상태
}

/**
 * 서버 -> 클라이언트 이벤트
 */
export interface ServerToClientEvents {
  // 새 사용자 접속
  user_joined: (user: UserState) => void;

  // 사용자 상태 업데이트
  user_update: (payload: UpdatePayload) => void;

  // 사용자 퇴장
  user_left: (userId: string) => void;

  // 현재 접속한 모든 사용자 목록 (초기 동기화)
  snapshot: (users: UserState[]) => void;

  // 에러 메시지
  error: (message: string) => void;
}

/**
 * 클라이언트 -> 서버 이벤트
 */
export interface ClientToServerEvents {
  // 월드 접속
  join: (data: { modelPath: string; nickname?: string }) => void;

  // 상태 업데이트
  update: (payload: UpdatePayload) => void;

  // 명시적 퇴장 (옵션)
  leave: () => void;
}

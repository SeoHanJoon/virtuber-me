import * as THREE from 'three';

/**
 * MoveNet 키포인트 (17개)
 * x, y: 0~1 정규화된 좌표
 * z: 깊이 정보 (Y 기반 근사값, MoveNet은 z를 제공하지 않음)
 * score: 신뢰도 (0~1)
 */
export interface Keypoint {
  x: number;
  y: number;
  z?: number; // Pseudo-3D z (Y 기반 근사)
  score?: number;
  name?: string;
}

/**
 * 상체 트래킹 상태
 * 각 본의 회전값 (Quaternion)
 */
export interface BodyTrackingState {
  leftShoulder: THREE.Quaternion;
  rightShoulder: THREE.Quaternion;
  leftUpperArm: THREE.Quaternion;
  rightUpperArm: THREE.Quaternion;
  leftLowerArm: THREE.Quaternion;
  rightLowerArm: THREE.Quaternion;
  spine: THREE.Quaternion;
  chest: THREE.Quaternion;
  head: THREE.Quaternion;
  neck: THREE.Quaternion;
}

/**
 * useBodyTracking 훅 옵션
 */
export interface BodyTrackingOptions {
  depthScale?: number; // z축 깊이 스케일 (단안 카메라 보정)
  smoothingFactor?: number; // EMA 스무딩 강도 (0~1)
  maxFPS?: number; // 최대 프레임 속도
  minConfidence?: number; // 최소 키포인트 신뢰도
  slerpAmount?: number; // Quaternion slerp 보간 강도 (0~1)
}

/**
 * useBodyTracking 훅 반환 타입
 */
export interface UseBodyTrackingReturn {
  bodyState: BodyTrackingState | null;
  isBodyTrackingReady: boolean;
  startBodyTracking: () => Promise<void>;
  stopBodyTracking: () => void;
  error: string | null;
  keypoints: Keypoint[] | null; // 디버깅용 키포인트
}

/**
 * VRM 모델 로드 시 저장할 기본 오프셋
 * T-pose 기준 각 본의 초기 회전값
 */
export interface BoneBaseOffsets {
  leftUpperArm: THREE.Quaternion;
  rightUpperArm: THREE.Quaternion;
  leftLowerArm: THREE.Quaternion;
  rightLowerArm: THREE.Quaternion;
  spine: THREE.Quaternion;
  chest: THREE.Quaternion;
  head: THREE.Quaternion;
  neck: THREE.Quaternion;
}

import * as THREE from 'three';
import type { Keypoint } from '@/types/bodyTracking';

/** MoveNet COCO 키포인트 이름 매핑 (17개) */
export const MOVENET_KEYPOINT_NAMES = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
];

/** EMA 스무딩을 위한 헬퍼 함수 */
export function smoothPoint3D(
  prev: THREE.Vector3,
  curr: THREE.Vector3,
  alpha: number
): THREE.Vector3 {
  return new THREE.Vector3(
    prev.x + alpha * (curr.x - prev.x),
    prev.y + alpha * (curr.y - prev.y),
    prev.z + alpha * (curr.z - prev.z)
  );
}

export interface RawKeypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
}

export interface ProcessKeypointsOptions {
  depthScale: number;
  smoothingFactor: number;
  minConfidence: number;
}

/**
 * 2D 키포인트를 Pseudo-3D로 변환하고 EMA 스무딩 적용
 */
export function processKeypoints(
  rawKeypoints: RawKeypoint[],
  videoWidth: number,
  videoHeight: number,
  options: ProcessKeypointsOptions,
  smoothedKeypoints: Map<string, THREE.Vector3>
): { processed: Keypoint[]; newSmoothed: Map<string, THREE.Vector3> } {
  const { depthScale, smoothingFactor, minConfidence } = options;
  const processed: Keypoint[] = [];
  const newSmoothed = new Map<string, THREE.Vector3>();

  rawKeypoints.forEach((kp, index) => {
    // MoveNet은 name이 없으므로 인덱스로 이름 할당
    const keypointName =
      kp.name || MOVENET_KEYPOINT_NAMES[index] || `keypoint_${index}`;

    if (kp.score === undefined || kp.score < minConfidence) {
      return;
    }

    // MoveNet은 픽셀 좌표를 반환하므로 먼저 0~1로 정규화
    const normalizedX_0to1 = kp.x / videoWidth;
    const normalizedY_0to1 = kp.y / videoHeight;

    // 중심을 (0,0)으로 이동: 0~1 → -0.5~0.5
    // Y축은 Three.js와 일치하도록 반전 (위가 양수)
    const normalizedX = normalizedX_0to1 - 0.5;
    const normalizedY = 0.5 - normalizedY_0to1;

    // Z축: MoveNet은 z값을 제공하지 않으므로 Y 기반 근사값 사용
    let normalizedZ: number;
    if (kp.z !== undefined) {
      normalizedZ = -kp.z * depthScale;
    } else {
      // MoveNet Fallback: Y 기반 깊이 근사 (위로 갈수록 앞에 있다고 가정)
      normalizedZ = -(normalizedY_0to1 - 0.5) * depthScale;
    }

    const currentPoint = new THREE.Vector3(
      normalizedX,
      normalizedY,
      normalizedZ
    );

    // EMA 스무딩 적용
    const prevSmoothed = smoothedKeypoints.get(keypointName);
    const smoothedPoint = prevSmoothed
      ? smoothPoint3D(prevSmoothed, currentPoint, smoothingFactor)
      : currentPoint;

    newSmoothed.set(keypointName, smoothedPoint);

    processed.push({
      x: smoothedPoint.x,
      y: smoothedPoint.y,
      z: smoothedPoint.z,
      score: kp.score,
      name: keypointName,
    });
  });

  return { processed, newSmoothed };
}

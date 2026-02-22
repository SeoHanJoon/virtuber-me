import type { FaceLandmarks } from '@/types/tracking';

/** 값을 범위 내로 제한 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** 두 점 사이의 유클리드 거리 계산 */
export function calculateDistance(
  p1: { x: number; y: number; z?: number },
  p2: { x: number; y: number; z?: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 원시 랜드마크를 처리하여 VRM에 매핑 가능한 데이터로 변환
 */
export function processFaceLandmarks(
  rawLandmarks: Array<{ x: number; y: number; z: number }>
): FaceLandmarks {
  // 주요 포인트 추출
  const noseTip = rawLandmarks[1];
  const leftCheek = rawLandmarks[234];
  const rightCheek = rawLandmarks[454];
  const leftEyeTop = rawLandmarks[159];
  const leftEyeBottom = rawLandmarks[145];
  const rightEyeTop = rawLandmarks[386];
  const rightEyeBottom = rawLandmarks[374];
  const mouthTop = rawLandmarks[13];
  const mouthBottom = rawLandmarks[14];
  const mouthLeft = rawLandmarks[61];
  const mouthRight = rawLandmarks[291];
  const leftEyebrowTop = rawLandmarks[70];
  const leftEyebrowBottom = rawLandmarks[27];
  const rightEyebrowTop = rawLandmarks[300];
  const rightEyebrowBottom = rawLandmarks[27];

  // 머리 회전 계산
  const yaw =
    Math.atan2(rightCheek.x - leftCheek.x, rightCheek.z - leftCheek.z) -
    Math.PI / 2;

  const pitch = (noseTip.y - 0.5) * 1.5;

  const roll =
    Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x) * 0.5;

  // 눈 열림 정도 계산
  const leftEyeOpen = calculateDistance(leftEyeTop, leftEyeBottom) / 0.02;
  const rightEyeOpen = calculateDistance(rightEyeTop, rightEyeBottom) / 0.02;

  // 입 벌림 정도 계산
  const mouthOpenness = calculateDistance(mouthTop, mouthBottom) / 0.05;
  const mouthWidth = calculateDistance(mouthLeft, mouthRight) / 0.08;

  // 눈썹 올림 정도 계산
  const leftEyebrowRaise = Math.max(
    0,
    (leftEyebrowTop.y - leftEyebrowBottom.y) * 5
  );
  const rightEyebrowRaise = Math.max(
    0,
    (rightEyebrowTop.y - rightEyebrowBottom.y) * 5
  );

  return {
    landmarks: rawLandmarks,
    headRotation: {
      yaw: clamp(yaw, -Math.PI / 2, Math.PI / 2),
      pitch: clamp(pitch, -Math.PI / 2, Math.PI / 2),
      roll: clamp(roll, -Math.PI / 4, Math.PI / 4),
    },
    eyes: {
      leftOpen: clamp(leftEyeOpen, 0, 1),
      rightOpen: clamp(rightEyeOpen, 0, 1),
    },
    mouth: {
      openness: clamp(mouthOpenness, 0, 1),
      width: clamp(mouthWidth, 0, 1),
    },
    eyebrows: {
      leftRaise: clamp(leftEyebrowRaise, 0, 1),
      rightRaise: clamp(rightEyebrowRaise, 0, 1),
    },
    timestamp: Date.now(),
  };
}

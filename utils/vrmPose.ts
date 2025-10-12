import { VRM } from '@pixiv/three-vrm';
import { globalCalibrationManager } from './vrmCalibration';

/**
 * VRM 기본 자세 (Idle Pose) 설정
 *
 * VRM 모델은 기본적으로 T-pose로 로드됩니다 (팔을 양옆으로 벌린 상태).
 * 이를 자연스러운 idle pose(팔을 내린 자세)로 초기화합니다.
 *
 * v2: Calibration 시스템 통합
 * - 모델별 팔 회전 방향 자동 감지
 * - 초기 Z축 회전 부호에 따라 적절한 방향 적용
 */

/**
 * VRM 모델에 자연스러운 idle pose 적용
 *
 * @param vrm - VRM 모델 인스턴스
 * @param modelId - 모델 ID (calibration 프로파일 참조용, 선택)
 */
export function applyIdlePose(vrm: VRM, modelId?: string): void {
  if (!vrm.humanoid) {
    console.warn(
      '[VRM Pose] Humanoid가 없어서 기본 자세를 적용할 수 없습니다.'
    );
    return;
  }

  // Calibration 프로파일에서 팔 회전 방향 가져오기
  let leftDirection = -1; // 기본값
  let rightDirection = 1; // 기본값

  if (modelId) {
    const profile = globalCalibrationManager.getProfile(modelId);
    if (profile) {
      leftDirection = profile.armRotationDirection.left;
      rightDirection = profile.armRotationDirection.right;
      console.log(
        `🔧 [VRM Pose] Calibration 적용: Left=${leftDirection > 0 ? '+' : '-'}, Right=${rightDirection > 0 ? '+' : '-'}`
      );
    }
  }

  // 팔을 자연스럽게 내린 자세
  // VRM T-pose: 팔을 옆으로 벌림 (upperArm.z = 0)
  // Idle pose: 팔을 아래로 내림 (upperArm.z = 약 1.4 radian, 방향은 모델에 따라 다름)

  const idleAngle = 1.4; // 약 80도

  // 왼팔 상완 (Left Upper Arm)
  const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
  if (leftUpperArm) {
    // Z축 회전: 팔을 아래로 내림 (방향은 calibration에서 감지)
    leftUpperArm.rotation.z = idleAngle * leftDirection;
    leftUpperArm.rotation.x = 0.0;
    leftUpperArm.rotation.y = 0.0;
  }

  // 왼팔 전완 (Left Lower Arm)
  const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
  if (leftLowerArm) {
    // Z축 회전: 팔꿈치를 약간 굽힘 (자연스러운 자세)
    leftLowerArm.rotation.z = 0.1; // 약 6도
    leftLowerArm.rotation.x = 0.0;
    leftLowerArm.rotation.y = 0.0;
  }

  // 오른팔 상완 (Right Upper Arm)
  const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
  if (rightUpperArm) {
    // Z축 회전: 팔을 아래로 내림 (방향은 calibration에서 감지)
    rightUpperArm.rotation.z = idleAngle * rightDirection;
    rightUpperArm.rotation.x = 0.0;
    rightUpperArm.rotation.y = 0.0;
  }

  // 오른팔 전완 (Right Lower Arm)
  const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
  if (rightLowerArm) {
    // Z축 회전: 팔꿈치를 약간 굽힘 (자연스러운 자세)
    rightLowerArm.rotation.z = -0.1; // 약 -6도
    rightLowerArm.rotation.x = 0.0;
    rightLowerArm.rotation.y = 0.0;
  }

  console.log('✅ [VRM Pose] 기본 자세(Idle Pose) 적용 완료: 팔을 내린 상태');
}

/**
 * VRM 모델을 기본 자세로 리셋
 *
 * 상체 추적을 끄거나 리셋할 때 사용합니다.
 *
 * @param vrm - VRM 모델 인스턴스
 * @param modelId - 모델 ID (calibration 프로파일 참조용, 선택)
 */
export function resetToIdlePose(vrm: VRM, modelId?: string): void {
  if (!vrm.humanoid) return;

  // 척추 및 가슴 초기화
  const spine = vrm.humanoid.getNormalizedBoneNode('spine');
  if (spine) {
    spine.rotation.x = 0;
    spine.rotation.y = 0;
    spine.rotation.z = 0;
  }

  const chest = vrm.humanoid.getNormalizedBoneNode('chest');
  if (chest) {
    chest.rotation.x = 0;
    chest.rotation.y = 0;
    chest.rotation.z = 0;
  }

  // 팔을 기본 자세로 복귀 (modelId 전달)
  applyIdlePose(vrm, modelId);

  console.log('✅ [VRM Pose] 기본 자세로 리셋 완료');
}

/**
 * 기본 자세의 회전값 가져오기
 *
 * bodyStateCalculator에서 visibility가 낮을 때 사용할 기본값입니다.
 */
export const IDLE_POSE_ROTATION = {
  leftUpperArm: {
    x: 0.0,
    y: 0.0,
    z: -0.4, // 팔을 내림 (왼쪽)
  },
  leftLowerArm: {
    x: 0.0,
    y: 0.0,
    z: 0.1, // 팔꿈치 약간 굽힘
  },
  rightUpperArm: {
    x: 0.0,
    y: 0.0,
    z: 0.4, // 팔을 내림 (오른쪽)
  },
  rightLowerArm: {
    x: 0.0,
    y: 0.0,
    z: -0.1, // 팔꿈치 약간 굽힘
  },
};

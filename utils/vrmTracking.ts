import { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { FaceStateCalculator, mapFaceStateToVRM } from './faceStateCalculator';
import { BodyStateCalculator } from './bodyStateCalculator';

/**
 * 얼굴 추적 데이터를 VRM 아바타에 적용
 */
export function applyFaceTrackingToVRM(
  vrm: VRM,
  landmarks: Array<{ x: number; y: number; z: number }>,
  calculator: FaceStateCalculator,
  invertPitch: boolean
) {
  if (!landmarks || landmarks.length === 0) return;
  if (!vrm.expressionManager) return;

  // 1. FaceStateCalculator로 얼굴 상태 계산
  const faceState = calculator.calculateFaceState(landmarks);

  // 2. VRM 블렌드셰이프로 변환
  const vrmMapping = mapFaceStateToVRM(faceState);

  // 3. VRM에 적용

  // 3-1. 입 표정 (블렌딩 방식)
  Object.entries(vrmMapping.mouth).forEach(([expression, value]) => {
    try {
      if (value > 0.01) {
        vrm.expressionManager?.setValue(
          expression as VRMExpressionPresetName,
          value as number
        );
      } else {
        vrm.expressionManager?.setValue(
          expression as VRMExpressionPresetName,
          0
        );
      }
    } catch {
      // 표정이 없는 경우 무시
    }
  });

  // 3-2. 눈 깜빡임
  try {
    vrm.expressionManager.setValue(
      'blinkLeft' as VRMExpressionPresetName,
      vrmMapping.blink.left
    );
    vrm.expressionManager.setValue(
      'blinkRight' as VRMExpressionPresetName,
      vrmMapping.blink.right
    );
  } catch {
    // 표정이 없는 경우 무시
  }

  // 3-3. 시선 방향
  try {
    vrm.expressionManager.setValue(
      'lookUp' as VRMExpressionPresetName,
      vrmMapping.look.up
    );
    vrm.expressionManager.setValue(
      'lookDown' as VRMExpressionPresetName,
      vrmMapping.look.down
    );
    vrm.expressionManager.setValue(
      'lookLeft' as VRMExpressionPresetName,
      vrmMapping.look.left
    );
    vrm.expressionManager.setValue(
      'lookRight' as VRMExpressionPresetName,
      vrmMapping.look.right
    );
  } catch {
    // 표정이 없는 경우 무시
  }

  // 3-4. 감정 (미소)
  try {
    vrm.expressionManager.setValue(
      'happy' as VRMExpressionPresetName,
      vrmMapping.emotion.happy
    );
  } catch {
    // 표정이 없는 경우 무시
  }

  // 4. 머리 회전 적용
  if (vrm.humanoid) {
    const head = vrm.humanoid.getNormalizedBoneNode('head');
    if (head && landmarks.length > 454) {
      const noseTip = landmarks[1];
      const leftCheek = landmarks[234];
      const rightCheek = landmarks[454];

      // Yaw (좌우 회전)
      const yaw =
        Math.atan2(rightCheek.x - leftCheek.x, rightCheek.z - leftCheek.z) -
        Math.PI / 2;

      // Pitch (위아래 회전)
      let pitch = (noseTip.y - 0.5) * 1.5;
      if (invertPitch) {
        pitch = -pitch;
      }

      // Roll (기울임)
      const roll =
        Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x) *
        0.5;

      // 부드럽게 적용 (Lerp)
      const smoothFactor = 0.3;
      head.rotation.y += (yaw - head.rotation.y) * smoothFactor;
      head.rotation.x += (pitch - head.rotation.x) * smoothFactor;
      head.rotation.z += (roll - head.rotation.z) * smoothFactor;
    }
  }
}

/**
 * 상체 추적 데이터를 VRM 아바타에 적용
 *
 * BodyStateCalculator에서 계산된 회전값을 VRM의 humanoid bone에 적용합니다.
 * 부드러운 움직임을 위해 lerp(선형 보간)를 사용합니다.
 */
export function applyBodyTrackingToVRM(
  vrm: VRM,
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
  calculator: BodyStateCalculator
) {
  if (!landmarks || landmarks.length === 0) return;
  if (!vrm.humanoid) return;

  const bodyState = calculator.calculateBodyState(landmarks);
  if (!bodyState) return;

  // 스무딩 팩터: 값이 작을수록 더 부드럽지만 지연이 생김
  // 0.15 = 매 프레임 목표값의 15%씩 적용 (안정적이고 부드러움)
  const smoothFactor = 0.15;

  // 척추 (Spine) - 몸통의 전후/좌우 기울기
  const spine = vrm.humanoid.getNormalizedBoneNode('spine');
  if (spine) {
    spine.rotation.x += (bodyState.spine.x - spine.rotation.x) * smoothFactor;
    spine.rotation.y += (bodyState.spine.y - spine.rotation.y) * smoothFactor;
    spine.rotation.z += (bodyState.spine.z - spine.rotation.z) * smoothFactor;
  }

  // 가슴 (Chest) - 상체의 보조 회전
  const chest = vrm.humanoid.getNormalizedBoneNode('chest');
  if (chest) {
    chest.rotation.x += (bodyState.chest.x - chest.rotation.x) * smoothFactor;
    chest.rotation.y += (bodyState.chest.y - chest.rotation.y) * smoothFactor;
    chest.rotation.z += (bodyState.chest.z - chest.rotation.z) * smoothFactor;
  }

  // 왼팔 상완 (Left Upper Arm) - 어깨에서 팔꿈치까지
  const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
  if (leftUpperArm) {
    // X: 팔을 앞뒤로, Y: 팔의 내외전, Z: 팔을 옆으로 들기
    leftUpperArm.rotation.x +=
      (bodyState.leftUpperArm.x - leftUpperArm.rotation.x) * smoothFactor;
    leftUpperArm.rotation.y +=
      (bodyState.leftUpperArm.y - leftUpperArm.rotation.y) * smoothFactor;
    leftUpperArm.rotation.z +=
      (bodyState.leftUpperArm.z - leftUpperArm.rotation.z) * smoothFactor;
  }

  // 왼팔 전완 (Left Lower Arm) - 팔꿈치에서 손목까지
  const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
  if (leftLowerArm) {
    // Z: 팔꿈치 굽힘 (0 = 펴짐, 양수 = 굽힘)
    leftLowerArm.rotation.z +=
      (bodyState.leftLowerArm.z - leftLowerArm.rotation.z) * smoothFactor;
  }

  // 오른팔 상완 (Right Upper Arm)
  const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
  if (rightUpperArm) {
    rightUpperArm.rotation.x +=
      (bodyState.rightUpperArm.x - rightUpperArm.rotation.x) * smoothFactor;
    rightUpperArm.rotation.y +=
      (bodyState.rightUpperArm.y - rightUpperArm.rotation.y) * smoothFactor;
    rightUpperArm.rotation.z +=
      (bodyState.rightUpperArm.z - rightUpperArm.rotation.z) * smoothFactor;
  }

  // 오른팔 전완 (Right Lower Arm)
  const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
  if (rightLowerArm) {
    rightLowerArm.rotation.z +=
      (bodyState.rightLowerArm.z - rightLowerArm.rotation.z) * smoothFactor;
  }
}

/**
 * 손 추적 데이터를 VRM 아바타에 적용
 */
export function applyHandTrackingToVRM(
  vrm: VRM,
  landmarks: Array<Array<{ x: number; y: number; z: number }>>,
  handednesses: Array<Array<{ categoryName: string }>>,
  calculator: BodyStateCalculator
) {
  if (!landmarks || landmarks.length === 0) return;
  if (!vrm.humanoid) return;

  // 왼손과 오른손 랜드마크 분리
  let leftHandLandmarks = null;
  let rightHandLandmarks = null;

  for (let i = 0; i < landmarks.length; i++) {
    const handedness = handednesses[i]?.[0]?.categoryName;
    if (handedness === 'Left') {
      leftHandLandmarks = landmarks[i];
    } else if (handedness === 'Right') {
      rightHandLandmarks = landmarks[i];
    }
  }

  const handState = calculator.calculateHandState(
    leftHandLandmarks,
    rightHandLandmarks
  );

  const smoothFactor = 0.3;

  // 왼손 손가락
  const leftThumb = vrm.humanoid.getNormalizedBoneNode('leftThumbProximal');
  if (leftThumb) {
    leftThumb.rotation.z +=
      (handState.leftThumb * 0.5 - leftThumb.rotation.z) * smoothFactor;
  }

  const leftIndex = vrm.humanoid.getNormalizedBoneNode('leftIndexProximal');
  if (leftIndex) {
    leftIndex.rotation.z +=
      (handState.leftIndex * 0.5 - leftIndex.rotation.z) * smoothFactor;
  }

  const leftMiddle = vrm.humanoid.getNormalizedBoneNode('leftMiddleProximal');
  if (leftMiddle) {
    leftMiddle.rotation.z +=
      (handState.leftMiddle * 0.5 - leftMiddle.rotation.z) * smoothFactor;
  }

  // 오른손 손가락
  const rightThumb = vrm.humanoid.getNormalizedBoneNode('rightThumbProximal');
  if (rightThumb) {
    rightThumb.rotation.z +=
      (handState.rightThumb * -0.5 - rightThumb.rotation.z) * smoothFactor;
  }

  const rightIndex = vrm.humanoid.getNormalizedBoneNode('rightIndexProximal');
  if (rightIndex) {
    rightIndex.rotation.z +=
      (handState.rightIndex * -0.5 - rightIndex.rotation.z) * smoothFactor;
  }

  const rightMiddle = vrm.humanoid.getNormalizedBoneNode('rightMiddleProximal');
  if (rightMiddle) {
    rightMiddle.rotation.z +=
      (handState.rightMiddle * -0.5 - rightMiddle.rotation.z) * smoothFactor;
  }
}

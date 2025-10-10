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

  const smoothFactor = 0.2;

  // 척추
  const spine = vrm.humanoid.getNormalizedBoneNode('spine');
  if (spine) {
    spine.rotation.x += (bodyState.spine.x - spine.rotation.x) * smoothFactor;
    spine.rotation.z += (bodyState.spine.z - spine.rotation.z) * smoothFactor;
  }

  // 가슴
  const chest = vrm.humanoid.getNormalizedBoneNode('chest');
  if (chest) {
    chest.rotation.x += (bodyState.chest.x - chest.rotation.x) * smoothFactor;
    chest.rotation.z += (bodyState.chest.z - chest.rotation.z) * smoothFactor;
  }

  // 왼팔
  const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
  if (leftUpperArm) {
    leftUpperArm.rotation.x +=
      (bodyState.leftUpperArm.x - leftUpperArm.rotation.x) * smoothFactor;
    leftUpperArm.rotation.y +=
      (bodyState.leftUpperArm.y - leftUpperArm.rotation.y) * smoothFactor;
  }

  const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
  if (leftLowerArm) {
    leftLowerArm.rotation.z +=
      (bodyState.leftLowerArm.z - leftLowerArm.rotation.z) * smoothFactor;
  }

  // 오른팔
  const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
  if (rightUpperArm) {
    rightUpperArm.rotation.x +=
      (bodyState.rightUpperArm.x - rightUpperArm.rotation.x) * smoothFactor;
    rightUpperArm.rotation.y +=
      (bodyState.rightUpperArm.y - rightUpperArm.rotation.y) * smoothFactor;
  }

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

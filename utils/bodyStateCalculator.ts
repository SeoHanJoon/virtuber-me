/**
 * 상체 및 손 상태 계산 유틸리티
 *
 * MediaPipe Pose/Hand Landmarker를 사용하여
 * VRM humanoid bone에 적용 가능한 상체 및 손 상태를 계산합니다.
 */

/**
 * 상체 상태 (어깨, 팔, 몸통)
 */
export interface BodyState {
  // 몸통
  spine: { x: number; y: number; z: number }; // 척추 회전
  chest: { x: number; y: number; z: number }; // 가슴 회전

  // 왼팔
  leftShoulder: { x: number; y: number; z: number }; // 왼쪽 어깨 회전
  leftUpperArm: { x: number; y: number; z: number }; // 왼쪽 상완 회전
  leftLowerArm: { x: number; y: number; z: number }; // 왼쪽 전완 회전

  // 오른팔
  rightShoulder: { x: number; y: number; z: number }; // 오른쪽 어깨 회전
  rightUpperArm: { x: number; y: number; z: number }; // 오른쪽 상완 회전
  rightLowerArm: { x: number; y: number; z: number }; // 오른쪽 전완 회전
}

/**
 * 손 상태 (손가락)
 */
export interface HandState {
  // 왼손
  leftThumb: number; // 엄지 굽힘 (0~1)
  leftIndex: number; // 검지 굽힘 (0~1)
  leftMiddle: number; // 중지 굽힘 (0~1)
  leftRing: number; // 약지 굽힘 (0~1)
  leftLittle: number; // 새끼 굽힘 (0~1)

  // 오른손
  rightThumb: number;
  rightIndex: number;
  rightMiddle: number;
  rightRing: number;
  rightLittle: number;
}

/**
 * MediaPipe Pose 랜드마크 타입
 */
type PoseLandmark = { x: number; y: number; z: number; visibility?: number };

/**
 * MediaPipe Hand 랜드마크 타입
 */
type HandLandmark = { x: number; y: number; z: number };

/**
 * 상체 상태 계산기
 */
export class BodyStateCalculator {
  // MediaPipe Pose 랜드마크 인덱스
  private readonly POSE_LANDMARKS = {
    NOSE: 0,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
  };

  // MediaPipe Hand 랜드마크 인덱스
  private readonly HAND_LANDMARKS = {
    WRIST: 0,
    THUMB_TIP: 4,
    INDEX_TIP: 8,
    MIDDLE_TIP: 12,
    RING_TIP: 16,
    LITTLE_TIP: 20,
    THUMB_MCP: 2,
    INDEX_MCP: 5,
    MIDDLE_MCP: 9,
    RING_MCP: 13,
    LITTLE_MCP: 17,
  };

  /**
   * Pose 랜드마크로부터 상체 상태 계산
   */
  public calculateBodyState(landmarks: PoseLandmark[]): BodyState | null {
    if (!landmarks || landmarks.length < 25) return null;

    try {
      // 어깨 중심점
      const leftShoulder = landmarks[this.POSE_LANDMARKS.LEFT_SHOULDER];
      const rightShoulder = landmarks[this.POSE_LANDMARKS.RIGHT_SHOULDER];
      const shoulderCenter = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2,
        z: (leftShoulder.z + rightShoulder.z) / 2,
      };

      // 엉덩이 중심점
      const leftHip = landmarks[this.POSE_LANDMARKS.LEFT_HIP];
      const rightHip = landmarks[this.POSE_LANDMARKS.RIGHT_HIP];
      const hipCenter = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2,
        z: (leftHip.z + rightHip.z) / 2,
      };

      // 척추 회전 계산 (몸통 기울기)
      const spineRotation = this.calculateSpineRotation(
        shoulderCenter,
        hipCenter
      );

      // 왼팔 회전 계산
      const leftArmRotation = this.calculateArmRotation(
        landmarks[this.POSE_LANDMARKS.LEFT_SHOULDER],
        landmarks[this.POSE_LANDMARKS.LEFT_ELBOW],
        landmarks[this.POSE_LANDMARKS.LEFT_WRIST],
        'left'
      );

      // 오른팔 회전 계산
      const rightArmRotation = this.calculateArmRotation(
        landmarks[this.POSE_LANDMARKS.RIGHT_SHOULDER],
        landmarks[this.POSE_LANDMARKS.RIGHT_ELBOW],
        landmarks[this.POSE_LANDMARKS.RIGHT_WRIST],
        'right'
      );

      return {
        spine: spineRotation,
        chest: { x: spineRotation.x * 0.7, y: 0, z: spineRotation.z * 0.7 },
        leftShoulder: leftArmRotation.shoulder,
        leftUpperArm: leftArmRotation.upperArm,
        leftLowerArm: leftArmRotation.lowerArm,
        rightShoulder: rightArmRotation.shoulder,
        rightUpperArm: rightArmRotation.upperArm,
        rightLowerArm: rightArmRotation.lowerArm,
      };
    } catch (error) {
      console.error('[BodyStateCalculator] 계산 오류:', error);
      return null;
    }
  }

  /**
   * Hand 랜드마크로부터 손 상태 계산
   */
  public calculateHandState(
    leftHandLandmarks: HandLandmark[] | null,
    rightHandLandmarks: HandLandmark[] | null
  ): HandState {
    const leftFingers = leftHandLandmarks
      ? this.calculateFingerBends(leftHandLandmarks)
      : { thumb: 0, index: 0, middle: 0, ring: 0, little: 0 };

    const rightFingers = rightHandLandmarks
      ? this.calculateFingerBends(rightHandLandmarks)
      : { thumb: 0, index: 0, middle: 0, ring: 0, little: 0 };

    return {
      leftThumb: leftFingers.thumb,
      leftIndex: leftFingers.index,
      leftMiddle: leftFingers.middle,
      leftRing: leftFingers.ring,
      leftLittle: leftFingers.little,
      rightThumb: rightFingers.thumb,
      rightIndex: rightFingers.index,
      rightMiddle: rightFingers.middle,
      rightRing: rightFingers.ring,
      rightLittle: rightFingers.little,
    };
  }

  /**
   * 척추 회전 계산
   */
  private calculateSpineRotation(
    shoulder: PoseLandmark,
    hip: PoseLandmark
  ): { x: number; y: number; z: number } {
    // 몸통 벡터 (엉덩이 → 어깨 방향으로 변경)
    const dx = hip.x - shoulder.x;
    const dy = hip.y - shoulder.y; // 양수 (엉덩이가 아래)
    const dz = hip.z - shoulder.z;

    // 벡터 크기
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (length < 0.01) return { x: 0, y: 0, z: 0 };

    // 정규화
    const ndx = dx / length;
    const _ndy = dy / length; // eslint-disable-line @typescript-eslint/no-unused-vars
    const ndz = dz / length;

    // 정상 자세: (0, 1, 0) - 엉덩이→어깨가 위쪽 방향
    // Pitch (전후 기울기): z 성분으로 판단
    // ndz = 0 → 정상 자세
    // ndz > 0 → 뒤로 젖힘 (어깨가 카메라에서 멀어짐)
    // ndz < 0 → 앞으로 숙임 (어깨가 카메라로 가까워짐)
    const pitch = -Math.asin(this.clamp(ndz, -1, 1)); // 부호 반전 (앞으로 숙임=양수)

    // Roll (좌우 기울기): x 성분으로 판단
    // ndx = 0 → 정상 자세
    // ndx > 0 → 왼쪽으로 기울임 (어깨가 오른쪽)
    // ndx < 0 → 오른쪽으로 기울임 (어깨가 왼쪽)
    const roll = Math.asin(this.clamp(ndx, -1, 1));

    return {
      x: this.clamp(pitch * 0.5, -0.8, 0.8), // 전후 기울기 범위 확대
      y: 0,
      z: this.clamp(roll * 0.5, -0.8, 0.8), // 좌우 기울기 범위 확대
    };
  }

  /**
   * 팔 회전 계산
   */
  private calculateArmRotation(
    shoulder: PoseLandmark,
    elbow: PoseLandmark,
    wrist: PoseLandmark,
    side: 'left' | 'right'
  ): {
    shoulder: { x: number; y: number; z: number };
    upperArm: { x: number; y: number; z: number };
    lowerArm: { x: number; y: number; z: number };
  } {
    // 상완 벡터 (어깨 → 팔꿈치)
    const upperArmVector = {
      x: elbow.x - shoulder.x,
      y: elbow.y - shoulder.y,
      z: elbow.z - shoulder.z,
    };

    // 전완 벡터 (팔꿈치 → 손목)
    const lowerArmVector = {
      x: wrist.x - elbow.x,
      y: wrist.y - elbow.y,
      z: wrist.z - elbow.z,
    };

    // 벡터 정규화
    const upperLength = Math.sqrt(
      upperArmVector.x ** 2 + upperArmVector.y ** 2 + upperArmVector.z ** 2
    );
    if (upperLength < 0.01) {
      return {
        shoulder: { x: 0, y: 0, z: 0 },
        upperArm: { x: 0, y: 0, z: 0 },
        lowerArm: { x: 0, y: 0, z: 0 },
      };
    }

    const nUpperArm = {
      x: upperArmVector.x / upperLength,
      y: upperArmVector.y / upperLength,
      z: upperArmVector.z / upperLength,
    };

    // 좌우 반전
    const sideMultiplier = side === 'left' ? 1 : -1;

    // 상완 회전
    // X축 회전 (Pitch): 팔을 앞뒤로 (y-z 평면)
    const upperArmPitch = Math.atan2(nUpperArm.y, -nUpperArm.z);

    // Y축 회전 (Yaw): 팔을 좌우로 (x-z 평면)
    const upperArmYaw = Math.atan2(nUpperArm.x * sideMultiplier, -nUpperArm.z);

    // Z축 회전 (Roll): 팔의 비틀림 (x-y 평면)
    const upperArmRoll = Math.atan2(nUpperArm.x * sideMultiplier, nUpperArm.y);

    // 팔꿈치 굽힘 각도 계산
    const elbowAngle = this.calculateAngle(upperArmVector, lowerArmVector);

    // 팔꿈치는 한 방향으로만 굽힘 (0 ~ 150도 정도)
    const elbowBend = this.clamp((Math.PI - elbowAngle) * 0.7, 0, 2.3);

    return {
      shoulder: { x: 0, y: 0, z: 0 },
      upperArm: {
        x: this.clamp(upperArmPitch, -Math.PI, Math.PI / 2), // 팔을 앞으로 들기 제한
        y: this.clamp(upperArmYaw, -Math.PI / 2, Math.PI / 2), // 팔을 옆으로 들기 제한
        z: this.clamp(upperArmRoll * 0.3, -0.5, 0.5), // 비틀림 제한
      },
      lowerArm: {
        x: 0,
        y: 0,
        z: elbowBend * sideMultiplier, // 팔꿈치 굽힘 (좌우 방향 고려)
      },
    };
  }

  /**
   * 손가락 굽힘 계산
   */
  private calculateFingerBends(landmarks: HandLandmark[]): {
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    little: number;
  } {
    const wrist = landmarks[this.HAND_LANDMARKS.WRIST];

    // 각 손가락 끝과 손목 사이의 거리로 굽힘 정도 추정
    const thumbDist = this.getDistance(
      wrist,
      landmarks[this.HAND_LANDMARKS.THUMB_TIP]
    );
    const indexDist = this.getDistance(
      wrist,
      landmarks[this.HAND_LANDMARKS.INDEX_TIP]
    );
    const middleDist = this.getDistance(
      wrist,
      landmarks[this.HAND_LANDMARKS.MIDDLE_TIP]
    );
    const ringDist = this.getDistance(
      wrist,
      landmarks[this.HAND_LANDMARKS.RING_TIP]
    );
    const littleDist = this.getDistance(
      wrist,
      landmarks[this.HAND_LANDMARKS.LITTLE_TIP]
    );

    // 정규화 (거리가 짧을수록 굽혀진 상태)
    const maxDist = 0.3; // 손가락을 완전히 폈을 때의 대략적인 거리
    const minDist = 0.1; // 손가락을 완전히 구부렸을 때의 거리

    return {
      thumb:
        1.0 - this.clamp((thumbDist - minDist) / (maxDist - minDist), 0, 1),
      index:
        1.0 - this.clamp((indexDist - minDist) / (maxDist - minDist), 0, 1),
      middle:
        1.0 - this.clamp((middleDist - minDist) / (maxDist - minDist), 0, 1),
      ring: 1.0 - this.clamp((ringDist - minDist) / (maxDist - minDist), 0, 1),
      little:
        1.0 - this.clamp((littleDist - minDist) / (maxDist - minDist), 0, 1),
    };
  }

  /**
   * 두 벡터 사이의 각도 계산
   */
  private calculateAngle(
    v1: { x: number; y: number; z: number },
    v2: { x: number; y: number; z: number }
  ): number {
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);
    return Math.acos(dot / (mag1 * mag2));
  }

  /**
   * 두 점 사이의 거리 계산
   */
  private getDistance(
    p1: { x: number; y: number; z: number },
    p2: { x: number; y: number; z: number }
  ): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 값을 범위 내로 제한
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

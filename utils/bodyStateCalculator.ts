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
 * 안정화된 회전 상태 (이전 프레임 기반 스무딩용)
 */
interface StabilizedRotation {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

/**
 * 상체 상태 계산기
 */
export class BodyStateCalculator {
  // Visibility 임계값 (이 값보다 낮으면 랜드마크가 보이지 않는 것으로 간주)
  private readonly VISIBILITY_THRESHOLD = 0.3; // 0.5 → 0.3으로 낮춰서 더 적극적으로 추적

  // 이전 프레임 기반 안정화: 팔 회전값 저장
  private previousLeftUpperArm: StabilizedRotation | null = null;
  private previousRightUpperArm: StabilizedRotation | null = null;
  private previousLeftLowerArm: StabilizedRotation | null = null;
  private previousRightLowerArm: StabilizedRotation | null = null;

  // 깊이값 불안정 보정: 스무딩 팩터
  private readonly SMOOTHING_FACTOR = 0.35; // 0~1, 높을수록 이전 값을 많이 유지 (안정화)
  private readonly DEPTH_SENSITIVITY = 0.7; // z축 깊이 민감도 (낮을수록 덜 민감)

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

      // 엉덩이 visibility 체크 (화면에 보이지 않으면 추정값이 부정확함)
      const hipVisibility = Math.min(
        leftHip.visibility ?? 0,
        rightHip.visibility ?? 0
      );

      let spineRotation: { x: number; y: number; z: number };

      // 엉덩이가 화면에 보이지 않으면 중립 자세로 설정
      if (hipVisibility < this.VISIBILITY_THRESHOLD) {
        spineRotation = { x: 0, y: 0, z: 0 };
      } else {
        // 엉덩이가 보이면 정상적으로 척추 회전 계산
        const hipCenter = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2,
          z: (leftHip.z + rightHip.z) / 2,
        };
        spineRotation = this.calculateSpineRotation(shoulderCenter, hipCenter);
      }

      // 왼팔 회전 계산 (원시 회전값)
      const leftArmRotationRaw = this.calculateArmRotation(
        landmarks[this.POSE_LANDMARKS.LEFT_SHOULDER],
        landmarks[this.POSE_LANDMARKS.LEFT_ELBOW],
        landmarks[this.POSE_LANDMARKS.LEFT_WRIST],
        'left'
      );

      // 오른팔 회전 계산 (원시 회전값)
      const rightArmRotationRaw = this.calculateArmRotation(
        landmarks[this.POSE_LANDMARKS.RIGHT_SHOULDER],
        landmarks[this.POSE_LANDMARKS.RIGHT_ELBOW],
        landmarks[this.POSE_LANDMARKS.RIGHT_WRIST],
        'right'
      );

      // 의사 3D 회전 보정 및 안정화 적용
      const now = Date.now();

      // 왼팔 상완 안정화
      const leftUpperArmStabilized = this.stabilizeAndProject3DArmPose(
        leftArmRotationRaw.upperArm,
        this.previousLeftUpperArm,
        'upperArm'
      );
      this.previousLeftUpperArm = { ...leftUpperArmStabilized, timestamp: now };

      // 왼팔 전완 안정화
      const leftLowerArmStabilized = this.stabilizeAndProject3DArmPose(
        leftArmRotationRaw.lowerArm,
        this.previousLeftLowerArm,
        'lowerArm'
      );
      this.previousLeftLowerArm = { ...leftLowerArmStabilized, timestamp: now };

      // 오른팔 상완 안정화
      const rightUpperArmStabilized = this.stabilizeAndProject3DArmPose(
        rightArmRotationRaw.upperArm,
        this.previousRightUpperArm,
        'upperArm'
      );
      this.previousRightUpperArm = {
        ...rightUpperArmStabilized,
        timestamp: now,
      };

      // 오른팔 전완 안정화
      const rightLowerArmStabilized = this.stabilizeAndProject3DArmPose(
        rightArmRotationRaw.lowerArm,
        this.previousRightLowerArm,
        'lowerArm'
      );
      this.previousRightLowerArm = {
        ...rightLowerArmStabilized,
        timestamp: now,
      };

      return {
        spine: spineRotation,
        chest: { x: spineRotation.x * 0.7, y: 0, z: spineRotation.z * 0.7 },
        leftShoulder: leftArmRotationRaw.shoulder,
        leftUpperArm: leftUpperArmStabilized, // 안정화된 회전값 사용
        leftLowerArm: leftLowerArmStabilized, // 안정화된 회전값 사용
        rightShoulder: rightArmRotationRaw.shoulder,
        rightUpperArm: rightUpperArmStabilized, // 안정화된 회전값 사용
        rightLowerArm: rightLowerArmStabilized, // 안정화된 회전값 사용
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
    const _ndy = dy / length; // y축은 현재 사용하지 않음 (정상 자세가 Y-up 기준이므로)
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
   * 팔 회전 계산 (좌표계 변환 포함)
   *
   * MediaPipe 좌표계 → Three.js 좌표계 변환:
   * - MediaPipe: X(오른쪽), Y(아래), Z(카메라 방향)
   * - Three.js/VRM: X(오른쪽), Y(위), Z(카메라 반대 방향)
   * - 변환: (x, y, z) → (x, -y, -z)
   *
   * 주의: z축 깊이값은 상대값이므로 stabilizeAndProject3DArmPose()에서 추가 보정
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
    // 팔꿈치/손목 visibility 체크 (화면에 보이지 않으면 추정값이 부정확함)
    const elbowVisibility = elbow.visibility ?? 0;
    const wristVisibility = wrist.visibility ?? 0;

    // 팔꿈치나 손목이 화면에 보이지 않으면 기본 자세(팔 내린 상태)로 설정
    if (
      elbowVisibility < this.VISIBILITY_THRESHOLD ||
      wristVisibility < this.VISIBILITY_THRESHOLD
    ) {
      // 기본 자세: 팔을 자연스럽게 내린 상태 (idle pose)
      // 목표값과 동일하게 설정하여 안정화 함수에서 자연스럽게 전환
      return {
        shoulder: { x: 0, y: 0, z: 0 },
        upperArm: {
          x: 0,
          y: 0,
          z: side === 'left' ? -70 : 70,
        },
        lowerArm: {
          x: 0,
          y: 0,
          z: 0,
        },
      };
    }

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

    // 상완 벡터 정규화
    const upperLength = Math.sqrt(
      upperArmVector.x ** 2 + upperArmVector.y ** 2 + upperArmVector.z ** 2
    );

    // 벡터가 너무 짧으면 기본 자세 반환
    if (upperLength < 0.01) {
      return {
        shoulder: { x: 0, y: 0, z: 0 },
        upperArm: { x: 0, y: 0, z: side === 'left' ? -70 : 70 },
        lowerArm: { x: 0, y: 0, z: 0 },
      };
    }

    // 정규화된 상완 벡터
    const nUpperArm = {
      x: upperArmVector.x / upperLength,
      y: upperArmVector.y / upperLength,
      z: upperArmVector.z / upperLength,
    };

    // 좌우 반전 (오른팔은 좌표계가 반대)
    const sideMultiplier = side === 'left' ? 1 : -1;

    // ===== MediaPipe → VRM 좌표계 변환 =====
    // MediaPipe: Y축 아래가 양수 (화면 좌표계)
    // VRM/Three.js: Y축 위가 양수 (3D 좌표계)
    //
    // 실제 데이터 분석 결과:
    // - 팔 아래: 어깨→팔꿈치 벡터 (x=0.15, y=0.52, z=-0.03)
    // - 팔 위로: 어깨→팔꿈치 벡터 (x=0.17, y=-0.53, z=-0.29)
    // → MediaPipe에서 y > 0 = 아래, y < 0 = 위
    //
    // VRM T-pose: 팔이 X축 방향 (옆으로 벌림)
    // 목표: X축 회전으로 팔을 위아래로 움직임

    // ===== VRM 회전각 계산 (실제 데이터 기반 보정) =====
    //
    // 목표 결과 (팔 아래 상태):
    // - x: -18° (팔을 약간 앞으로)
    // - y: -49° (팔을 내림)
    // - z: 50° (팔을 약간 비틀림)

    // X축 회전 (Pitch): 팔을 앞뒤로
    // 실제 데이터: asin(-0.758) ≈ -49.3° → 목표: -18
    // 0.365배 스케일 + degree 변환 (부호 유지)
    const upperArmPitch =
      Math.asin(this.clamp(nUpperArm.y, -1, 1)) * 0.365 * (180 / Math.PI);

    // Y축 회전 (Yaw): 팔을 위아래로
    // 실제 데이터: atan2(-0.147, -0.635) ≈ -166.9° → 목표: -49
    // 0.294배 스케일 + degree 변환
    const upperArmYaw =
      Math.atan2(-nUpperArm.x, nUpperArm.z) *
      0.294 *
      sideMultiplier *
      (180 / Math.PI);

    // Z축 회전 (Roll): 팔의 비틀림
    // 실제 데이터: atan2(0.635, 0.147) ≈ 76.9° → 목표: 50
    // 0.65배 스케일 + degree 변환
    const upperArmRoll =
      Math.atan2(-nUpperArm.z, Math.abs(nUpperArm.x)) *
      0.65 *
      sideMultiplier *
      (180 / Math.PI);

    // ===== 팔꿈치 굽힘 각도 계산 =====
    const elbowAngle = this.calculateAngle(upperArmVector, lowerArmVector);

    // 팔꿈치는 한 방향으로만 굽힘
    // Math.PI - elbowAngle: 팔을 펴면 0, 구부리면 증가
    // 실제 데이터: bend ≈ 170.3° → 목표: -23
    // 부호 반전 + 0.135배 스케일 + degree 변환
    const elbowBend = -(Math.PI - elbowAngle) * 0.135 * (180 / Math.PI);

    return {
      shoulder: { x: 0, y: 0, z: 0 },
      upperArm: {
        x: this.clamp(upperArmPitch, -180, 180), // -180 ~ 180
        y: this.clamp(upperArmYaw, -180, 180), // -180 ~ 180
        z: this.clamp(upperArmRoll, -180, 180), // -180 ~ 180
      },
      lowerArm: {
        x: elbowBend, // 팔꿈치 굽힘 (X축)
        y: 0,
        z: 0,
      },
    };
  }

  /**
   * 의사 3D 회전 보정 및 안정화
   *
   * MediaPipe의 z축 깊이값이 상대값이라 불안정한 문제를 해결:
   * 1. 이전 프레임 회전값과 블렌딩하여 떨림 감소
   * 2. z축 변화량에 depth sensitivity 적용
   * 3. 급격한 변화 시 transition damping 적용
   *
   * @param currentRotation 현재 프레임의 계산된 회전값 (degree)
   * @param previousRotation 이전 프레임의 회전값
   * @param armSide 'left' 또는 'right'
   * @returns 안정화된 회전값 (degree)
   */
  private stabilizeAndProject3DArmPose(
    currentRotation: { x: number; y: number; z: number },
    previousRotation: StabilizedRotation | null,
    _armSide: 'upperArm' | 'lowerArm' // eslint-disable-line @typescript-eslint/no-unused-vars
  ): { x: number; y: number; z: number } {
    // 첫 프레임이거나 이전 값이 없으면 현재 값 그대로 반환
    if (!previousRotation) {
      return { ...currentRotation };
    }

    const now = Date.now();
    const timeDelta = now - previousRotation.timestamp;

    // 프레임 간격이 너무 길면 (500ms 이상) 이전 값 무시
    if (timeDelta > 500) {
      return { ...currentRotation };
    }

    // 깊이값 불안정 보정: z축에는 민감도를 낮춰서 적용
    const stabilized = {
      x: 0,
      y: 0,
      z: 0,
    };

    // 각 축마다 스무딩 적용
    for (const axis of ['x', 'y', 'z'] as const) {
      const current = currentRotation[axis];
      const previous = previousRotation[axis];
      const delta = current - previous;

      // z축은 깊이 민감도를 적용하여 덜 민감하게
      const sensitivity = axis === 'z' ? this.DEPTH_SENSITIVITY : 1.0;

      // 급격한 변화 감지 (transition damping)
      const absDelta = Math.abs(delta);
      let smoothFactor = this.SMOOTHING_FACTOR;

      if (absDelta > 15) {
        // 15도 이상 급변: 더 강한 스무딩
        smoothFactor = 0.6;
      } else if (absDelta > 30) {
        // 30도 이상 급변: 매우 강한 스무딩 (떨림 방지)
        smoothFactor = 0.75;
      }

      // 이전 프레임 기반 안정화: 선형 보간 (LERP)
      stabilized[axis] =
        previous * smoothFactor + current * sensitivity * (1 - smoothFactor);
    }

    return stabilized;
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

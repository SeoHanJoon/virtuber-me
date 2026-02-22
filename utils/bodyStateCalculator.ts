/**
 * 상체 및 손 상태 계산 유틸리티
 *
 * MediaPipe Pose/Hand Landmarker를 사용하여
 * VRM humanoid bone에 적용 가능한 상체 및 손 상태를 계산합니다.
 */
import * as THREE from 'three';

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
 * 몸통 좌표계 (torso-local frame)
 */
interface TorsoFrame {
  right: THREE.Vector3; // 몸통 X축 (캐릭터 왼쪽 = +)
  up: THREE.Vector3; // 몸통 Y축 (위쪽)
  forward: THREE.Vector3; // 몸통 Z축 (앞쪽)
}

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
      const lsVRM = this.toVRMSpace(
        landmarks[this.POSE_LANDMARKS.LEFT_SHOULDER]
      );
      const rsVRM = this.toVRMSpace(
        landmarks[this.POSE_LANDMARKS.RIGHT_SHOULDER]
      );
      const leVRM = this.toVRMSpace(landmarks[this.POSE_LANDMARKS.LEFT_ELBOW]);
      const reVRM = this.toVRMSpace(landmarks[this.POSE_LANDMARKS.RIGHT_ELBOW]);
      const lwVRM = this.toVRMSpace(landmarks[this.POSE_LANDMARKS.LEFT_WRIST]);
      const rwVRM = this.toVRMSpace(landmarks[this.POSE_LANDMARKS.RIGHT_WRIST]);
      const lhVRM = this.toVRMSpace(landmarks[this.POSE_LANDMARKS.LEFT_HIP]);
      const rhVRM = this.toVRMSpace(landmarks[this.POSE_LANDMARKS.RIGHT_HIP]);

      const shoulderCenter = lsVRM.clone().lerp(rsVRM, 0.5);
      const hipCenter = lhVRM.clone().lerp(rhVRM, 0.5);

      // 척추 회전 (수직에서의 편차)
      const spineRotation = this.calculateSpineRotation(
        shoulderCenter,
        hipCenter
      );

      // 몸통 좌표계 구축 (팔 회전을 로컬 좌표로 계산하기 위해)
      const torsoFrame = this.buildTorsoFrame(
        lsVRM,
        rsVRM,
        shoulderCenter,
        hipCenter
      );

      // 팔 회전 (몸통 기준 로컬 좌표)
      const leftArmRotation = this.calculateArmRotation(
        lsVRM,
        leVRM,
        lwVRM,
        'left',
        torsoFrame
      );
      const rightArmRotation = this.calculateArmRotation(
        rsVRM,
        reVRM,
        rwVRM,
        'right',
        torsoFrame
      );

      return {
        spine: spineRotation,
        chest: {
          x: spineRotation.x * 0.5,
          y: spineRotation.y * 0.5,
          z: spineRotation.z * 0.5,
        },
        leftShoulder: { x: 0, y: 0, z: 0 },
        leftUpperArm: leftArmRotation.upperArm,
        leftLowerArm: leftArmRotation.lowerArm,
        rightShoulder: { x: 0, y: 0, z: 0 },
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
   * MediaPipe worldLandmarks → VRM 공간 변환
   *
   * MediaPipe world landmarks (실측 확인):
   *   X: 캐릭터 왼쪽 = + (VRM과 동일)
   *   Y: 아래 = + (Y-down) — VRM은 위 = +
   *   Z: 카메라 반대쪽 = + — VRM은 카메라 방향 = +
   *
   * → Y와 Z 모두 반전 (두 축 반전 = 180° X축 회전, 오른손 법칙 유지)
   */
  private toVRMSpace(p: PoseLandmark): THREE.Vector3 {
    return new THREE.Vector3(p.x, -p.y, -p.z);
  }

  /**
   * 몸통 좌표계 구축
   * 팔 회전을 몸통 기준 로컬 좌표로 계산하기 위해 필요
   */
  private buildTorsoFrame(
    leftShoulder: THREE.Vector3,
    rightShoulder: THREE.Vector3,
    shoulderCenter: THREE.Vector3,
    hipCenter: THREE.Vector3
  ): TorsoFrame {
    // 몸통 위쪽 (엉덩이 → 어깨)
    const up = shoulderCenter.clone().sub(hipCenter);
    if (up.length() < 0.01) {
      return {
        right: new THREE.Vector3(1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
        forward: new THREE.Vector3(0, 0, 1),
      };
    }
    up.normalize();

    // 어깨 축 (오른어깨 → 왼어깨 = 캐릭터 왼쪽 방향)
    const shoulderAxis = leftShoulder.clone().sub(rightShoulder);
    if (shoulderAxis.length() < 0.01) {
      return {
        right: new THREE.Vector3(1, 0, 0),
        up,
        forward: new THREE.Vector3(0, 0, 1),
      };
    }
    shoulderAxis.normalize();

    // 앞쪽 = 어깨축 × 위쪽 (오른손 법칙)
    const forward = new THREE.Vector3().crossVectors(shoulderAxis, up);
    forward.normalize();

    // 어깨축을 up과 forward에 수직하게 재정규화
    const right = new THREE.Vector3().crossVectors(up, forward);
    right.normalize();

    return { right, up, forward };
  }

  /**
   * 척추 회전 계산
   * 수직(0,1,0)에서의 편차를 atan2로 계산 — 보수적 감쇠
   */
  private calculateSpineRotation(
    shoulderCenter: THREE.Vector3,
    hipCenter: THREE.Vector3
  ): { x: number; y: number; z: number } {
    const spineDir = shoulderCenter.clone().sub(hipCenter);
    const length = spineDir.length();
    if (length < 0.01) return { x: 0, y: 0, z: 0 };

    spineDir.normalize();

    // 수직(0,1,0)에서의 편차를 각도로 계산
    // pitch (X rotation): 전후 기울기 — Z 성분의 편차
    const pitch = Math.atan2(spineDir.z, spineDir.y);
    // roll (Z rotation): 좌우 기울기 — X 성분의 편차
    const roll = -Math.atan2(spineDir.x, spineDir.y);

    const scale = 0.6;
    return {
      x: this.clamp(pitch * scale, -0.5, 0.5),
      y: 0,
      z: this.clamp(roll * scale, -0.5, 0.5),
    };
  }

  /**
   * 팔 회전 계산 (몸통 기준 로컬 좌표)
   *
   * VRM 본 계층: spine → chest → shoulder → upperArm → lowerArm
   * upperArm의 rotation은 부모(shoulder/chest) 기준 로컬이므로,
   * 팔 방향을 월드가 아닌 몸통 로컬 좌표로 변환해야 이중 회전을 방지
   *
   * intrinsic XYZ Euler로 직접 분해:
   *   R_total = Rz(γ) · Ry(β) · Rx(α)
   *   왼팔 T-pose (1,0,0) → 결과: (cosβ·cosγ, cosβ·sinγ, -sinβ)
   *   오른팔 T-pose (-1,0,0) → 결과: (-cosβ·cosγ, -cosβ·sinγ, sinβ)
   *
   *   α(twist)는 위치 데이터로 결정 불가 → 0 고정
   *   β(Y회전, 전후 스윙)와 γ(Z회전, 상하 스윙)만 atan2로 계산
   */
  private calculateArmRotation(
    shoulder: THREE.Vector3,
    elbow: THREE.Vector3,
    wrist: THREE.Vector3,
    side: 'left' | 'right',
    torso: TorsoFrame
  ): {
    upperArm: { x: number; y: number; z: number };
    lowerArm: { x: number; y: number; z: number };
  } {
    const sideMultiplier = side === 'left' ? 1 : -1;

    // 상완 방향 (어깨 → 팔꿈치) in world VRM space
    const upperArmWorld = elbow.clone().sub(shoulder);
    const upperLength = upperArmWorld.length();
    if (upperLength < 0.01) {
      return {
        upperArm: { x: 0, y: 0, z: 0 },
        lowerArm: { x: 0, y: 0, z: 0 },
      };
    }
    upperArmWorld.normalize();

    // 월드 방향을 몸통 로컬 좌표로 변환 (dot product projection)
    const lx = upperArmWorld.dot(torso.right);
    const ly = upperArmWorld.dot(torso.up);
    const lz = upperArmWorld.dot(torso.forward);

    // atan2로 직접 Euler 계산 (Quaternion 분해의 twist 아티팩트 방지)
    let zRot: number;
    let yRot: number;
    const cosβ = Math.sqrt(lx * lx + ly * ly);

    if (side === 'left') {
      // 왼팔: T-pose (+1,0,0), 결과 = (cosβ·cosγ, cosβ·sinγ, -sinβ)
      yRot = Math.asin(this.clamp(-lz, -1, 1));
      zRot = cosβ > 0.01 ? Math.atan2(ly, lx) : 0;
    } else {
      // 오른팔: T-pose (-1,0,0), 결과 = (-cosβ·cosγ, -cosβ·sinγ, sinβ)
      yRot = Math.asin(this.clamp(lz, -1, 1));
      zRot = cosβ > 0.01 ? Math.atan2(-ly, -lx) : 0;
    }

    // 전완 방향 (팔꿈치 → 손목) — 팔꿈치 굽힘 각도
    const lowerArmWorld = wrist.clone().sub(elbow);
    const lowerLength = lowerArmWorld.length();

    let elbowBend = 0;
    if (lowerLength > 0.01) {
      lowerArmWorld.normalize();
      const dot = this.clamp(upperArmWorld.dot(lowerArmWorld), -1, 1);
      // angle = 두 벡터 사이 각도 (0=직선, π=완전 접힘)
      const angle = Math.acos(dot);
      elbowBend = this.clamp(angle, 0, 2.5);
    }

    return {
      upperArm: {
        x: 0,
        y: this.clamp(yRot, -Math.PI * 0.5, Math.PI * 0.5),
        z: this.clamp(zRot, -Math.PI, Math.PI),
      },
      lowerArm: {
        x: 0,
        y: 0,
        z: elbowBend * sideMultiplier,
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

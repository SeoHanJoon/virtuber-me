/**
 * VRM Calibration System
 *
 * 모델별로 다른 본 구조와 회전 축을 자동으로 분석하고 보정하는 시스템
 *
 * 주요 기능:
 * 1. VRM 모델의 본 구조 스캔 및 분석
 * 2. 기준 포즈(T-pose/A-pose)와의 차이 계산
 * 3. 회전 보정 매트릭스(Quaternion) 생성
 * 4. 모델별 캐싱을 통한 재사용
 */

import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

/**
 * 본 보정 데이터
 */
export interface BoneCalibrationData {
  // 본의 초기 로컬 회전 (모델 로드 시)
  initialRotation: THREE.Quaternion;
  // 본의 초기 로컬 위치
  initialPosition: THREE.Vector3;
  // 부모 본과의 방향 벡터
  directionToParent: THREE.Vector3;
  // 본의 길이 (자식까지의 거리)
  length: number;
  // 회전 보정 쿼터니언
  correctionQuaternion: THREE.Quaternion;
  // 본이 존재하는지 여부
  exists: boolean;
}

/**
 * VRM 모델의 전체 보정 데이터
 */
export interface VRMCalibrationProfile {
  // 모델 식별자 (경로 또는 해시)
  modelId: string;
  // 보정 생성 시간
  timestamp: number;
  // 각 본별 보정 데이터
  bones: {
    // 상체
    spine?: BoneCalibrationData;
    chest?: BoneCalibrationData;
    neck?: BoneCalibrationData;
    head?: BoneCalibrationData;
    // 왼팔
    leftShoulder?: BoneCalibrationData;
    leftUpperArm?: BoneCalibrationData;
    leftLowerArm?: BoneCalibrationData;
    leftHand?: BoneCalibrationData;
    // 오른팔
    rightShoulder?: BoneCalibrationData;
    rightUpperArm?: BoneCalibrationData;
    rightLowerArm?: BoneCalibrationData;
    rightHand?: BoneCalibrationData;
  };
  // 기준 포즈 타입 (T-pose 또는 A-pose 자동 감지)
  basePoseType: 'T-pose' | 'A-pose' | 'unknown';
  // 팔의 초기 각도 (도 단위)
  initialArmAngle: number;
  // 팔 회전 방향 (자동 감지)
  armRotationDirection: {
    // 왼팔: 1 = 양수 방향으로 내림, -1 = 음수 방향으로 내림
    left: 1 | -1;
    // 오른팔: 1 = 양수 방향으로 내림, -1 = 음수 방향으로 내림
    right: 1 | -1;
  };
}

/**
 * VRM Calibration Manager
 *
 * 모델별 보정 데이터를 생성하고 관리합니다.
 */
export class VRMCalibrationManager {
  // 모델별 보정 프로파일 캐시
  private profiles: Map<string, VRMCalibrationProfile> = new Map();

  /**
   * VRM 모델을 분석하여 보정 프로파일 생성
   */
  public calibrate(vrm: VRM, modelId: string): VRMCalibrationProfile {
    console.log(`🔍 [Calibration] 모델 분석 시작: ${modelId}`);

    // 이미 캐시된 프로파일이 있으면 반환
    if (this.profiles.has(modelId)) {
      console.log(`✅ [Calibration] 캐시된 프로파일 사용`);
      return this.profiles.get(modelId)!;
    }

    if (!vrm.humanoid) {
      throw new Error('[Calibration] Humanoid가 없는 VRM 모델입니다.');
    }

    const profile: VRMCalibrationProfile = {
      modelId,
      timestamp: Date.now(),
      bones: {},
      basePoseType: 'unknown',
      initialArmAngle: 0,
      armRotationDirection: {
        left: -1, // 기본값 (나중에 감지)
        right: 1, // 기본값 (나중에 감지)
      },
    };

    // 각 본 분석
    const boneNames: Array<keyof typeof profile.bones> = [
      'spine',
      'chest',
      'neck',
      'head',
      'leftShoulder',
      'leftUpperArm',
      'leftLowerArm',
      'leftHand',
      'rightShoulder',
      'rightUpperArm',
      'rightLowerArm',
      'rightHand',
    ];

    boneNames.forEach((boneName) => {
      const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName);
      if (boneNode) {
        profile.bones[boneName] = this.analyzeBone(boneNode, boneName);
      } else {
        // 본이 없는 경우 기본값
        profile.bones[boneName] = {
          initialRotation: new THREE.Quaternion(),
          initialPosition: new THREE.Vector3(),
          directionToParent: new THREE.Vector3(0, 1, 0),
          length: 0,
          correctionQuaternion: new THREE.Quaternion(),
          exists: false,
        };
      }
    });

    // 기준 포즈 타입 감지 (팔의 초기 각도로 판단)
    const poseType = this.detectBasePose(
      profile.bones.leftUpperArm,
      profile.bones.rightUpperArm
    );
    profile.basePoseType = poseType.type;
    profile.initialArmAngle = poseType.angle;

    // 팔 회전 방향 자동 감지
    const armDirection = this.detectArmRotationDirection(
      profile.bones.leftUpperArm,
      profile.bones.rightUpperArm
    );
    profile.armRotationDirection = armDirection;

    // 보정 쿼터니언 계산
    this.calculateCorrectionQuaternions(profile, vrm);

    // 캐시에 저장
    this.profiles.set(modelId, profile);

    console.log(`✅ [Calibration] 분석 완료:`, {
      basePose: profile.basePoseType,
      armAngle: profile.initialArmAngle.toFixed(1) + '°',
      bonesFound: boneNames.filter((name) => profile.bones[name]?.exists)
        .length,
      armDirection: {
        left: profile.armRotationDirection.left > 0 ? '+' : '-',
        right: profile.armRotationDirection.right > 0 ? '+' : '-',
      },
    });

    return profile;
  }

  /**
   * 개별 본 분석
   */
  private analyzeBone(
    boneNode: THREE.Object3D,
    boneName: string
  ): BoneCalibrationData {
    // 초기 회전 저장 (로컬 회전)
    const initialRotation = boneNode.quaternion.clone();

    // 초기 위치 저장
    const initialPosition = boneNode.position.clone();

    // 부모까지의 방향 벡터 계산
    let directionToParent = new THREE.Vector3(0, 1, 0);
    if (boneNode.parent) {
      directionToParent = new THREE.Vector3()
        .subVectors(boneNode.parent.position, boneNode.position)
        .normalize();
    }

    // 자식 본까지의 거리 (본 길이)
    let length = 0;
    if (boneNode.children.length > 0) {
      const child = boneNode.children[0];
      length = boneNode.position.distanceTo(child.position);
    }

    return {
      initialRotation,
      initialPosition,
      directionToParent,
      length,
      correctionQuaternion: new THREE.Quaternion(), // 나중에 계산
      exists: true,
    };
  }

  /**
   * 기준 포즈 타입 감지 (T-pose vs A-pose)
   *
   * T-pose: 팔을 완전히 옆으로 벌림 (~90도)
   * A-pose: 팔을 약간 아래로 (~30~60도)
   */
  private detectBasePose(
    leftArm?: BoneCalibrationData,
    rightArm?: BoneCalibrationData
  ): { type: 'T-pose' | 'A-pose' | 'unknown'; angle: number } {
    if (!leftArm?.exists || !rightArm?.exists) {
      return { type: 'unknown', angle: 0 };
    }

    // 왼팔 상완의 Z축 회전값으로 각도 추정
    const leftEuler = new THREE.Euler().setFromQuaternion(
      leftArm.initialRotation
    );
    const leftAngleDeg = Math.abs(THREE.MathUtils.radToDeg(leftEuler.z));

    // T-pose: 70도 이상
    // A-pose: 20~70도
    if (leftAngleDeg > 70) {
      return { type: 'T-pose', angle: leftAngleDeg };
    } else if (leftAngleDeg > 20) {
      return { type: 'A-pose', angle: leftAngleDeg };
    } else {
      return { type: 'unknown', angle: leftAngleDeg };
    }
  }

  /**
   * 팔 회전 방향 자동 감지
   *
   * VRM 모델마다 본의 회전 방향이 다를 수 있습니다.
   * 초기 Z축 회전값의 부호를 분석하여 "팔을 내리는" 방향을 결정합니다.
   *
   * 로직:
   * - T-pose/A-pose에서 팔이 옆으로 벌어져 있음
   * - 팔을 내리려면 Z축 회전을 더 크게 (또는 작게) 해야 함
   * - 초기 Z값이 음수면 더 음수로, 양수면 더 양수로 가는 것이 내리는 방향
   */
  private detectArmRotationDirection(
    leftArm?: BoneCalibrationData,
    rightArm?: BoneCalibrationData
  ): { left: 1 | -1; right: 1 | -1 } {
    const result: { left: 1 | -1; right: 1 | -1 } = {
      left: -1, // 기본값
      right: 1, // 기본값
    };

    // 왼팔 방향 감지
    if (leftArm?.exists) {
      const leftEuler = new THREE.Euler().setFromQuaternion(
        leftArm.initialRotation
      );
      const leftZ = leftEuler.z;

      // 초기 Z값의 부호로 판단
      // 음수 → 더 음수 방향(-1)이 내리는 방향
      // 양수 → 더 양수 방향(+1)이 내리는 방향
      if (leftZ < 0) {
        result.left = -1;
      } else if (leftZ > 0) {
        result.left = 1;
      } else {
        // Z가 0에 가까우면, Y축 확인
        // 일반적으로 T-pose에서 팔은 Y=0에 가까움
        // A-pose에서는 Y가 약간 음수 (아래로 기울어짐)
        const leftY = leftEuler.y;
        // Y가 음수면 이미 아래로 향함 → 음수 방향이 더 내림
        result.left = leftY < 0 ? -1 : -1; // 기본값은 -1
      }
    }

    // 오른팔 방향 감지 (왼팔과 대칭)
    if (rightArm?.exists) {
      const rightEuler = new THREE.Euler().setFromQuaternion(
        rightArm.initialRotation
      );
      const rightZ = rightEuler.z;

      // 오른팔은 왼팔과 대칭이므로 부호가 반대
      if (rightZ < 0) {
        result.right = -1;
      } else if (rightZ > 0) {
        result.right = 1;
      } else {
        const rightY = rightEuler.y;
        result.right = rightY < 0 ? 1 : 1; // 기본값은 1
      }
    }

    return result;
  }

  /**
   * 보정 쿼터니언 계산
   *
   * 목표: 어떤 초기 포즈든 일관된 트래킹 입력을 받을 수 있도록 변환
   */
  private calculateCorrectionQuaternions(
    profile: VRMCalibrationProfile,
    vrm: VRM
  ): void {
    // T-pose를 기준으로 보정
    // 목표: 모든 모델이 T-pose 상태라고 가정하고 트래킹 입력 적용

    const targetTPose = {
      // T-pose 기준 회전값
      leftUpperArm: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, -Math.PI / 2) // -90도
      ),
      rightUpperArm: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, Math.PI / 2) // +90도
      ),
    };

    // 왼팔 보정 쿼터니언 계산
    if (profile.bones.leftUpperArm?.exists) {
      const initialRot = profile.bones.leftUpperArm.initialRotation;
      const correction = new THREE.Quaternion();
      // correction = targetTPose * initialRot.inverse()
      correction.multiplyQuaternions(
        targetTPose.leftUpperArm,
        initialRot.clone().invert()
      );
      profile.bones.leftUpperArm.correctionQuaternion = correction;
    }

    // 오른팔 보정 쿼터니언 계산
    if (profile.bones.rightUpperArm?.exists) {
      const initialRot = profile.bones.rightUpperArm.initialRotation;
      const correction = new THREE.Quaternion();
      correction.multiplyQuaternions(
        targetTPose.rightUpperArm,
        initialRot.clone().invert()
      );
      profile.bones.rightUpperArm.correctionQuaternion = correction;
    }

    // 다른 본들도 동일한 방식으로 계산 가능
    // (현재는 팔만 구현, 필요시 확장)
  }

  /**
   * 트래킹 회전에 보정 적용
   *
   * @param boneName 본 이름
   * @param trackingRotation 트래킹으로부터 계산된 회전 (Euler)
   * @param modelId 모델 ID
   * @returns 보정된 Quaternion
   */
  public applyCorrectionToTracking(
    boneName: keyof VRMCalibrationProfile['bones'],
    trackingRotation: THREE.Euler,
    modelId: string
  ): THREE.Quaternion {
    const profile = this.profiles.get(modelId);
    if (!profile) {
      // 프로파일이 없으면 그대로 반환
      return new THREE.Quaternion().setFromEuler(trackingRotation);
    }

    const boneData = profile.bones[boneName];
    if (!boneData?.exists) {
      return new THREE.Quaternion().setFromEuler(trackingRotation);
    }

    // trackingQuat = tracking을 쿼터니언으로 변환
    const trackingQuat = new THREE.Quaternion().setFromEuler(trackingRotation);

    // finalQuat = trackingQuat * correctionQuat
    const finalQuat = new THREE.Quaternion();
    finalQuat.multiplyQuaternions(trackingQuat, boneData.correctionQuaternion);

    return finalQuat;
  }

  /**
   * 캐시된 프로파일 가져오기
   */
  public getProfile(modelId: string): VRMCalibrationProfile | undefined {
    return this.profiles.get(modelId);
  }

  /**
   * 캐시 초기화
   */
  public clearCache(): void {
    this.profiles.clear();
    console.log('🗑️ [Calibration] 캐시 초기화됨');
  }

  /**
   * 디버그 정보 출력
   */
  public debugProfile(modelId: string): void {
    const profile = this.profiles.get(modelId);
    if (!profile) {
      console.warn(`[Calibration] 프로파일을 찾을 수 없음: ${modelId}`);
      return;
    }

    console.log('🔍 [Calibration] 프로파일 디버그:', {
      modelId: profile.modelId,
      basePose: profile.basePoseType,
      armAngle: profile.initialArmAngle.toFixed(1) + '°',
      bones: Object.entries(profile.bones)
        .filter(([_, data]) => data.exists)
        .map(([name, data]) => ({
          name,
          initialRotation: {
            x: THREE.MathUtils.radToDeg(
              new THREE.Euler().setFromQuaternion(data.initialRotation).x
            ).toFixed(1),
            y: THREE.MathUtils.radToDeg(
              new THREE.Euler().setFromQuaternion(data.initialRotation).y
            ).toFixed(1),
            z: THREE.MathUtils.radToDeg(
              new THREE.Euler().setFromQuaternion(data.initialRotation).z
            ).toFixed(1),
          },
          length: data.length.toFixed(3),
        })),
    });
  }
}

/**
 * 전역 Calibration Manager 인스턴스
 */
export const globalCalibrationManager = new VRMCalibrationManager();

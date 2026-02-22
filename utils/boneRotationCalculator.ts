import * as THREE from 'three';
import type { Keypoint, BodyTrackingState } from '@/types/bodyTracking';

/** name 또는 인덱스로 키포인트 검색 */
function getKeypoint(
  kps: Keypoint[],
  name: string,
  index: number
): Keypoint | null {
  const byName = kps.find((kp) => kp.name === name);
  if (byName) return byName;
  return kps[index] || null;
}

/** 팔 회전 계산: Euler 각도(pitch, yaw) → Quaternion 변환 */
export function calculateArmRotation(
  shoulder: THREE.Vector3,
  elbow: THREE.Vector3,
  wrist: THREE.Vector3,
  isLeft: boolean
): { upperArm: THREE.Quaternion; lowerArm: THREE.Quaternion } {
  const sideMultiplier = isLeft ? 1 : -1;

  // T-pose 기본값 (NaN 방지)
  const defaultRotation = {
    upperArm: new THREE.Quaternion(),
    lowerArm: new THREE.Quaternion(),
  };

  // 상완 벡터: 어깨 → 팔꿈치
  const upperArmVec = elbow.clone().sub(shoulder);
  const upperLength = upperArmVec.length();

  if (upperLength < 0.01 || !isFinite(upperLength)) {
    return defaultRotation;
  }

  upperArmVec.normalize();

  if (
    !isFinite(upperArmVec.x) ||
    !isFinite(upperArmVec.y) ||
    !isFinite(upperArmVec.z)
  ) {
    return defaultRotation;
  }

  // 오일러 각도로 계산 (라디안)
  const sqrtVal = Math.sqrt(
    upperArmVec.x * upperArmVec.x + upperArmVec.z * upperArmVec.z
  );
  const pitch = Math.atan2(-upperArmVec.y, sqrtVal);
  const yaw = Math.atan2(
    upperArmVec.z * sideMultiplier,
    upperArmVec.x * sideMultiplier
  );
  const roll = 0;

  if (!isFinite(pitch) || !isFinite(yaw)) {
    return defaultRotation;
  }

  const upperArmQuat = new THREE.Quaternion();
  const euler = new THREE.Euler(pitch, yaw, roll, 'XYZ');
  upperArmQuat.setFromEuler(euler);

  // 팔꿈치 굽힘 계산
  const lowerArmVec = wrist.clone().sub(elbow);
  const lowerLength = lowerArmVec.length();

  if (lowerLength < 0.01 || !isFinite(lowerLength)) {
    return { upperArm: upperArmQuat, lowerArm: new THREE.Quaternion() };
  }

  lowerArmVec.normalize();

  if (
    !isFinite(lowerArmVec.x) ||
    !isFinite(lowerArmVec.y) ||
    !isFinite(lowerArmVec.z)
  ) {
    return { upperArm: upperArmQuat, lowerArm: new THREE.Quaternion() };
  }

  const dotProduct = upperArmVec.dot(lowerArmVec);
  const clampedDot = Math.max(-1, Math.min(1, dotProduct));
  const elbowAngle = Math.acos(clampedDot);

  if (!isFinite(elbowAngle)) {
    return { upperArm: upperArmQuat, lowerArm: new THREE.Quaternion() };
  }

  const elbowBend = Math.max(0, Math.PI - elbowAngle) * 0.7;
  const lowerArmQuat = new THREE.Quaternion();
  lowerArmQuat.setFromAxisAngle(
    new THREE.Vector3(0, 0, sideMultiplier),
    elbowBend
  );

  return { upperArm: upperArmQuat, lowerArm: lowerArmQuat };
}

/**
 * 키포인트 배열로부터 VRM 본 회전(Quaternion) 계산
 *
 * MoveNet COCO: 0=nose, 5=left_shoulder, 6=right_shoulder, 7=left_elbow,
 * 8=right_elbow, 9=left_wrist, 10=right_wrist, 11=left_hip, 12=right_hip
 */
export function calculateBodyRotations(
  kps: Keypoint[]
): BodyTrackingState | null {
  const nose = getKeypoint(kps, 'nose', 0);
  const leftShoulder = getKeypoint(kps, 'left_shoulder', 5);
  const rightShoulder = getKeypoint(kps, 'right_shoulder', 6);
  const leftElbow = getKeypoint(kps, 'left_elbow', 7);
  const rightElbow = getKeypoint(kps, 'right_elbow', 8);
  const leftWrist = getKeypoint(kps, 'left_wrist', 9);
  const rightWrist = getKeypoint(kps, 'right_wrist', 10);
  const leftHip = getKeypoint(kps, 'left_hip', 11);
  const rightHip = getKeypoint(kps, 'right_hip', 12);

  if (
    !leftShoulder ||
    !rightShoulder ||
    !leftElbow ||
    !rightElbow ||
    !leftWrist ||
    !rightWrist ||
    !nose ||
    !leftHip ||
    !rightHip
  ) {
    return null;
  }

  // Three.js Vector3로 변환
  const ls = new THREE.Vector3(
    leftShoulder.x,
    leftShoulder.y,
    leftShoulder.z ?? 0
  );
  const rs = new THREE.Vector3(
    rightShoulder.x,
    rightShoulder.y,
    rightShoulder.z ?? 0
  );
  const le = new THREE.Vector3(leftElbow.x, leftElbow.y, leftElbow.z ?? 0);
  const re = new THREE.Vector3(rightElbow.x, rightElbow.y, rightElbow.z ?? 0);
  const lw = new THREE.Vector3(leftWrist.x, leftWrist.y, leftWrist.z ?? 0);
  const rw = new THREE.Vector3(rightWrist.x, rightWrist.y, rightWrist.z ?? 0);
  const n = new THREE.Vector3(nose.x, nose.y, nose.z ?? 0);
  const lh = new THREE.Vector3(leftHip.x, leftHip.y, leftHip.z ?? 0);
  const rh = new THREE.Vector3(rightHip.x, rightHip.y, rightHip.z ?? 0);

  // 척추/가슴: 어깨-엉덩이 중심선 기준 회전
  const shoulderCenter = ls.clone().lerp(rs, 0.5);
  const hipCenter = lh.clone().lerp(rh, 0.5);
  const spineVector = shoulderCenter.clone().sub(hipCenter).normalize();
  const forwardVector = new THREE.Vector3(0, 1, 0);
  const spineQuaternion = new THREE.Quaternion().setFromUnitVectors(
    forwardVector,
    spineVector
  );

  // 머리/목: 코-어깨 중심선 기준 회전
  const headVector = n.clone().sub(shoulderCenter).normalize();
  const headQuaternion = new THREE.Quaternion().setFromUnitVectors(
    forwardVector,
    headVector
  );

  const leftArm = calculateArmRotation(ls, le, lw, true);
  const rightArm = calculateArmRotation(rs, re, rw, false);

  return {
    spine: spineQuaternion,
    chest: spineQuaternion,
    head: headQuaternion,
    neck: headQuaternion,
    leftShoulder: new THREE.Quaternion(),
    rightShoulder: new THREE.Quaternion(),
    leftUpperArm: leftArm.upperArm,
    rightUpperArm: rightArm.upperArm,
    leftLowerArm: leftArm.lowerArm,
    rightLowerArm: rightArm.lowerArm,
  };
}

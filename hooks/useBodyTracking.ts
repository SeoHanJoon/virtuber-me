'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type {
  Keypoint,
  BodyTrackingState,
  BodyTrackingOptions,
  UseBodyTrackingReturn,
} from '@/types/bodyTracking';

// TensorFlow.js와 pose-detection은 dynamic import로 로드
let poseDetection: typeof import('@tensorflow-models/pose-detection') | null =
  null;
let tf: typeof import('@tensorflow/tfjs-core') | null = null;

// PoseDetector 타입 정의
type PoseDetector = {
  estimatePoses: (
    image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ) => Promise<
    Array<{
      keypoints: Array<{ x: number; y: number; score?: number; name?: string }>;
    }>
  >;
  dispose: () => void;
};

// EMA 스무딩을 위한 헬퍼 함수
function smoothPoint3D(
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

/**
 * MoveNet 기반 상체 트래킹 훅
 */
export function useBodyTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: BodyTrackingOptions = {}
): UseBodyTrackingReturn {
  const {
    depthScale = 0.3, // z축 깊이 스케일 (단안 카메라 보정)
    smoothingFactor = 0.3, // EMA 스무딩 강도 (0~1)
    maxFPS = 30, // 최대 프레임 속도
    minConfidence = 0.3, // 최소 키포인트 신뢰도
  } = options;

  const [detector, setDetector] = useState<PoseDetector | null>(null);
  const [isBodyTrackingReady, setIsBodyTrackingReady] = useState(false);
  const [bodyState, setBodyState] = useState<BodyTrackingState | null>(null);
  const [keypoints, setKeypoints] = useState<Keypoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);

  // 이전 프레임의 스무딩된 키포인트 저장
  const smoothedKeypoints = useRef<Map<string, THREE.Vector3>>(new Map());

  /**
   * TensorFlow.js와 BlazePose 모델 로드
   */
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Dynamic import로 TensorFlow.js 로드
        if (!tf) {
          console.log('[useBodyTracking] TensorFlow.js 초기화 시작...');
          const tfModule = await import('@tensorflow/tfjs-core');
          tf = tfModule;

          await import('@tensorflow/tfjs-backend-webgl');
          await tf.setBackend('webgl');
          await tf.ready();
          console.log(
            '[useBodyTracking] ✅ TensorFlow.js WebGL 백엔드 초기화 완료'
          );
          console.log('[useBodyTracking] 현재 백엔드:', tf.getBackend());
        }

        // Dynamic import로 pose-detection 로드
        if (!poseDetection) {
          poseDetection = await import('@tensorflow-models/pose-detection');
        }

        // MoveNet 설정 (안정적이고 빠름, MediaPipe 패키지 불필요)
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          minPoseScore: 0.25,
        };

        console.log(
          '[useBodyTracking] MoveNet 모델 로딩 시작...',
          detectorConfig
        );

        const loadedDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );

        setDetector(loadedDetector);
        setIsBodyTrackingReady(true);
        console.log('[useBodyTracking] ✅ MoveNet 모델 로드 완료');
      } catch (err) {
        console.error('[useBodyTracking] MoveNet 모델 로드 실패:', err);
        setError('MoveNet 모델 로드 실패: ' + (err as Error).message);
      }
    };

    loadModel();

    return () => {
      if (detector) {
        detector.dispose();
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 키포인트를 3D로 변환 및 스무딩
   * MoveNet은 x, y만 제공하므로 z는 Y 기반으로 근사
   */
  const processKeypoints = useCallback(
    (
      rawKeypoints: Array<{
        x: number;
        y: number;
        z?: number; // MoveNet은 z값 제공 안함, Fallback 사용
        score?: number;
        name?: string;
      }>,
      videoWidth: number,
      videoHeight: number
    ): Keypoint[] => {
      // 디버깅: 원본 키포인트 확인 (0.2% 확률 - 매우 드물게)
      const shouldLog = Math.random() < 0.002;
      if (shouldLog) {
        const leftShoulder = rawKeypoints.find(
          (kp) => kp.name === 'left_shoulder'
        );
        const leftElbow = rawKeypoints.find((kp) => kp.name === 'left_elbow');
        const leftWrist = rawKeypoints.find((kp) => kp.name === 'left_wrist');
        const rightShoulder = rawKeypoints.find(
          (kp) => kp.name === 'right_shoulder'
        );
        const rightElbow = rawKeypoints.find((kp) => kp.name === 'right_elbow');
        const rightWrist = rawKeypoints.find((kp) => kp.name === 'right_wrist');
        console.log('[useBodyTracking] 원본 키포인트 (양쪽 팔):', {
          videoSize: { width: videoWidth, height: videoHeight },
          left: { shoulder: leftShoulder, elbow: leftElbow, wrist: leftWrist },
          right: {
            shoulder: rightShoulder,
            elbow: rightElbow,
            wrist: rightWrist,
          },
          totalKeypoints: rawKeypoints.length,
          minConfidence,
        });
      }

      // MoveNet COCO 키포인트 이름 매핑
      const MOVENET_KEYPOINT_NAMES = [
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

      const processed: Keypoint[] = [];
      const newSmoothedKeypoints = new Map<string, THREE.Vector3>();

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
        const normalizedY = 0.5 - normalizedY_0to1; // Y축 반전

        // Z축: MoveNet은 z값을 제공하지 않으므로 Y 기반 근사값 사용
        let normalizedZ: number;
        if (kp.z !== undefined) {
          // z값이 있으면 그대로 사용
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
        const prevSmoothed = smoothedKeypoints.current.get(keypointName);
        const smoothedPoint = prevSmoothed
          ? smoothPoint3D(prevSmoothed, currentPoint, smoothingFactor)
          : currentPoint;

        newSmoothedKeypoints.set(keypointName, smoothedPoint);

        processed.push({
          x: smoothedPoint.x,
          y: smoothedPoint.y,
          z: smoothedPoint.z,
          score: kp.score,
          name: keypointName, // 매핑된 이름 사용
        });
      });

      smoothedKeypoints.current = newSmoothedKeypoints;

      // 디버깅: 처리된 키포인트 확인
      if (shouldLog) {
        const pLeftShoulder = processed.find(
          (kp) => kp.name === 'left_shoulder'
        );
        const pLeftElbow = processed.find((kp) => kp.name === 'left_elbow');
        const pLeftWrist = processed.find((kp) => kp.name === 'left_wrist');
        const pRightShoulder = processed.find(
          (kp) => kp.name === 'right_shoulder'
        );
        const pRightElbow = processed.find((kp) => kp.name === 'right_elbow');
        const pRightWrist = processed.find((kp) => kp.name === 'right_wrist');
        console.log('[useBodyTracking] 처리된 키포인트 (양쪽 팔):', {
          left: {
            shoulder: pLeftShoulder,
            elbow: pLeftElbow,
            wrist: pLeftWrist,
          },
          right: {
            shoulder: pRightShoulder,
            elbow: pRightElbow,
            wrist: pRightWrist,
          },
          totalProcessed: processed.length,
        });
      }

      return processed;
    },
    [depthScale, smoothingFactor, minConfidence]
  );

  /**
   * 키포인트를 기반으로 VRM 본 회전 계산
   * MoveNet은 name 속성이 없으므로 인덱스로 접근
   * COCO format:
   * 0: nose, 5: left_shoulder, 6: right_shoulder,
   * 7: left_elbow, 8: right_elbow, 9: left_wrist, 10: right_wrist,
   * 11: left_hip, 12: right_hip
   */
  const calculateBodyRotations = useCallback(
    (kps: Keypoint[]): BodyTrackingState | null => {
      // MoveNet은 name 속성이 없으므로 인덱스로 접근
      // 먼저 name으로 시도하고, 실패하면 인덱스로 접근
      const getKeypoint = (name: string, index: number) => {
        const byName = kps.find((kp) => kp.name === name);
        if (byName) return byName;
        // name이 없으면 인덱스로 접근
        return kps[index] || null;
      };

      const nose = getKeypoint('nose', 0);
      const leftShoulder = getKeypoint('left_shoulder', 5);
      const rightShoulder = getKeypoint('right_shoulder', 6);
      const leftElbow = getKeypoint('left_elbow', 7);
      const rightElbow = getKeypoint('right_elbow', 8);
      const leftWrist = getKeypoint('left_wrist', 9);
      const rightWrist = getKeypoint('right_wrist', 10);
      const leftHip = getKeypoint('left_hip', 11);
      const rightHip = getKeypoint('right_hip', 12);

      // 디버깅: 키포인트 접근 방식 확인 (0.5% 확률 - 드물게 출력)
      if (Math.random() < 0.005) {
        console.log('[useBodyTracking] 🔍 키포인트 접근 (인덱스 기반):', {
          totalKeypoints: kps.length,
          hasNames: kps.some((kp) => kp.name),
          found: {
            nose: !!nose,
            leftShoulder: !!leftShoulder,
            rightShoulder: !!rightShoulder,
            leftElbow: !!leftElbow,
            rightElbow: !!rightElbow,
            leftWrist: !!leftWrist,
            rightWrist: !!rightWrist,
            leftHip: !!leftHip,
            rightHip: !!rightHip,
          },
          sampleData: {
            leftShoulder: leftShoulder
              ? {
                  x: leftShoulder.x,
                  y: leftShoulder.y,
                  score: leftShoulder.score,
                }
              : null,
          },
        });
      }

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
        // 어떤 키포인트가 없는지 디버깅 (1% 확률로만 출력)
        if (Math.random() < 0.01) {
          const missing = [];
          if (!leftShoulder) missing.push('left_shoulder');
          if (!rightShoulder) missing.push('right_shoulder');
          if (!leftElbow) missing.push('left_elbow');
          if (!rightElbow) missing.push('right_elbow');
          if (!leftWrist) missing.push('left_wrist');
          if (!rightWrist) missing.push('right_wrist');
          if (!nose) missing.push('nose');
          if (!leftHip) missing.push('left_hip');
          if (!rightHip) missing.push('right_hip');

          console.warn(
            '[useBodyTracking] ⚠️ 일부 키포인트 감지 안됨 (정상적일 수 있음):',
            {
              missing,
              tip: '상체 전체가 화면에 보이도록 조정하세요',
            }
          );
        }
        return null;
      }

      // Three.js Vector3로 변환 (z값이 undefined면 0으로 대체)
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
      const re = new THREE.Vector3(
        rightElbow.x,
        rightElbow.y,
        rightElbow.z ?? 0
      );
      const lw = new THREE.Vector3(leftWrist.x, leftWrist.y, leftWrist.z ?? 0);
      const rw = new THREE.Vector3(
        rightWrist.x,
        rightWrist.y,
        rightWrist.z ?? 0
      );
      const n = new THREE.Vector3(nose.x, nose.y, nose.z ?? 0);
      const lh = new THREE.Vector3(leftHip.x, leftHip.y, leftHip.z ?? 0);
      const rh = new THREE.Vector3(rightHip.x, rightHip.y, rightHip.z ?? 0);

      // 척추/가슴 회전 (어깨 중앙과 엉덩이 중앙 기준)
      const shoulderCenter = ls.clone().lerp(rs, 0.5);
      const hipCenter = lh.clone().lerp(rh, 0.5);
      const spineVector = shoulderCenter.clone().sub(hipCenter).normalize();
      const forwardVector = new THREE.Vector3(0, 1, 0); // VRM의 기본 척추 방향 (Y-up)
      const spineQuaternion = new THREE.Quaternion().setFromUnitVectors(
        forwardVector,
        spineVector
      );

      // 머리/목 회전 (코와 어깨 중앙 기준)
      const headVector = n.clone().sub(shoulderCenter).normalize();
      const headQuaternion = new THREE.Quaternion().setFromUnitVectors(
        forwardVector,
        headVector
      );

      // 팔 회전 계산 (각도 기반 - 안정적)
      const calculateArmRotation = (
        shoulder: THREE.Vector3,
        elbow: THREE.Vector3,
        wrist: THREE.Vector3,
        isLeft: boolean
      ) => {
        const sideMultiplier = isLeft ? 1 : -1;

        // 기본 T-pose Quaternion (항상 유효한 값 반환)
        const defaultRotation = {
          upperArm: new THREE.Quaternion(),
          lowerArm: new THREE.Quaternion(),
        };

        // 상완 벡터 (어깨 -> 팔꿈치)
        const upperArmVec = elbow.clone().sub(shoulder);
        const upperLength = upperArmVec.length();

        if (upperLength < 0.01 || !isFinite(upperLength)) {
          // 너무 가까우면 기본 T-pose 유지
          return defaultRotation;
        }

        upperArmVec.normalize();

        // NaN 체크
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
        const roll = 0; // 롤은 0으로 고정

        // NaN 체크
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
          // 전완이 너무 짧으면 상완만 반환
          return {
            upperArm: upperArmQuat,
            lowerArm: new THREE.Quaternion(),
          };
        }

        lowerArmVec.normalize();

        // NaN 체크
        if (
          !isFinite(lowerArmVec.x) ||
          !isFinite(lowerArmVec.y) ||
          !isFinite(lowerArmVec.z)
        ) {
          return {
            upperArm: upperArmQuat,
            lowerArm: new THREE.Quaternion(),
          };
        }

        const dotProduct = upperArmVec.dot(lowerArmVec);
        const clampedDot = Math.max(-1, Math.min(1, dotProduct));
        const elbowAngle = Math.acos(clampedDot);

        if (!isFinite(elbowAngle)) {
          return {
            upperArm: upperArmQuat,
            lowerArm: new THREE.Quaternion(),
          };
        }

        const elbowBend = Math.max(0, Math.PI - elbowAngle) * 0.7;
        const lowerArmQuat = new THREE.Quaternion();
        lowerArmQuat.setFromAxisAngle(
          new THREE.Vector3(0, 0, sideMultiplier),
          elbowBend
        );

        return {
          upperArm: upperArmQuat,
          lowerArm: lowerArmQuat,
        };
      };

      const leftArm = calculateArmRotation(ls, le, lw, true);
      const rightArm = calculateArmRotation(rs, re, rw, false);

      // 디버깅: 회전값 출력 (양쪽 팔, 0.2% 확률)
      if (Math.random() < 0.002) {
        console.log('[useBodyTracking] 팔 회전 계산 (양쪽):', {
          left: {
            shoulder: { x: ls.x, y: ls.y, z: ls.z },
            elbow: { x: le.x, y: le.y, z: le.z },
            wrist: { x: lw.x, y: lw.y, z: lw.z },
            upperArm: {
              x: leftArm.upperArm.x,
              y: leftArm.upperArm.y,
              z: leftArm.upperArm.z,
              w: leftArm.upperArm.w,
            },
            lowerArm: {
              x: leftArm.lowerArm.x,
              y: leftArm.lowerArm.y,
              z: leftArm.lowerArm.z,
              w: leftArm.lowerArm.w,
            },
          },
          right: {
            shoulder: { x: rs.x, y: rs.y, z: rs.z },
            elbow: { x: re.x, y: re.y, z: re.z },
            wrist: { x: rw.x, y: rw.y, z: rw.z },
            upperArm: {
              x: rightArm.upperArm.x,
              y: rightArm.upperArm.y,
              z: rightArm.upperArm.z,
              w: rightArm.upperArm.w,
            },
            lowerArm: {
              x: rightArm.lowerArm.x,
              y: rightArm.lowerArm.y,
              z: rightArm.lowerArm.z,
              w: rightArm.lowerArm.w,
            },
          },
        });
      }

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
    },
    []
  );

  /**
   * 트래킹 루프
   */
  const trackPose = useCallback(async () => {
    if (!detector || !videoRef.current || videoRef.current.readyState < 2) {
      animationFrameId.current = requestAnimationFrame(trackPose);
      return;
    }

    const now = performance.now();
    const elapsed = now - lastFrameTime.current;
    const interval = 1000 / maxFPS;

    if (elapsed > interval) {
      lastFrameTime.current = now - (elapsed % interval);

      try {
        const video = videoRef.current;

        // 비디오 상태 확인 (첫 프레임만)
        if (!video.videoWidth || !video.videoHeight) {
          if (Math.random() < 0.01) {
            console.warn('[useBodyTracking] 비디오 크기가 0입니다:', {
              width: video.videoWidth,
              height: video.videoHeight,
              readyState: video.readyState,
            });
          }
          animationFrameId.current = requestAnimationFrame(trackPose);
          return;
        }

        // 비디오 정보 확인 (항상 출력 - 디버깅용)
        if (Math.random() < 0.1) {
          console.log('[useBodyTracking] estimatePoses 호출 전:', {
            videoElement: !!video,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused,
            currentTime: video.currentTime,
          });
        }

        const poses = await detector.estimatePoses(video);

        // 포즈 추정 결과 확인 (0.5% 확률 - 드물게 출력)
        if (Math.random() < 0.005) {
          const firstKp = poses?.[0]?.keypoints?.[0];
          const leftShoulderByName = poses?.[0]?.keypoints?.find(
            (kp) => kp.name === 'left_shoulder'
          );
          const keypointAt5 = poses?.[0]?.keypoints?.[5]; // MoveNet left_shoulder 인덱스
          const firstKpWithZ = firstKp as
            | {
                x: number;
                y: number;
                z?: number;
                score?: number;
                name?: string;
              }
            | undefined;
          const leftShoulderWithZ = leftShoulderByName as
            | {
                x: number;
                y: number;
                z?: number;
                score?: number;
                name?: string;
              }
            | undefined;
          const kp5WithZ = keypointAt5 as
            | {
                x: number;
                y: number;
                z?: number;
                score?: number;
                name?: string;
              }
            | undefined;

          console.log('[useBodyTracking] 🔍 포즈 추정 결과 상세:', {
            posesCount: poses?.length || 0,
            totalKeypoints: poses?.[0]?.keypoints?.length || 0,
            firstKeypoint: firstKpWithZ
              ? {
                  name: firstKpWithZ.name,
                  x: firstKpWithZ.x,
                  y: firstKpWithZ.y,
                  z: firstKpWithZ.z,
                  score: firstKpWithZ.score,
                }
              : null,
            leftShoulderByName: leftShoulderWithZ
              ? {
                  x: leftShoulderWithZ.x,
                  y: leftShoulderWithZ.y,
                  z: leftShoulderWithZ.z,
                  score: leftShoulderWithZ.score,
                }
              : null,
            keypointAt5: kp5WithZ
              ? {
                  name: kp5WithZ.name,
                  x: kp5WithZ.x,
                  y: kp5WithZ.y,
                  z: kp5WithZ.z,
                  score: kp5WithZ.score,
                }
              : null,
            allKeypointNames: poses?.[0]?.keypoints?.map(
              (kp) => (kp as { name?: string }).name || 'NO_NAME'
            ),
          });
        }

        if (poses && poses.length > 0) {
          const mainPose = poses[0];

          // 키포인트가 null인지 확인
          const nullCount = mainPose.keypoints.filter((kp) => {
            const kpWithZ = kp as { x: number; y: number; z?: number };
            return (
              kpWithZ.x === null || kpWithZ.y === null || kpWithZ.z === null
            );
          }).length;

          if (Math.random() < 0.1 && nullCount > 0) {
            console.warn('[useBodyTracking] null 키포인트 발견:', {
              totalKeypoints: mainPose.keypoints.length,
              nullCount,
              firstNull: mainPose.keypoints.find((kp) => {
                const kpWithZ = kp as { x: number; y: number; z?: number };
                return (
                  kpWithZ.x === null || kpWithZ.y === null || kpWithZ.z === null
                );
              }),
            });
          }

          const processedKeypoints = processKeypoints(
            mainPose.keypoints,
            video.videoWidth,
            video.videoHeight
          );
          setKeypoints(processedKeypoints);

          const rotations = calculateBodyRotations(processedKeypoints);

          // 디버깅: 회전 계산 결과 확인 (0.5% 확률)
          if (Math.random() < 0.005) {
            console.log('[useBodyTracking] 🎯 calculateBodyRotations 결과:', {
              hasRotations: !!rotations,
              processedKeypointsCount: processedKeypoints.length,
              rotations: rotations
                ? {
                    leftUpperArm: rotations.leftUpperArm,
                    rightUpperArm: rotations.rightUpperArm,
                  }
                : null,
            });
          }

          if (rotations) {
            setBodyState(rotations);
          } else {
            // null 반환은 정상적인 동작일 수 있음 (포즈 변화 시)
            // 로그를 거의 출력하지 않음 (0.1% 확률)
            if (Math.random() < 0.001) {
              console.warn(
                '[useBodyTracking] ⚠️ calculateBodyRotations가 null 반환 (일부 키포인트 감지 안됨)'
              );
            }
            setBodyState(null);
          }
        } else {
          // 포즈가 감지되지 않음 (0.1% 확률로만 로그)
          if (Math.random() < 0.001) {
            console.warn(
              '[useBodyTracking] 포즈가 감지되지 않음 (정상적일 수 있음 - 화면에서 벗어남)'
            );
          }
          setBodyState(null);
          setKeypoints(null);
        }
      } catch (err) {
        console.error('[useBodyTracking] 포즈 추정 오류:', err);
        setError('포즈 추정 오류: ' + (err as Error).message);
        setBodyState(null);
        setKeypoints(null);
      }
    }

    animationFrameId.current = requestAnimationFrame(trackPose);
  }, [detector, maxFPS, processKeypoints, calculateBodyRotations, videoRef]);

  /**
   * 트래킹 시작/중지 함수
   */
  const startBodyTracking = useCallback(async () => {
    console.log('[useBodyTracking] 트래킹 시작 요청', {
      detectorReady: !!detector,
      videoReady: !!videoRef.current,
      videoReadyState: videoRef.current?.readyState,
    });

    if (!detector) {
      const errorMsg = 'MoveNet detector가 준비되지 않았습니다.';
      console.error('[useBodyTracking]', errorMsg);
      setError(errorMsg);
      return;
    }

    if (!videoRef.current || videoRef.current.readyState < 2) {
      const errorMsg = '비디오가 준비되지 않았습니다.';
      console.error('[useBodyTracking]', errorMsg);
      setError(errorMsg);
      return;
    }

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    lastFrameTime.current = performance.now();
    animationFrameId.current = requestAnimationFrame(trackPose);
    console.log('[useBodyTracking] ✅ MoveNet 바디 트래킹 시작');
  }, [detector, trackPose, videoRef]);

  const stopBodyTracking = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    setBodyState(null);
    setKeypoints(null);
    console.log('[useBodyTracking] 바디 트래킹 중지');
  }, []);

  return {
    bodyState,
    isBodyTrackingReady,
    startBodyTracking,
    stopBodyTracking,
    error,
    keypoints,
  };
}

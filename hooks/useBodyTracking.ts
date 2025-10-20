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

        // BlazePose 설정 (TFjs 런타임 - Webpack 호환)
        // 'full' 모델에서 NaN 발생 → 'lite' 모델로 변경
        const detectorConfig = {
          runtime: 'tfjs' as const,
          modelType: 'lite' as const, // full → lite (더 가볍고 안정적)
          enableSmoothing: true,
        };

        console.log(
          '[useBodyTracking] ✅ BlazePose 모델 로딩 시작 (TFjs runtime, lite model)...',
          detectorConfig
        );

        const loadedDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.BlazePose,
          detectorConfig
        );

        console.log('[useBodyTracking] ✅ BlazePose detector 객체 생성 완료');

        // 🔥 중요: 더미 이미지로 모델 워밍업 (첫 추론 시 초기화 필요)
        console.log(
          '[useBodyTracking] 🔥 모델 워밍업 시작 (null 문제 해결)...'
        );
        try {
          // 640x480 크기의 더미 캔버스 생성
          const dummyCanvas = document.createElement('canvas');
          dummyCanvas.width = 640;
          dummyCanvas.height = 480;
          const ctx = dummyCanvas.getContext('2d');
          if (ctx) {
            // 검은 배경으로 채우기
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 640, 480);
          }

          // 더미 프레임으로 첫 추론 실행 (모델 가중치 로드 및 초기화)
          console.log('[useBodyTracking] 🔥 더미 추론 실행 중...');
          const warmupResult = await loadedDetector.estimatePoses(dummyCanvas);
          console.log('[useBodyTracking] ✅ 모델 워밍업 완료! 결과:', {
            posesLength: warmupResult?.length,
            firstPoseKeypoints: warmupResult?.[0]?.keypoints?.length,
          });
        } catch (warmupErr) {
          console.warn('[useBodyTracking] ⚠️ 모델 워밍업 실패:', warmupErr);
        }

        setDetector(loadedDetector);
        setIsBodyTrackingReady(true);
        console.log('[useBodyTracking] ✅✅✅ BlazePose 초기화 완료!');
      } catch (err) {
        console.error('[useBodyTracking] ❌ BlazePose 모델 로드 실패:', err);
        setError('BlazePose 모델 로드 실패: ' + (err as Error).message);
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
      // 디버깅: 원본 키포인트 확인 (5% 확률 - NaN 문제 해결 후 빈도 감소)
      const shouldLog = Math.random() < 0.05;

      // 🔍 첫 3개 키포인트의 원본 데이터 타입과 값 확인
      if (shouldLog) {
        console.log('[useBodyTracking] 🔍 원본 키포인트 샘플 (처음 3개):', {
          videoSize: { width: videoWidth, height: videoHeight },
          totalKeypoints: rawKeypoints.length,
          sample: rawKeypoints.slice(0, 3).map((kp, i) => ({
            index: i,
            name: kp.name,
            x: kp.x,
            y: kp.y,
            z: (kp as { z?: number }).z,
            score: kp.score,
            xType: typeof kp.x,
            yType: typeof kp.y,
            isXNaN: Number.isNaN(kp.x),
            isYNaN: Number.isNaN(kp.y),
          })),
        });
      }

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

      // BlazePose COCO 키포인트 이름 매핑 (33개)
      const BLAZEPOSE_KEYPOINT_NAMES = [
        'nose',
        'left_eye_inner',
        'left_eye',
        'left_eye_outer',
        'right_eye_inner',
        'right_eye',
        'right_eye_outer',
        'left_ear',
        'right_ear',
        'mouth_left',
        'mouth_right',
        'left_shoulder',
        'right_shoulder',
        'left_elbow',
        'right_elbow',
        'left_wrist',
        'right_wrist',
        'left_pinky',
        'right_pinky',
        'left_index',
        'right_index',
        'left_thumb',
        'right_thumb',
        'left_hip',
        'right_hip',
        'left_knee',
        'right_knee',
        'left_ankle',
        'right_ankle',
        'left_heel',
        'right_heel',
        'left_foot_index',
        'right_foot_index',
      ];

      const processed: Keypoint[] = [];
      const newSmoothedKeypoints = new Map<string, THREE.Vector3>();

      rawKeypoints.forEach((kp, index) => {
        // BlazePose는 name이 없을 수 있으므로 인덱스로 이름 할당
        const keypointName =
          kp.name || BLAZEPOSE_KEYPOINT_NAMES[index] || `keypoint_${index}`;

        if (kp.score === undefined || kp.score < minConfidence) {
          return;
        }

        // 🔍 NaN 디버깅: 원본 값 확인 (첫 3개만, 5% 확률)
        if (index < 3 && shouldLog) {
          console.log(
            `[useBodyTracking] 🔍 키포인트 #${index} (${keypointName}) 처리 전:`,
            {
              rawX: kp.x,
              rawY: kp.y,
              rawZ: (kp as { z?: number }).z,
              score: kp.score,
            }
          );
        }

        // BlazePose는 이미 0~1 범위로 정규화된 좌표를 반환 (픽셀이 아님!)
        // 중심을 (0,0)으로 이동: 0~1 → -0.5~0.5
        // Y축은 Three.js와 일치하도록 반전 (위가 양수)
        const normalizedX = kp.x - 0.5;
        const normalizedY = 0.5 - kp.y; // Y축 반전

        // Z축: BlazePose는 실제 z값을 제공 (엉덩이 중심 기준 상대 깊이)
        let normalizedZ: number;
        if (kp.z !== undefined) {
          // BlazePose의 z값은 이미 정규화되어 있음
          normalizedZ = -kp.z * depthScale;
        } else {
          // Fallback: Y 기반 깊이 근사 (위로 갈수록 앞에 있다고 가정)
          normalizedZ = -(kp.y - 0.5) * depthScale;
        }

        // 🔍 NaN 디버깅: 정규화 후 값 확인 (첫 3개만, 5% 확률)
        if (index < 3 && shouldLog) {
          console.log(
            `[useBodyTracking] 🔍 키포인트 #${index} (${keypointName}) 정규화 후:`,
            {
              normalizedX,
              normalizedY,
              normalizedZ,
              isXNaN: Number.isNaN(normalizedX),
              isYNaN: Number.isNaN(normalizedY),
              isZNaN: Number.isNaN(normalizedZ),
            }
          );
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

        const finalKeypoint = {
          x: smoothedPoint.x,
          y: smoothedPoint.y,
          z: smoothedPoint.z,
          score: kp.score,
          name: keypointName, // 매핑된 이름 사용
        };

        // 🔍 NaN 디버깅: 최종 출력 확인 (첫 3개만, 5% 확률)
        if (index < 3 && shouldLog) {
          console.log(
            `[useBodyTracking] 🔍 키포인트 #${index} (${keypointName}) 최종 출력:`,
            {
              x: finalKeypoint.x,
              y: finalKeypoint.y,
              z: finalKeypoint.z,
              isXNaN: Number.isNaN(finalKeypoint.x),
              isYNaN: Number.isNaN(finalKeypoint.y),
              isZNaN: Number.isNaN(finalKeypoint.z),
            }
          );
        }

        processed.push(finalKeypoint);
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
   * BlazePose는 name 속성이 없을 수 있으므로 인덱스로 접근
   * BlazePose format (33 landmarks):
   * 0: nose, 11: left_shoulder, 12: right_shoulder,
   * 13: left_elbow, 14: right_elbow, 15: left_wrist, 16: right_wrist,
   * 23: left_hip, 24: right_hip
   */
  const calculateBodyRotations = useCallback(
    (kps: Keypoint[]): BodyTrackingState | null => {
      // BlazePose는 name 속성이 없을 수 있으므로 인덱스로 접근
      // 먼저 name으로 시도하고, 실패하면 인덱스로 접근
      const getKeypoint = (name: string, index: number) => {
        const byName = kps.find((kp) => kp.name === name);
        if (byName) return byName;
        // name이 없으면 인덱스로 접근
        return kps[index] || null;
      };

      const nose = getKeypoint('nose', 0);
      const leftShoulder = getKeypoint('left_shoulder', 11);
      const rightShoulder = getKeypoint('right_shoulder', 12);
      const leftElbow = getKeypoint('left_elbow', 13);
      const rightElbow = getKeypoint('right_elbow', 14);
      const leftWrist = getKeypoint('left_wrist', 15);
      const rightWrist = getKeypoint('right_wrist', 16);
      const leftHip = getKeypoint('left_hip', 23);
      const rightHip = getKeypoint('right_hip', 24);

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

        // 비디오 정보 확인 (5% 확률 - NaN 문제 해결 후 빈도 감소)
        if (Math.random() < 0.05) {
          console.log('[useBodyTracking] 🎥 estimatePoses 호출 전:', {
            videoElement: !!video,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused,
            currentTime: video.currentTime,
          });
        }

        const poses = await detector.estimatePoses(video);

        // 🔍 NaN 디버깅: poses 원본 반환값 상세 확인 (100% - NaN 문제 해결까지)
        console.log('[useBodyTracking] 🔍🔍🔍 estimatePoses 원본 반환값:', {
          posesType: typeof poses,
          posesIsArray: Array.isArray(poses),
          posesLength: poses?.length,
          hasPoses: !!poses && poses.length > 0,
        });

        if (poses && poses.length > 0) {
          const firstPose = poses[0];
          console.log(
            '[useBodyTracking] 🔍🔍 포즈 객체:',
            JSON.stringify(poses)
          );
          console.log('[useBodyTracking] 🔍🔍🔍 첫 번째 포즈 구조:', {
            hasKeypoints: !!firstPose.keypoints,
            keypointsType: typeof firstPose.keypoints,
            keypointsIsArray: Array.isArray(firstPose.keypoints),
            keypointsLength: firstPose.keypoints?.length,
          });

          if (firstPose.keypoints && firstPose.keypoints.length > 0) {
            // 첫 3개 키포인트의 원본 값 확인
            const first3Keypoints = firstPose.keypoints.slice(0, 3);
            console.log(
              '[useBodyTracking] 🔍🔍🔍 첫 3개 키포인트 원본 값:',
              first3Keypoints.map((kp, i) => {
                const kpWithZ = kp as {
                  x: number;
                  y: number;
                  z?: number;
                  score?: number;
                  name?: string;
                };
                return {
                  index: i,
                  x: kp.x,
                  y: kp.y,
                  z: kpWithZ.z,
                  score: kp.score,
                  name: kp.name,
                  xType: typeof kp.x,
                  yType: typeof kp.y,
                  zType: typeof kpWithZ.z,
                  scoreType: typeof kp.score,
                  isXNumber: typeof kp.x === 'number',
                  isYNumber: typeof kp.y === 'number',
                  isXNaN: typeof kp.x === 'number' && Number.isNaN(kp.x),
                  isYNaN: typeof kp.y === 'number' && Number.isNaN(kp.y),
                  isZNaN:
                    typeof kpWithZ.z === 'number' && Number.isNaN(kpWithZ.z),
                  isScoreNaN:
                    typeof kp.score === 'number' && Number.isNaN(kp.score),
                };
              })
            );
          } else {
            console.warn(
              '[useBodyTracking] ⚠️ keypoints 배열이 비어있거나 존재하지 않음'
            );
          }
        } else {
          console.warn('[useBodyTracking] ⚠️ poses가 비어있거나 존재하지 않음');
        }

        // 포즈 추정 결과 확인 (5% 확률 - NaN 문제 해결 후 빈도 감소)
        if (Math.random() < 0.05) {
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
          // 포즈가 감지되지 않음 (1% 확률로만 로그 - NaN 문제 해결 후 빈도 감소)
          if (Math.random() < 0.01) {
            console.warn(
              '[useBodyTracking] ⚠️ 포즈가 감지되지 않음 (정상적일 수 있음 - 화면에서 벗어남 or 모델 로딩 중)'
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
      const errorMsg = 'BlazePose detector가 준비되지 않았습니다.';
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
    console.log(
      '[useBodyTracking] ✅ BlazePose 바디 트래킹 시작 (33 landmarks + Z-depth, TFjs)'
    );
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

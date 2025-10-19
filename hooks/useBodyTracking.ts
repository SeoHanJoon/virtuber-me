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
   * TensorFlow.js와 MoveNet 모델 로드
   */
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Dynamic import로 TensorFlow.js 로드
        if (!tf) {
          const tfModule = await import('@tensorflow/tfjs-core');
          tf = tfModule;
          await import('@tensorflow/tfjs-backend-webgl');
          await tf.setBackend('webgl');
          await tf.ready();
        }

        // Dynamic import로 pose-detection 로드
        if (!poseDetection) {
          poseDetection = await import('@tensorflow-models/pose-detection');
        }

        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true, // MoveNet 자체 스무딩 활성화
        };

        const loadedDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );

        setDetector(loadedDetector);
        setIsBodyTrackingReady(true);
        console.log('[useBodyTracking] MoveNet 모델 로드 완료');
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
   * 2D 키포인트를 Pseudo-3D로 변환 및 스무딩
   */
  const processKeypoints = useCallback(
    (
      rawKeypoints: Array<{
        x: number;
        y: number;
        score?: number;
        name?: string;
      }>,
      videoWidth: number,
      videoHeight: number
    ): Keypoint[] => {
      const processed: Keypoint[] = [];
      const newSmoothedKeypoints = new Map<string, THREE.Vector3>();

      rawKeypoints.forEach((kp) => {
        if (!kp.name || kp.score === undefined || kp.score < minConfidence) {
          return;
        }

        // 2D 좌표를 0~1 범위로 정규화하고, 중심을 (0,0)으로 이동
        // Y축은 Three.js와 일치하도록 반전 (위가 양수)
        const normalizedX = kp.x / videoWidth - 0.5;
        const normalizedY = 0.5 - kp.y / videoHeight; // Y축 반전
        // Z축은 Y좌표를 기반으로 깊이 근사 (Y가 작을수록(위로 갈수록) Z가 앞으로)
        const pseudoZ = -(kp.y / videoHeight - 0.5) * depthScale;

        const currentPoint = new THREE.Vector3(
          normalizedX,
          normalizedY,
          pseudoZ
        );

        // EMA 스무딩 적용
        const prevSmoothed = smoothedKeypoints.current.get(kp.name);
        const smoothedPoint = prevSmoothed
          ? smoothPoint3D(prevSmoothed, currentPoint, smoothingFactor)
          : currentPoint;

        newSmoothedKeypoints.set(kp.name, smoothedPoint);

        processed.push({
          x: smoothedPoint.x,
          y: smoothedPoint.y,
          z: smoothedPoint.z,
          score: kp.score,
          name: kp.name,
        });
      });

      smoothedKeypoints.current = newSmoothedKeypoints;
      return processed;
    },
    [depthScale, smoothingFactor, minConfidence]
  );

  /**
   * 키포인트를 기반으로 VRM 본 회전 계산
   */
  const calculateBodyRotations = useCallback(
    (kps: Keypoint[]): BodyTrackingState | null => {
      const getKeypoint = (name: string) => kps.find((kp) => kp.name === name);

      const leftShoulder = getKeypoint('left_shoulder');
      const rightShoulder = getKeypoint('right_shoulder');
      const leftElbow = getKeypoint('left_elbow');
      const rightElbow = getKeypoint('right_elbow');
      const leftWrist = getKeypoint('left_wrist');
      const rightWrist = getKeypoint('right_wrist');
      const nose = getKeypoint('nose');
      const leftHip = getKeypoint('left_hip');
      const rightHip = getKeypoint('right_hip');

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
        leftShoulder.z
      );
      const rs = new THREE.Vector3(
        rightShoulder.x,
        rightShoulder.y,
        rightShoulder.z
      );
      const le = new THREE.Vector3(leftElbow.x, leftElbow.y, leftElbow.z);
      const re = new THREE.Vector3(rightElbow.x, rightElbow.y, rightElbow.z);
      const lw = new THREE.Vector3(leftWrist.x, leftWrist.y, leftWrist.z);
      const rw = new THREE.Vector3(rightWrist.x, rightWrist.y, rightWrist.z);
      const n = new THREE.Vector3(nose.x, nose.y, nose.z);
      const lh = new THREE.Vector3(leftHip.x, leftHip.y, leftHip.z);
      const rh = new THREE.Vector3(rightHip.x, rightHip.y, rightHip.z);

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

      // 팔 회전 (상완: 어깨-팔꿈치, 전완: 팔꿈치-손목)
      const calculateArmQuaternions = (
        shoulder: THREE.Vector3,
        elbow: THREE.Vector3,
        wrist: THREE.Vector3,
        isLeft: boolean
      ) => {
        const upperArmVector = elbow.clone().sub(shoulder).normalize();
        const lowerArmVector = wrist.clone().sub(elbow).normalize();

        // VRM T-pose 기준 팔 방향 (X축)
        const referenceUpperArm = new THREE.Vector3(isLeft ? 1 : -1, 0, 0);
        const referenceLowerArm = new THREE.Vector3(isLeft ? 1 : -1, 0, 0);

        const upperArmQuaternion = new THREE.Quaternion().setFromUnitVectors(
          referenceUpperArm,
          upperArmVector
        );
        const lowerArmQuaternion = new THREE.Quaternion().setFromUnitVectors(
          referenceLowerArm,
          lowerArmVector
        );

        return { upperArmQuaternion, lowerArmQuaternion };
      };

      const {
        upperArmQuaternion: leftUpperArm,
        lowerArmQuaternion: leftLowerArm,
      } = calculateArmQuaternions(ls, le, lw, true);
      const {
        upperArmQuaternion: rightUpperArm,
        lowerArmQuaternion: rightLowerArm,
      } = calculateArmQuaternions(rs, re, rw, false);

      return {
        spine: spineQuaternion,
        chest: spineQuaternion, // 가슴은 척추와 동일하게 일단 설정
        head: headQuaternion,
        neck: headQuaternion, // 목은 머리와 동일하게 일단 설정
        leftShoulder: new THREE.Quaternion(), // MoveNet은 어깨 회전 직접 제공 안함
        rightShoulder: new THREE.Quaternion(),
        leftUpperArm,
        rightUpperArm,
        leftLowerArm,
        rightLowerArm,
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
        const poses = await detector.estimatePoses(video);

        if (poses && poses.length > 0) {
          const mainPose = poses[0];
          const processedKeypoints = processKeypoints(
            mainPose.keypoints,
            video.videoWidth,
            video.videoHeight
          );
          setKeypoints(processedKeypoints); // 디버깅용

          const rotations = calculateBodyRotations(processedKeypoints);
          if (rotations) {
            setBodyState(rotations);
          } else {
            setBodyState(null);
          }
        } else {
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
    if (!detector) {
      setError('MoveNet detector가 준비되지 않았습니다.');
      return;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    lastFrameTime.current = performance.now();
    animationFrameId.current = requestAnimationFrame(trackPose);
    console.log('[useBodyTracking] 바디 트래킹 시작');
  }, [detector, trackPose]);

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

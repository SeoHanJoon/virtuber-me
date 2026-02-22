'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type {
  Keypoint,
  BodyTrackingState,
  BodyTrackingOptions,
  UseBodyTrackingReturn,
} from '@/types/bodyTracking';
import { processKeypoints } from '@/utils/poseKeypointProcessor';
import { calculateBodyRotations } from '@/utils/boneRotationCalculator';

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

/**
 * MoveNet 기반 상체 트래킹 훅
 */
export function useBodyTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: BodyTrackingOptions = {}
): UseBodyTrackingReturn {
  const {
    depthScale = 0.3,
    smoothingFactor = 0.3,
    maxFPS = 30,
    minConfidence = 0.3,
  } = options;

  const [detector, setDetector] = useState<PoseDetector | null>(null);
  const [isBodyTrackingReady, setIsBodyTrackingReady] = useState(false);
  const [bodyState, setBodyState] = useState<BodyTrackingState | null>(null);
  const [keypoints, setKeypoints] = useState<Keypoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);
  const smoothedKeypoints = useRef<Map<string, THREE.Vector3>>(new Map());

  // TensorFlow.js와 MoveNet 모델 로드
  useEffect(() => {
    const loadModel = async () => {
      try {
        if (!tf) {
          const tfModule = await import('@tensorflow/tfjs-core');
          tf = tfModule;
          await import('@tensorflow/tfjs-backend-webgl');
          await tf.setBackend('webgl');
          await tf.ready();
        }

        if (!poseDetection) {
          poseDetection = await import('@tensorflow-models/pose-detection');
        }

        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          minPoseScore: 0.25,
        };

        const loadedDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );

        setDetector(loadedDetector);
        setIsBodyTrackingReady(true);
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

  /** 트래킹 루프 */
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

        if (!video.videoWidth || !video.videoHeight) {
          animationFrameId.current = requestAnimationFrame(trackPose);
          return;
        }

        const poses = await detector.estimatePoses(video);

        if (poses && poses.length > 0) {
          const mainPose = poses[0];

          const result = processKeypoints(
            mainPose.keypoints,
            video.videoWidth,
            video.videoHeight,
            { depthScale, smoothingFactor, minConfidence },
            smoothedKeypoints.current
          );
          smoothedKeypoints.current = result.newSmoothed;
          setKeypoints(result.processed);

          const rotations = calculateBodyRotations(result.processed);
          setBodyState(rotations);
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
  }, [detector, maxFPS, depthScale, smoothingFactor, minConfidence, videoRef]);

  /** 트래킹 시작 */
  const startBodyTracking = useCallback(async () => {
    if (!detector) {
      setError('MoveNet detector가 준비되지 않았습니다.');
      return;
    }

    if (!videoRef.current || videoRef.current.readyState < 2) {
      setError('비디오가 준비되지 않았습니다.');
      return;
    }

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    lastFrameTime.current = performance.now();
    animationFrameId.current = requestAnimationFrame(trackPose);
  }, [detector, trackPose, videoRef]);

  /** 트래킹 중지 */
  const stopBodyTracking = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    setBodyState(null);
    setKeypoints(null);
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

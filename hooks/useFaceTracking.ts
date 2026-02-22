/**
 * MediaPipe Face Landmarker를 사용한 얼굴 추적 훅
 *
 * 웹캠에서 실시간으로 얼굴 랜드마크를 감지하고,
 * VRM 표정에 매핑할 수 있는 데이터를 제공합니다.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { FaceLandmarks } from '../types/tracking';
import { processFaceLandmarks } from '../utils/faceLandmarkProcessor';

/**
 * 훅 반환 타입
 */
export interface UseFaceTrackingReturn {
  // 현재 얼굴 랜드마크 데이터
  landmarks: FaceLandmarks | null;

  // 비디오 엘리먼트 ref
  videoRef: React.RefObject<HTMLVideoElement | null>;

  // 상태
  isReady: boolean; // MediaPipe 준비 완료
  isTracking: boolean; // 추적 중
  error: string | null;

  // 제어 함수
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

/**
 * 얼굴 추적 훅
 */
export function useFaceTracking(): UseFaceTrackingReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [landmarks, setLandmarks] = useState<FaceLandmarks | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * MediaPipe Face Landmarker 초기화
   */
  useEffect(() => {
    let mounted = true;

    async function initFaceLandmarker() {
      try {
        console.log('[Face Tracking] MediaPipe 초기화 중...');

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const landmarker = await FaceLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1, // 한 명의 얼굴만 추적
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: true, // 표정 블렌드셰이프 활성화
            outputFacialTransformationMatrixes: true,
          }
        );

        if (mounted) {
          faceLandmarkerRef.current = landmarker;
          setIsReady(true);
          console.log('[Face Tracking] MediaPipe 준비 완료');
        }
      } catch (err) {
        console.error('[Face Tracking] 초기화 오류:', err);
        if (mounted) {
          setError('얼굴 추적 초기화 실패');
        }
      }
    }

    initFaceLandmarker();

    return () => {
      mounted = false;
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  /**
   * 웹캠 시작 및 추적 시작
   */
  const startTracking = useCallback(async () => {
    if (!faceLandmarkerRef.current) {
      setError('MediaPipe가 준비되지 않았습니다.');
      return;
    }

    try {
      console.log('[Face Tracking] 웹캠 시작...');

      // 웹캠 스트림 획득
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        streamRef.current = stream;

        console.log('[Face Tracking] 추적 시작');
        setIsTracking(true);
        setError(null);

        // 추적 루프 시작
        detectFace();
      }
    } catch (err) {
      console.error('[Face Tracking] 웹캠 접근 오류:', err);
      setError('웹캠 접근 실패. HTTPS 환경에서 실행해주세요.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 추적 중지
   */
  const stopTracking = useCallback(() => {
    console.log('[Face Tracking] 추적 중지');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsTracking(false);
    setLandmarks(null);
  }, []);

  /**
   * 얼굴 감지 루프
   */
  const detectFace = useCallback(() => {
    const video = videoRef.current;
    const landmarker = faceLandmarkerRef.current;

    if (!video || !landmarker || video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(detectFace);
      return;
    }

    try {
      const startTimeMs = performance.now();
      const result: FaceLandmarkerResult = landmarker.detectForVideo(
        video,
        startTimeMs
      );

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const rawLandmarks = result.faceLandmarks[0];

        // 얼굴 데이터 계산
        const faceLandmarks = processFaceLandmarks(rawLandmarks);
        setLandmarks(faceLandmarks);
      } else {
        // 얼굴이 감지되지 않음
        setLandmarks(null);
      }
    } catch (err) {
      console.error('[Face Tracking] 감지 오류:', err);
    }

    animationFrameRef.current = requestAnimationFrame(detectFace);
  }, []);

  /**
   * 정리
   */
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    landmarks,
    videoRef,
    isReady,
    isTracking,
    error,
    startTracking,
    stopTracking,
  };
}

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

/**
 * 얼굴 랜드마크 데이터
 */
export interface FaceLandmarks {
  // 랜드마크 포인트 (468개)
  landmarks: Array<{ x: number; y: number; z: number }>;

  // 머리 회전 (라디안)
  headRotation: {
    yaw: number; // 좌우 회전
    pitch: number; // 위아래 회전
    roll: number; // 기울임
  };

  // 눈 상태
  eyes: {
    leftOpen: number; // 0(감음) ~ 1(뜸)
    rightOpen: number; // 0(감음) ~ 1(뜸)
  };

  // 입 상태
  mouth: {
    openness: number; // 0(닫음) ~ 1(벌림)
    width: number; // 입 가로 너비 (웃음 감지용)
  };

  // 눈썹 상태
  eyebrows: {
    leftRaise: number; // 0(평상시) ~ 1(올림)
    rightRaise: number; // 0(평상시) ~ 1(올림)
  };

  // 타임스탬프
  timestamp: number;
}

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

/**
 * 원시 랜드마크를 처리하여 VRM에 매핑 가능한 데이터로 변환
 */
function processFaceLandmarks(
  rawLandmarks: Array<{ x: number; y: number; z: number }>
): FaceLandmarks {
  // 주요 포인트 추출
  const noseTip = rawLandmarks[1];
  const leftCheek = rawLandmarks[234];
  const rightCheek = rawLandmarks[454];
  const leftEyeTop = rawLandmarks[159];
  const leftEyeBottom = rawLandmarks[145];
  const rightEyeTop = rawLandmarks[386];
  const rightEyeBottom = rawLandmarks[374];
  const mouthTop = rawLandmarks[13];
  const mouthBottom = rawLandmarks[14];
  const mouthLeft = rawLandmarks[61];
  const mouthRight = rawLandmarks[291];
  const leftEyebrowTop = rawLandmarks[70];
  const leftEyebrowBottom = rawLandmarks[27];
  const rightEyebrowTop = rawLandmarks[300];
  const rightEyebrowBottom = rawLandmarks[27];

  // 머리 회전 계산
  const yaw =
    Math.atan2(rightCheek.x - leftCheek.x, rightCheek.z - leftCheek.z) -
    Math.PI / 2;

  const pitch = (noseTip.y - 0.5) * 1.5;

  const roll =
    Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x) * 0.5;

  // 눈 열림 정도 계산
  const leftEyeOpen = calculateDistance(leftEyeTop, leftEyeBottom) / 0.02;
  const rightEyeOpen = calculateDistance(rightEyeTop, rightEyeBottom) / 0.02;

  // 입 벌림 정도 계산
  const mouthOpenness = calculateDistance(mouthTop, mouthBottom) / 0.05;
  const mouthWidth = calculateDistance(mouthLeft, mouthRight) / 0.08;

  // 눈썹 올림 정도 계산
  const leftEyebrowRaise = Math.max(
    0,
    (leftEyebrowTop.y - leftEyebrowBottom.y) * 5
  );
  const rightEyebrowRaise = Math.max(
    0,
    (rightEyebrowTop.y - rightEyebrowBottom.y) * 5
  );

  return {
    landmarks: rawLandmarks,
    headRotation: {
      yaw: clamp(yaw, -Math.PI / 2, Math.PI / 2),
      pitch: clamp(pitch, -Math.PI / 2, Math.PI / 2),
      roll: clamp(roll, -Math.PI / 4, Math.PI / 4),
    },
    eyes: {
      leftOpen: clamp(leftEyeOpen, 0, 1),
      rightOpen: clamp(rightEyeOpen, 0, 1),
    },
    mouth: {
      openness: clamp(mouthOpenness, 0, 1),
      width: clamp(mouthWidth, 0, 1),
    },
    eyebrows: {
      leftRaise: clamp(leftEyebrowRaise, 0, 1),
      rightRaise: clamp(rightEyebrowRaise, 0, 1),
    },
    timestamp: Date.now(),
  };
}

/**
 * 두 점 사이의 유클리드 거리 계산
 */
function calculateDistance(
  p1: { x: number; y: number; z?: number },
  p2: { x: number; y: number; z?: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 값을 범위 내로 제한
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

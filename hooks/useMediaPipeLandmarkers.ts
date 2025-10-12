import { useEffect, useRef } from 'react';

/**
 * MediaPipe Landmarker 초기화 옵션
 */
interface UseMediaPipeLandmarkersOptions {
  isWebcamReady: boolean;
  enableFace?: boolean;
  enableBody?: boolean;
  enableHand?: boolean;
  onFaceReady?: () => void;
  onBodyReady?: () => void;
  onHandReady?: () => void;
}

/**
 * MediaPipe Face/Pose/Hand Landmarker를 관리하는 커스텀 훅
 */
export function useMediaPipeLandmarkers({
  isWebcamReady,
  enableFace = true,
  enableBody = false,
  enableHand = false,
  onFaceReady,
  onBodyReady,
  onHandReady,
}: UseMediaPipeLandmarkersOptions) {
  const faceLandmarkerRef = useRef<unknown>(null);
  const poseLandmarkerRef = useRef<unknown>(null);
  const handLandmarkerRef = useRef<unknown>(null);

  // Face Landmarker 초기화
  useEffect(() => {
    if (!isWebcamReady || !enableFace) return;

    const initFaceLandmarker = async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import(
          '@mediapipe/tasks-vision'
        );

        // 버전 통일
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU', // GPU 사용
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        faceLandmarkerRef.current = landmarker;
        console.log('MediaPipe Face Landmarker 초기화 완료 (GPU)');
        onFaceReady?.();
      } catch (err) {
        console.error('Face Landmarker 초기화 실패:', err);
      }
    };

    initFaceLandmarker();

    return () => {
      if (
        faceLandmarkerRef.current &&
        typeof faceLandmarkerRef.current === 'object' &&
        'close' in faceLandmarkerRef.current
      ) {
        (faceLandmarkerRef.current as { close: () => void }).close();
        faceLandmarkerRef.current = null;
      }
    };
  }, [isWebcamReady, enableFace]);

  // Pose Landmarker 초기화
  useEffect(() => {
    if (!isWebcamReady) {
      console.log('[Pose Init] 웹캠 대기 중...');
      return;
    }

    if (!enableBody) {
      console.log('[Pose Init] 상체 추적 비활성화됨');
      return;
    }

    console.log('[Pose Init] Pose Landmarker 초기화 시작...');

    const initPoseLandmarker = async () => {
      try {
        const { PoseLandmarker, FilesetResolver } = await import(
          '@mediapipe/tasks-vision'
        );

        console.log('[Pose Init] FilesetResolver 로드 중...');
        // 공식 예제와 동일한 버전 사용
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );

        console.log('[Pose Init] PoseLandmarker 생성 중...');
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU', // GPU 사용으로 변경 (성능 향상)
          },
          runningMode: 'VIDEO',
          numPoses: 1, // 1명의 포즈만 추적
        });

        poseLandmarkerRef.current = landmarker;
        console.log('✅ MediaPipe Pose Landmarker 초기화 완료 (GPU)');
        onBodyReady?.();
      } catch (err) {
        console.error('❌ Pose Landmarker 초기화 실패:', err);
      }
    };

    initPoseLandmarker();

    return () => {
      if (
        poseLandmarkerRef.current &&
        typeof poseLandmarkerRef.current === 'object' &&
        'close' in poseLandmarkerRef.current
      ) {
        (poseLandmarkerRef.current as { close: () => void }).close();
        poseLandmarkerRef.current = null;
      }
    };
  }, [isWebcamReady, enableBody, onBodyReady]);

  // Hand Landmarker 초기화
  useEffect(() => {
    if (!isWebcamReady || !enableHand) return;

    const initHandLandmarker = async () => {
      try {
        const { HandLandmarker, FilesetResolver } = await import(
          '@mediapipe/tasks-vision'
        );

        // 버전 통일
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU', // GPU 사용
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        handLandmarkerRef.current = landmarker;
        console.log('MediaPipe Hand Landmarker 초기화 완료 (GPU)');
        onHandReady?.();
      } catch (err) {
        console.error('Hand Landmarker 초기화 실패:', err);
      }
    };

    initHandLandmarker();

    return () => {
      if (
        handLandmarkerRef.current &&
        typeof handLandmarkerRef.current === 'object' &&
        'close' in handLandmarkerRef.current
      ) {
        (handLandmarkerRef.current as { close: () => void }).close();
        handLandmarkerRef.current = null;
      }
    };
  }, [isWebcamReady, enableHand]);

  return {
    faceLandmarkerRef,
    poseLandmarkerRef,
    handLandmarkerRef,
  };
}

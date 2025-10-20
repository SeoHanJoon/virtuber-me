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

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        faceLandmarkerRef.current = landmarker;
        console.log('MediaPipe Face Landmarker 초기화 완료');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWebcamReady, enableFace]);

  // Pose Landmarker 초기화
  useEffect(() => {
    if (!isWebcamReady || !enableBody) return;

    const initPoseLandmarker = async () => {
      try {
        const { PoseLandmarker, FilesetResolver } = await import(
          '@mediapipe/tasks-vision'
        );

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });

        poseLandmarkerRef.current = landmarker;
        console.log('MediaPipe Pose Landmarker 초기화 완료');
        onBodyReady?.();
      } catch (err) {
        console.error('Pose Landmarker 초기화 실패:', err);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWebcamReady, enableBody]);

  // Hand Landmarker 초기화
  useEffect(() => {
    if (!isWebcamReady || !enableHand) return;

    const initHandLandmarker = async () => {
      try {
        const { HandLandmarker, FilesetResolver } = await import(
          '@mediapipe/tasks-vision'
        );

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        handLandmarkerRef.current = landmarker;
        console.log('MediaPipe Hand Landmarker 초기화 완료');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWebcamReady, enableHand]);

  return {
    faceLandmarkerRef,
    poseLandmarkerRef,
    handLandmarkerRef,
  };
}

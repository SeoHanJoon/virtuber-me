'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { FaceTrackingVRMViewerProps } from '../types/components';
import { FaceStateCalculator } from '../utils/faceStateCalculator';
import { BodyStateCalculator } from '../utils/bodyStateCalculator';
import type { BlendShapesData } from '../utils/mediapipeBlendShapes';
import { useWebcam } from '../hooks/useWebcam';
import { useMediaPipeLandmarkers } from '../hooks/useMediaPipeLandmarkers';
import { useVRMScene } from '../hooks/useVRMScene';
import {
  applyFaceTrackingToVRM,
  applyBodyTrackingToVRM,
  applyHandTrackingToVRM,
} from '../utils/vrmTracking';
import TrackingStatusIndicator from './TrackingStatusIndicator';
import ExpressionSettingsPanel, {
  type ExpressionMultipliers,
} from './ExpressionSettingsPanel';
import WebcamPreview from './WebcamPreview';

export default function FaceTrackingVRMViewer({
  modelPath,
  className = '',
  width = 800,
  height = 600,
  mirrorMode: initialMirrorMode = false,
  rotateModel: initialRotateModel = false,
  invertPitch: initialInvertPitch = false,
  manualControlEnabled = false,
  showLandmarks: externalShowLandmarks,
  onVRMChange,
}: FaceTrackingVRMViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 상태 관리
  const [error, setError] = useState<string | null>(null);
  const [isFaceLandmarkerReady, setIsFaceLandmarkerReady] = useState(false);
  const [isVRMLoaded, setIsVRMLoaded] = useState(false);
  const [blendShapesData, setBlendShapesData] =
    useState<BlendShapesData | null>(null);

  // 트래킹 옵션 (관련 상태 그룹화)
  const [trackingOptions, setTrackingOptions] = useState({
    body: false,
    hand: false,
    showLandmarks: false,
    showBlendShapes: false,
  });
  const showLandmarks = externalShowLandmarks ?? trackingOptions.showLandmarks;

  // 랜드마크 데이터
  const [currentLandmarks, setCurrentLandmarks] = useState<Array<{
    x: number;
    y: number;
    z: number;
  }> | null>(null);
  const [currentPoseLandmarks, setCurrentPoseLandmarks] = useState<Array<{
    x: number;
    y: number;
    z: number;
  }> | null>(null);

  // 표정 설정
  const [expressionMultipliers, setExpressionMultipliers] =
    useState<ExpressionMultipliers>({
      mouthOpen: 1.0,
      mouthWidth: 1.0,
      mouthSmile: 1.0,
      blink: 1.5,
      eyeLook: 1.0,
    });

  // 모델 변형 설정 (관련 상태 그룹화)
  const [transforms, setTransforms] = useState({
    mirror: initialMirrorMode,
    rotate: initialRotateModel,
    invertPitch: initialInvertPitch,
  });

  // Calculator 인스턴스
  const faceCalculatorRef = useRef(
    new FaceStateCalculator({
      smoothingFactor: 0.7,
      multipliers: { blink: 1.5 },
    })
  );
  const bodyCalculatorRef = useRef(new BodyStateCalculator());

  // Custom Hooks
  const { videoRef, isReady: isWebcamReady, error: webcamError } = useWebcam();

  const { faceLandmarkerRef, poseLandmarkerRef, handLandmarkerRef } =
    useMediaPipeLandmarkers({
      isWebcamReady,
      enableFace: true,
      enableBody: trackingOptions.body,
      enableHand: trackingOptions.hand,
      onFaceReady: () => setIsFaceLandmarkerReady(true),
    });

  const { vrmRef, rendererRef, sceneRef, cameraRef } = useVRMScene({
    canvasRef,
    modelPath,
    width,
    height,
    mirrorMode: transforms.mirror,
    rotateModel: transforms.rotate,
    onError: setError,
    onVRMLoaded: () => {
      setIsVRMLoaded(true);
      onVRMChange?.(vrmRef.current);
    },
  });

  // 에러 동기화
  useEffect(() => {
    if (webcamError) setError(webcamError);
  }, [webcamError]);

  // 애니메이션 루프
  useEffect(() => {
    if (!isVRMLoaded || !isWebcamReady) {
      return;
    }

    if (
      !vrmRef.current ||
      !rendererRef.current ||
      !sceneRef.current ||
      !cameraRef.current
    ) {
      return;
    }

    const clock = new THREE.Clock();
    let lastVideoTime = -1;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();

      if (vrmRef.current) {
        // 얼굴 추적 (수동 제어 비활성화 시에만)
        if (
          faceLandmarkerRef.current &&
          videoRef.current &&
          videoRef.current.currentTime !== lastVideoTime &&
          !manualControlEnabled
        ) {
          lastVideoTime = videoRef.current.currentTime;

          try {
            const result = (
              faceLandmarkerRef.current as {
                detectForVideo: (
                  video: HTMLVideoElement,
                  timestamp: number
                ) => {
                  faceLandmarks: Array<
                    Array<{ x: number; y: number; z: number }>
                  >;
                  faceBlendshapes?: Array<BlendShapesData>;
                };
              }
            ).detectForVideo(videoRef.current, performance.now());

            if (result?.faceLandmarks?.[0]) {
              // VRM에 얼굴 추적 적용
              applyFaceTrackingToVRM(
                vrmRef.current,
                result.faceLandmarks[0],
                faceCalculatorRef.current,
                transforms.invertPitch
              );

              // 시각화를 위해 랜드마크 저장
              setCurrentLandmarks(result.faceLandmarks[0]);

              // BlendShapes 데이터 저장 (모니터링용)
              if (result.faceBlendshapes?.[0]) {
                setBlendShapesData(result.faceBlendshapes[0]);
              }
            }
          } catch {
            // 추적 실패 무시
          }
        }

        // 상체 추적 (수동 제어 비활성화 시에만)
        if (
          poseLandmarkerRef.current &&
          videoRef.current &&
          trackingOptions.body &&
          !manualControlEnabled
        ) {
          try {
            const poseResult = (
              poseLandmarkerRef.current as {
                detectForVideo: (
                  video: HTMLVideoElement,
                  timestamp: number
                ) => {
                  landmarks: Array<
                    Array<{
                      x: number;
                      y: number;
                      z: number;
                      visibility?: number;
                    }>
                  >;
                  worldLandmarks: Array<
                    Array<{
                      x: number;
                      y: number;
                      z: number;
                      visibility?: number;
                    }>
                  >;
                };
              }
            ).detectForVideo(videoRef.current, performance.now());

            // 바디 트래킹에는 worldLandmarks 사용 (미터 단위 3D 좌표, Z 깊이 정확)
            if (poseResult?.worldLandmarks?.[0]) {
              applyBodyTrackingToVRM(
                vrmRef.current,
                poseResult.worldLandmarks[0],
                bodyCalculatorRef.current
              );
            }

            // 시각화에는 image landmarks 사용 (0-1 정규화 좌표)
            if (poseResult?.landmarks?.[0]) {
              setCurrentPoseLandmarks(poseResult.landmarks[0]);
            }
          } catch {
            // 추적 실패 무시
          }
        }

        // 손 추적 (수동 제어 비활성화 시에만)
        if (
          handLandmarkerRef.current &&
          videoRef.current &&
          trackingOptions.hand &&
          !manualControlEnabled
        ) {
          try {
            const handResult = (
              handLandmarkerRef.current as {
                detectForVideo: (
                  video: HTMLVideoElement,
                  timestamp: number
                ) => {
                  landmarks: Array<Array<{ x: number; y: number; z: number }>>;
                  handednesses: Array<Array<{ categoryName: string }>>;
                };
              }
            ).detectForVideo(videoRef.current, performance.now());

            if (handResult?.landmarks) {
              applyHandTrackingToVRM(
                vrmRef.current,
                handResult.landmarks,
                handResult.handednesses,
                bodyCalculatorRef.current
              );
            }
          } catch {
            // 추적 실패 무시
          }
        }

        // VRM 업데이트
        vrmRef.current.update(deltaTime);
      }

      // 렌더링
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isVRMLoaded,
    isWebcamReady,
    isFaceLandmarkerReady,
    vrmRef,
    rendererRef,
    sceneRef,
    cameraRef,
    videoRef,
    faceLandmarkerRef,
    poseLandmarkerRef,
    handLandmarkerRef,
    transforms.invertPitch,
    trackingOptions.body,
    trackingOptions.hand,
    manualControlEnabled,
  ]);

  // 표정 강도 변경 핸들러
  const handleMultiplierChange = (
    key: keyof ExpressionMultipliers,
    value: number
  ) => {
    const newMultipliers = {
      ...expressionMultipliers,
      [key]: value,
    };
    setExpressionMultipliers(newMultipliers);
    faceCalculatorRef.current.setMultipliers(newMultipliers);
  };

  const handleReset = () => {
    const defaultMultipliers: ExpressionMultipliers = {
      mouthOpen: 1.0,
      mouthWidth: 1.0,
      mouthSmile: 1.0,
      blink: 1.5,
      eyeLook: 1.0,
    };
    setExpressionMultipliers(defaultMultipliers);
    faceCalculatorRef.current.setMultipliers(defaultMultipliers);
  };

  return (
    <div className="relative">
      {/* 웹캠 비디오 (MediaPipe용 - 항상 숨김) */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        autoPlay
        width={640}
        height={480}
      />

      {/* VRM 렌더링 캔버스 */}
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
        }}
      />

      {/* 상태 표시 */}
      <TrackingStatusIndicator
        error={error}
        isWebcamReady={isWebcamReady}
        isFaceLandmarkerReady={isFaceLandmarkerReady}
        isVRMLoaded={isVRMLoaded}
      />

      {/* 통합 설정 패널 (랜드마크 표시 제외) */}
      <ExpressionSettingsPanel
        multipliers={expressionMultipliers}
        onMultiplierChange={handleMultiplierChange}
        enableBodyTracking={trackingOptions.body}
        onBodyTrackingChange={(v) =>
          setTrackingOptions((prev) => ({ ...prev, body: v }))
        }
        enableHandTracking={trackingOptions.hand}
        onHandTrackingChange={(v) =>
          setTrackingOptions((prev) => ({ ...prev, hand: v }))
        }
        showLandmarks={
          externalShowLandmarks !== undefined
            ? showLandmarks
            : trackingOptions.showLandmarks
        }
        onShowLandmarksChange={
          externalShowLandmarks !== undefined
            ? undefined
            : (v) =>
                setTrackingOptions((prev) => ({ ...prev, showLandmarks: v }))
        }
        mirrorMode={transforms.mirror}
        onMirrorModeChange={(v) =>
          setTransforms((prev) => ({ ...prev, mirror: v }))
        }
        rotateModel={transforms.rotate}
        onRotateModelChange={(v) =>
          setTransforms((prev) => ({ ...prev, rotate: v }))
        }
        invertPitch={transforms.invertPitch}
        onInvertPitchChange={(v) =>
          setTransforms((prev) => ({ ...prev, invertPitch: v }))
        }
        showBlendShapes={trackingOptions.showBlendShapes}
        onShowBlendShapesChange={(v) =>
          setTrackingOptions((prev) => ({ ...prev, showBlendShapes: v }))
        }
        blendShapesData={blendShapesData}
        onReset={handleReset}
      />

      {/* 랜드마크 시각화 (웹캠 비디오 프리뷰) */}
      {showLandmarks && videoRef.current && (
        <WebcamPreview
          videoRef={videoRef}
          landmarks={currentLandmarks}
          poseLandmarks={currentPoseLandmarks}
          width={240}
          height={180}
        />
      )}
    </div>
  );
}

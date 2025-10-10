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
import LandmarkVisualizer from './LandmarkVisualizer';

export default function FaceTrackingVRMViewer({
  modelPath,
  className = '',
  width = 800,
  height = 600,
  mirrorMode: initialMirrorMode = false,
  rotateModel: initialRotateModel = false,
  invertPitch: initialInvertPitch = false,
}: FaceTrackingVRMViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 상태 관리
  const [error, setError] = useState<string | null>(null);
  const [enableBodyTracking, setEnableBodyTracking] = useState(false);
  const [enableHandTracking, setEnableHandTracking] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showBlendShapes, setShowBlendShapes] = useState(false);
  const [isFaceLandmarkerReady, setIsFaceLandmarkerReady] = useState(false);
  const [isVRMLoaded, setIsVRMLoaded] = useState(false);
  const [blendShapesData, setBlendShapesData] =
    useState<BlendShapesData | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<Array<{
    x: number;
    y: number;
    z: number;
  }> | null>(null);
  const [expressionMultipliers, setExpressionMultipliers] =
    useState<ExpressionMultipliers>({
      mouthOpen: 1.0,
      mouthWidth: 1.0,
      mouthSmile: 1.0,
      blink: 1.5,
      eyeLook: 1.0,
    });

  // 모델 변형 설정 (내부 state로 관리)
  const [mirrorMode, setMirrorMode] = useState(initialMirrorMode);
  const [rotateModel, setRotateModel] = useState(initialRotateModel);
  const [invertPitch, setInvertPitch] = useState(initialInvertPitch);

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
      enableBody: enableBodyTracking,
      enableHand: enableHandTracking,
      onFaceReady: () => setIsFaceLandmarkerReady(true),
    });

  const { vrmRef, rendererRef, sceneRef, cameraRef } = useVRMScene({
    canvasRef,
    modelPath,
    width,
    height,
    mirrorMode,
    rotateModel,
    onError: setError,
    onVRMLoaded: () => setIsVRMLoaded(true),
  });

  // 에러 동기화
  useEffect(() => {
    if (webcamError) setError(webcamError);
  }, [webcamError]);

  // 애니메이션 루프
  useEffect(() => {
    // VRM과 렌더러가 준비될 때까지 대기
    if (!isVRMLoaded || !isWebcamReady) {
      console.log(
        `[Animation] 대기 중... VRM: ${isVRMLoaded}, Webcam: ${isWebcamReady}`
      );
      return;
    }

    if (
      !vrmRef.current ||
      !rendererRef.current ||
      !sceneRef.current ||
      !cameraRef.current
    ) {
      console.log('[Animation] Ref 준비 중...');
      return;
    }

    console.log('[Animation] 애니메이션 루프 시작');

    const clock = new THREE.Clock();
    let lastVideoTime = -1;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();

      if (vrmRef.current) {
        // 얼굴 추적
        if (
          faceLandmarkerRef.current &&
          videoRef.current &&
          videoRef.current.currentTime !== lastVideoTime
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
                invertPitch
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

        // 상체 추적
        if (
          poseLandmarkerRef.current &&
          videoRef.current &&
          enableBodyTracking
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
                };
              }
            ).detectForVideo(videoRef.current, performance.now());

            if (poseResult?.landmarks?.[0]) {
              applyBodyTrackingToVRM(
                vrmRef.current,
                poseResult.landmarks[0],
                bodyCalculatorRef.current
              );
            }
          } catch {
            // 추적 실패 무시
          }
        }

        // 손 추적
        if (
          handLandmarkerRef.current &&
          videoRef.current &&
          enableHandTracking
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
      console.log('[Animation] 애니메이션 루프 정리');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isVRMLoaded, // VRM 로드 완료 감지 🆕
    isWebcamReady, // 웹캠 준비 완료 감지 🆕
    isFaceLandmarkerReady, // Face Landmarker 준비 완료 감지 🆕
    vrmRef,
    rendererRef,
    sceneRef,
    cameraRef,
    videoRef,
    faceLandmarkerRef,
    poseLandmarkerRef,
    handLandmarkerRef,
    invertPitch,
    enableBodyTracking,
    enableHandTracking,
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

      {/* 통합 설정 패널 */}
      <ExpressionSettingsPanel
        multipliers={expressionMultipliers}
        onMultiplierChange={handleMultiplierChange}
        enableBodyTracking={enableBodyTracking}
        onBodyTrackingChange={setEnableBodyTracking}
        enableHandTracking={enableHandTracking}
        onHandTrackingChange={setEnableHandTracking}
        showLandmarks={showLandmarks}
        onShowLandmarksChange={setShowLandmarks}
        mirrorMode={mirrorMode}
        onMirrorModeChange={setMirrorMode}
        rotateModel={rotateModel}
        onRotateModelChange={setRotateModel}
        invertPitch={invertPitch}
        onInvertPitchChange={setInvertPitch}
        showBlendShapes={showBlendShapes}
        onShowBlendShapesChange={setShowBlendShapes}
        blendShapesData={blendShapesData}
        onReset={handleReset}
      />

      {/* 랜드마크 시각화 (웹캠 비디오 프리뷰) - 좌측 하단으로 이동 */}
      {showLandmarks && videoRef.current && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="relative">
            {/* 웹캠 프리뷰 (더 작은 크기) */}
            <div
              className="relative"
              style={{
                width: '240px',
                height: '180px',
                borderRadius: '8px',
                border: '2px solid rgba(255,255,255,0.3)',
                overflow: 'hidden',
                backgroundColor: '#000',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              <video
                ref={(el) => {
                  if (el && videoRef.current) {
                    el.srcObject = videoRef.current.srcObject;
                    el.play().catch(() => {
                      // 자동 재생 실패 무시
                    });
                  }
                }}
                playsInline
                muted
                autoPlay
                width={240}
                height={180}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {/* 랜드마크 오버레이 */}
              <div className="absolute top-0 left-0">
                <LandmarkVisualizer
                  videoRef={videoRef}
                  landmarks={currentLandmarks}
                  width={240}
                  height={180}
                  enabled={showLandmarks}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

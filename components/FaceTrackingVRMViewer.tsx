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
import BlendShapesMonitor from './BlendShapesMonitor';
import LandmarkVisualizer from './LandmarkVisualizer';

export default function FaceTrackingVRMViewer({
  modelPath,
  className = '',
  width = 800,
  height = 600,
  mirrorMode = false,
  rotateModel = false,
  invertPitch = false,
}: FaceTrackingVRMViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 상태 관리
  const [error, setError] = useState<string | null>(null);
  const [enableBodyTracking, setEnableBodyTracking] = useState(false);
  const [enableHandTracking, setEnableHandTracking] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
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
    });

  const { vrmRef, rendererRef, sceneRef, cameraRef } = useVRMScene({
    canvasRef,
    modelPath,
    width,
    height,
    mirrorMode,
    rotateModel,
    onError: setError,
  });

  // 에러 동기화
  useEffect(() => {
    if (webcamError) setError(webcamError);
  }, [webcamError]);

  // 애니메이션 루프
  useEffect(() => {
    if (
      !vrmRef.current ||
      !rendererRef.current ||
      !sceneRef.current ||
      !cameraRef.current
    )
      return;

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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
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
      {/* 웹캠 비디오 (숨김) */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
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
        isFaceLandmarkerReady={!!faceLandmarkerRef.current}
      />

      {/* 설정 패널 */}
      <ExpressionSettingsPanel
        multipliers={expressionMultipliers}
        onMultiplierChange={handleMultiplierChange}
        enableBodyTracking={enableBodyTracking}
        onBodyTrackingChange={setEnableBodyTracking}
        enableHandTracking={enableHandTracking}
        onHandTrackingChange={setEnableHandTracking}
        showLandmarks={showLandmarks}
        onShowLandmarksChange={setShowLandmarks}
        onReset={handleReset}
      />

      {/* BlendShapes 모니터 */}
      <BlendShapesMonitor blendShapes={blendShapesData} threshold={0.1} />

      {/* 랜드마크 시각화 (웹캠 비디오 위에 오버레이) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2">
        <div className="relative">
          <video
            ref={videoRef}
            className={showLandmarks ? 'block' : 'hidden'}
            playsInline
            muted
            width={320}
            height={240}
            style={{
              borderRadius: '8px',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          />
          {showLandmarks && (
            <LandmarkVisualizer
              videoRef={videoRef}
              landmarks={currentLandmarks}
              width={320}
              height={240}
              enabled={showLandmarks}
            />
          )}
        </div>
      </div>
    </div>
  );
}

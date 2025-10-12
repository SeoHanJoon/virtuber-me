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
import { resetToIdlePose } from '../utils/vrmPose';
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
  const [currentPoseLandmarks, setCurrentPoseLandmarks] = useState<Array<{
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

  // 디버깅 플래그 (한 번만 로그 출력)
  const poseLoggedRef = useRef(false);
  const poseErrorLoggedRef = useRef(false);

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
            // 첫 실행 로그
            if (!poseLoggedRef.current) {
              console.log('[상체 추적] detectForVideo 호출 시작');
            }

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
              // 시각화를 위해 Pose 랜드마크 저장
              setCurrentPoseLandmarks(poseResult.landmarks[0]);

              // 상체 추적 데이터를 VRM에 적용
              applyBodyTrackingToVRM(
                vrmRef.current,
                poseResult.landmarks[0],
                bodyCalculatorRef.current
              );

              // 디버깅: 첫 프레임에만 로그 출력
              if (!poseLoggedRef.current) {
                console.log('✅ [상체 추적] Pose 랜드마크 감지 및 적용 시작:', {
                  랜드마크수: poseResult.landmarks[0].length,
                  어깨위치: {
                    왼쪽: poseResult.landmarks[0][11],
                    오른쪽: poseResult.landmarks[0][12],
                  },
                  팔꿈치위치: {
                    왼쪽: poseResult.landmarks[0][13],
                    오른쪽: poseResult.landmarks[0][14],
                  },
                  손목위치: {
                    왼쪽: poseResult.landmarks[0][15],
                    오른쪽: poseResult.landmarks[0][16],
                  },
                  가시성: {
                    왼쪽어깨:
                      poseResult.landmarks[0][11].visibility?.toFixed(2),
                    왼쪽팔꿈치:
                      poseResult.landmarks[0][13].visibility?.toFixed(2),
                    왼쪽손목:
                      poseResult.landmarks[0][15].visibility?.toFixed(2),
                    오른쪽어깨:
                      poseResult.landmarks[0][12].visibility?.toFixed(2),
                    오른쪽팔꿈치:
                      poseResult.landmarks[0][14].visibility?.toFixed(2),
                    오른쪽손목:
                      poseResult.landmarks[0][16].visibility?.toFixed(2),
                  },
                });
                console.log(
                  '💡 Visibility < 0.5 = 화면에 안 보임 → 기본 자세 유지'
                );
                poseLoggedRef.current = true;
              }
            } else {
              // Pose가 감지되지 않으면 null로 설정
              setCurrentPoseLandmarks(null);
            }
          } catch (err) {
            // 추적 실패 로그
            if (!poseErrorLoggedRef.current) {
              console.warn('[상체 추적] Pose 감지 실패:', err);
              poseErrorLoggedRef.current = true;
            }
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
    // 표정 강도 초기화
    const defaultMultipliers: ExpressionMultipliers = {
      mouthOpen: 1.0,
      mouthWidth: 1.0,
      mouthSmile: 1.0,
      blink: 1.5,
      eyeLook: 1.0,
    };
    setExpressionMultipliers(defaultMultipliers);
    faceCalculatorRef.current.setMultipliers(defaultMultipliers);

    // VRM 모델을 기본 자세(Idle Pose)로 리셋
    if (vrmRef.current) {
      resetToIdlePose(vrmRef.current);
    }
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

      {/* 랜드마크 시각화 (웹캠 비디오 프리뷰) */}
      {showLandmarks && videoRef.current && (
        <WebcamPreview
          videoRef={videoRef}
          faceLandmarks={currentLandmarks}
          poseLandmarks={currentPoseLandmarks}
          width={240}
          height={180}
        />
      )}
    </div>
  );
}

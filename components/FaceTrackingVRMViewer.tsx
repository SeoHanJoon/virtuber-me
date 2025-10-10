'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  VRM,
  VRMLoaderPlugin,
  VRMUtils,
  VRMExpressionPresetName,
} from '@pixiv/three-vrm';
import type { FaceTrackingVRMViewerProps } from '../types/components';
import {
  FaceStateCalculator,
  mapFaceStateToVRM,
} from '../utils/faceStateCalculator';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const vrmRef = useRef<VRM | null>(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faceLandmarkerRef = useRef<unknown>(null);
  const animationFrameRef = useRef<number | null>(null);

  // FaceStateCalculator 인스턴스 (스무딩 강도: 0.7, 눈 깜빡임 강도: 1.5)
  const faceCalculatorRef = useRef(
    new FaceStateCalculator({
      smoothingFactor: 0.7,
      multipliers: { blink: 1.5 }, // 기본 눈 깜빡임 강도 1.5배
    })
  );

  // 표정 강도 조절 상태
  const [expressionMultipliers, setExpressionMultipliers] = useState({
    mouthOpen: 1.0,
    mouthWidth: 1.0,
    mouthSmile: 1.0,
    blink: 1.5, // 기본값 1.5배
    eyeLook: 1.0,
  });

  const [showSettings, setShowSettings] = useState(false);

  // 웹캠 스트림 초기화
  useEffect(() => {
    let stream: MediaStream | null = null;

    const initWebcam = async () => {
      try {
        // 웹캠 권한 요청 및 스트림 획득
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: 'user', // 전면 카메라 사용
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsWebcamReady(true);
          };
        }
      } catch (err) {
        console.error('웹캠 초기화 실패:', err);
        setError('웹캠에 접근할 수 없습니다. 권한을 확인해주세요.');
      }
    };

    initWebcam();

    // 클린업: 웹캠 스트림 종료
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // MediaPipe Face Landmarker 초기화
  useEffect(() => {
    if (!isWebcamReady) return;

    const initFaceLandmarker = async () => {
      try {
        // MediaPipe 동적 임포트 (빌드 에러 방지)
        const { FaceLandmarker, FilesetResolver } = await import(
          '@mediapipe/tasks-vision'
        );

        // MediaPipe WASM 파일 로드
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        // Face Landmarker 생성 - 얼굴 랜드마크 검출기
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU', // CPU 사용 (안정적)
          },
          outputFaceBlendshapes: true, // 표정 블렌드쉐이프 출력
          outputFacialTransformationMatrixes: true, // 얼굴 변환 행렬 출력
          runningMode: 'VIDEO', // 비디오 모드로 실행
          numFaces: 1, // 한 명의 얼굴만 추적
        });

        faceLandmarkerRef.current = landmarker;
        console.log('MediaPipe Face Landmarker 초기화 완료');
      } catch (err) {
        console.error('MediaPipe 초기화 실패:', err);
        setError('얼굴 추적 초기화에 실패했습니다.');
      }
    };

    initFaceLandmarker();

    return () => {
      // 클린업: Face Landmarker 해제
      if (
        faceLandmarkerRef.current &&
        typeof faceLandmarkerRef.current === 'object' &&
        'close' in faceLandmarkerRef.current
      ) {
        (faceLandmarkerRef.current as { close: () => void }).close();
        faceLandmarkerRef.current = null;
      }
    };
  }, [isWebcamReady]);

  // Three.js 및 VRM 초기화
  useEffect(() => {
    if (!canvasRef.current) return;

    // Three.js 렌더러 초기화 - 투명 배경
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true, // 투명 배경
      antialias: true, // 안티앨리어싱
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    // 씬 생성
    const scene = new THREE.Scene();

    // 카메라 설정
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 3);

    // 조명 설정
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // GLTF Loader로 VRM 모델 로드
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelPath,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        vrmRef.current = vrm;

        // VRM 최적화
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        scene.add(vrm.scene);

        // 모델 변형 적용
        applyTransforms(vrm.scene, mirrorMode, rotateModel);

        console.log('VRM 모델 로드 완료');
      },
      (progress) => {
        const percentComplete = (progress.loaded / progress.total) * 100 || 0;
        console.log(`VRM 로딩: ${percentComplete.toFixed(2)}%`);
      },
      (error) => {
        console.error('VRM 로드 실패:', error);
        setError('VRM 모델을 로드할 수 없습니다.');
      }
    );

    // 시계 객체
    const clock = new THREE.Clock();
    let lastVideoTime = -1;

    // 애니메이션 루프
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();

      // VRM 업데이트
      if (vrmRef.current) {
        // 얼굴 추적 데이터 처리
        if (
          faceLandmarkerRef.current &&
          videoRef.current &&
          videoRef.current.currentTime !== lastVideoTime
        ) {
          lastVideoTime = videoRef.current.currentTime;

          try {
            // MediaPipe로 얼굴 랜드마크 검출
            const result = (
              faceLandmarkerRef.current as {
                detectForVideo: (
                  video: HTMLVideoElement,
                  timestamp: number
                ) => {
                  faceLandmarks: Array<
                    Array<{ x: number; y: number; z: number }>
                  >;
                };
              }
            ).detectForVideo(videoRef.current, performance.now());

            if (result && result.faceLandmarks && result.faceLandmarks[0]) {
              // 얼굴 추적 데이터를 VRM에 적용 (FaceStateCalculator 사용)
              applyFaceTrackingToVRM(
                vrmRef.current,
                result.faceLandmarks[0],
                faceCalculatorRef.current,
                invertPitch
              );
            }
          } catch {
            // 추적 실패 시 무시 (성능을 위해 로그 최소화)
          }
        }

        // VRM 내부 상태 업데이트
        vrmRef.current.update(deltaTime);
      }

      // 렌더링
      renderer.render(scene, camera);
    };

    animate();

    // 클린업
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
      }
      renderer.dispose();
    };
  }, [modelPath, width, height, mirrorMode, rotateModel, invertPitch]);

  // 모델이 로드된 후 변형 상태가 변경되면 적용
  useEffect(() => {
    if (vrmRef.current) {
      applyTransforms(vrmRef.current.scene, mirrorMode, rotateModel);
    }
  }, [mirrorMode, rotateModel]);

  // 표정 강도 변경 핸들러
  const handleMultiplierChange = (
    key: keyof typeof expressionMultipliers,
    value: number
  ) => {
    const newMultipliers = {
      ...expressionMultipliers,
      [key]: value,
    };
    setExpressionMultipliers(newMultipliers);
    faceCalculatorRef.current.setMultipliers(newMultipliers);
  };

  return (
    <div className="relative">
      {/* 웹캠 비디오 (숨김 처리) */}
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
      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-2 rounded-lg text-sm">
        {error ? (
          <span className="text-red-400">❌ {error}</span>
        ) : !isWebcamReady ? (
          <span>📷 웹캠 초기화 중...</span>
        ) : !faceLandmarkerRef.current ? (
          <span>🔄 얼굴 추적 초기화 중...</span>
        ) : (
          <span className="text-green-400">✅ 추적 활성화</span>
        )}
      </div>

      {/* 표정 강도 조절 패널 */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          ⚙️ 표정 강도 조절
        </button>

        {showSettings && (
          <div className="mt-2 bg-black/90 text-white p-4 rounded-lg text-sm w-64 space-y-3">
            <h3 className="font-bold text-base mb-3">표정 강도 설정</h3>

            {/* 눈 깜빡임 강도 */}
            <div>
              <label className="flex justify-between mb-1">
                <span>👁️ 눈 깜빡임</span>
                <span className="text-yellow-400">
                  {expressionMultipliers.blink.toFixed(1)}x
                </span>
              </label>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={expressionMultipliers.blink}
                onChange={(e) =>
                  handleMultiplierChange('blink', parseFloat(e.target.value))
                }
                className="w-full"
              />
            </div>

            {/* 입 벌림 강도 */}
            <div>
              <label className="flex justify-between mb-1">
                <span>👄 입 벌림</span>
                <span className="text-yellow-400">
                  {expressionMultipliers.mouthOpen.toFixed(1)}x
                </span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={expressionMultipliers.mouthOpen}
                onChange={(e) =>
                  handleMultiplierChange(
                    'mouthOpen',
                    parseFloat(e.target.value)
                  )
                }
                className="w-full"
              />
            </div>

            {/* 미소 강도 */}
            <div>
              <label className="flex justify-between mb-1">
                <span>😊 미소</span>
                <span className="text-yellow-400">
                  {expressionMultipliers.mouthSmile.toFixed(1)}x
                </span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={expressionMultipliers.mouthSmile}
                onChange={(e) =>
                  handleMultiplierChange(
                    'mouthSmile',
                    parseFloat(e.target.value)
                  )
                }
                className="w-full"
              />
            </div>

            {/* 시선 강도 */}
            <div>
              <label className="flex justify-between mb-1">
                <span>👀 시선</span>
                <span className="text-yellow-400">
                  {expressionMultipliers.eyeLook.toFixed(1)}x
                </span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={expressionMultipliers.eyeLook}
                onChange={(e) =>
                  handleMultiplierChange('eyeLook', parseFloat(e.target.value))
                }
                className="w-full"
              />
            </div>

            {/* 초기화 버튼 */}
            <button
              onClick={() => {
                const defaultMultipliers = {
                  mouthOpen: 1.0,
                  mouthWidth: 1.0,
                  mouthSmile: 1.0,
                  blink: 1.5,
                  eyeLook: 1.0,
                };
                setExpressionMultipliers(defaultMultipliers);
                faceCalculatorRef.current.setMultipliers(defaultMultipliers);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm mt-2 transition-colors"
            >
              🔄 기본값으로 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 얼굴 추적 데이터를 VRM 아바타에 적용하는 함수 (FaceStateCalculator 사용)
 * @param vrm - VRM 아바타 인스턴스
 * @param landmarks - MediaPipe 얼굴 랜드마크 배열 (468+ 점)
 * @param calculator - FaceStateCalculator 인스턴스
 * @param invertPitch - pitch 추적 반전 여부
 */
function applyFaceTrackingToVRM(
  vrm: VRM,
  landmarks: Array<{ x: number; y: number; z: number }>,
  calculator: FaceStateCalculator,
  invertPitch: boolean
) {
  if (!landmarks || landmarks.length === 0) return;
  if (!vrm.expressionManager) return;

  // 1. FaceStateCalculator로 얼굴 상태 계산
  const faceState = calculator.calculateFaceState(landmarks);

  // 2. VRM 블렌드셰이프로 변환
  const vrmMapping = mapFaceStateToVRM(faceState);

  // 3. VRM에 적용

  // 3-1. 입 표정 (블렌딩 방식으로 여러 표정 동시 적용)
  Object.entries(vrmMapping.mouth).forEach(([expression, value]) => {
    try {
      if (value > 0.01) {
        // 0.01 이상인 값만 적용 (미세한 값 무시)
        vrm.expressionManager?.setValue(
          expression as VRMExpressionPresetName,
          value as number
        );
      } else {
        // 0에 가까우면 명시적으로 0 설정
        vrm.expressionManager?.setValue(
          expression as VRMExpressionPresetName,
          0
        );
      }
    } catch {
      // 표정이 없는 경우 무시
    }
  });

  // 3-2. 눈 깜빡임
  try {
    vrm.expressionManager.setValue(
      'blinkLeft' as VRMExpressionPresetName,
      vrmMapping.blink.left
    );
    vrm.expressionManager.setValue(
      'blinkRight' as VRMExpressionPresetName,
      vrmMapping.blink.right
    );
  } catch {
    // 표정이 없는 경우 무시
  }

  // 3-3. 시선 방향
  try {
    vrm.expressionManager.setValue(
      'lookUp' as VRMExpressionPresetName,
      vrmMapping.look.up
    );
    vrm.expressionManager.setValue(
      'lookDown' as VRMExpressionPresetName,
      vrmMapping.look.down
    );
    vrm.expressionManager.setValue(
      'lookLeft' as VRMExpressionPresetName,
      vrmMapping.look.left
    );
    vrm.expressionManager.setValue(
      'lookRight' as VRMExpressionPresetName,
      vrmMapping.look.right
    );
  } catch {
    // 표정이 없는 경우 무시
  }

  // 3-4. 감정 (미소)
  try {
    vrm.expressionManager.setValue(
      'happy' as VRMExpressionPresetName,
      vrmMapping.emotion.happy
    );
  } catch {
    // 표정이 없는 경우 무시
  }

  // 4. 머리 회전 적용 (Head Rotation) - 기존 로직 유지
  if (vrm.humanoid) {
    const head = vrm.humanoid.getNormalizedBoneNode('head');
    if (head && landmarks.length > 454) {
      // 얼굴 중심점과 좌우 랜드마크로 회전 계산
      const noseTip = landmarks[1]; // 코끝
      const leftCheek = landmarks[234]; // 왼쪽 볼
      const rightCheek = landmarks[454]; // 오른쪽 볼

      // Yaw (좌우 회전) 계산
      const yaw =
        Math.atan2(rightCheek.x - leftCheek.x, rightCheek.z - leftCheek.z) -
        Math.PI / 2;

      // Pitch (위아래 회전) 계산
      let pitch = (noseTip.y - 0.5) * 1.5;
      if (invertPitch) {
        pitch = -pitch; // pitch 반전
      }

      // Roll (기울임) 계산
      const roll =
        Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x) *
        0.5;

      // 회전 값을 부드럽게 적용 (Lerp)
      const smoothFactor = 0.3;
      head.rotation.y += (yaw - head.rotation.y) * smoothFactor;
      head.rotation.x += (pitch - head.rotation.x) * smoothFactor;
      head.rotation.z += (roll - head.rotation.z) * smoothFactor;
    }
  }
}

/**
 * VRM 모델에 변형을 적용하는 함수
 * @param scene - VRM scene 객체
 * @param mirrorMode - 좌우 미러 모드
 * @param rotateModel - 모델 180도 회전
 */
function applyTransforms(
  scene: THREE.Group,
  mirrorMode: boolean,
  rotateModel: boolean
) {
  // 좌우 미러 (거울 모드)
  scene.scale.x = mirrorMode ? -1 : 1;

  // 모델 180도 회전 (뒤돌아 있는 경우)
  scene.rotation.y = rotateModel ? Math.PI : 0;
}

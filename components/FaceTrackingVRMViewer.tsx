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

interface FaceTrackingVRMViewerProps {
  modelPath: string;
  className?: string;
  width?: number;
  height?: number;
  mirrorMode?: boolean; // 좌우 미러
  rotateModel?: boolean; // 모델 180도 회전
  invertPitch?: boolean; // pitch 추적 반전 (위아래 반대)
}

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
              // 얼굴 추적 데이터를 VRM에 적용
              applyFaceTrackingToVRM(
                vrmRef.current,
                result.faceLandmarks[0],
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
    </div>
  );
}

/**
 * 얼굴 추적 데이터를 VRM 아바타에 적용하는 함수
 * @param vrm - VRM 아바타 인스턴스
 * @param landmarks - MediaPipe 얼굴 랜드마크 배열 (478개 점)
 * @param invertPitch - pitch 추적 반전 여부
 */
function applyFaceTrackingToVRM(
  vrm: VRM,
  landmarks: Array<{ x: number; y: number; z: number }>,
  invertPitch: boolean
) {
  if (!landmarks || landmarks.length === 0) return;

  // 1. 눈 깜빡임 적용 (Eye Blink)
  const leftEyeOpenRatio = calculateEyeOpenRatio(
    landmarks,
    [159, 145], // 왼쪽 눈 위
    [23, 133] // 왼쪽 눈 아래
  );
  const rightEyeOpenRatio = calculateEyeOpenRatio(
    landmarks,
    [386, 374], // 오른쪽 눈 위
    [253, 362] // 오른쪽 눈 아래
  );

  // VRM 표정에 눈 깜빡임 적용 (값이 작을수록 눈을 감은 상태)
  if (vrm.expressionManager) {
    const leftBlinkValue = Math.max(0, 1 - leftEyeOpenRatio * 3);
    const rightBlinkValue = Math.max(0, 1 - rightEyeOpenRatio * 3);

    vrm.expressionManager.setValue(
      'blinkLeft' as VRMExpressionPresetName,
      leftBlinkValue
    );
    vrm.expressionManager.setValue(
      'blinkRight' as VRMExpressionPresetName,
      rightBlinkValue
    );
  }

  // 2. 입 벌림 적용 (Mouth Open - A shape)
  const mouthOpenRatio = calculateMouthOpenRatio(
    landmarks,
    [13], // 입 위
    [14] // 입 아래
  );

  if (vrm.expressionManager) {
    // 입 벌림 정도를 VRM의 'aa' 표정에 적용
    const mouthValue = Math.min(1, mouthOpenRatio * 2);
    vrm.expressionManager.setValue('aa' as VRMExpressionPresetName, mouthValue);
  }

  // 3. 머리 회전 적용 (Head Rotation)
  if (vrm.humanoid) {
    const head = vrm.humanoid.getNormalizedBoneNode('head');
    if (head) {
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
 * 눈이 얼마나 열려있는지 비율 계산
 * @param landmarks - 얼굴 랜드마크 배열
 * @param topIndices - 눈 위쪽 랜드마크 인덱스
 * @param bottomIndices - 눈 아래쪽 랜드마크 인덱스
 * @returns 눈 열림 비율 (0: 감음, 1: 완전히 열림)
 */
function calculateEyeOpenRatio(
  landmarks: Array<{ x: number; y: number; z: number }>,
  topIndices: number[],
  bottomIndices: number[]
): number {
  // 눈의 세로 거리 계산
  let topY = 0;
  let bottomY = 0;

  topIndices.forEach((idx) => (topY += landmarks[idx].y));
  bottomIndices.forEach((idx) => (bottomY += landmarks[idx].y));

  topY /= topIndices.length;
  bottomY /= bottomIndices.length;

  const distance = Math.abs(bottomY - topY);

  // 정규화 (일반적인 눈 열림 거리를 1.0으로)
  return distance / 0.02; // 임계값은 조정 가능
}

/**
 * 입이 얼마나 열려있는지 비율 계산
 * @param landmarks - 얼굴 랜드마크 배열
 * @param topIndices - 입 위쪽 랜드마크 인덱스
 * @param bottomIndices - 입 아래쪽 랜드마크 인덱스
 * @returns 입 열림 비율 (0: 닫힘, 1: 열림)
 */
function calculateMouthOpenRatio(
  landmarks: Array<{ x: number; y: number; z: number }>,
  topIndices: number[],
  bottomIndices: number[]
): number {
  // 입의 세로 거리 계산
  let topY = 0;
  let bottomY = 0;

  topIndices.forEach((idx) => (topY += landmarks[idx].y));
  bottomIndices.forEach((idx) => (bottomY += landmarks[idx].y));

  topY /= topIndices.length;
  bottomY /= bottomIndices.length;

  const distance = Math.abs(bottomY - topY);

  // 정규화
  return distance / 0.05; // 임계값은 조정 가능
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

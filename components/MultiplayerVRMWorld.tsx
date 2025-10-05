/**
 * 멀티플레이어 VRM 월드 컴포넌트
 *
 * 최대 100명의 사용자가 접속할 수 있는 VRM 아바타 월드를 렌더링합니다.
 * - 자신의 아바타: 얼굴 추적으로 제어
 * - 다른 사용자들: 네트워크로 동기화된 상태 표시
 * - WASD로 이동, 마우스로 시점 제어
 * - 거리 기반 LOD 및 컬링으로 성능 최적화
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { useExpressionMapping } from '../hooks/useExpressionMapping';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { useControls } from '../hooks/useControls';

/**
 * 컴포넌트 Props
 */
export interface MultiplayerVRMWorldProps {
  // 내 아바타 모델 경로
  myModelPath: string;

  // 닉네임
  nickname?: string;

  // 서버 URL
  serverUrl?: string;

  // 캔버스 크기
  width?: number;
  height?: number;

  // 클래스명
  className?: string;

  // 최대 렌더링 거리 (성능 최적화)
  maxRenderDistance?: number;
}

/**
 * 멀티플레이어 VRM 월드
 */
export default function MultiplayerVRMWorld({
  myModelPath,
  nickname,
  serverUrl,
  width = 1920,
  height = 1080,
  className = '',
  maxRenderDistance = 50,
}: MultiplayerVRMWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // 내 VRM 아바타
  const myVRMRef = useRef<VRM | null>(null);

  // 다른 사용자들의 VRM 아바타
  const otherVRMsRef = useRef<Map<string, VRM>>(new Map());

  // 커스텀 훅들
  const faceTracking = useFaceTracking();
  const expression = useExpressionMapping(faceTracking.landmarks);
  const network = useNetworkSync(serverUrl);
  const controls = useControls({
    moveSpeed: 5,
    sprintSpeed: 10,
    initialPosition: new THREE.Vector3(0, 0, 5),
    bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  /**
   * Three.js 씬 초기화
   */
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('[World] Three.js 씬 초기화');

    // 씬 생성
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // 하늘색 배경
    sceneRef.current = scene;

    // 카메라 생성
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 5); // 눈높이
    cameraRef.current = camera;

    // 렌더러 생성
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // 조명
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 바닥 (그리드)
    const gridHelper = new THREE.GridHelper(200, 200, 0x888888, 0xcccccc);
    scene.add(gridHelper);

    // 내 VRM 모델 로드
    loadMyVRM(scene, myModelPath);

    // 렌더링 루프 시작
    const animationLoop = () => {
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const myVRM = myVRMRef.current;

      if (!scene || !camera || !renderer) return;

      // 내 아바타 업데이트
      if (myVRM) {
        // 위치 업데이트
        myVRM.scene.position.copy(controls.movement.position);
        myVRM.scene.quaternion.copy(controls.movement.rotation);

        // 표정 업데이트
        if (myVRM.expressionManager) {
          // 모든 표정 초기화
          Object.keys(expression.values).forEach((name) => {
            try {
              myVRM.expressionManager?.setValue(name, 0);
            } catch {
              // 표정이 없는 경우 무시
            }
          });

          // 현재 표정 적용
          Object.entries(expression.values).forEach(([name, value]) => {
            if (value > 0) {
              try {
                myVRM.expressionManager?.setValue(name, value);
              } catch {
                // 표정이 없는 경우 무시
              }
            }
          });
        }

        // 머리 회전 (얼굴 추적)
        if (faceTracking.landmarks && myVRM.humanoid) {
          const head = myVRM.humanoid.getNormalizedBoneNode('head');
          if (head) {
            const { yaw, pitch, roll } = faceTracking.landmarks.headRotation;

            const smoothFactor = 0.3;
            head.rotation.y += (yaw - head.rotation.y) * smoothFactor;
            head.rotation.x += (pitch - head.rotation.x) * smoothFactor;
            head.rotation.z += (roll - head.rotation.z) * smoothFactor;
          }
        }

        // VRM 업데이트
        myVRM.update(0.016); // ~60fps
      }

      // 다른 사용자들 업데이트
      network.otherUsers.forEach((user, userId) => {
        const vrm = otherVRMsRef.current.get(userId);
        if (!vrm) return;

        // 거리 기반 컬링
        const distance = controls.movement.position.distanceTo(
          new THREE.Vector3(user.position.x, user.position.y, user.position.z)
        );

        if (distance > maxRenderDistance) {
          vrm.scene.visible = false;
          return;
        }

        vrm.scene.visible = true;

        // 위치 보간 (부드러운 이동)
        vrm.scene.position.lerp(
          new THREE.Vector3(user.position.x, user.position.y, user.position.z),
          0.2
        );

        // 회전 보간
        const targetQuat = new THREE.Quaternion(
          user.rotation.x,
          user.rotation.y,
          user.rotation.z,
          user.rotation.w
        );
        vrm.scene.quaternion.slerp(targetQuat, 0.2);

        // 표정 적용
        if (vrm.expressionManager && user.expression) {
          try {
            vrm.expressionManager.setValue(user.expression.current, 1);
            vrm.expressionManager.setValue(
              'blinkLeft',
              user.expression.blinkLeft
            );
            vrm.expressionManager.setValue(
              'blinkRight',
              user.expression.blinkRight
            );
          } catch {
            // 표정이 없는 경우 무시
          }
        }

        // VRM 업데이트
        vrm.update(0.016);
      });

      // 카메라 위치 (3인칭 뷰)
      camera.position.set(
        controls.movement.position.x,
        controls.movement.position.y + 1.6,
        controls.movement.position.z + 5
      );
      camera.lookAt(controls.movement.position);

      // 렌더링
      renderer.render(scene, camera);

      requestAnimationFrame(animationLoop);
    };

    animationLoop();

    return () => {
      // 정리
      renderer.dispose();
      scene.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myModelPath, width, height]);

  /**
   * 내 VRM 모델 로드
   */
  async function loadMyVRM(scene: THREE.Scene, modelPath: string) {
    try {
      console.log('[World] 내 VRM 로드:', modelPath);

      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await loader.loadAsync(modelPath, (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        setLoadingProgress(percent);
      });

      const vrm = gltf.userData.vrm as VRM;

      if (!vrm) {
        throw new Error('VRM 데이터를 찾을 수 없습니다.');
      }

      // 최적화
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.removeUnnecessaryJoints(gltf.scene);

      // 씬에 추가
      scene.add(vrm.scene);
      myVRMRef.current = vrm;

      console.log('[World] 내 VRM 로드 완료');
      setIsLoading(false);
    } catch (error) {
      console.error('[World] VRM 로드 오류:', error);
      setIsLoading(false);
    }
  }

  /**
   * 다른 사용자 VRM 로드
   */
  async function loadOtherVRM(
    userId: string,
    modelPath: string
  ): Promise<VRM | null> {
    try {
      console.log('[World] 다른 사용자 VRM 로드:', userId, modelPath);

      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await loader.loadAsync(modelPath);
      const vrm = gltf.userData.vrm as VRM;

      if (!vrm) {
        throw new Error('VRM 데이터를 찾을 수 없습니다.');
      }

      // 최적화
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.removeUnnecessaryJoints(gltf.scene);

      // 씬에 추가
      if (sceneRef.current) {
        sceneRef.current.add(vrm.scene);
      }

      return vrm;
    } catch (error) {
      console.error('[World] 다른 사용자 VRM 로드 오류:', error);
      return null;
    }
  }

  /**
   * 다른 사용자들 동기화
   */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 새 사용자 추가
    network.otherUsers.forEach((user, userId) => {
      if (!otherVRMsRef.current.has(userId)) {
        loadOtherVRM(userId, user.modelPath).then((vrm) => {
          if (vrm) {
            otherVRMsRef.current.set(userId, vrm);
          }
        });
      }
    });

    // 퇴장한 사용자 제거
    otherVRMsRef.current.forEach((vrm, userId) => {
      if (!network.otherUsers.has(userId)) {
        scene.remove(vrm.scene);
        otherVRMsRef.current.delete(userId);
        console.log('[World] 사용자 제거:', userId);
      }
    });
  }, [network.otherUsers]);

  /**
   * 얼굴 추적 시작 (연결 후)
   */
  useEffect(() => {
    if (
      network.isConnected &&
      faceTracking.isReady &&
      !faceTracking.isTracking
    ) {
      faceTracking.startTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network.isConnected, faceTracking.isReady, faceTracking.isTracking]);

  /**
   * 내 상태 업데이트 전송
   */
  useEffect(() => {
    if (!network.isConnected) return;

    network.updateMyState({
      position: controls.movement.position,
      rotation: controls.movement.rotation,
      expression: expression.name,
      blinkLeft: expression.values.blinkLeft,
      blinkRight: expression.values.blinkRight,
      mood: expression.mood,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    network.isConnected,
    controls.movement.position,
    controls.movement.rotation,
    expression,
  ]);

  /**
   * 서버 연결
   */
  function handleConnect() {
    network.connect(myModelPath, nickname);
  }

  return (
    <div className={`relative ${className}`}>
      {/* 3D 캔버스 */}
      <canvas ref={canvasRef} width={width} height={height} className="block" />

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <div className="text-2xl font-bold mb-2">VRM 로드 중...</div>
            <div className="text-lg">{loadingProgress.toFixed(0)}%</div>
          </div>
        </div>
      )}

      {/* 연결 버튼 */}
      {!network.isConnected && !isLoading && (
        <div className="absolute top-4 left-4">
          <button
            onClick={handleConnect}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold"
          >
            월드 접속하기
          </button>
        </div>
      )}

      {/* 상태 표시 */}
      <div className="absolute top-4 right-4 bg-black/70 text-white p-4 rounded-lg text-sm space-y-1">
        <div>연결: {network.isConnected ? '✅' : '❌'}</div>
        <div>얼굴 추적: {faceTracking.isTracking ? '✅' : '❌'}</div>
        <div>
          사용자: {network.otherUsers.size + (network.isConnected ? 1 : 0)}명
        </div>
        <div>표정: {expression.name}</div>
        <div className="text-xs mt-2">
          W/A/S/D: 이동
          <br />
          Shift: 달리기
          <br />
          마우스: 시점 회전
        </div>
      </div>

      {/* 에러 메시지 */}
      {(network.error || faceTracking.error) && (
        <div className="absolute bottom-4 left-4 bg-red-500 text-white p-4 rounded-lg">
          {network.error || faceTracking.error}
        </div>
      )}

      {/* 숨겨진 비디오 (얼굴 추적용) */}
      <video
        ref={faceTracking.videoRef}
        className="hidden"
        autoPlay
        playsInline
        muted
      />
    </div>
  );
}

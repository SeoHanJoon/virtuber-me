import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { applyTransforms } from '../utils/vrmTransforms';

/**
 * VRM Scene 초기화 옵션
 */
interface UseVRMSceneOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  modelPath: string;
  width: number;
  height: number;
  mirrorMode: boolean;
  rotateModel: boolean;
  onError?: (message: string) => void;
  onVRMLoaded?: () => void;
}

/**
 * Three.js Scene과 VRM 모델을 관리하는 커스텀 훅
 */
export function useVRMScene({
  canvasRef,
  modelPath,
  width,
  height,
  mirrorMode,
  rotateModel,
  onError,
  onVRMLoaded,
}: UseVRMSceneOptions) {
  const vrmRef = useRef<VRM | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Scene 및 VRM 초기화
  useEffect(() => {
    if (!canvasRef.current) return;

    // Three.js 렌더러 초기화
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // 씬 생성
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 카메라 설정
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 3);
    cameraRef.current = camera;

    // 조명 설정
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // VRM 모델 로드
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

        setIsLoaded(true);
        onVRMLoaded?.();
        console.log('VRM 모델 로드 완료');
      },
      (progress) => {
        const percentComplete = (progress.loaded / progress.total) * 100 || 0;
        console.log(`VRM 로딩: ${percentComplete.toFixed(2)}%`);
      },
      (error) => {
        console.error('VRM 로드 실패:', error);
        onError?.('VRM 모델을 로드할 수 없습니다.');
      }
    );

    // 클린업
    return () => {
      if (vrmRef.current && sceneRef.current) {
        sceneRef.current.remove(vrmRef.current.scene);
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
      }
      renderer.dispose();
    };
  }, [canvasRef, modelPath, width, height, onError]);

  // 변형 상태 변경 시 재적용
  useEffect(() => {
    if (vrmRef.current) {
      applyTransforms(vrmRef.current.scene, mirrorMode, rotateModel);
    }
  }, [mirrorMode, rotateModel]);

  return {
    vrmRef,
    rendererRef,
    sceneRef,
    cameraRef,
    isLoaded,
  };
}

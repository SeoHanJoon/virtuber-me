'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { VRMViewerProps } from '../types/components';

export default function VRMViewer({
  modelPath,
  className = '',
  width = 800,
  height = 600,
  mirrorMode = false,
  rotateModel = false,
}: VRMViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vrmRef = useRef<VRM | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Three.js 렌더러 초기화 - 투명 배경 활성화
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true, // 투명 배경 활성화
      antialias: true, // 안티앨리어싱으로 부드러운 렌더링
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    // 씬 생성 - 배경을 투명하게 설정
    const scene = new THREE.Scene();

    // 카메라 설정 - 원근 카메라 사용
    const camera = new THREE.PerspectiveCamera(
      30, // 시야각(FOV)
      width / height, // 종횡비
      0.1, // 가까운 클리핑 평면
      100 // 먼 클리핑 평면
    );
    camera.position.set(0, 1.4, 3); // 카메라 위치 설정 (약간 위에서 앞쪽으로)

    // 조명 설정
    // 1. 방향성 조명 - 메인 라이트
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // 2. 주변광 - 전체적인 밝기 조절
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // GLTF Loader 생성 및 VRM 플러그인 등록
    const loader = new GLTFLoader();
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });

    // VRM 모델 로드
    loader.load(
      modelPath,
      (gltf) => {
        // VRM 인스턴스 추출
        const vrm = gltf.userData.vrm as VRM;
        vrmRef.current = vrm;

        // VRM 모델을 Three.js가 올바르게 처리할 수 있도록 설정
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // 씬에 VRM 모델 추가
        scene.add(vrm.scene);

        // 모델 변형 적용
        applyTransforms(vrm.scene, mirrorMode, rotateModel);

        console.log('VRM 모델 로드 완료:', vrm);
      },
      (progress) => {
        // 로딩 진행 상황 로그
        const percentComplete = (progress.loaded / progress.total) * 100 || 0;
        console.log(`로딩 중: ${percentComplete.toFixed(2)}%`);
      },
      (error) => {
        // 로딩 에러 처리
        console.error('VRM 로드 실패:', error);
      }
    );

    // 시계 객체 생성 - 애니메이션 시간 추적용
    const clock = new THREE.Clock();

    // 애니메이션 루프
    const animate = () => {
      // 다음 프레임 요청
      requestAnimationFrame(animate);

      // 경과 시간 계산
      const deltaTime = clock.getDelta();

      // VRM 모델이 로드되었으면 업데이트
      if (vrmRef.current) {
        // VRM의 내부 상태 업데이트 (표정, 본, 스프링 등)
        vrmRef.current.update(deltaTime);

        // 간단한 회전 애니메이션 추가 (선택 사항)
        // vrmRef.current.scene.rotation.y += 0.01;
      }

      // 렌더링 수행
      renderer.render(scene, camera);
    };

    // 애니메이션 시작
    animate();

    // 클린업 함수 - 컴포넌트 언마운트 시 리소스 정리
    return () => {
      // VRM 모델 정리
      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
      }

      // 렌더러 정리
      renderer.dispose();
    };
  }, [modelPath, width, height, mirrorMode, rotateModel]);

  // 모델이 로드된 후 변형 상태가 변경되면 적용
  useEffect(() => {
    if (vrmRef.current) {
      applyTransforms(vrmRef.current.scene, mirrorMode, rotateModel);
    }
  }, [mirrorMode, rotateModel]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'block',
      }}
    />
  );
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

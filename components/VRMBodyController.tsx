'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { VRM, VRMHumanBoneName, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useBodyTracking } from '@/hooks/useBodyTracking';
import type {
  BodyTrackingState,
  BodyTrackingOptions,
  BoneBaseOffsets,
} from '@/types/bodyTracking';

interface VRMBodyControllerProps {
  // 비디오 ref (웹캠)
  videoRef: React.RefObject<HTMLVideoElement | null>;

  // VRM 모델 URL
  vrmUrl: string;

  // 캔버스 크기
  width?: number;
  height?: number;

  // 트래킹 옵션
  trackingOptions?: BodyTrackingOptions;

  // VRM 로드 완료 시 콜백
  onVRMLoaded?: (vrm: VRM) => void;

  // 트래킹 시작/중지 트리거
  isTrackingActive: boolean;
}

export function VRMBodyController({
  videoRef,
  vrmUrl,
  width = 640,
  height = 480,
  trackingOptions,
  onVRMLoaded,
  isTrackingActive,
}: VRMBodyControllerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vrmRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const animationFrameId = useRef<number | null>(null);

  const [isVRMLoaded, setIsVRMLoaded] = useState(false);
  const baseOffsetsRef = useRef<BoneBaseOffsets | null>(null);

  // useBodyTracking 훅
  const {
    bodyState,
    isBodyTrackingReady,
    startBodyTracking,
    stopBodyTracking,
    keypoints,
  } = useBodyTracking(videoRef, trackingOptions);

  // 트래킹 활성화/비활성화
  useEffect(() => {
    if (isTrackingActive) {
      startBodyTracking();
    } else {
      stopBodyTracking();
    }
  }, [isTrackingActive, startBodyTracking, stopBodyTracking]);

  /**
   * Three.js 씬 초기화
   */
  useEffect(() => {
    if (!canvasRef.current) {
      console.warn('[VRMBodyController] Canvas ref가 없습니다');
      return;
    }

    console.log('[VRMBodyController] Three.js 씬 초기화 시작');

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 1.6); // VRM에 적합한 카메라 위치
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true, // 투명 배경
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    console.log('[VRMBodyController] 렌더러 설정 완료:', {
      width,
      height,
      pixelRatio: window.devicePixelRatio,
    });

    // 조명
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // OrbitControls (카메라 조작)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0); // VRM의 중심
    controls.update();
    controlsRef.current = controls;

    // 애니메이션 루프
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      const delta = clockRef.current.getDelta();
      if (vrmRef.current) {
        vrmRef.current.update(delta);
      }
      controls.update();
      renderer.render(scene, camera);
    };

    console.log('[VRMBodyController] 애니메이션 루프 시작');
    animate();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [width, height]);

  /**
   * VRM 모델 로드
   */
  useEffect(() => {
    if (!sceneRef.current || !vrmUrl) return;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      vrmUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm || !sceneRef.current) {
          console.error(
            '[VRMBodyController] VRM 로드 실패: vrm 데이터가 없습니다'
          );
          return;
        }

        // 기존 VRM 제거
        if (vrmRef.current && sceneRef.current) {
          sceneRef.current.remove(vrmRef.current.scene);
          console.log('[VRMBodyController] 기존 VRM 제거됨');
        }

        // VRM 씬에 추가
        sceneRef.current.add(vrm.scene);
        vrmRef.current = vrm;
        console.log('[VRMBodyController] VRM 씬에 추가됨:', {
          position: vrm.scene.position,
          scale: vrm.scene.scale,
          visible: vrm.scene.visible,
        });

        // 기본 오프셋 저장 (T-pose 기준)
        const leftUpperArm = vrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.LeftUpperArm
        );
        const rightUpperArm = vrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.RightUpperArm
        );
        const leftLowerArm = vrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.LeftLowerArm
        );
        const rightLowerArm = vrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.RightLowerArm
        );
        const spine = vrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.Spine
        );
        const chest = vrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.Chest
        );
        const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
        const neck = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);

        if (
          leftUpperArm &&
          rightUpperArm &&
          leftLowerArm &&
          rightLowerArm &&
          spine &&
          chest &&
          head &&
          neck
        ) {
          baseOffsetsRef.current = {
            leftUpperArm: leftUpperArm.quaternion.clone(),
            rightUpperArm: rightUpperArm.quaternion.clone(),
            leftLowerArm: leftLowerArm.quaternion.clone(),
            rightLowerArm: rightLowerArm.quaternion.clone(),
            spine: spine.quaternion.clone(),
            chest: chest.quaternion.clone(),
            head: head.quaternion.clone(),
            neck: neck.quaternion.clone(),
          };
        }

        setIsVRMLoaded(true);
        onVRMLoaded?.(vrm);

        console.log('[VRMBodyController] VRM 로드 완료:', vrmUrl);
      },
      undefined,
      (error) => {
        console.error('[VRMBodyController] VRM 로드 오류:', error);
      }
    );
  }, [vrmUrl, onVRMLoaded]);

  /**
   * Body state를 VRM 본에 적용
   */
  const applyBodyStateToVRM = useCallback(
    (state: BodyTrackingState) => {
      if (!vrmRef.current || !baseOffsetsRef.current) return;

      const vrm = vrmRef.current;
      const baseOffsets = baseOffsetsRef.current;
      const slerpAmount = trackingOptions?.slerpAmount ?? 0.15; // 보간 강도

      const applyRotation = (
        boneName: VRMHumanBoneName,
        targetQuaternion: THREE.Quaternion,
        baseOffset: THREE.Quaternion
      ) => {
        const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
        if (bone) {
          // 기본 오프셋을 적용하여 최종 목표 회전 계산
          const finalTargetRotation = targetQuaternion
            .clone()
            .multiply(baseOffset);
          // Slerp 보간으로 부드럽게 회전 적용
          bone.quaternion.slerp(finalTargetRotation, slerpAmount);
        }
      };

      // 척추 및 가슴
      applyRotation(VRMHumanBoneName.Spine, state.spine, baseOffsets.spine);
      applyRotation(VRMHumanBoneName.Chest, state.chest, baseOffsets.chest);
      applyRotation(VRMHumanBoneName.Head, state.head, baseOffsets.head);
      applyRotation(VRMHumanBoneName.Neck, state.neck, baseOffsets.neck);

      // 팔
      applyRotation(
        VRMHumanBoneName.LeftUpperArm,
        state.leftUpperArm,
        baseOffsets.leftUpperArm
      );
      applyRotation(
        VRMHumanBoneName.RightUpperArm,
        state.rightUpperArm,
        baseOffsets.rightUpperArm
      );
      applyRotation(
        VRMHumanBoneName.LeftLowerArm,
        state.leftLowerArm,
        baseOffsets.leftLowerArm
      );
      applyRotation(
        VRMHumanBoneName.RightLowerArm,
        state.rightLowerArm,
        baseOffsets.rightLowerArm
      );

      // 어깨는 MoveNet에서 직접 제공하지 않으므로, 상완 회전에 포함되도록 처리
      // 또는 상위 본(가슴)의 회전으로 간접적으로 영향
    },
    [trackingOptions?.slerpAmount]
  );

  /**
   * bodyState 변경 시 VRM에 적용
   */
  useEffect(() => {
    if (isVRMLoaded && bodyState) {
      applyBodyStateToVRM(bodyState);
    }
  }, [bodyState, isVRMLoaded, applyBodyStateToVRM]);

  return (
    <div className="relative w-full h-full bg-gray-900">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* VRM 로딩 상태 */}
      {!isVRMLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white text-lg">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto" />
            <p>VRM 모델 로딩 중...</p>
          </div>
        </div>
      )}

      {/* MoveNet 로딩 상태 */}
      {!isBodyTrackingReady && isVRMLoaded && (
        <div className="absolute top-2 right-2 p-2 bg-blue-600 bg-opacity-80 text-white text-xs rounded">
          MoveNet 초기화 중...
        </div>
      )}

      {/* 트래킹 상태 표시 (키포인트는 디버그용으로 숨김) */}
      {isVRMLoaded && isBodyTrackingReady && (
        <div className="absolute top-2 right-2 p-2 bg-green-600 bg-opacity-80 text-white text-xs rounded">
          ✓ 트래킹 활성화
        </div>
      )}
    </div>
  );
}

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
  videoRef: React.RefObject<HTMLVideoElement | null>;
  vrmUrl: string;
  width?: number;
  height?: number;
  trackingOptions?: BodyTrackingOptions;
  onVRMLoaded?: (vrm: VRM) => void;
  isTrackingActive: boolean;
  onKeypointsUpdate?: (
    keypoints: Array<{
      x: number;
      y: number;
      z?: number;
      score?: number;
      name?: string;
    }> | null
  ) => void;
}

export function VRMBodyController({
  videoRef,
  vrmUrl,
  width = 640,
  height = 480,
  trackingOptions,
  onVRMLoaded,
  isTrackingActive,
  onKeypointsUpdate,
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

  const {
    bodyState,
    isBodyTrackingReady,
    startBodyTracking,
    stopBodyTracking,
    keypoints,
    error,
  } = useBodyTracking(videoRef, trackingOptions);

  useEffect(() => {
    if (error) {
      console.error('[VRMBodyController] useBodyTracking 에러:', error);
    }
  }, [error]);

  useEffect(() => {
    if (onKeypointsUpdate) {
      onKeypointsUpdate(keypoints);
    }
  }, [keypoints, onKeypointsUpdate]);

  useEffect(() => {
    console.log('[VRMBodyController] 트래킹 상태 변경:', {
      isTrackingActive,
      isBodyTrackingReady,
      hasVideoRef: !!videoRef.current,
    });

    if (isTrackingActive) {
      startBodyTracking();
    } else {
      stopBodyTracking();
    }
  }, [
    isTrackingActive,
    isBodyTrackingReady,
    startBodyTracking,
    stopBodyTracking,
    videoRef,
  ]);

  // Three.js 씬 초기화
  useEffect(() => {
    if (!canvasRef.current) {
      console.warn('[VRMBodyController] Canvas ref가 없습니다');
      return;
    }

    console.log('[VRMBodyController] Three.js 씬 초기화 시작');

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 1.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
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

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0);
    controls.update();
    controlsRef.current = controls;

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

  // VRM 모델 로드
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
          // 기본 포즈 저장 및 초기화
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

          console.log('[VRMBodyController] 기본 본 오프셋 저장 완료');
        } else {
          console.warn(
            '[VRMBodyController] 일부 본을 찾을 수 없어 기본 오프셋을 저장하지 못했습니다.'
          );
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
          // baseOffset에 targetQuaternion을 상대적으로 적용
          const finalRotation = baseOffset.clone().multiply(targetQuaternion);

          // Slerp 보간으로 부드럽게 회전 적용
          bone.quaternion.slerp(finalRotation, slerpAmount);
        }
      };

      // 팔만 적용 (가장 안정적)
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
    },
    [trackingOptions?.slerpAmount]
  );

  /**
   * 트래킹 비활성화 시 VRM을 기본 포즈로 리셋
   */
  useEffect(() => {
    if (
      !isTrackingActive &&
      isVRMLoaded &&
      vrmRef.current &&
      baseOffsetsRef.current
    ) {
      const vrm = vrmRef.current;
      const baseOffsets = baseOffsetsRef.current;

      // 모든 본을 기본 포즈로 리셋
      const resetBone = (
        boneName: VRMHumanBoneName,
        baseOffset: THREE.Quaternion
      ) => {
        const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
        if (bone) {
          bone.quaternion.copy(baseOffset);
        }
      };

      resetBone(VRMHumanBoneName.LeftUpperArm, baseOffsets.leftUpperArm);
      resetBone(VRMHumanBoneName.RightUpperArm, baseOffsets.rightUpperArm);
      resetBone(VRMHumanBoneName.LeftLowerArm, baseOffsets.leftLowerArm);
      resetBone(VRMHumanBoneName.RightLowerArm, baseOffsets.rightLowerArm);
      resetBone(VRMHumanBoneName.Spine, baseOffsets.spine);
      resetBone(VRMHumanBoneName.Chest, baseOffsets.chest);
      resetBone(VRMHumanBoneName.Head, baseOffsets.head);
      resetBone(VRMHumanBoneName.Neck, baseOffsets.neck);

      console.log('[VRMBodyController] VRM 기본 포즈로 리셋');
    }
  }, [isTrackingActive, isVRMLoaded]);

  /**
   * bodyState 변경 시 VRM에 적용
   * 트래킹이 활성화되었을 때만 적용
   */
  useEffect(() => {
    if (isVRMLoaded && bodyState && isTrackingActive) {
      applyBodyStateToVRM(bodyState);
    }
  }, [
    bodyState,
    isVRMLoaded,
    isTrackingActive,
    isBodyTrackingReady,
    applyBodyStateToVRM,
  ]);

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

      {/* 트래킹 상태 표시 */}
      {isVRMLoaded && isBodyTrackingReady && (
        <div className="absolute top-2 right-2 p-2 bg-green-600 bg-opacity-80 text-white text-xs rounded space-y-1">
          <div>✓ MoveNet 준비됨</div>
          {isTrackingActive && (
            <div className="text-yellow-300">🔴 트래킹 중</div>
          )}
          {!isTrackingActive && <div className="text-gray-300">⏸ 대기 중</div>}
          {bodyState && (
            <div className="text-green-200 text-[10px]">📊 데이터 수신 중</div>
          )}
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="absolute bottom-2 right-2 p-2 bg-red-600 bg-opacity-90 text-white text-xs rounded max-w-xs">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

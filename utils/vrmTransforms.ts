import * as THREE from 'three';

/**
 * VRM 모델에 변형을 적용하는 함수
 * @param scene - VRM scene 객체
 * @param mirrorMode - 좌우 미러 모드
 * @param rotateModel - 모델 180도 회전
 */
export function applyTransforms(
  scene: THREE.Group,
  mirrorMode: boolean,
  rotateModel: boolean
) {
  // 좌우 미러 (거울 모드)
  scene.scale.x = mirrorMode ? -1 : 1;

  // 모델 180도 회전 (뒤돌아 있는 경우)
  scene.rotation.y = rotateModel ? Math.PI : 0;
}

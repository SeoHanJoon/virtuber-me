import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * VRM 모델을 로드하고 최적화하여 반환
 */
export async function loadVRM(
  modelPath: string,
  onProgress?: (percent: number) => void
): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const gltf = await loader.loadAsync(modelPath, (progress) => {
    if (onProgress && progress.total > 0) {
      onProgress((progress.loaded / progress.total) * 100);
    }
  });

  const vrm = gltf.userData.vrm as VRM;

  if (!vrm) {
    throw new Error('VRM 데이터를 찾을 수 없습니다.');
  }

  // 최적화
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.removeUnnecessaryJoints(gltf.scene);

  return vrm;
}

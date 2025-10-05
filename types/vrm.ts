/**
 * VRM 관련 타입 정의
 */

/**
 * VRM 모델 정보
 */
export interface VRMModel {
  name: string; // 모델 이름 (확장자 제외)
  path: string; // 모델 경로 (/models/xxx.vrm)
}

/**
 * VRM 모델 목록 API 응답
 */
export type VRMModelsResponse = VRMModel[];

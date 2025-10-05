/**
 * 컴포넌트 Props 타입 정의
 */

/**
 * VRM 뷰어 컴포넌트 Props
 */
export interface VRMViewerProps {
  modelPath: string;
  className?: string;
  width?: number;
  height?: number;
  mirrorMode?: boolean; // 좌우 미러
  rotateModel?: boolean; // 모델 180도 회전
}

/**
 * 얼굴 추적 VRM 뷰어 컴포넌트 Props
 */
export interface FaceTrackingVRMViewerProps {
  modelPath: string;
  className?: string;
  width?: number;
  height?: number;
  mirrorMode?: boolean; // 좌우 미러
  rotateModel?: boolean; // 모델 180도 회전
  invertPitch?: boolean; // pitch 추적 반전 (위아래 반대)
}

/**
 * 멀티플레이어 VRM 월드 컴포넌트 Props
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

interface TrackingStatusIndicatorProps {
  error: string | null;
  isWebcamReady: boolean;
  isFaceLandmarkerReady: boolean;
}

/**
 * 추적 상태를 표시하는 컴포넌트
 */
export default function TrackingStatusIndicator({
  error,
  isWebcamReady,
  isFaceLandmarkerReady,
}: TrackingStatusIndicatorProps) {
  return (
    <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-2 rounded-lg text-sm">
      {error ? (
        <span className="text-red-400">❌ {error}</span>
      ) : !isWebcamReady ? (
        <span>📷 웹캠 초기화 중...</span>
      ) : !isFaceLandmarkerReady ? (
        <span>🔄 얼굴 추적 초기화 중...</span>
      ) : (
        <span className="text-green-400">✅ 추적 활성화</span>
      )}
    </div>
  );
}

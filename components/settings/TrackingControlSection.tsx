interface TrackingControlSectionProps {
  invertPitch: boolean;
  onInvertPitchChange: (enabled: boolean) => void;
  enableBodyTracking: boolean;
  onBodyTrackingChange: (enabled: boolean) => void;
  enableHandTracking: boolean;
  onHandTrackingChange: (enabled: boolean) => void;
  showLandmarks: boolean;
  onShowLandmarksChange: (show: boolean) => void;
}

/**
 * 추적 제어 설정 섹션
 */
export default function TrackingControlSection({
  invertPitch,
  onInvertPitchChange,
  enableBodyTracking,
  onBodyTrackingChange,
  enableHandTracking,
  onHandTrackingChange,
  showLandmarks,
  onShowLandmarksChange,
}: TrackingControlSectionProps) {
  return (
    <div className="pt-4 border-t border-gray-700">
      <h4 className="font-semibold text-base mb-3 text-blue-400">
        🎯 추적 설정
      </h4>

      {/* 위아래 반전 */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg mb-2">
        <label className="flex items-center gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={invertPitch}
            onChange={(e) => onInvertPitchChange(e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <div className="flex-1">
            <span className="text-sm block">⇅ 위아래 반전</span>
            <span className="text-xs text-gray-400">
              고개가 반대로 움직이면 체크
            </span>
          </div>
        </label>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            invertPitch
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {invertPitch ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* 상체 추적 토글 */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg mb-2">
        <label className="flex items-center gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={enableBodyTracking}
            onChange={(e) => onBodyTrackingChange(e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <span className="text-sm">🙆 상체 추적</span>
        </label>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            enableBodyTracking
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {enableBodyTracking ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* 손 추적 토글 */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg mb-2">
        <label className="flex items-center gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={enableHandTracking}
            onChange={(e) => onHandTrackingChange(e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <span className="text-sm">✋ 손 추적</span>
        </label>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            enableHandTracking
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {enableHandTracking ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* 랜드마크 시각화 토글 */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={showLandmarks}
            onChange={(e) => onShowLandmarksChange(e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <span className="text-sm">👁️ 랜드마크 표시</span>
        </label>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            showLandmarks
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {showLandmarks ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
}

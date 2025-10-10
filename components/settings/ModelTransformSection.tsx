interface ModelTransformSectionProps {
  mirrorMode: boolean;
  onMirrorModeChange: (enabled: boolean) => void;
  rotateModel: boolean;
  onRotateModelChange: (enabled: boolean) => void;
}

/**
 * 모델 변형 설정 섹션
 */
export default function ModelTransformSection({
  mirrorMode,
  onMirrorModeChange,
  rotateModel,
  onRotateModelChange,
}: ModelTransformSectionProps) {
  return (
    <div>
      <h4 className="font-semibold text-base mb-3 text-green-400">
        🔄 모델 변형
      </h4>

      {/* 모델 180° 회전 */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg mb-2">
        <label className="flex items-center gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={rotateModel}
            onChange={(e) => onRotateModelChange(e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <span className="text-sm">↻ 모델 180° 회전</span>
        </label>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            rotateModel
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {rotateModel ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* 좌우 미러 */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={mirrorMode}
            onChange={(e) => onMirrorModeChange(e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <span className="text-sm">⇆ 좌우 미러</span>
        </label>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            mirrorMode ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
          }`}
        >
          {mirrorMode ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
}

import { useState } from 'react';

export interface ExpressionMultipliers {
  mouthOpen: number;
  mouthWidth: number;
  mouthSmile: number;
  blink: number;
  eyeLook: number;
}

interface ExpressionSettingsPanelProps {
  multipliers: ExpressionMultipliers;
  onMultiplierChange: (key: keyof ExpressionMultipliers, value: number) => void;
  enableBodyTracking: boolean;
  onBodyTrackingChange: (enabled: boolean) => void;
  enableHandTracking: boolean;
  onHandTrackingChange: (enabled: boolean) => void;
  showLandmarks: boolean;
  onShowLandmarksChange: (show: boolean) => void;
  onReset: () => void;
}

/**
 * 표정 강도 조절 및 추적 설정 패널 컴포넌트
 */
export default function ExpressionSettingsPanel({
  multipliers,
  onMultiplierChange,
  enableBodyTracking,
  onBodyTrackingChange,
  enableHandTracking,
  onHandTrackingChange,
  showLandmarks,
  onShowLandmarksChange,
  onReset,
}: ExpressionSettingsPanelProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="absolute top-4 right-4">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        ⚙️ 표정 강도 조절
      </button>

      {showSettings && (
        <div className="mt-2 bg-black/90 text-white p-4 rounded-lg text-sm w-64 space-y-3">
          <h3 className="font-bold text-base mb-3">추적 설정</h3>

          {/* 상체 추적 토글 */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableBodyTracking}
                onChange={(e) => onBodyTrackingChange(e.target.checked)}
                className="w-4 h-4"
              />
              <span>🙆 상체 추적</span>
            </label>
            <span className="text-xs text-gray-400">
              {enableBodyTracking ? 'ON' : 'OFF'}
            </span>
          </div>

          {/* 손 추적 토글 */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableHandTracking}
                onChange={(e) => onHandTrackingChange(e.target.checked)}
                className="w-4 h-4"
              />
              <span>✋ 손 추적</span>
            </label>
            <span className="text-xs text-gray-400">
              {enableHandTracking ? 'ON' : 'OFF'}
            </span>
          </div>

          {/* 랜드마크 시각화 토글 */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLandmarks}
                onChange={(e) => onShowLandmarksChange(e.target.checked)}
                className="w-4 h-4"
              />
              <span>👁️ 랜드마크 표시</span>
            </label>
            <span className="text-xs text-gray-400">
              {showLandmarks ? 'ON' : 'OFF'}
            </span>
          </div>

          <h4 className="font-semibold text-sm mt-3 mb-2">표정 강도</h4>

          {/* 눈 깜빡임 강도 */}
          <div>
            <label className="flex justify-between mb-1">
              <span>👁️ 눈 깜빡임</span>
              <span className="text-yellow-400">
                {multipliers.blink.toFixed(1)}x
              </span>
            </label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={multipliers.blink}
              onChange={(e) =>
                onMultiplierChange('blink', parseFloat(e.target.value))
              }
              className="w-full"
            />
          </div>

          {/* 입 벌림 강도 */}
          <div>
            <label className="flex justify-between mb-1">
              <span>👄 입 벌림</span>
              <span className="text-yellow-400">
                {multipliers.mouthOpen.toFixed(1)}x
              </span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={multipliers.mouthOpen}
              onChange={(e) =>
                onMultiplierChange('mouthOpen', parseFloat(e.target.value))
              }
              className="w-full"
            />
          </div>

          {/* 미소 강도 */}
          <div>
            <label className="flex justify-between mb-1">
              <span>😊 미소</span>
              <span className="text-yellow-400">
                {multipliers.mouthSmile.toFixed(1)}x
              </span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={multipliers.mouthSmile}
              onChange={(e) =>
                onMultiplierChange('mouthSmile', parseFloat(e.target.value))
              }
              className="w-full"
            />
          </div>

          {/* 시선 강도 */}
          <div>
            <label className="flex justify-between mb-1">
              <span>👀 시선</span>
              <span className="text-yellow-400">
                {multipliers.eyeLook.toFixed(1)}x
              </span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={multipliers.eyeLook}
              onChange={(e) =>
                onMultiplierChange('eyeLook', parseFloat(e.target.value))
              }
              className="w-full"
            />
          </div>

          {/* 초기화 버튼 */}
          <button
            onClick={onReset}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm mt-2 transition-colors"
          >
            🔄 기본값으로 초기화
          </button>
        </div>
      )}
    </div>
  );
}

import type { ExpressionMultipliers } from '../ExpressionSettingsPanel';

interface ExpressionIntensitySectionProps {
  multipliers: ExpressionMultipliers;
  onMultiplierChange: (key: keyof ExpressionMultipliers, value: number) => void;
}

/**
 * 표정 강도 조절 섹션
 */
export default function ExpressionIntensitySection({
  multipliers,
  onMultiplierChange,
}: ExpressionIntensitySectionProps) {
  return (
    <div className="pt-4 border-t border-gray-700">
      <h4 className="font-semibold text-base mb-3 text-purple-400">
        😊 표정 강도
      </h4>

      {/* 눈 깜빡임 강도 */}
      <div className="bg-gray-800 p-3 rounded-lg mb-3">
        <label className="flex justify-between mb-2">
          <span className="text-sm">👁️ 눈 깜빡임</span>
          <span className="text-yellow-400 font-mono text-sm">
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
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
        />
      </div>

      {/* 입 벌림 강도 */}
      <div className="bg-gray-800 p-3 rounded-lg mb-3">
        <label className="flex justify-between mb-2">
          <span className="text-sm">👄 입 벌림</span>
          <span className="text-yellow-400 font-mono text-sm">
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
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
        />
      </div>

      {/* 미소 강도 */}
      <div className="bg-gray-800 p-3 rounded-lg mb-3">
        <label className="flex justify-between mb-2">
          <span className="text-sm">😊 미소</span>
          <span className="text-yellow-400 font-mono text-sm">
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
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
        />
      </div>

      {/* 시선 강도 */}
      <div className="bg-gray-800 p-3 rounded-lg">
        <label className="flex justify-between mb-2">
          <span className="text-sm">👀 시선</span>
          <span className="text-yellow-400 font-mono text-sm">
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
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
        />
      </div>
    </div>
  );
}

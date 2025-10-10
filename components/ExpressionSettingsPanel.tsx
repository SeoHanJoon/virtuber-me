import { useState } from 'react';
import type { BlendShapesData } from '../utils/mediapipeBlendShapes';
import { formatBlendShapesForDisplay } from '../utils/mediapipeBlendShapes';

export interface ExpressionMultipliers {
  mouthOpen: number;
  mouthWidth: number;
  mouthSmile: number;
  blink: number;
  eyeLook: number;
}

interface ExpressionSettingsPanelProps {
  // 표정 강도
  multipliers: ExpressionMultipliers;
  onMultiplierChange: (key: keyof ExpressionMultipliers, value: number) => void;
  // 추적 설정
  enableBodyTracking: boolean;
  onBodyTrackingChange: (enabled: boolean) => void;
  enableHandTracking: boolean;
  onHandTrackingChange: (enabled: boolean) => void;
  showLandmarks: boolean;
  onShowLandmarksChange: (show: boolean) => void;
  // 모델 변형 설정
  mirrorMode: boolean;
  onMirrorModeChange: (enabled: boolean) => void;
  rotateModel: boolean;
  onRotateModelChange: (enabled: boolean) => void;
  invertPitch: boolean;
  onInvertPitchChange: (enabled: boolean) => void;
  // BlendShapes 모니터
  showBlendShapes: boolean;
  onShowBlendShapesChange: (show: boolean) => void;
  blendShapesData: BlendShapesData | null;
  // 초기화
  onReset: () => void;
}

/**
 * 통합 설정 패널 컴포넌트
 * - 모델 변형 (거울, 회전, 추적 반전)
 * - 추적 설정 (상체, 손, 랜드마크)
 * - 표정 강도 조절
 * - BlendShapes 모니터
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
  mirrorMode,
  onMirrorModeChange,
  rotateModel,
  onRotateModelChange,
  invertPitch,
  onInvertPitchChange,
  showBlendShapes,
  onShowBlendShapesChange,
  blendShapesData,
  onReset,
}: ExpressionSettingsPanelProps) {
  const [showSettings, setShowSettings] = useState(false);

  // BlendShapes 표시 데이터 생성
  const displayBlendShapes = blendShapesData
    ? formatBlendShapesForDisplay(blendShapesData, 0.1).slice(0, 10)
    : [];

  return (
    <>
      {/* 설정 버튼 - 우측 상단 고정 */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg"
      >
        ⚙️ 설정 {showSettings ? '▼' : '▶'}
      </button>

      {/* 설정 패널 - 사이드바 형태 */}
      {showSettings && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowSettings(false)}
          />

          {/* 설정 패널 */}
          <div className="fixed top-0 right-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6 space-y-4">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                <h3 className="font-bold text-lg">⚙️ 설정</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* 모델 변형 섹션 */}
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
                      mirrorMode
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {mirrorMode ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* 추적 설정 섹션 */}
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

              {/* 표정 강도 섹션 */}
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
                      onMultiplierChange(
                        'mouthOpen',
                        parseFloat(e.target.value)
                      )
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
                      onMultiplierChange(
                        'mouthSmile',
                        parseFloat(e.target.value)
                      )
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

              {/* BlendShapes 모니터 섹션 */}
              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-base text-orange-400">
                    📊 BlendShapes 모니터
                  </h4>
                  <button
                    onClick={() => onShowBlendShapesChange(!showBlendShapes)}
                    className={`text-xs font-medium px-3 py-1 rounded transition-colors ${
                      showBlendShapes
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {showBlendShapes ? '숨김' : '표시'}
                  </button>
                </div>

                {showBlendShapes && (
                  <div className="bg-gray-800 p-3 rounded-lg max-h-64 overflow-y-auto">
                    {displayBlendShapes.length === 0 ? (
                      <p className="text-gray-400 text-center py-4 text-sm">
                        얼굴이 감지되지 않았습니다
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {displayBlendShapes.map((item, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="text-gray-400 w-4 text-right text-xs">
                              {index + 1}
                            </span>
                            <span className="flex-1 text-xs text-gray-300">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 w-32">
                              <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-orange-500 to-yellow-500 h-full transition-all duration-100"
                                  style={{ width: `${item.value * 100}%` }}
                                />
                              </div>
                              <span className="text-yellow-400 w-10 text-right font-mono text-xs">
                                {item.value.toFixed(2)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400">
                      <p>💡 상위 10개 (0.1 이상만 표시)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 초기화 버튼 */}
              <button
                onClick={onReset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-lg"
              >
                🔄 기본값으로 초기화
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

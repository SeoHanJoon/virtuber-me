import { useState } from 'react';
import type { BlendShapesData } from '../utils/mediapipeBlendShapes';
import ModelTransformSection from './settings/ModelTransformSection';
import TrackingControlSection from './settings/TrackingControlSection';
import ExpressionIntensitySection from './settings/ExpressionIntensitySection';
import BlendShapesSection from './settings/BlendShapesSection';

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
  onShowLandmarksChange?: (show: boolean) => void; // Optional: 외부에서 제어될 수 있음
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
              <ModelTransformSection
                mirrorMode={mirrorMode}
                onMirrorModeChange={onMirrorModeChange}
                rotateModel={rotateModel}
                onRotateModelChange={onRotateModelChange}
              />

              {/* 추적 설정 섹션 */}
              <TrackingControlSection
                invertPitch={invertPitch}
                onInvertPitchChange={onInvertPitchChange}
                enableBodyTracking={enableBodyTracking}
                onBodyTrackingChange={onBodyTrackingChange}
                enableHandTracking={enableHandTracking}
                onHandTrackingChange={onHandTrackingChange}
                showLandmarks={showLandmarks}
                onShowLandmarksChange={onShowLandmarksChange}
              />

              {/* 표정 강도 섹션 */}
              <ExpressionIntensitySection
                multipliers={multipliers}
                onMultiplierChange={onMultiplierChange}
              />

              {/* BlendShapes 모니터 섹션 */}
              <BlendShapesSection
                showBlendShapes={showBlendShapes}
                onShowBlendShapesChange={onShowBlendShapesChange}
                blendShapesData={blendShapesData}
              />

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

'use client';

import { useState } from 'react';
import type { VRMCalibrationProfile } from '../utils/vrmCalibration';

interface TrackingDebugOverlayProps {
  // Calibration 데이터
  calibrationProfile: VRMCalibrationProfile | null;
  // 현재 트래킹 상태
  bodyTracking?: {
    leftUpperArm?: { x: number; y: number; z: number };
    rightUpperArm?: { x: number; y: number; z: number };
    spine?: { x: number; y: number; z: number };
  };
  faceTracking?: {
    mouthOpen?: number;
    blinkLeft?: number;
    blinkRight?: number;
  };
  // FPS
  fps?: number;
}

/**
 * 트래킹 디버그 오버레이
 *
 * VRM Calibration 정보 및 실시간 트래킹 데이터를 표시합니다.
 */
export default function TrackingDebugOverlay({
  calibrationProfile,
  bodyTracking,
  faceTracking,
  fps,
}: TrackingDebugOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const radToDeg = (rad: number) => ((rad * 180) / Math.PI).toFixed(1);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      {/* 토글 버튼 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 px-4 py-2 bg-gray-900/90 text-white rounded-lg hover:bg-gray-800/90 transition-colors text-sm font-mono"
      >
        🐛 Debug {isExpanded ? '▼' : '▶'}
      </button>

      {isExpanded && (
        <div className="bg-gray-900/95 text-white p-4 rounded-lg shadow-2xl space-y-3 text-xs font-mono max-h-[80vh] overflow-y-auto">
          {/* FPS */}
          {fps !== undefined && (
            <div className="pb-2 border-b border-gray-700">
              <div className="text-green-400 font-bold">
                FPS: {fps.toFixed(1)}
              </div>
            </div>
          )}

          {/* Calibration 정보 */}
          {calibrationProfile && (
            <div className="space-y-2">
              <div className="text-yellow-400 font-bold">
                📊 Calibration Profile
              </div>
              <div className="pl-2 space-y-1 text-gray-300">
                <div>
                  Base Pose:{' '}
                  <span className="text-cyan-400">
                    {calibrationProfile.basePoseType}
                  </span>
                </div>
                <div>
                  Arm Angle:{' '}
                  <span className="text-cyan-400">
                    {calibrationProfile.initialArmAngle.toFixed(1)}°
                  </span>
                </div>
                <div>
                  Bones Found:{' '}
                  <span className="text-cyan-400">
                    {
                      Object.values(calibrationProfile.bones).filter(
                        (b) => b.exists
                      ).length
                    }
                  </span>
                </div>
              </div>

              {/* 주요 본 정보 */}
              <div className="mt-2 space-y-1">
                <div className="text-blue-400 font-bold">Key Bones:</div>
                {['leftUpperArm', 'rightUpperArm', 'spine', 'chest'].map(
                  (boneName) => {
                    const bone =
                      calibrationProfile.bones[
                        boneName as keyof typeof calibrationProfile.bones
                      ];
                    if (!bone?.exists) return null;
                    return (
                      <div key={boneName} className="pl-2 text-gray-400">
                        {boneName}: <span className="text-green-400">✓</span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* 상체 트래킹 데이터 */}
          {bodyTracking && (
            <div className="space-y-2 pt-2 border-t border-gray-700">
              <div className="text-yellow-400 font-bold">🎯 Body Tracking</div>
              {bodyTracking.leftUpperArm && (
                <div className="pl-2 space-y-1">
                  <div className="text-blue-300">Left Upper Arm:</div>
                  <div className="pl-2 text-gray-400">
                    X: {radToDeg(bodyTracking.leftUpperArm.x)}° Y:{' '}
                    {radToDeg(bodyTracking.leftUpperArm.y)}° Z:{' '}
                    {radToDeg(bodyTracking.leftUpperArm.z)}°
                  </div>
                </div>
              )}
              {bodyTracking.rightUpperArm && (
                <div className="pl-2 space-y-1">
                  <div className="text-blue-300">Right Upper Arm:</div>
                  <div className="pl-2 text-gray-400">
                    X: {radToDeg(bodyTracking.rightUpperArm.x)}° Y:{' '}
                    {radToDeg(bodyTracking.rightUpperArm.y)}° Z:{' '}
                    {radToDeg(bodyTracking.rightUpperArm.z)}°
                  </div>
                </div>
              )}
              {bodyTracking.spine && (
                <div className="pl-2 space-y-1">
                  <div className="text-blue-300">Spine:</div>
                  <div className="pl-2 text-gray-400">
                    X: {radToDeg(bodyTracking.spine.x)}° Y:{' '}
                    {radToDeg(bodyTracking.spine.y)}° Z:{' '}
                    {radToDeg(bodyTracking.spine.z)}°
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 얼굴 트래킹 데이터 */}
          {faceTracking && (
            <div className="space-y-2 pt-2 border-t border-gray-700">
              <div className="text-yellow-400 font-bold">😊 Face Tracking</div>
              {faceTracking.mouthOpen !== undefined && (
                <div className="pl-2 text-gray-400">
                  Mouth Open:{' '}
                  <span className="text-green-400">
                    {(faceTracking.mouthOpen * 100).toFixed(0)}%
                  </span>
                  <div className="mt-1 w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, faceTracking.mouthOpen * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {faceTracking.blinkLeft !== undefined && (
                <div className="pl-2 text-gray-400">
                  Blink Left:{' '}
                  <span className="text-blue-400">
                    {(faceTracking.blinkLeft * 100).toFixed(0)}%
                  </span>
                  <div className="mt-1 w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, faceTracking.blinkLeft * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {faceTracking.blinkRight !== undefined && (
                <div className="pl-2 text-gray-400">
                  Blink Right:{' '}
                  <span className="text-blue-400">
                    {(faceTracking.blinkRight * 100).toFixed(0)}%
                  </span>
                  <div className="mt-1 w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, faceTracking.blinkRight * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 범례 */}
          <div className="pt-2 border-t border-gray-700 text-xs text-gray-500">
            💡 Tip: Calibration은 모델별로 자동 생성됩니다
          </div>
        </div>
      )}
    </div>
  );
}

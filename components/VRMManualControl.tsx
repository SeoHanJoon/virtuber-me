'use client';

import { useState, useEffect } from 'react';
import type { VRM } from '@pixiv/three-vrm';

/**
 * VRM 본 회전 수동 조절 값
 */
export interface VRMManualRotation {
  // 척추
  spineX: number;
  spineY: number;
  spineZ: number;
  // 가슴
  chestX: number;
  chestY: number;
  chestZ: number;
  // 왼팔 상완
  leftUpperArmX: number;
  leftUpperArmY: number;
  leftUpperArmZ: number;
  // 왼팔 전완
  leftLowerArmX: number;
  leftLowerArmY: number;
  leftLowerArmZ: number;
  // 오른팔 상완
  rightUpperArmX: number;
  rightUpperArmY: number;
  rightUpperArmZ: number;
  // 오른팔 전완
  rightLowerArmX: number;
  rightLowerArmY: number;
  rightLowerArmZ: number;
  // 머리
  headX: number;
  headY: number;
  headZ: number;
}

interface VRMManualControlProps {
  vrm: VRM | null;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

const defaultRotation: VRMManualRotation = {
  spineX: 0,
  spineY: 0,
  spineZ: 0,
  chestX: 0,
  chestY: 0,
  chestZ: 0,
  leftUpperArmX: 0,
  leftUpperArmY: 0,
  leftUpperArmZ: 0,
  leftLowerArmX: 0,
  leftLowerArmY: 0,
  leftLowerArmZ: 0,
  rightUpperArmX: 0,
  rightUpperArmY: 0,
  rightUpperArmZ: 0,
  rightLowerArmX: 0,
  rightLowerArmY: 0,
  rightLowerArmZ: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
};

/**
 * 슬라이더 컨트롤 컴포넌트 (컴포넌트 외부로 분리)
 */
const SliderControl = ({
  label,
  value,
  onChange,
  min = -Math.PI,
  max = Math.PI,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) => {
  const radToDeg = (rad: number) => ((rad * 180) / Math.PI).toFixed(0);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs text-gray-300">{label}</label>
        <span className="text-xs text-cyan-400 font-mono">
          {radToDeg(value)}°
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onInput={(e) =>
          onChange(parseFloat((e.target as HTMLInputElement).value))
        }
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  );
};

/**
 * VRM 본 회전 수동 조절 패널
 */
export default function VRMManualControl({
  vrm,
  enabled,
  onEnabledChange,
}: VRMManualControlProps) {
  const [rotation, setRotation] = useState<VRMManualRotation>(defaultRotation);

  // 회전 적용
  useEffect(() => {
    if (!vrm?.humanoid || !enabled) return;

    const spine = vrm.humanoid.getNormalizedBoneNode('spine');
    if (spine) {
      spine.rotation.x = rotation.spineX;
      spine.rotation.y = rotation.spineY;
      spine.rotation.z = rotation.spineZ;
    }

    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    if (chest) {
      chest.rotation.x = rotation.chestX;
      chest.rotation.y = rotation.chestY;
      chest.rotation.z = rotation.chestZ;
    }

    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    if (leftUpperArm) {
      leftUpperArm.rotation.x = rotation.leftUpperArmX;
      leftUpperArm.rotation.y = rotation.leftUpperArmY;
      leftUpperArm.rotation.z = rotation.leftUpperArmZ;
    }

    const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
    if (leftLowerArm) {
      leftLowerArm.rotation.x = rotation.leftLowerArmX;
      leftLowerArm.rotation.y = rotation.leftLowerArmY;
      leftLowerArm.rotation.z = rotation.leftLowerArmZ;
    }

    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    if (rightUpperArm) {
      rightUpperArm.rotation.x = rotation.rightUpperArmX;
      rightUpperArm.rotation.y = rotation.rightUpperArmY;
      rightUpperArm.rotation.z = rotation.rightUpperArmZ;
    }

    const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
    if (rightLowerArm) {
      rightLowerArm.rotation.x = rotation.rightLowerArmX;
      rightLowerArm.rotation.y = rotation.rightLowerArmY;
      rightLowerArm.rotation.z = rotation.rightLowerArmZ;
    }

    const head = vrm.humanoid.getNormalizedBoneNode('head');
    if (head) {
      head.rotation.x = rotation.headX;
      head.rotation.y = rotation.headY;
      head.rotation.z = rotation.headZ;
    }
  }, [vrm, rotation, enabled]);

  const handleReset = () => {
    setRotation(defaultRotation);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* 헤더 */}
      <div className="mb-4 flex gap-2 items-center">
        <button
          onClick={() => onEnabledChange(!enabled)}
          className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
            enabled
              ? 'bg-cyan-600 text-white hover:bg-cyan-700'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🎮 수동 제어 {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {enabled && (
        <div className="bg-gray-900/95 text-white p-4 rounded-lg shadow-2xl space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex justify-between items-center pb-2 border-b border-gray-700">
            <h3 className="text-sm font-bold text-cyan-400">
              VRM 본 회전 제어
            </h3>
            <button
              onClick={handleReset}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
            >
              리셋
            </button>
          </div>

          {/* 척추 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-yellow-400">척추 (Spine)</h4>
            <SliderControl
              label="X (Pitch)"
              value={rotation.spineX}
              onChange={(v) => setRotation({ ...rotation, spineX: v })}
            />
            <SliderControl
              label="Y (Yaw)"
              value={rotation.spineY}
              onChange={(v) => setRotation({ ...rotation, spineY: v })}
            />
            <SliderControl
              label="Z (Roll)"
              value={rotation.spineZ}
              onChange={(v) => setRotation({ ...rotation, spineZ: v })}
            />
          </div>

          {/* 가슴 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-yellow-400">가슴 (Chest)</h4>
            <SliderControl
              label="X (Pitch)"
              value={rotation.chestX}
              onChange={(v) => setRotation({ ...rotation, chestX: v })}
            />
            <SliderControl
              label="Y (Yaw)"
              value={rotation.chestY}
              onChange={(v) => setRotation({ ...rotation, chestY: v })}
            />
            <SliderControl
              label="Z (Roll)"
              value={rotation.chestZ}
              onChange={(v) => setRotation({ ...rotation, chestZ: v })}
            />
          </div>

          {/* 왼팔 상완 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-blue-400">왼팔 상완</h4>
            <SliderControl
              label="X (Pitch)"
              value={rotation.leftUpperArmX}
              onChange={(v) => setRotation({ ...rotation, leftUpperArmX: v })}
            />
            <SliderControl
              label="Y (Yaw)"
              value={rotation.leftUpperArmY}
              onChange={(v) => setRotation({ ...rotation, leftUpperArmY: v })}
            />
            <SliderControl
              label="Z (Roll)"
              value={rotation.leftUpperArmZ}
              onChange={(v) => setRotation({ ...rotation, leftUpperArmZ: v })}
            />
          </div>

          {/* 왼팔 전완 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-blue-400">왼팔 전완</h4>
            <SliderControl
              label="X (Pitch)"
              value={rotation.leftLowerArmX}
              onChange={(v) => setRotation({ ...rotation, leftLowerArmX: v })}
            />
            <SliderControl
              label="Y (Yaw)"
              value={rotation.leftLowerArmY}
              onChange={(v) => setRotation({ ...rotation, leftLowerArmY: v })}
            />
            <SliderControl
              label="Z (Roll)"
              value={rotation.leftLowerArmZ}
              onChange={(v) => setRotation({ ...rotation, leftLowerArmZ: v })}
            />
          </div>

          {/* 오른팔 상완 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-green-400">오른팔 상완</h4>
            <SliderControl
              label="X (Pitch)"
              value={rotation.rightUpperArmX}
              onChange={(v) => setRotation({ ...rotation, rightUpperArmX: v })}
            />
            <SliderControl
              label="Y (Yaw)"
              value={rotation.rightUpperArmY}
              onChange={(v) => setRotation({ ...rotation, rightUpperArmY: v })}
            />
            <SliderControl
              label="Z (Roll)"
              value={rotation.rightUpperArmZ}
              onChange={(v) => setRotation({ ...rotation, rightUpperArmZ: v })}
            />
          </div>

          {/* 오른팔 전완 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-green-400">오른팔 전완</h4>
            <SliderControl
              label="X (Pitch)"
              value={rotation.rightLowerArmX}
              onChange={(v) => setRotation({ ...rotation, rightLowerArmX: v })}
            />
            <SliderControl
              label="Y (Yaw)"
              value={rotation.rightLowerArmY}
              onChange={(v) => setRotation({ ...rotation, rightLowerArmY: v })}
            />
            <SliderControl
              label="Z (Roll)"
              value={rotation.rightLowerArmZ}
              onChange={(v) => setRotation({ ...rotation, rightLowerArmZ: v })}
            />
          </div>

          {/* 머리 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-purple-400">머리 (Head)</h4>
            <SliderControl
              label="X (Pitch)"
              value={rotation.headX}
              onChange={(v) => setRotation({ ...rotation, headX: v })}
            />
            <SliderControl
              label="Y (Yaw)"
              value={rotation.headY}
              onChange={(v) => setRotation({ ...rotation, headY: v })}
            />
            <SliderControl
              label="Z (Roll)"
              value={rotation.headZ}
              onChange={(v) => setRotation({ ...rotation, headZ: v })}
            />
          </div>

          {/* 안내 */}
          <div className="pt-2 border-t border-gray-700 text-xs text-gray-500">
            💡 수동 제어 ON 시 자동 트래킹이 비활성화됩니다
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #06b6d4;
          cursor: pointer;
          border-radius: 50%;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #06b6d4;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    </div>
  );
}

import { useMemo } from 'react';
import type { BlendShapesData } from '../../utils/mediapipeBlendShapes';
import { formatBlendShapesForDisplay } from '../../utils/mediapipeBlendShapes';

interface BlendShapesSectionProps {
  showBlendShapes: boolean;
  onShowBlendShapesChange: (show: boolean) => void;
  blendShapesData: BlendShapesData | null;
}

/**
 * BlendShapes 모니터 섹션
 */
export default function BlendShapesSection({
  showBlendShapes,
  onShowBlendShapesChange,
  blendShapesData,
}: BlendShapesSectionProps) {
  // BlendShapes 표시 데이터 (메모이제이션)
  const displayBlendShapes = useMemo(
    () =>
      blendShapesData
        ? formatBlendShapesForDisplay(blendShapesData, 0.1).slice(0, 10)
        : [],
    [blendShapesData]
  );

  return (
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
  );
}

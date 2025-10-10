import { useState, useEffect } from 'react';
import type { BlendShapesData } from '../utils/mediapipeBlendShapes';
import { formatBlendShapesForDisplay } from '../utils/mediapipeBlendShapes';

interface BlendShapesMonitorProps {
  blendShapes: BlendShapesData | null;
  threshold?: number;
  maxItems?: number;
}

/**
 * MediaPipe BlendShapes 실시간 모니터 컴포넌트
 */
export default function BlendShapesMonitor({
  blendShapes,
  threshold = 0.1,
  maxItems = 10,
}: BlendShapesMonitorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayData, setDisplayData] = useState<
    Array<{ name: string; value: number }>
  >([]);

  useEffect(() => {
    if (blendShapes) {
      const formatted = formatBlendShapesForDisplay(blendShapes, threshold);
      setDisplayData(formatted.slice(0, maxItems));
    }
  }, [blendShapes, threshold, maxItems]);

  return (
    <div className="absolute bottom-4 left-4">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        📊 BlendShapes {isVisible ? '▼' : '▶'}
      </button>

      {isVisible && (
        <div className="mt-2 bg-black/90 text-white p-4 rounded-lg text-xs w-80 max-h-96 overflow-y-auto">
          <h3 className="font-bold text-sm mb-3">
            MediaPipe BlendShapes (상위 {maxItems}개)
          </h3>

          {displayData.length === 0 ? (
            <p className="text-gray-400 text-center py-4">
              얼굴이 감지되지 않았습니다
            </p>
          ) : (
            <ul className="space-y-2">
              {displayData.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-gray-400 w-4 text-right">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-xs">{item.name}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-100"
                        style={{ width: `${item.value * 100}%` }}
                      />
                    </div>
                    <span className="text-yellow-400 w-12 text-right font-mono">
                      {item.value.toFixed(2)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-400">
            <p>💡 Tip: 임계값({threshold.toFixed(2)}) 이상만 표시됩니다</p>
          </div>
        </div>
      )}
    </div>
  );
}

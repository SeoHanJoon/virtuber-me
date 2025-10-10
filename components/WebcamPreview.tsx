import { useCallback } from 'react';
import LandmarkVisualizer from './LandmarkVisualizer';

interface WebcamPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  width?: number;
  height?: number;
}

/**
 * 웹캠 프리뷰 + 랜드마크 오버레이 컴포넌트
 */
export default function WebcamPreview({
  videoRef,
  landmarks,
  width = 240,
  height = 180,
}: WebcamPreviewProps) {
  // video ref 콜백을 useCallback으로 메모이제이션
  const handleVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && videoRef.current) {
        el.srcObject = videoRef.current.srcObject;
        el.play().catch(() => {
          // 자동 재생 실패 무시
        });
      }
    },
    [videoRef]
  );

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className="relative rounded-lg border-2 border-white/30 overflow-hidden bg-black shadow-2xl"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* 웹캠 비디오 */}
        <video
          ref={handleVideoRef}
          playsInline
          muted
          autoPlay
          width={width}
          height={height}
          className="w-full h-full object-cover"
        />
        {/* 랜드마크 오버레이 */}
        <div className="absolute top-0 left-0">
          <LandmarkVisualizer
            videoRef={videoRef}
            landmarks={landmarks}
            width={width}
            height={height}
            enabled={true}
          />
        </div>
      </div>
    </div>
  );
}

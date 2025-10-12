import { useCallback, useRef, useEffect } from 'react';

interface WebcamPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  faceLandmarks: Array<{ x: number; y: number; z: number }> | null;
  poseLandmarks: Array<{ x: number; y: number; z: number }> | null;
  width?: number;
  height?: number;
}

/**
 * 웹캠 프리뷰 + Face & Pose 랜드마크 오버레이 컴포넌트
 */
export default function WebcamPreview({
  videoRef,
  faceLandmarks,
  poseLandmarks,
  width = 240,
  height = 180,
}: WebcamPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // 랜드마크 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, width, height);

    // Face 랜드마크 그리기 (초록색)
    if (faceLandmarks && faceLandmarks.length > 0) {
      ctx.fillStyle = '#00FF00';
      faceLandmarks.forEach((landmark) => {
        const x = landmark.x * width;
        const y = landmark.y * height;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Pose 랜드마크 그리기 (빨간색, 더 큰 점)
    if (poseLandmarks && poseLandmarks.length > 0) {
      ctx.fillStyle = '#FF0000';
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;

      // 랜드마크 점 그리기
      poseLandmarks.forEach((landmark, index) => {
        const x = landmark.x * width;
        const y = landmark.y * height;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();

        // 인덱스 표시 (주요 포인트)
        if (index % 2 === 0) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '8px Arial';
          ctx.fillText(index.toString(), x + 5, y - 5);
          ctx.fillStyle = '#FF0000';
        }
      });

      // 주요 연결선 그리기 (간략화)
      const connections = [
        [11, 12], // 어깨
        [11, 23], // 왼쪽 상체
        [12, 24], // 오른쪽 상체
        [23, 24], // 엉덩이
        [11, 13], // 왼팔 상완
        [13, 15], // 왼팔 하완
        [12, 14], // 오른팔 상완
        [14, 16], // 오른팔 하완
      ];

      connections.forEach(([start, end]) => {
        if (start < poseLandmarks.length && end < poseLandmarks.length) {
          const startPoint = poseLandmarks[start];
          const endPoint = poseLandmarks[end];
          ctx.beginPath();
          ctx.moveTo(startPoint.x * width, startPoint.y * height);
          ctx.lineTo(endPoint.x * width, endPoint.y * height);
          ctx.stroke();
        }
      });
    }
  }, [faceLandmarks, poseLandmarks, width, height]);

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
        {/* 랜드마크 오버레이 캔버스 */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute top-0 left-0 pointer-events-none"
        />
        {/* 범례 */}
        <div className="absolute top-2 left-2 text-xs text-white bg-black/70 px-2 py-1 rounded">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            <span>Face</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
            <span>Pose</span>
          </div>
        </div>
      </div>
    </div>
  );
}

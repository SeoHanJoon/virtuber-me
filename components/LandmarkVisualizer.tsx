import { useRef, useEffect } from 'react';

interface LandmarkVisualizerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  poseLandmarks?: Array<{ x: number; y: number; z: number }> | null;
  width?: number;
  height?: number;
  enabled: boolean;
}

/**
 * MediaPipe 얼굴 + 상체 랜드마크 시각화 컴포넌트
 *
 * 공식 예제의 DrawingUtils 스타일을 적용합니다.
 */
export default function LandmarkVisualizer({
  videoRef,
  landmarks,
  poseLandmarks,
  width = 640,
  height = 480,
  enabled,
}: LandmarkVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled || !canvasRef.current || !videoRef.current) {
      // 비활성화 시 캔버스 클리어
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, width, height);

    // 비디오 크기 확인
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) return;

    ctx.save();

    // 1. Pose 랜드마크 그리기 (상체) - 빨간색
    if (poseLandmarks && poseLandmarks.length > 0) {
      drawPoseLandmarks(ctx, poseLandmarks, width, height);
    }

    // 2. 얼굴 랜드마크 그리기 (위에 레이어)
    if (landmarks) {
      // 점 그리기 (468개 랜드마크)
      landmarks.forEach((landmark) => {
        const x = landmark.x * width;
        const y = landmark.y * height;

        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fillStyle = '#00FF0080'; // 반투명 초록색
        ctx.fill();
      });

      // 주요 연결선 그리기
      if (landmarks.length > 454) {
        // 얼굴 윤곽선 (공식 예제 스타일)
        drawFaceOval(ctx, landmarks, width, height);

        // 눈
        drawEyes(ctx, landmarks, width, height);

        // 눈썹
        drawEyebrows(ctx, landmarks, width, height);

        // 입술
        drawLips(ctx, landmarks, width, height);

        // 홍채
        drawIris(ctx, landmarks, width, height);
      }
    }

    ctx.restore();
  }, [landmarks, poseLandmarks, enabled, width, height, videoRef]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
    />
  );
}

/**
 * Pose 랜드마크 그리기 (상체)
 */
function drawPoseLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  width: number,
  height: number
) {
  // MediaPipe Pose 연결선 정의 (33개 landmark)
  const POSE_CONNECTIONS = [
    // 몸통
    [11, 12], // 어깨
    [11, 13], // 왼쪽 어깨 -> 팔꿈치
    [13, 15], // 왼쪽 팔꿈치 -> 손목
    [12, 14], // 오른쪽 어깨 -> 팔꿈치
    [14, 16], // 오른쪽 팔꿈치 -> 손목
    [11, 23], // 왼쪽 어깨 -> 엉덩이
    [12, 24], // 오른쪽 어깨 -> 엉덩이
    [23, 24], // 엉덩이
    // 다리
    [23, 25], // 왼쪽 엉덩이 -> 무릎
    [25, 27], // 왼쪽 무릎 -> 발목
    [24, 26], // 오른쪽 엉덩이 -> 무릎
    [26, 28], // 오른쪽 무릎 -> 발목
    // 손
    [15, 17], // 왼쪽 손목 -> 검지
    [15, 19], // 왼쪽 손목 -> 새끼
    [15, 21], // 왼쪽 손목 -> 엄지
    [16, 18], // 오른쪽 손목 -> 검지
    [16, 20], // 오른쪽 손목 -> 새끼
    [16, 22], // 오른쪽 손목 -> 엄지
    // 발
    [27, 29], // 왼쪽 발목 -> 발끝
    [27, 31], // 왼쪽 발목 -> 발뒤꿈치
    [28, 30], // 오른쪽 발목 -> 발끝
    [28, 32], // 오른쪽 발목 -> 발뒤꿈치
    [29, 31], // 왼쪽 발
    [30, 32], // 오른쪽 발
  ];

  // 점 그리기 (빨간색)
  landmarks.forEach((landmark) => {
    const x = landmark.x * width;
    const y = landmark.y * height;

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#FF0000CC'; // 빨간색
    ctx.fill();
  });

  // 연결선 그리기
  ctx.strokeStyle = '#FF0000CC'; // 빨간색
  ctx.lineWidth = 2;

  POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
    if (startIdx < landmarks.length && endIdx < landmarks.length) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      ctx.beginPath();
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    }
  });
}

/**
 * 얼굴 윤곽선 그리기
 */
function drawFaceOval(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  width: number,
  height: number
) {
  // MediaPipe FACE_OVAL 인덱스 (간소화 버전)
  const faceOvalIndices = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
    378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
  ];

  ctx.beginPath();
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 1;

  faceOvalIndices.forEach((index, i) => {
    if (index < landmarks.length) {
      const x = landmarks[index].x * width;
      const y = landmarks[index].y * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  });

  ctx.closePath();
  ctx.stroke();
}

/**
 * 눈 그리기
 */
function drawEyes(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  width: number,
  height: number
) {
  // 왼쪽 눈 (초록색)
  const leftEyeIndices = [
    33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
  ];
  drawConnection(ctx, landmarks, leftEyeIndices, width, height, '#30FF30');

  // 오른쪽 눈 (빨간색)
  const rightEyeIndices = [
    362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384,
    398,
  ];
  drawConnection(ctx, landmarks, rightEyeIndices, width, height, '#FF3030');
}

/**
 * 눈썹 그리기
 */
function drawEyebrows(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  width: number,
  height: number
) {
  // 왼쪽 눈썹 (초록색)
  const leftBrowIndices = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107];
  drawConnection(ctx, landmarks, leftBrowIndices, width, height, '#30FF30');

  // 오른쪽 눈썹 (빨간색)
  const rightBrowIndices = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336];
  drawConnection(ctx, landmarks, rightBrowIndices, width, height, '#FF3030');
}

/**
 * 입술 그리기
 */
function drawLips(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  width: number,
  height: number
) {
  // 외곽 입술
  const outerLipsIndices = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317,
    14, 87, 178, 88, 95,
  ];
  drawConnection(ctx, landmarks, outerLipsIndices, width, height, '#E0E0E0');

  // 내부 입술
  const innerLipsIndices = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
  drawConnection(ctx, landmarks, innerLipsIndices, width, height, '#E0E0E0');
}

/**
 * 홍채 그리기
 */
function drawIris(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  width: number,
  height: number
) {
  // 왼쪽 홍채 (초록색)
  const leftIrisIndices = [474, 475, 476, 477];
  drawPoints(ctx, landmarks, leftIrisIndices, width, height, '#30FF30', 2);

  // 오른쪽 홍채 (빨간색)
  const rightIrisIndices = [469, 470, 471, 472];
  drawPoints(ctx, landmarks, rightIrisIndices, width, height, '#FF3030', 2);
}

/**
 * 연결선 그리기 헬퍼
 */
function drawConnection(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  indices: number[],
  width: number,
  height: number,
  color: string
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  indices.forEach((index, i) => {
    if (index < landmarks.length) {
      const x = landmarks[index].x * width;
      const y = landmarks[index].y * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  });

  ctx.stroke();
}

/**
 * 점 그리기 헬퍼
 */
function drawPoints(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  indices: number[],
  width: number,
  height: number,
  color: string,
  radius: number
) {
  ctx.fillStyle = color;

  indices.forEach((index) => {
    if (index < landmarks.length) {
      const x = landmarks[index].x * width;
      const y = landmarks[index].y * height;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

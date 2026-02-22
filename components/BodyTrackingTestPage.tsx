/**
 * BlazePose 기반 VRM 상체 트래킹 테스트 페이지 컴포넌트
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VRMBodyController } from '@/components/VRMBodyController';

export default function BodyTrackingTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [selectedVrm, setSelectedVrm] = useState(
    '/models/VRM1_Constraint_Twist_Sample.vrm'
  );
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [keypoints, setKeypoints] = useState<Array<{
    x: number;
    y: number;
    z?: number;
    score?: number;
    name?: string;
  }> | null>(null);

  // 웹캠 스트림 설정
  useEffect(() => {
    // cleanup 함수에서 사용할 video 엘리먼트를 미리 저장
    const video = videoRef.current;

    const setupWebcam = async () => {
      if (!video) {
        console.warn('[BodyTrackingTestPage] videoRef.current가 없습니다');
        return;
      }

      try {
        console.log('[BodyTrackingTestPage] 웹캠 권한 요청 중...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        video.srcObject = stream;
        await video.play();
        setIsWebcamReady(true);
        setWebcamError(null);
        console.log('[BodyTrackingTestPage] ✅ 웹캠 스트림 시작:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
        });
      } catch (err) {
        console.error('[BodyTrackingTestPage] 웹캠 접근 오류:', err);
        setWebcamError('웹캠 접근 오류: ' + (err as Error).message);
        setIsWebcamReady(false);
      }
    };

    setupWebcam();

    return () => {
      // cleanup 시점에 저장된 video 엘리먼트 사용
      if (video?.srcObject) {
        (video.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
        console.log('[BodyTrackingTestPage] 웹캠 스트림 중지');
      }
    };
  }, []);

  const handleVrmChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVrm(event.target.value);
  };

  const toggleTracking = () => {
    console.log('[BodyTrackingTestPage] 트래킹 토글:', {
      current: isTrackingActive,
      next: !isTrackingActive,
      hasVideo: !!videoRef.current,
      videoReady: videoRef.current?.readyState,
      videoWidth: videoRef.current?.videoWidth,
      videoHeight: videoRef.current?.videoHeight,
    });
    setIsTrackingActive((prev) => !prev);
  };

  // 랜드마크 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || !keypoints || keypoints.length === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas 크기를 비디오 또는 컨테이너 크기로 설정
    const containerWidth = canvas.parentElement?.clientWidth || 640;
    const containerHeight = canvas.parentElement?.clientHeight || 480;
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Canvas 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Canvas가 작동하는지 확인용 - 테스트 점
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(10, 10, 10, 10); // 좌상단 빨간 사각형

    // 테스트: 고정 위치에 파란색 점 그리기 (중앙)
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 15, 0, 2 * Math.PI);
    ctx.fillStyle = '#0000ff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    let drawnCount = 0;
    let firstCoordText = '';

    // 키포인트 그리기
    keypoints.forEach((kp, index) => {
      if (kp.score && kp.score > 0.3) {
        // 키포인트는 이미 -0.5 ~ 0.5 범위로 정규화되어 있음
        // Canvas 좌표로 변환: (-0.5, -0.5) ~ (0.5, 0.5) → (0, 0) ~ (width, height)
        const x = (kp.x + 0.5) * canvas.width;
        const y = (0.5 - kp.y) * canvas.height;

        // 첫 번째 점의 좌표 저장 (디버깅용)
        if (drawnCount === 0) {
          firstCoordText = `First: orig(${kp.x.toFixed(2)}, ${kp.y.toFixed(2)}) → canvas(${Math.round(x)}, ${Math.round(y)})`;
        }

        // 점 그리기 (더 크고 밝게)
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        drawnCount++;

        // 키포인트 이름 표시 (더 크고 그림자 추가)
        if (kp.name) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 4;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Arial';
          ctx.fillText(kp.name, x + 10, y + 5);
          ctx.shadowBlur = 0;
        }
      }
    });

    // 디버깅 정보 표시
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 14px Arial';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`Keypoints: ${drawnCount}/${keypoints.length}`, 10, 30);

    // 첫 번째 점의 좌표 표시
    if (firstCoordText) {
      ctx.fillText(firstCoordText, 10, 70);
    }
    ctx.shadowBlur = 0;

    // 연결선 그리기 (MoveNet 17 키포인트)
    const connections = [
      // 얼굴
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 4], // nose - eyes - ears
      // 상체
      [5, 6],
      [5, 7],
      [7, 9],
      [6, 8],
      [8, 10], // shoulders - arms
      [5, 11],
      [6, 12],
      [11, 12], // torso
      // 하체
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16], // hips - legs
    ];

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;

    let linesDrawn = 0;

    connections.forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];

      if (
        kp1 &&
        kp2 &&
        kp1.score &&
        kp2.score &&
        kp1.score > 0.3 &&
        kp2.score > 0.3
      ) {
        const x1 = (kp1.x + 0.5) * canvas.width;
        const y1 = (0.5 - kp1.y) * canvas.height;
        const x2 = (kp2.x + 0.5) * canvas.width;
        const y2 = (0.5 - kp2.y) * canvas.height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        linesDrawn++;
      }
    });

    // 연결선 수 표시
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 14px Arial';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`Lines: ${linesDrawn}`, 10, 50);
    ctx.shadowBlur = 0;
  }, [keypoints]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">
        MoveNet 기반 VRM 상체 트래킹 테스트 (안정적, 빠름)
      </h1>

      <div className="flex flex-grow gap-4">
        {/* 웹캠 미리보기 및 컨트롤 패널 */}
        <div className="w-1/2 flex flex-col items-center bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-2">
            웹캠 미리보기 + 랜드마크
          </h2>
          <div className="relative w-full max-w-md aspect-video bg-black rounded-md overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover transform scaleX(-1)" // 좌우 반전
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full transform scaleX(-1)" // 좌우 반전
              style={{ pointerEvents: 'none' }}
            />
            {!isWebcamReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                {webcamError ? (
                  <p className="text-red-500 text-center">{webcamError}</p>
                ) : (
                  <p>웹캠 로딩 중...</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 w-full max-w-md">
            <label
              htmlFor="vrm-select"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              VRM 모델 선택:
            </label>
            <select
              id="vrm-select"
              value={selectedVrm}
              onChange={handleVrmChange}
              className="block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="/models/VRM1_Constraint_Twist_Sample">
                Sample VRM
              </option>
              {/* 다른 VRM 모델 추가 */}
            </select>
          </div>

          <button
            onClick={toggleTracking}
            disabled={!isWebcamReady}
            className={`mt-4 px-6 py-3 rounded-lg text-lg font-semibold transition-colors duration-200
              ${
                isTrackingActive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }
              ${!isWebcamReady && 'opacity-50 cursor-not-allowed'}`}
          >
            {isTrackingActive ? '트래킹 중지' : '트래킹 시작'}
          </button>

          <p className="mt-2 text-sm text-gray-400">
            {isTrackingActive
              ? '상체 트래킹 활성화됨'
              : '상체 트래킹 비활성화됨'}
          </p>

          <div className="mt-4 p-3 bg-blue-900 bg-opacity-50 rounded-md text-xs">
            <p className="font-semibold mb-1">💡 Webpack 모드 정보:</p>
            <p>
              Turbopack 대신 Webpack을 사용하여 TensorFlow.js와 MoveNet이
              정상적으로 동작합니다.
            </p>
            <p className="mt-1">빌드 시간이 더 소요될 수 있습니다.</p>
          </div>
        </div>

        {/* VRM 렌더링 영역 */}
        <div className="w-1/2 flex flex-col items-center bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-2">VRM 아바타</h2>
          <div
            className="relative bg-gray-900 rounded-md overflow-hidden"
            style={{ width: '640px', height: '480px' }}
          >
            {isWebcamReady ? (
              <VRMBodyController
                videoRef={videoRef}
                vrmUrl={selectedVrm}
                width={640}
                height={480}
                isTrackingActive={isTrackingActive}
                onKeypointsUpdate={setKeypoints}
                trackingOptions={{
                  depthScale: 0.3,
                  smoothingFactor: 0.3,
                  maxFPS: 30,
                  slerpAmount: 0.15,
                  minConfidence: 0.3,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                <p>웹캠이 준비되지 않았습니다.</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-yellow-900 bg-opacity-50 rounded-md text-xs max-w-md">
            <p className="font-semibold mb-1">🎯 트래킹 팁:</p>
            <p>• 상체가 전체적으로 화면에 보이도록 하세요</p>
            <p>• 조명이 밝은 곳에서 사용하세요</p>
            <p>• VRM 모델이 움직이지 않으면 웹캠을 확인하세요</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MoveNet 기반 VRM 상체 트래킹 테스트 페이지 컴포넌트
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VRMBodyController } from '@/components/VRMBodyController';

export default function BodyTrackingTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [selectedVrm, setSelectedVrm] = useState('/models/sample.vrm');
  const [isTrackingActive, setIsTrackingActive] = useState(false);

  // 웹캠 스트림 설정
  useEffect(() => {
    // cleanup 함수에서 사용할 video 엘리먼트를 미리 저장
    const video = videoRef.current;

    const setupWebcam = async () => {
      if (!video) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        video.srcObject = stream;
        await video.play();
        setIsWebcamReady(true);
        setWebcamError(null);
        console.log('[BodyTrackingTestPage] 웹캠 스트림 시작');
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
    setIsTrackingActive((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">
        MoveNet 기반 VRM 상체 트래킹 테스트 (Webpack 모드)
      </h1>

      <div className="flex flex-grow gap-4">
        {/* 웹캠 미리보기 및 컨트롤 패널 */}
        <div className="w-1/2 flex flex-col items-center bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-2">웹캠 미리보기</h2>
          <div className="relative w-full max-w-md aspect-video bg-black rounded-md overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover transform scaleX(-1)" // 좌우 반전
              autoPlay
              playsInline
              muted
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
              <option value="/models/sample.vrm">Sample VRM</option>
              <option value="/models/furina.vrm">Furina</option>
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
          <div className="relative w-full max-w-md aspect-video bg-gray-900 rounded-md overflow-hidden">
            {isWebcamReady && (
              <VRMBodyController
                videoRef={videoRef}
                vrmUrl={selectedVrm}
                width={640}
                height={480}
                isTrackingActive={isTrackingActive}
                trackingOptions={{
                  depthScale: 0.3,
                  smoothingFactor: 0.3,
                  maxFPS: 30,
                  slerpAmount: 0.15,
                  minConfidence: 0.3,
                }}
              />
            )}
            {!isWebcamReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                <p>웹캠이 준비되지 않았습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import FaceTrackingVRMViewer from '@/components/FaceTrackingVRMViewer';
import VRMManualControl from '@/components/VRMManualControl';
import { useVRMModels } from '@/hooks/useVRMModels';
import type { VRM } from '@pixiv/three-vrm';

export default function FaceTrackingPage() {
  const { models, selectedModel, setSelectedModel, isLoading } = useVRMModels();
  const [isStarted, setIsStarted] = useState(false);
  const [manualControlEnabled, setManualControlEnabled] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const vrmRef = useRef<VRM | null>(null);

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-sans">
      <main className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            실시간 얼굴 추적 VTuber
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            웹캠으로 아바타를 실시간 조종하세요
          </p>
        </div>

        {!isStarted ? (
          /* 시작 화면 */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎭</div>
                  <h2 className="text-2xl font-bold mb-2">
                    얼굴 추적 체험하기
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    웹캠 권한이 필요합니다
                  </p>
                </div>

                {/* 모델 선택 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    아바타 선택
                  </label>
                  {isLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                  ) : models.length === 0 ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        VRM 파일을 public/models/ 폴더에 추가해주세요
                      </p>
                    </div>
                  ) : (
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700"
                    >
                      {models.map((model) => (
                        <option key={model.path} value={model.path}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-bold mb-2 text-blue-900 dark:text-blue-300">
                    ✨ 추적 기능
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>👀 눈 깜빡임 (좌/우 독립)</li>
                    <li>👄 입 벌림</li>
                    <li>🔄 머리 회전 (Yaw, Pitch, Roll)</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h3 className="font-bold mb-2 text-yellow-900 dark:text-yellow-300">
                    ⚠️ 팁
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• 밝은 조명에서 사용</li>
                    <li>• 얼굴을 카메라 정면에 위치</li>
                    <li>• 과장된 표정으로 더 잘 인식</li>
                  </ul>
                </div>

                <button
                  onClick={() => setIsStarted(true)}
                  disabled={!selectedModel}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  시작하기
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 얼굴 추적 화면 */
          <div>
            {/* 캔버스 + 수동 제어 패널 */}
            <div className="flex gap-6">
              {/* VRM 캔버스 */}
              <div className="flex-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex justify-center items-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4">
                    <FaceTrackingVRMViewer
                      modelPath={selectedModel}
                      width={600}
                      height={600}
                      className="rounded-lg"
                      manualControlEnabled={manualControlEnabled}
                      showLandmarks={showLandmarks}
                      onVRMChange={(vrm) => (vrmRef.current = vrm)}
                    />
                  </div>
                </div>

                {/* 종료 버튼 */}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setIsStarted(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-8 rounded-lg transition-all shadow-lg"
                  >
                    종료하기
                  </button>
                </div>

                {/* 안내 */}
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-300 text-center">
                    💡 설정은 우측 상단 <strong>⚙️ 설정</strong> 버튼을
                    클릭하세요
                  </p>
                </div>
              </div>

              {/* 수동 제어 패널 */}
              <div className="w-96">
                {/* 랜드마크 표시 버튼 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4 sticky top-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLandmarks}
                      onChange={(e) => setShowLandmarks(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                      📍 랜드마크 표시
                    </span>
                  </label>
                </div>

                {/* 수동 제어 패널 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sticky top-28">
                  <VRMManualControl
                    vrm={vrmRef.current}
                    enabled={manualControlEnabled}
                    onEnabledChange={setManualControlEnabled}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

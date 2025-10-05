'use client';

import { useState, useEffect } from 'react';
import FaceTrackingVRMViewer from '@/components/FaceTrackingVRMViewer';

interface VRMModel {
  name: string;
  path: string;
}

export default function FaceTrackingPage() {
  const [models, setModels] = useState<VRMModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // VRM 모델 목록 로드
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/api/vrm-models');
        const data = await response.json();
        setModels(data.models);
        if (data.models.length > 0) {
          setSelectedModel(data.models[0].path);
        }
      } catch (error) {
        console.error('모델 목록 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* VRM 뷰어 영역 */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex justify-center items-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4">
                  <FaceTrackingVRMViewer
                    modelPath={selectedModel}
                    width={600}
                    height={600}
                    className="rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 컨트롤 패널 */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold mb-3">상태</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <span className="text-sm">웹캠</span>
                    <span className="text-xs px-2 py-1 bg-green-500 text-white rounded">
                      ON
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <span className="text-sm">추적</span>
                    <span className="text-xs px-2 py-1 bg-green-500 text-white rounded">
                      ON
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold mb-3">모델</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {models.find((m) => m.path === selectedModel)?.name ||
                    'Unknown'}
                </p>
              </div>

              <button
                onClick={() => setIsStarted(false)}
                className="w-full bg-gray-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition-all"
              >
                종료
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

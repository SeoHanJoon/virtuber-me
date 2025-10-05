'use client';

import { useState, useEffect } from 'react';
import VRMViewer from '@/components/VRMViewer';
import type { VRMModel } from '@/types/vrm';

export default function VRMPage() {
  const [models, setModels] = useState<VRMModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // 모델 변형 옵션 상태
  const [mirrorMode, setMirrorMode] = useState(false);
  const [rotateModel, setRotateModel] = useState(false);

  // VRM 모델 목록 로드
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/api/vrm-models');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setModels(data);
          if (data.length > 0) {
            setSelectedModel(data[0].path);
          }
        } else {
          console.error('API 응답이 배열이 아닙니다:', data);
          setModels([]);
        }
      } catch (error) {
        console.error('모델 목록 로드 실패:', error);
        setModels([]);
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
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            VRM 모델 뷰어
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            3D 아바타를 확인하고 탐색하세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* VRM 뷰어 영역 */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex justify-center items-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4 min-h-[600px]">
                {selectedModel ? (
                  <VRMViewer
                    modelPath={selectedModel}
                    width={600}
                    height={600}
                    className="rounded-lg"
                    mirrorMode={mirrorMode}
                    rotateModel={rotateModel}
                  />
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <p className="text-xl mb-2">📁</p>
                    <p>VRM 모델을 선택하거나 업로드해주세요</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 모델 선택 패널 */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">모델 선택</h3>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">로딩 중...</p>
                </div>
              ) : models.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-3xl mb-2">📦</p>
                  <p className="text-sm">
                    VRM 파일을
                    <br />
                    public/models/
                    <br />
                    폴더에 추가해주세요
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {models.map((model) => (
                    <button
                      key={model.path}
                      onClick={() => setSelectedModel(model.path)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        selectedModel === model.path
                          ? 'bg-purple-100 dark:bg-purple-900 border-2 border-purple-500'
                          : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🎭</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{model.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {model.path}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 모델 변형 컨트롤 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">🔄 모델 설정</h3>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rotateModel}
                    onChange={(e) => setRotateModel(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    모델 180° 회전
                  </span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mirrorMode}
                    onChange={(e) => setMirrorMode(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    좌우 미러
                  </span>
                </label>
              </div>
            </div>

            {/* 정보 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-3">💡 사용 방법</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• VRM 파일을 public/models/ 폴더에 추가</li>
                <li>• 왼쪽에서 모델 선택</li>
                <li>• 마우스로 회전 가능</li>
                <li>• 모델이 뒤돌아 있으면 180° 회전 체크</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

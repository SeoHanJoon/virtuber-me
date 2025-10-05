'use client';

import { useState } from 'react';
import VRMViewer from '@/components/VRMViewer';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function VRMPage() {
  const [modelPath, setModelPath] = useState('/models/sample.vrm');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-sans">
      <main className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            VRM 모델 뷰어
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Three.js와 @pixiv/three-vrm을 사용한 3D 아바타 렌더링
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* VRM 뷰어 영역 */}
          <div className="lg:col-span-2">
            <Card title="3D 뷰어" className="h-full">
              <div className="flex justify-center items-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4">
                <VRMViewer
                  modelPath={modelPath}
                  width={600}
                  height={600}
                  className="rounded-lg"
                />
              </div>
            </Card>
          </div>

          {/* 컨트롤 패널 */}
          <div className="space-y-4">
            <Card title="설정">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    모델 경로
                  </label>
                  <input
                    type="text"
                    value={modelPath}
                    onChange={(e) => setModelPath(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700"
                    placeholder="/models/sample.vrm"
                  />
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setIsLoading(true);
                    setTimeout(() => setIsLoading(false), 1000);
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? '로딩 중...' : '모델 새로고침'}
                </Button>
              </div>
            </Card>

            <Card title="사용 방법">
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 font-bold mr-2 flex-shrink-0">
                    1
                  </span>
                  <p>
                    VRM 파일을{' '}
                    <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                      /public/models/
                    </code>{' '}
                    폴더에 배치
                  </p>
                </div>
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 font-bold mr-2 flex-shrink-0">
                    2
                  </span>
                  <p>위 입력란에 파일 경로 입력 (예: /models/avatar.vrm)</p>
                </div>
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 font-bold mr-2 flex-shrink-0">
                    3
                  </span>
                  <p>&apos;모델 새로고침&apos; 버튼을 클릭하여 로드</p>
                </div>
              </div>
            </Card>

            <Card title="정보">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    렌더러
                  </span>
                  <span className="font-medium">Three.js</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    VRM 버전
                  </span>
                  <span className="font-medium">@pixiv/three-vrm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">배경</span>
                  <span className="font-medium">투명</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="mt-8">
          <Card>
            <h3 className="text-lg font-bold mb-3">VRM 모델 구하기</h3>
            <div className="space-y-2 text-sm">
              <p>무료 VRM 모델을 다운로드할 수 있는 사이트:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 ml-4">
                <li>
                  <a
                    href="https://hub.vroid.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    VRoid Hub
                  </a>{' '}
                  - VRM 모델 공유 플랫폼
                </li>
                <li>
                  <a
                    href="https://vroid.com/studio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    VRoid Studio
                  </a>{' '}
                  - 직접 VRM 캐릭터 제작
                </li>
                <li>
                  <a
                    href="https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm/examples/models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Three-VRM 예제 모델
                  </a>{' '}
                  - 테스트용 샘플 모델
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

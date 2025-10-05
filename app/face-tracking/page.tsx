'use client';

import { useState } from 'react';
import FaceTrackingVRMViewer from '@/components/FaceTrackingVRMViewer';
import Card from '@/components/Card';
import Button from '@/components/Button';

export default function FaceTrackingPage() {
  const [modelPath] = useState('/models/sample.vrm');
  const [isStarted, setIsStarted] = useState(false);

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-sans">
      <main className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            실시간 얼굴 추적 VTuber
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            웹캠으로 얼굴을 추적하여 VRM 아바타를 실시간으로 조종하세요
          </p>
        </div>

        {!isStarted ? (
          /* 시작 화면 */
          <div className="max-w-2xl mx-auto">
            <Card>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎭</div>
                  <h2 className="text-2xl font-bold mb-2">
                    얼굴 추적 체험하기
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    이 기능은 웹캠 권한이 필요합니다
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-bold mb-2 text-blue-900 dark:text-blue-300">
                    ✨ 추적되는 기능
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>👀 눈 깜빡임 (좌/우 독립)</li>
                    <li>👄 입 벌림 (A 발음)</li>
                    <li>🔄 머리 회전 (Yaw, Pitch, Roll)</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h3 className="font-bold mb-2 text-yellow-900 dark:text-yellow-300">
                    ⚠️ 주의사항
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• 밝은 조명에서 사용하세요</li>
                    <li>• 얼굴이 카메라에 정면으로 보이도록 하세요</li>
                    <li>• 처음 로딩 시 시간이 걸릴 수 있습니다</li>
                  </ul>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => setIsStarted(true)}
                >
                  시작하기
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          /* 얼굴 추적 화면 */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* VRM 뷰어 영역 */}
            <div className="lg:col-span-2">
              <Card title="실시간 아바타" className="h-full">
                <div className="flex justify-center items-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4">
                  <FaceTrackingVRMViewer
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
              <Card title="상태">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm">웹캠</span>
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                      활성화
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm">얼굴 추적</span>
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                      실행 중
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm">VRM 모델</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      로드됨
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="기능">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start">
                    <span className="mr-2">👀</span>
                    <div>
                      <div className="font-medium">눈 깜빡임</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        좌우 눈 독립 추적
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">👄</span>
                    <div>
                      <div className="font-medium">입 모양</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        입 벌림 정도 감지
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">🔄</span>
                    <div>
                      <div className="font-medium">머리 회전</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        3축 회전 추적
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="팁">
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p>💡 과장된 표정을 지으면 더 잘 인식됩니다</p>
                  <p>💡 얼굴을 천천히 움직이면 부드럽게 추적됩니다</p>
                  <p>💡 조명이 밝을수록 정확도가 높아집니다</p>
                </div>
              </Card>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setIsStarted(false)}
              >
                종료
              </Button>
            </div>
          </div>
        )}

        {/* 기술 정보 */}
        <div className="mt-8">
          <Card>
            <h3 className="text-lg font-bold mb-3">🔧 기술 스택</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="font-bold mb-1">얼굴 추적</div>
                <div className="text-gray-600 dark:text-gray-400">
                  MediaPipe Face Landmarker
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="font-bold mb-1">3D 렌더링</div>
                <div className="text-gray-600 dark:text-gray-400">
                  Three.js + WebGL
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="font-bold mb-1">아바타</div>
                <div className="text-gray-600 dark:text-gray-400">
                  VRM 1.0 / @pixiv/three-vrm
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

/**
 * 멀티플레이어 VRM 월드 페이지
 *
 * 최대 100명이 동시에 접속할 수 있는 VRM 아바타 월드입니다.
 * 얼굴 추적과 WASD 키로 아바타를 제어하고,
 * 다른 사용자들과 실시간으로 상호작용할 수 있습니다.
 */

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useVRMModels } from '@/hooks/useVRMModels';

// MultiplayerVRMWorld 컴포넌트를 동적으로 로드 (SSR 방지)
const MultiplayerVRMWorld = dynamic(
  () => import('../../components/MultiplayerVRMWorld'),
  { ssr: false }
);

/**
 * 멀티플레이어 페이지
 */
export default function MultiplayerPage() {
  const { models, selectedModel, setSelectedModel, isLoading } = useVRMModels();
  const [nickname, setNickname] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:3001');
  const [isStarted, setIsStarted] = useState(false);

  /**
   * 월드 시작
   */
  function handleStart() {
    if (!selectedModel) {
      alert('VRM 모델을 선택해주세요.');
      return;
    }

    if (!nickname.trim()) {
      setNickname(`사용자_${Math.random().toString(36).slice(2, 6)}`);
    }

    setIsStarted(true);
  }

  // 월드가 시작되면 전체 화면으로 렌더링
  if (isStarted && selectedModel) {
    return (
      <div className="w-screen h-screen">
        <MultiplayerVRMWorld
          myModelPath={selectedModel}
          nickname={nickname}
          serverUrl={serverUrl}
          width={typeof window !== 'undefined' ? window.innerWidth : 1920}
          height={typeof window !== 'undefined' ? window.innerHeight : 1080}
          maxRenderDistance={50}
        />

        {/* 나가기 버튼 */}
        <div className="absolute top-4 left-4">
          <button
            onClick={() => setIsStarted(false)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
          >
            월드 나가기
          </button>
        </div>
      </div>
    );
  }

  // 시작 전 설정 화면
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-block mb-4 text-blue-400 hover:text-blue-300"
          >
            ← 홈으로
          </Link>
          <h1 className="text-4xl font-bold mb-2">🌐 VRM 멀티플레이어 월드</h1>
          <p className="text-gray-400">
            최대 100명이 동시에 접속 가능한 VRM 아바타 월드
          </p>
        </div>

        {/* 설정 카드 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">월드 설정</h2>

          {/* 닉네임 입력 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              닉네임 (선택사항)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요 (비워두면 자동 생성)"
              className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              maxLength={20}
            />
          </div>

          {/* VRM 모델 선택 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              VRM 아바타 선택
            </label>

            {isLoading ? (
              <div className="text-gray-400">모델 목록 로드 중...</div>
            ) : models.length === 0 ? (
              <div className="text-yellow-400">
                ⚠️ VRM 모델이 없습니다. <code>public/models/</code> 폴더에 VRM
                파일을 추가해주세요.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.isArray(models) &&
                  models.map((model) => (
                    <button
                      key={model.path}
                      onClick={() => setSelectedModel(model.path)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedModel === model.path
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-4xl mb-2">👤</div>
                      <div className="text-sm font-medium truncate">
                        {model.name}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* 서버 URL 설정 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">서버 URL</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:3001"
              className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <div className="text-xs text-gray-400 mt-1">
              💡 서버를 먼저 실행해주세요: <code>cd server && npm run dev</code>
            </div>
          </div>

          {/* 시작 버튼 */}
          <button
            onClick={handleStart}
            disabled={!selectedModel || models.length === 0}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold text-lg transition-colors"
          >
            {!selectedModel || models.length === 0
              ? '모델을 선택해주세요'
              : '월드 입장하기 🚀'}
          </button>
        </div>

        {/* 안내 사항 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-3">📋 사용 방법</h3>
          <ul className="space-y-2 text-gray-300">
            <li>
              • <strong>WASD</strong>: 캐릭터 이동
            </li>
            <li>
              • <strong>Shift</strong>: 달리기
            </li>
            <li>
              • <strong>마우스 이동</strong>: 시점 회전
            </li>
            <li>
              • <strong>웹캠</strong>: 얼굴 추적으로 아바타 표정 제어
            </li>
            <li>
              • <strong>실시간 동기화</strong>: 다른 사용자들과 실시간으로 소통
            </li>
          </ul>
        </div>

        {/* 주의 사항 */}
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-3 text-yellow-400">
            ⚠️ 주의 사항
          </h3>
          <ul className="space-y-2 text-gray-300">
            <li>
              • <strong>HTTPS 필수</strong>: 웹캠 사용을 위해 HTTPS 환경에서
              실행해주세요.
              <br />
              <span className="text-sm text-gray-400">
                (localhost는 HTTP도 허용됩니다)
              </span>
            </li>
            <li>
              • <strong>서버 실행</strong>: 멀티플레이어 서버가 실행 중이어야
              합니다.
              <br />
              <code className="text-sm bg-gray-700 px-2 py-1 rounded">
                cd server && npm install && npm run dev
              </code>
            </li>
            <li>
              • <strong>개인정보 보호</strong>: 이 시스템은{' '}
              <strong>이미지나 비디오를 전송하지 않으며</strong>, 얼굴 추적
              결과(표정 데이터)만 전송합니다.
            </li>
            <li>
              • <strong>성능</strong>: 100명 동시 접속을 지원하지만, 최적의
              성능을 위해서는 강력한 GPU와 안정적인 네트워크가 필요합니다.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

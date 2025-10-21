'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handleCreateRoom = () => {
    const newRoomId = roomId.trim() || generateRoomId();
    router.push(`/room/${newRoomId}`);
  };

  const handleQuickJoin = () => {
    const quickRoomId = generateRoomId();
    router.push(`/room/${quickRoomId}`);
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-sans">
      <main className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Virtuber Me 🎭
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-400 mb-4">
            페이셜 트래킹 VRChat
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-500">
            웹캠으로 얼굴 추적 + VRM 아바타 + 멀티플레이어 룸
          </p>
        </div>

        {/* 멀티플레이어 룸 생성 */}
        <div className="mb-12 bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-2xl shadow-2xl text-white">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">🌐 멀티플레이어</h2>
            <p className="text-blue-100">
              친구들과 함께 VRM 아바타로 만나보세요!
            </p>
          </div>

          {!isCreatingRoom ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleQuickJoin}
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg"
              >
                🚀 빠른 시작 (랜덤 룸)
              </button>
              <button
                onClick={() => setIsCreatingRoom(true)}
                className="px-8 py-4 bg-purple-700 hover:bg-purple-800 rounded-xl font-bold transition-colors"
              >
                ➕ 룸 ID로 입장
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) =>
                    setRoomId(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="룸 ID를 입력하세요 (비어있으면 자동 생성)"
                  className="w-full px-4 py-3 rounded-lg text-black font-mono text-lg text-center"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsCreatingRoom(false)}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="flex-1 px-4 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors"
                >
                  입장하기 →
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-blue-100">
            ✅ 얼굴 추적 데이터만 전송 (이미지/비디오 전송 없음)
          </div>
        </div>

        {/* 주요 기능 카드 */}
        <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
          📚 기능 체험
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* VRM 뷰어 */}
          <Link href="/vrm">
            <div className="group cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl hover:shadow-xl transition-all duration-300 border-2 border-purple-200 dark:border-purple-700 hover:scale-105">
              <div className="text-4xl mb-3">🎨</div>
              <h3 className="text-xl font-bold mb-2 text-purple-900 dark:text-purple-300">
                VRM 뷰어
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                3D 아바타 미리보기
              </p>
            </div>
          </Link>

          {/* 페이스 트래킹 */}
          <Link href="/face-tracking">
            <div className="group cursor-pointer bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 p-6 rounded-xl hover:shadow-xl transition-all duration-300 border-2 border-pink-200 dark:border-pink-700 hover:scale-105">
              <div className="text-4xl mb-3">🎭</div>
              <h3 className="text-xl font-bold mb-2 text-pink-900 dark:text-pink-300">
                실시간 얼굴 추적
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                468 landmarks + 52 BlendShapes
              </p>
            </div>
          </Link>

          {/* 멀티플레이어 (기존) */}
          <Link href="/multiplayer">
            <div className="group cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl hover:shadow-xl transition-all duration-300 border-2 border-blue-200 dark:border-blue-700 hover:scale-105">
              <div className="text-4xl mb-3">🌍</div>
              <h3 className="text-xl font-bold mb-2 text-blue-900 dark:text-blue-300">
                멀티플레이어 (단일)
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                기본 멀티플레이어 월드
              </p>
            </div>
          </Link>

          {/* 기술 정보 */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-300">
              기술 스택
            </h3>
            <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
              <li>• Next.js 15 + TypeScript</li>
              <li>• Three.js + @pixiv/three-vrm</li>
              <li>• MediaPipe Face Landmarker</li>
              <li>• Socket.IO 멀티 룸</li>
            </ul>
          </div>
        </div>

        {/* 프로젝트 소개 */}
        <div className="text-center mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-xl">
          <h3 className="text-xl font-bold mb-3">🚀 프로젝트 소개</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Virtuber Me는 브라우저에서 바로 사용할 수 있는 페이셜 트래킹
            VRChat입니다. 웹캠으로 실시간 얼굴 추적을 통해 VRM 아바타를
            조종하고, 멀티플레이어 룸에서 친구들과 소통하세요! WASD로 이동,
            마우스로 시점 조작이 가능합니다.
          </p>
        </div>
      </main>
    </div>
  );
}

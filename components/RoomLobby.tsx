'use client';

import { useState, useEffect } from 'react';
import { useVRMModels } from '@/hooks/useVRMModels';

interface RoomLobbyProps {
  roomId: string;
  nickname: string;
  modelPath: string;
  onNicknameChange: (nickname: string) => void;
  onModelPathChange: (path: string) => void;
  onJoin: () => void;
  onBack: () => void;
}

export default function RoomLobby({
  roomId,
  nickname,
  modelPath,
  onNicknameChange,
  onModelPathChange,
  onJoin,
  onBack,
}: RoomLobbyProps) {
  const { models, isLoading } = useVRMModels();
  const [roomInfo, setRoomInfo] = useState<{
    userCount: number;
    lastActivity: string;
  } | null>(null);

  useEffect(() => {
    // 룸 정보 가져오기
    fetch('http://localhost:3001/rooms')
      .then((res) => res.json())
      .then((rooms) => {
        const room = rooms.find((r: { id: string }) => r.id === roomId);
        if (room) {
          setRoomInfo({
            userCount: room.userCount,
            lastActivity: new Date(room.lastActivity).toLocaleString('ko-KR'),
          });
        } else {
          setRoomInfo({ userCount: 0, lastActivity: '신규 룸' });
        }
      })
      .catch(() => {
        setRoomInfo({ userCount: 0, lastActivity: '알 수 없음' });
      });
  }, [roomId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && nickname.trim()) {
      onJoin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* 상단 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">Virtuber Me 🎭</h1>
          <p className="text-xl text-blue-200">페이셜 트래킹 VRChat</p>
        </div>

        {/* 메인 카드 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* 룸 정보 */}
          <div className="mb-6 p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-200">접속할 룸</div>
                <div className="text-2xl font-bold text-white">{roomId}</div>
              </div>
              {roomInfo && (
                <div className="text-right">
                  <div className="text-sm text-blue-200">현재 참여자</div>
                  <div className="text-2xl font-bold text-white">
                    {roomInfo.userCount}명
                  </div>
                </div>
              )}
            </div>
            {roomInfo && (
              <div className="text-xs text-blue-300 mt-2">
                마지막 활동: {roomInfo.lastActivity}
              </div>
            )}
          </div>

          {/* 닉네임 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-white mb-2">
              닉네임 *
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => onNicknameChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="닉네임을 입력하세요"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              maxLength={20}
              autoFocus
            />
            <div className="text-xs text-gray-300 mt-1">
              {nickname.length}/20 자
            </div>
          </div>

          {/* VRM 모델 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-white mb-2">
              아바타 모델
            </label>
            {isLoading ? (
              <div className="text-gray-300">모델 목록 로딩 중...</div>
            ) : (
              <select
                value={modelPath}
                onChange={(e) => onModelPathChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {models.map((model) => (
                  <option
                    key={model.path}
                    value={model.path}
                    className="bg-gray-800"
                  >
                    {model.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 주의사항 */}
          <div className="mb-6 p-4 bg-yellow-500/10 rounded-lg border border-yellow-400/30">
            <div className="text-sm text-yellow-200 space-y-1">
              <div>⚠️ 웹캠 권한이 필요합니다</div>
              <div>✅ 얼굴 추적 데이터만 전송됩니다</div>
              <div>🎮 WASD 이동, 마우스로 시점 조작</div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="flex-1 px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-bold transition-colors"
            >
              뒤로가기
            </button>
            <button
              onClick={onJoin}
              disabled={!nickname.trim()}
              className="flex-1 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold transition-colors"
            >
              입장하기 →
            </button>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="text-center mt-6 text-sm text-blue-200">
          <div>룸이 비어있으면 자동으로 생성됩니다</div>
          <div className="text-xs text-gray-400 mt-2">
            서버: http://localhost:3001
          </div>
        </div>
      </div>
    </div>
  );
}

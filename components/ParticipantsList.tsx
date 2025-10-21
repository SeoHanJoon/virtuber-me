'use client';

import { useState, useEffect } from 'react';
import type { UserState } from '@/types/multiplayer';

interface ParticipantsListProps {
  users: Map<string, UserState>;
  myUserId?: string;
  myPosition?: { x: number; y: number; z: number };
  onUserClick?: (userId: string) => void;
}

export default function ParticipantsList({
  users,
  myUserId,
  myPosition,
  onUserClick,
}: ParticipantsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sortedUsers, setSortedUsers] = useState<UserState[]>([]);

  useEffect(() => {
    // 사용자 목록 정렬 (본인 먼저, 나머지는 닉네임순)
    const userArray = Array.from(users.values());
    const sorted = userArray.sort((a, b) => {
      if (a.id === myUserId) return -1;
      if (b.id === myUserId) return 1;
      return (a.nickname || '').localeCompare(b.nickname || '');
    });
    setSortedUsers(sorted);
  }, [users, myUserId]);

  if (!isExpanded) {
    return (
      <div className="fixed top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg shadow-lg">
        <button
          onClick={() => setIsExpanded(true)}
          className="px-4 py-2 text-white font-bold hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
        >
          <span>👥 {sortedUsers.length}명</span>
          <span className="text-xs">▼</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg shadow-lg max-w-xs w-64 max-h-[80vh] overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <div className="text-white font-bold flex items-center gap-2">
          <span>👥</span>
          <span>참여자 ({sortedUsers.length})</span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-white/60 hover:text-white transition-colors"
        >
          <span className="text-lg">▲</span>
        </button>
      </div>

      {/* 참여자 목록 */}
      <div className="overflow-y-auto flex-1">
        {sortedUsers.length === 0 ? (
          <div className="p-4 text-center text-gray-400">참여자가 없습니다</div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedUsers.map((user) => {
              const isMe = user.id === myUserId;
              const distance =
                isMe || !myPosition
                  ? 0
                  : Math.sqrt(
                      Math.pow(user.position.x - myPosition.x, 2) +
                        Math.pow(user.position.y - myPosition.y, 2) +
                        Math.pow(user.position.z - myPosition.z, 2)
                    );

              return (
                <button
                  key={user.id}
                  onClick={() => onUserClick?.(user.id)}
                  className={`w-full p-3 rounded-lg transition-all ${
                    isMe
                      ? 'bg-blue-600/30 border-2 border-blue-400'
                      : 'bg-white/10 hover:bg-white/20 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* 아바타 아이콘 */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        isMe ? 'bg-blue-500' : 'bg-purple-500'
                      }`}
                    >
                      {isMe ? '👤' : '👥'}
                    </div>

                    {/* 사용자 정보 */}
                    <div className="flex-1 text-left">
                      <div className="font-bold text-white text-sm">
                        {user.nickname || `사용자_${user.id.slice(0, 4)}`}
                        {isMe && (
                          <span className="ml-2 text-xs bg-blue-500 px-2 py-0.5 rounded">
                            나
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span>{user.expression.current}</span>
                        {!isMe && <span>• {distance.toFixed(1)}m</span>}
                      </div>
                    </div>

                    {/* 표정 상태 */}
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        {user.expression.mood === 'happy' && '😊'}
                        {user.expression.mood === 'sad' && '😢'}
                        {user.expression.mood === 'angry' && '😠'}
                        {user.expression.mood === 'relaxed' && '😌'}
                        {user.expression.mood === 'neutral' && '😐'}
                      </div>
                      <div className="flex gap-0.5 mt-1">
                        {/* 눈 깜빡임 표시 */}
                        <div
                          className={`w-2 h-2 rounded-full ${
                            user.expression.blinkLeft > 0.5
                              ? 'bg-yellow-500'
                              : 'bg-gray-600'
                          }`}
                          title="왼쪽 눈"
                        />
                        <div
                          className={`w-2 h-2 rounded-full ${
                            user.expression.blinkRight > 0.5
                              ? 'bg-yellow-500'
                              : 'bg-gray-600'
                          }`}
                          title="오른쪽 눈"
                        />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 정보 */}
      <div className="p-3 border-t border-white/20">
        <div className="text-xs text-gray-400 text-center">
          클릭하여 카메라 이동 (준비 중)
        </div>
      </div>
    </div>
  );
}

'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MultiplayerVRMWorld = dynamic(
  () => import('@/components/MultiplayerVRMWorld'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">로딩 중...</div>
      </div>
    ),
  }
);

const RoomLobby = dynamic(() => import('@/components/RoomLobby'), {
  ssr: false,
});

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RoomPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const router = useRouter();

  const [isJoined, setIsJoined] = useState(false);
  const [nickname, setNickname] = useState('');
  const [modelPath, setModelPath] = useState(
    '/models/VRM1_Constraint_Twist_Sample.vrm'
  );

  const handleJoin = () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    setIsJoined(true);
  };

  const handleLeave = () => {
    if (confirm('정말 나가시겠습니까?')) {
      router.push('/');
    }
  };

  if (!isJoined) {
    return (
      <RoomLobby
        roomId={roomId}
        nickname={nickname}
        modelPath={modelPath}
        onNicknameChange={setNickname}
        onModelPathChange={setModelPath}
        onJoin={handleJoin}
        onBack={() => router.push('/')}
      />
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      <MultiplayerVRMWorld
        myModelPath={modelPath}
        nickname={nickname}
        serverUrl="http://localhost:3001"
        roomId={roomId}
        width={1920}
        height={1080}
        className="w-full h-full"
      />

      <button
        onClick={handleLeave}
        className="absolute top-20 left-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
      >
        나가기
      </button>

      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
        <div className="text-sm font-bold">룸: {roomId}</div>
        <div className="text-xs text-gray-300">{nickname}</div>
      </div>
    </div>
  );
}

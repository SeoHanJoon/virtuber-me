/**
 * MoveNet 기반 VRM 상체 트래킹 테스트 페이지
 * 이 페이지는 완전히 클라이언트 사이드에서만 동작합니다.
 */

'use client';

import dynamic from 'next/dynamic';

// 전체 페이지를 dynamic import로 로드 (SSR 비활성화)
const BodyTrackingTestPage = dynamic(
  () => import('@/components/BodyTrackingTestPage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto" />
          <p className="text-lg">BlazePose 모델 로딩 중... (TFjs lite)</p>
        </div>
      </div>
    ),
  }
);

export default function Page() {
  return <BodyTrackingTestPage />;
}

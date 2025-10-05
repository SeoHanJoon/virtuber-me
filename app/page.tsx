import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-sans">
      <main className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Virtuber Me
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-400 mb-4">
            웹 기반 VTuber 플랫폼
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-500">
            VRM 아바타 + 실시간 얼굴 추적 + 멀티플레이어 (개발 예정)
          </p>
        </div>

        {/* 주요 기능 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* VRM 뷰어 */}
          <Link href="/vrm">
            <div className="group cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-8 rounded-2xl hover:shadow-xl transition-all duration-300 border-2 border-purple-200 dark:border-purple-700 hover:scale-105">
              <div className="text-5xl mb-4">🎨</div>
              <h2 className="text-2xl font-bold mb-3 text-purple-900 dark:text-purple-300">
                VRM 뷰어
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                3D 아바타를 자유롭게 확인하고 커스터마이징하세요
              </p>
              <div className="text-purple-600 dark:text-purple-400 font-medium group-hover:translate-x-2 transition-transform inline-block">
                체험하기 →
              </div>
            </div>
          </Link>

          {/* 페이스 트래킹 */}
          <Link href="/face-tracking">
            <div className="group cursor-pointer bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 p-8 rounded-2xl hover:shadow-xl transition-all duration-300 border-2 border-pink-200 dark:border-pink-700 hover:scale-105">
              <div className="text-5xl mb-4">🎭</div>
              <h2 className="text-2xl font-bold mb-3 text-pink-900 dark:text-pink-300">
                실시간 얼굴 추적
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                웹캠으로 아바타를 실시간 조종하는 VTuber 체험
              </p>
              <div className="text-pink-600 dark:text-pink-400 font-medium group-hover:translate-x-2 transition-transform inline-block">
                시작하기 →
              </div>
            </div>
          </Link>

          {/* 멀티플레이어 (Coming Soon) */}
          <div className="relative cursor-not-allowed bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-8 rounded-2xl border-2 border-blue-200 dark:border-blue-700 opacity-60">
            <div className="absolute top-4 right-4 bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-bold">
              COMING SOON
            </div>
            <div className="text-5xl mb-4">🌐</div>
            <h2 className="text-2xl font-bold mb-3 text-blue-900 dark:text-blue-300">
              멀티플레이어
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              VRChat처럼 다른 사람들과 만나고 소통하세요
            </p>
          </div>

          {/* 기술 정보 */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-600">
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-300">
              기술 스택
            </h2>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• Next.js 15 + TypeScript</li>
              <li>• Three.js + @pixiv/three-vrm</li>
              <li>• MediaPipe Face Landmarker</li>
              <li>• Tailwind CSS 4</li>
              <li>• WebRTC (예정)</li>
            </ul>
          </div>
        </div>

        {/* 간단한 설명 */}
        <div className="text-center mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-xl">
          <h3 className="text-xl font-bold mb-3">🚀 프로젝트 소개</h3>
          <p className="text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Virtuber Me는 브라우저에서 바로 사용할 수 있는 VTuber 플랫폼입니다.
            VRM 아바타를 업로드하고, 웹캠으로 실시간 얼굴 추적을 통해 아바타를
            조종할 수 있습니다. 향후 멀티플레이어 기능이 추가될 예정입니다.
          </p>
        </div>
      </main>
    </div>
  );
}

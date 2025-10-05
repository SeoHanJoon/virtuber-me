import Button from '@/components/Button';
import Card from '@/components/Card';

export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-sans">
      <main className="max-w-6xl mx-auto">
        {/* 헤더 섹션 */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Virtuber Me
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Next.js 15 + TypeScript + Tailwind CSS로 구축된 현대적인 웹
            애플리케이션
          </p>
        </div>

        {/* 기능 카드 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card title="⚡️ 빠른 성능">
            <p>
              Next.js 15의 최신 기능과 Turbopack을 활용하여 초고속 개발 경험을
              제공합니다.
            </p>
          </Card>

          <Card title="🎨 현대적인 디자인">
            <p>
              Tailwind CSS를 사용하여 반응형이며 아름다운 UI를 빠르게
              구축합니다.
            </p>
          </Card>

          <Card title="🔧 타입 안정성">
            <p>
              TypeScript를 통해 코드의 안정성과 개발자 경험을 크게 향상시킵니다.
            </p>
          </Card>

          <Card title="📦 확장 가능한 구조">
            <p>
              컴포넌트, 라이브러리, 타입이 체계적으로 구조화되어 있어 쉽게
              확장할 수 있습니다.
            </p>
          </Card>

          <Card title="✨ 코드 품질">
            <p>
              ESLint와 Prettier가 자동으로 코드 품질을 관리하고 일관된 스타일을
              유지합니다.
            </p>
          </Card>

          <Card title="🚀 자동화된 워크플로우">
            <p>
              Husky와 lint-staged로 커밋 전 자동으로 린트와 포맷팅을 수행합니다.
            </p>
          </Card>

          <Card title="🎭 VRM 모델 렌더링">
            <p>
              Three.js와 @pixiv/three-vrm을 사용하여 3D 아바타를 실시간으로
              렌더링합니다.
            </p>
            <a
              href="/vrm"
              className="inline-block mt-3 text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              VRM 뷰어 보기 →
            </a>
          </Card>

          <Card title="📹 실시간 얼굴 추적">
            <p>
              웹캠으로 얼굴을 추적하여 VRM 아바타를 실시간으로 조종하는 VTuber
              기능을 체험하세요.
            </p>
            <a
              href="/face-tracking"
              className="inline-block mt-3 text-pink-600 dark:text-pink-400 hover:underline font-medium"
            >
              얼굴 추적 체험하기 →
            </a>
          </Card>
        </div>

        {/* 액션 버튼 섹션 */}
        <div className="flex flex-wrap gap-4 justify-center">
          <a href="/face-tracking">
            <Button variant="primary" size="lg">
              🎭 얼굴 추적 체험
            </Button>
          </a>
          <a href="/vrm">
            <Button variant="outline" size="lg">
              🎨 VRM 뷰어
            </Button>
          </a>
          <Button variant="secondary" size="lg">
            📚 문서 보기
          </Button>
        </div>

        {/* 추가 정보 섹션 */}
        <div className="mt-16 p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-xl">
          <h2 className="text-2xl font-bold mb-4 text-center">
            프로젝트 시작하기
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p className="flex items-start">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded mr-3">
                1
              </span>
              <span>
                <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  npm run dev
                </code>{' '}
                명령어로 개발 서버를 시작합니다
              </span>
            </p>
            <p className="flex items-start">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded mr-3">
                2
              </span>
              <span>
                <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  app/page.tsx
                </code>{' '}
                파일을 수정하여 이 페이지를 변경합니다
              </span>
            </p>
            <p className="flex items-start">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded mr-3">
                3
              </span>
              <span>변경 사항이 자동으로 반영되는 것을 확인합니다</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

import Button from '@/components/Button';
import Card from '@/components/Card';

/**
 * 홈 페이지
 * Tailwind CSS를 사용한 예제 페이지
 */
export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Virtuber Me에 오신 것을 환영합니다
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Next.js 15, TypeScript, Tailwind CSS로 구축된 현대적인 웹 애플리케이션
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="primary">시작하기</Button>
          <Button variant="outline">더 알아보기</Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        <Card
          title="TypeScript"
          description="타입 안전성을 보장하는 정적 타입 검사"
        >
          <Button variant="secondary" className="w-full mt-4">
            자세히 보기
          </Button>
        </Card>
        <Card
          title="Tailwind CSS"
          description="유틸리티 우선 CSS 프레임워크로 빠른 UI 개발"
        >
          <Button variant="secondary" className="w-full mt-4">
            자세히 보기
          </Button>
        </Card>
        <Card
          title="ESLint & Prettier"
          description="일관된 코드 스타일과 자동 포매팅"
        >
          <Button variant="secondary" className="w-full mt-4">
            자세히 보기
          </Button>
        </Card>
      </section>

      <section className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-12 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">
          현대적인 개발 환경이 준비되었습니다
        </h2>
        <p className="text-lg mb-6">
          Husky와 lint-staged로 커밋 전 자동 코드 포매팅이 적용됩니다
        </p>
        <Button
          variant="outline"
          className="border-white text-white hover:bg-white/10"
        >
          프로젝트 구조 보기
        </Button>
      </section>
    </div>
  );
}

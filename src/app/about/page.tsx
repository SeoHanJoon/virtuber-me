import Card from '@/components/Card';

/**
 * 소개 페이지
 * 프로젝트의 기술 스택과 기능을 소개
 */
export default function AboutPage() {
  const features = [
    {
      title: 'Next.js 15',
      description: '최신 버전의 Next.js App Router 사용',
      icon: '⚡',
    },
    {
      title: 'TypeScript',
      description: '타입 안전성과 개발자 경험 향상',
      icon: '📘',
    },
    {
      title: 'Tailwind CSS',
      description: '빠르고 일관된 스타일링',
      icon: '🎨',
    },
    {
      title: 'ESLint',
      description: '코드 품질 검사 및 버그 예방',
      icon: '🔍',
    },
    {
      title: 'Prettier',
      description: '자동 코드 포매팅',
      icon: '✨',
    },
    {
      title: 'Husky',
      description: 'Git 훅을 통한 자동화',
      icon: '🐶',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">프로젝트 소개</h1>
        <p className="text-lg text-gray-600 mb-6">
          이 프로젝트는 현대적인 웹 개발 도구와 베스트 프랙티스를 적용한 Next.js
          애플리케이션입니다.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-blue-900">
            <strong>목표:</strong> 확장 가능하고 유지보수가 쉬운 프로젝트 구조를
            제공하며, 개발자 경험을 최적화합니다.
          </p>
        </div>
      </div>

      <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
        주요 기술 스택
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Card
            key={feature.title}
            title={feature.title}
            description={feature.description}
          >
            <div className="text-5xl text-center mt-4">{feature.icon}</div>
          </Card>
        ))}
      </div>

      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">프로젝트 구조</h2>
        <div className="bg-gray-50 rounded-lg p-6 font-mono text-sm">
          <pre className="text-gray-800">
            {`virtuber-me/
├── src/
│   ├── app/              # Next.js App Router 페이지
│   ├── components/       # 재사용 가능한 컴포넌트
│   └── lib/              # 유틸리티 함수 및 라이브러리
├── public/               # 정적 파일
├── .husky/               # Git 훅 설정
├── .nvmrc                # Node.js 버전 지정
├── eslint.config.mjs     # ESLint 설정
├── .prettierrc           # Prettier 설정
└── package.json          # 프로젝트 의존성`}
          </pre>
        </div>
      </div>
    </div>
  );
}

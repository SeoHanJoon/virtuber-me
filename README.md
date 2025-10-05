# Virtuber Me

Next.js 15, TypeScript, Tailwind CSS로 구축된 현대적인 웹 애플리케이션 템플릿

## 🚀 주요 기능

- **Next.js 15**: 최신 버전의 Next.js와 App Router 사용
- **TypeScript**: 타입 안정성을 위한 완전한 TypeScript 지원
- **Tailwind CSS 4**: 유틸리티 우선 CSS 프레임워크
- **ESLint + Prettier**: 코드 품질 및 일관된 스타일 유지
- **Husky + lint-staged**: Git 커밋 전 자동 린트 및 포맷팅
- **확장 가능한 구조**: 체계적인 폴더 구조로 쉬운 확장성
- **VRM 모델 렌더링**: Three.js와 @pixiv/three-vrm을 사용한 3D 아바타 렌더링

## 📦 기술 스택

- **프레임워크**: Next.js 15.5.4
- **언어**: TypeScript 5
- **스타일링**: Tailwind CSS 4
- **3D 렌더링**: Three.js + @pixiv/three-vrm
- **린팅**: ESLint 9
- **포맷팅**: Prettier 3.6
- **Git Hooks**: Husky 9.1 + lint-staged 16.2
- **패키지 매니저**: npm
- **Node.js**: 22.20.0

## 📁 프로젝트 구조

\`\`\`
virtuber-me/
├── app/ # Next.js App Router 디렉토리
│ ├── layout.tsx # 루트 레이아웃
│ ├── page.tsx # 메인 페이지
│ ├── vrm/ # VRM 뷰어 페이지
│ │ └── page.tsx # VRM 모델 렌더링 페이지
│ └── globals.css # 글로벌 스타일
├── components/ # 재사용 가능한 React 컴포넌트
│ ├── Button.tsx # 버튼 컴포넌트
│ ├── Card.tsx # 카드 컴포넌트
│ └── VRMViewer.tsx # VRM 3D 모델 뷰어
├── lib/ # 유틸리티 함수 및 헬퍼
│ └── utils.ts # 공통 유틸리티 함수
├── types/ # TypeScript 타입 정의
│ └── index.ts # 공통 타입 정의
├── public/ # 정적 파일 (이미지, 폰트 등)
│ └── models/ # VRM 모델 파일 저장 디렉토리
├── .husky/ # Husky Git hooks 설정
├── .nvmrc # Node.js 버전 지정
├── .prettierrc # Prettier 설정
├── .prettierignore # Prettier 제외 파일
├── eslint.config.mjs # ESLint 설정
├── next.config.ts # Next.js 설정
├── tailwind.config.ts # Tailwind CSS 설정
├── tsconfig.json # TypeScript 설정
└── package.json # 프로젝트 의존성 및 스크립트
\`\`\`

## 🛠️ 시작하기

### 필수 요구사항

- Node.js 22.20.0 (nvm 사용 권장)
- npm

### 설치 방법

1. **저장소 클론 및 이동**

\`\`\`bash
cd virtuber-me
\`\`\`

2. **올바른 Node.js 버전 사용** (nvm 사용 시)

\`\`\`bash
nvm use
\`\`\`

3. **의존성 설치**

\`\`\`bash
npm install
\`\`\`

4. **개발 서버 실행**

\`\`\`bash
npm run dev
\`\`\`

5. **브라우저에서 확인**

[http://localhost:3000](http://localhost:3000) 열기

## 📜 사용 가능한 스크립트

- \`npm run dev\`: 개발 서버 시작 (Turbopack 사용)
- \`npm run build\`: 프로덕션 빌드 생성
- \`npm run start\`: 프로덕션 서버 시작
- \`npm run lint\`: ESLint 실행
- \`npm run lint:fix\`: ESLint 자동 수정
- \`npm run format\`: Prettier로 모든 파일 포맷팅
- \`npm run format:check\`: Prettier 포맷 검사

## 🔧 코드 품질 자동화

이 프로젝트는 코드 품질을 자동으로 관리하는 도구들이 설정되어 있습니다:

### ESLint

코드 품질과 잠재적 버그를 검사합니다.

\`\`\`bash
npm run lint
\`\`\`

### Prettier

일관된 코드 스타일을 유지합니다.

\`\`\`bash
npm run format
\`\`\`

### Husky + lint-staged

Git 커밋 전에 자동으로 다음을 실행합니다:

1. **변경된 파일에 대해서만**:
   - TypeScript/JavaScript 파일: ESLint 수정 + Prettier 포맷팅
   - JSON/Markdown/CSS 파일: Prettier 포맷팅

이를 통해 저장소에 항상 깨끗하고 일관된 코드가 유지됩니다.

## 🎨 컴포넌트 사용 예제

### Button 컴포넌트

\`\`\`tsx
import Button from '@/components/Button';

<Button variant="primary" size="lg">
  클릭하세요
</Button>

<Button variant="outline" size="md">
  보조 버튼
</Button>
\`\`\`

### Card 컴포넌트

\`\`\`tsx
import Card from '@/components/Card';

<Card title="제목">
  <p>카드 내용이 여기에 들어갑니다.</p>
</Card>
\`\`\`

## 🌈 Tailwind CSS 사용하기

이 프로젝트는 Tailwind CSS 4를 사용합니다. 유틸리티 클래스를 사용하여 빠르게 스타일링할 수 있습니다:

\`\`\`tsx

<div className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600">
  Tailwind CSS 스타일
</div>
\`\`\`

## 📝 개발 가이드

### 새 페이지 추가하기

\`app\` 디렉토리에 새 폴더를 만들고 \`page.tsx\` 파일을 생성합니다:

\`\`\`tsx
// app/about/page.tsx
export default function About() {
return <div>소개 페이지</div>;
}
\`\`\`

### 새 컴포넌트 추가하기

\`components\` 디렉토리에 새 컴포넌트 파일을 생성합니다:

\`\`\`tsx
// components/Header.tsx
export default function Header() {
return <header>헤더 컴포넌트</header>;
}
\`\`\`

### 타입 정의 추가하기

\`types/index.ts\` 파일에 새로운 타입을 추가합니다:

\`\`\`typescript
export interface Product {
id: string;
name: string;
price: number;
}
\`\`\`

## 🎭 VRM 모델 사용하기

이 프로젝트는 VRM 3D 아바타를 렌더링할 수 있습니다.

### VRM 뷰어 페이지 접속

개발 서버를 실행한 후 \`http://localhost:3000/vrm\`으로 이동

### VRM 모델 추가하기

1. VRM 파일을 \`public/models/\` 디렉토리에 저장
2. VRM 뷰어 페이지에서 모델 경로 입력 (예: \`/models/avatar.vrm\`)
3. 모델이 자동으로 로드되고 렌더링됩니다

### VRM 모델 다운로드

- **VRoid Hub**: https://hub.vroid.com/ - 무료/유료 VRM 모델
- **VRoid Studio**: https://vroid.com/studio - 직접 캐릭터 제작
- **Three-VRM 샘플**: https://github.com/pixiv/three-vrm

### VRMViewer 컴포넌트 사용

\`\`\`tsx
import VRMViewer from '@/components/VRMViewer';

<VRMViewer
  modelPath="/models/sample.vrm"
  width={800}
  height={600}
  className="rounded-lg"
/>
\`\`\`

## 🔍 추가 리소스

- [Next.js 공식 문서](https://nextjs.org/docs)
- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/docs)
- [React 공식 문서](https://react.dev/)

## 📄 라이선스

이 프로젝트는 자유롭게 사용할 수 있습니다.

## 🤝 기여하기

버그 리포트, 기능 제안, Pull Request를 환영합니다!

---

**즐거운 코딩 되세요! 🚀**

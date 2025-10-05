# Virtuber Me

Next.js 15, TypeScript, Tailwind CSS로 구축된 현대적인 웹 애플리케이션입니다.

## 🚀 주요 기능

- **Next.js 15**: 최신 App Router 및 서버 컴포넌트 활용
- **TypeScript**: 타입 안전성을 보장하는 정적 타입 검사
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **ESLint**: 코드 품질 검사 및 버그 예방
- **Prettier**: 자동 코드 포매팅
- **Husky + lint-staged**: 커밋 전 자동 코드 포매팅 및 린트 검사

## 📋 필수 요구사항

- Node.js 22.20.0 (`.nvmrc` 파일 참조)
- npm 또는 yarn

## 🛠️ 설치 방법

### 1. Node.js 버전 설정

이 프로젝트는 Node.js 22.20.0을 사용합니다. nvm을 사용하는 경우:

```bash
nvm use
```

또는 nvm이 없다면 [Node.js 공식 웹사이트](https://nodejs.org/)에서 22.20.0 버전을 설치하세요.

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

## 📜 사용 가능한 스크립트

- `npm run dev` - 개발 서버 실행 (포트 3000)
- `npm run build` - 프로덕션 빌드 생성
- `npm start` - 프로덕션 서버 실행
- `npm run lint` - ESLint로 코드 검사
- `npm run format` - Prettier로 코드 포매팅
- `npm run format:check` - 포매팅 규칙 위반 확인

## 📁 프로젝트 구조

```
virtuber-me/
├── src/
│   ├── app/              # Next.js App Router 페이지
│   │   ├── about/        # 소개 페이지
│   │   ├── contact/      # 연락 페이지
│   │   ├── layout.tsx    # 루트 레이아웃
│   │   ├── page.tsx      # 홈 페이지
│   │   └── globals.css   # 전역 스타일
│   ├── components/       # 재사용 가능한 컴포넌트
│   │   ├── Header.tsx    # 헤더 컴포넌트
│   │   ├── Footer.tsx    # 푸터 컴포넌트
│   │   ├── Button.tsx    # 버튼 컴포넌트
│   │   └── Card.tsx      # 카드 컴포넌트
│   └── lib/              # 유틸리티 함수 및 라이브러리
├── public/               # 정적 파일 (이미지, 폰트 등)
├── .husky/               # Git 훅 설정
├── .nvmrc                # Node.js 버전 지정
├── .prettierrc           # Prettier 설정
├── .prettierignore       # Prettier 무시 파일
├── eslint.config.mjs     # ESLint 설정
├── tsconfig.json         # TypeScript 설정
├── tailwind.config.ts    # Tailwind CSS 설정 (없는 경우 postcss.config.mjs 사용)
├── next.config.ts        # Next.js 설정
└── package.json          # 프로젝트 의존성 및 스크립트
```

## 🎨 컴포넌트 예제

### Button 컴포넌트

```tsx
import Button from '@/components/Button';

<Button variant="primary">시작하기</Button>
<Button variant="secondary">더 알아보기</Button>
<Button variant="outline">자세히 보기</Button>
```

### Card 컴포넌트

```tsx
import Card from '@/components/Card';

<Card title="제목" description="설명 텍스트">
  <p>추가 컨텐츠</p>
</Card>;
```

## 🔧 개발 환경 설정

### ESLint 설정

ESLint는 `eslint.config.mjs` 파일에서 설정됩니다. Next.js와 TypeScript를 위한 권장 규칙이 적용되어 있습니다.

### Prettier 설정

Prettier는 `.prettierrc` 파일에서 설정됩니다. 일관된 코드 스타일을 유지하기 위해 다음 규칙이 적용됩니다:

- 세미콜론 사용
- 작은따옴표 사용
- 줄 길이 80자
- 탭 크기 2

### Husky 및 lint-staged

커밋하기 전에 자동으로 다음 작업이 수행됩니다:

- Prettier로 코드 포매팅
- ESLint로 코드 검사 및 자동 수정

이는 `.husky/pre-commit` 훅을 통해 실행됩니다.

## 🌐 배포

### Vercel

Next.js 프로젝트를 Vercel에 배포하는 가장 쉬운 방법:

1. [Vercel](https://vercel.com/new)에서 프로젝트 가져오기
2. GitHub 저장소 연결
3. 자동 배포

### 기타 플랫폼

이 프로젝트는 Node.js를 지원하는 모든 플랫폼에 배포할 수 있습니다:

- Netlify
- AWS Amplify
- Google Cloud Platform
- Docker 컨테이너

## 📚 추가 학습 자료

- [Next.js 문서](https://nextjs.org/docs)
- [TypeScript 문서](https://www.typescriptlang.org/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [ESLint 문서](https://eslint.org/docs/latest/)
- [Prettier 문서](https://prettier.io/docs/en/index.html)

## 📄 라이센스

MIT License

## 👥 기여하기

이슈 및 풀 리퀘스트는 언제나 환영합니다!

1. 프로젝트를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경 사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/AmazingFeature`)
5. 풀 리퀘스트를 엽니다

## 📞 문의

문의 사항이 있으시면 [연락 페이지](/contact)를 방문하세요.

import Link from 'next/link';

/**
 * 헤더 컴포넌트
 * 네비게이션 메뉴를 포함한 상단 헤더
 */
export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Virtuber Me
          </Link>
          <ul className="flex space-x-6">
            <li>
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                홈
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                소개
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                연락
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}

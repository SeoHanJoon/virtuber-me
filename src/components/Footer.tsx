/**
 * 푸터 컴포넌트
 * 페이지 하단에 표시되는 저작권 정보
 */
export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 Virtuber Me. All rights reserved.</p>
          <p className="mt-2 text-sm">
            Next.js{' '}
            {process.env.NODE_ENV === 'production' ? '프로덕션' : '개발'} 모드
          </p>
        </div>
      </div>
    </footer>
  );
}

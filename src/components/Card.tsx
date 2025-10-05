import { ReactNode } from 'react';

interface CardProps {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}

/**
 * 카드 컴포넌트
 * 콘텐츠를 시각적으로 구분하여 표시
 */
export default function Card({
  title,
  description,
  children,
  className = '',
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 ${className}`}
    >
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      {children}
    </div>
  );
}

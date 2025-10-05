'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import Card from '@/components/Card';

/**
 * 연락 페이지
 * 폼 제출 예제를 포함한 인터랙티브 페이지
 */
export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', message: '' });
    }, 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          연락하기
        </h1>
        <p className="text-lg text-gray-600 mb-8 text-center">
          궁금한 점이 있으시면 언제든지 문의해주세요
        </p>

        {submitted ? (
          <Card
            title="메시지 전송 완료"
            description="감사합니다! 곧 답변 드리겠습니다."
          >
            <div className="text-center text-green-600 text-6xl mt-4">✓</div>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="홍길동"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  메시지
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="메시지를 입력하세요..."
                />
              </div>

              <Button type="submit" variant="primary" className="w-full">
                메시지 보내기
              </Button>
            </form>
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="이메일" description="support@virtuber.me">
            <div className="text-center text-3xl mt-2">📧</div>
          </Card>
          <Card title="전화" description="+82 10-1234-5678">
            <div className="text-center text-3xl mt-2">📱</div>
          </Card>
          <Card title="위치" description="서울, 대한민국">
            <div className="text-center text-3xl mt-2">📍</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // public/models 디렉토리 경로
    const modelsDir = path.join(process.cwd(), 'public', 'models');

    // 디렉토리가 존재하는지 확인
    if (!fs.existsSync(modelsDir)) {
      return NextResponse.json({ models: [] });
    }

    // .vrm 파일만 필터링
    const files = fs
      .readdirSync(modelsDir)
      .filter((file) => file.endsWith('.vrm'))
      .map((file) => ({
        name: file.replace('.vrm', ''),
        path: `/models/${file}`,
      }));

    return NextResponse.json({ models: files });
  } catch (error) {
    console.error('VRM 모델 목록 로드 실패:', error);
    return NextResponse.json({ models: [] }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { VRMModelsResponse } from '@/types/vrm';

export async function GET(): Promise<NextResponse<VRMModelsResponse>> {
  try {
    // public/models 디렉토리 경로
    const modelsDir = path.join(process.cwd(), 'public', 'models');

    // 디렉토리가 존재하는지 확인
    if (!fs.existsSync(modelsDir)) {
      return NextResponse.json([]);
    }

    // .vrm 파일만 필터링
    const files: VRMModelsResponse = fs
      .readdirSync(modelsDir)
      .filter((file) => file.endsWith('.vrm'))
      .map((file) => ({
        name: file.replace('.vrm', ''),
        path: `/models/${file}`,
      }));

    return NextResponse.json(files);
  } catch (error) {
    console.error('VRM 모델 목록 로드 실패:', error);
    return NextResponse.json([], { status: 500 });
  }
}

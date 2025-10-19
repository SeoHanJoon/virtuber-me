import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // TensorFlow.js와 MediaPipe는 클라이언트 사이드에서만 로드
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // MediaPipe와 TensorFlow.js의 WASM 파일 처리
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // MediaPipe 모델 파일 처리
    config.module.rules.push({
      test: /\.(tflite|binarypb)$/,
      type: 'asset/resource',
    });

    return config;
  },
  // 실험적 기능 비활성화 (Webpack 안정성 향상)
  experimental: {},
};

export default nextConfig;

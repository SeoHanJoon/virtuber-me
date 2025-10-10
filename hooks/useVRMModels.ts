import { useState, useEffect } from 'react';
import type { VRMModel } from '../types/vrm';

/**
 * VRM 모델 목록 로드 및 관리 훅
 */
export function useVRMModels() {
  const [models, setModels] = useState<VRMModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/api/vrm-models');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setModels(data);
          if (data.length > 0) {
            setSelectedModel(data[0].path);
          }
        } else {
          console.error('API 응답이 배열이 아닙니다:', data);
          setModels([]);
          setError('잘못된 API 응답 형식입니다.');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '모델 목록 로드 실패';
        console.error('모델 목록 로드 실패:', err);
        setError(errorMessage);
        setModels([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  return {
    models,
    selectedModel,
    setSelectedModel,
    isLoading,
    error,
  };
}

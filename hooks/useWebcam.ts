import { useEffect, useRef, useState } from 'react';

/**
 * 웹캠 스트림을 관리하는 커스텀 훅
 */
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initWebcam = async () => {
      try {
        // 웹캠 권한 요청 및 스트림 획득
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: 'user', // 전면 카메라 사용
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsReady(true);
          };
        }
      } catch (err) {
        console.error('웹캠 초기화 실패:', err);
        setError('웹캠에 접근할 수 없습니다. 권한을 확인해주세요.');
      }
    };

    initWebcam();

    // 클린업: 웹캠 스트림 종료
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { videoRef, isReady, error };
}

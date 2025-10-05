/**
 * 얼굴 추적 관련 타입 정의
 */

import type { VRMExpressionPresetName } from '@pixiv/three-vrm';

/**
 * 얼굴 랜드마크 데이터
 */
export interface FaceLandmarks {
  // 랜드마크 포인트 (468개)
  landmarks: Array<{ x: number; y: number; z: number }>;

  // 머리 회전 (라디안)
  headRotation: {
    yaw: number; // 좌우 회전
    pitch: number; // 위아래 회전
    roll: number; // 기울임
  };

  // 눈 상태
  eyes: {
    leftOpen: number; // 0(감음) ~ 1(뜸)
    rightOpen: number; // 0(감음) ~ 1(뜸)
  };

  // 입 상태
  mouth: {
    openness: number; // 0(닫음) ~ 1(벌림)
    width: number; // 입 가로 너비 (웃음 감지용)
  };

  // 눈썹 상태
  eyebrows: {
    leftRaise: number; // 0(평상시) ~ 1(올림)
    rightRaise: number; // 0(평상시) ~ 1(올림)
  };

  // 타임스탬프
  timestamp: number;
}

/**
 * VRM 표정 상태
 */
export interface VRMExpression {
  // 현재 활성 표정 이름
  name: VRMExpressionPresetName | string;

  // 개별 표정 값 (0~1)
  values: {
    neutral: number;
    aa: number;
    ih: number;
    ou: number;
    ee: number;
    oh: number;
    blink: number;
    blinkLeft: number;
    blinkRight: number;
    happy: number;
    angry: number;
    sad: number;
    relaxed: number;
    lookUp: number;
    lookDown: number;
    lookLeft: number;
    lookRight: number;
  };

  // 감정 상태
  mood: 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed';
}

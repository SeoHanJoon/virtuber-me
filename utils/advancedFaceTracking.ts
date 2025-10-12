/**
 * Advanced Face Tracking System
 *
 * 고급 얼굴 트래킹 기능:
 * - EMA (Exponential Moving Average) 기반 스무딩
 * - Kalman Filter를 통한 노이즈 제거
 * - 더 정밀한 Landmark 기반 표정 감지
 * - 자연스러운 표정 전환을 위한 가중 평균
 */

import type { FaceState } from './faceStateCalculator';

/**
 * EMA Smoother (Exponential Moving Average)
 *
 * 간단하지만 효과적인 스무딩. 이전 값에 가중치를 두어 급격한 변화를 완화합니다.
 */
export class EMASmoother {
  private alpha: number; // 스무딩 강도 (0~1, 낮을수록 부드러움)
  private previousValues: Map<string, number> = new Map();

  constructor(alpha: number = 0.3) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * 값을 스무딩합니다
   *
   * newValue에 alpha 가중치를, 이전값에 (1-alpha) 가중치를 적용
   */
  public smooth(key: string, newValue: number): number {
    const prevValue = this.previousValues.get(key) ?? newValue;
    const smoothed = this.alpha * newValue + (1 - this.alpha) * prevValue;
    this.previousValues.set(key, smoothed);
    return smoothed;
  }

  /**
   * 모든 값 초기화
   */
  public reset(): void {
    this.previousValues.clear();
  }

  /**
   * alpha 값 변경
   */
  public setAlpha(alpha: number): void {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }
}

/**
 * 1D Kalman Filter
 *
 * 더 정교한 노이즈 제거를 위한 칼만 필터
 * MediaPipe landmark의 미세한 떨림을 제거하는 데 효과적입니다.
 */
export class KalmanFilter1D {
  private Q: number; // Process variance (모델 불확실성)
  private R: number; // Measurement variance (측정 노이즈)
  private P: number; // Estimation error covariance
  private X: number; // Estimated value
  private K: number; // Kalman gain

  constructor(
    processVariance: number = 0.001,
    measurementVariance: number = 0.1,
    initialValue: number = 0
  ) {
    this.Q = processVariance;
    this.R = measurementVariance;
    this.P = 1;
    this.X = initialValue;
    this.K = 0;
  }

  /**
   * 새로운 측정값으로 필터 업데이트
   */
  public filter(measurement: number): number {
    // Prediction
    this.P = this.P + this.Q;

    // Update
    this.K = this.P / (this.P + this.R);
    this.X = this.X + this.K * (measurement - this.X);
    this.P = (1 - this.K) * this.P;

    return this.X;
  }

  /**
   * 필터 초기화
   */
  public reset(value: number = 0): void {
    this.X = value;
    this.P = 1;
  }
}

/**
 * Multi-value Kalman Smoother
 *
 * FaceState의 모든 값에 Kalman filter 적용
 */
export class FaceStateKalmanSmoother {
  private filters: Map<string, KalmanFilter1D> = new Map();
  private processVariance: number;
  private measurementVariance: number;

  constructor(
    processVariance: number = 0.001,
    measurementVariance: number = 0.1
  ) {
    this.processVariance = processVariance;
    this.measurementVariance = measurementVariance;
  }

  /**
   * FaceState 전체를 스무딩
   */
  public smoothFaceState(state: FaceState): FaceState {
    const smoothed: FaceState = {} as FaceState;

    for (const key of Object.keys(state) as Array<keyof FaceState>) {
      if (!this.filters.has(key)) {
        this.filters.set(
          key,
          new KalmanFilter1D(
            this.processVariance,
            this.measurementVariance,
            state[key]
          )
        );
      }

      const filter = this.filters.get(key)!;
      smoothed[key] = filter.filter(state[key]);
    }

    return smoothed;
  }

  /**
   * 모든 필터 초기화
   */
  public reset(): void {
    this.filters.clear();
  }
}

/**
 * Advanced Expression Mapper
 *
 * Landmark 기반의 더 정밀한 표정 매핑
 */
type Landmark = { x: number; y: number; z: number };

export class AdvancedExpressionMapper {
  /**
   * 눈썹 올림 정도 계산
   *
   * MediaPipe Face Landmarker의 눈썹 랜드마크를 사용
   */
  public calculateBrowRaise(landmarks: Landmark[]): {
    left: number;
    right: number;
  } {
    // 왼쪽 눈썹: 70, 63, 105, 66, 107
    // 오른쪽 눈썹: 300, 293, 334, 296, 336
    const leftBrow = [70, 63, 105, 66, 107];
    const rightBrow = [300, 293, 334, 296, 336];

    // 왼쪽/오른쪽 눈 중심
    const leftEyeCenter = landmarks[159]; // 왼쪽 눈 위
    const rightEyeCenter = landmarks[386]; // 오른쪽 눈 위

    if (!leftEyeCenter || !rightEyeCenter) {
      return { left: 0, right: 0 };
    }

    // 왼쪽 눈썹의 평균 Y 좌표
    const leftBrowAvgY =
      leftBrow.reduce((sum, idx) => sum + (landmarks[idx]?.y || 0), 0) /
      leftBrow.length;

    // 오른쪽 눈썹의 평균 Y 좌표
    const rightBrowAvgY =
      rightBrow.reduce((sum, idx) => sum + (landmarks[idx]?.y || 0), 0) /
      rightBrow.length;

    // 눈썹과 눈 사이 거리 계산 (Y축)
    const leftDistance = leftEyeCenter.y - leftBrowAvgY;
    const rightDistance = rightEyeCenter.y - rightBrowAvgY;

    // 정규화 (기준: 0.03)
    const leftRaise = Math.max(0, leftDistance / 0.03);
    const rightRaise = Math.max(0, rightDistance / 0.03);

    return {
      left: Math.min(1, leftRaise),
      right: Math.min(1, rightRaise),
    };
  }

  /**
   * 턱 움직임 계산 (입 벌림과는 별개)
   *
   * 턱이 내려가는 정도를 감지
   */
  public calculateJawOpen(landmarks: Landmark[]): number {
    // 턱 끝: 152
    // 코끝: 1
    const chin = landmarks[152];
    const nose = landmarks[1];

    if (!chin || !nose) return 0;

    // 턱과 코 사이 거리 (Y축)
    const distance = chin.y - nose.y;

    // 정규화 (기준: 0.15)
    const normalized = distance / 0.15;

    return Math.max(0, Math.min(1, normalized - 0.5)); // 0.5를 중립으로
  }

  /**
   * 입 모양 세부 분석
   *
   * 'aa', 'ih', 'ou', 'ee', 'oh'를 구분하기 위한 2D 매핑
   */
  public analyzeMouthShape(landmarks: Landmark[]): {
    openness: number; // 0~1 (세로)
    width: number; // 0~1 (가로)
    roundness: number; // 0~1 (둥글기)
  } {
    const upper = landmarks[13]; // 입 윗부분 중앙
    const lower = landmarks[14]; // 입 아랫부분 중앙
    const left = landmarks[61]; // 입 왼쪽
    const right = landmarks[291]; // 입 오른쪽

    if (!upper || !lower || !left || !right) {
      return { openness: 0, width: 1, roundness: 0 };
    }

    // 세로 거리 (openness)
    const verticalDist = Math.sqrt(
      Math.pow(upper.x - lower.x, 2) +
        Math.pow(upper.y - lower.y, 2) +
        Math.pow(upper.z - lower.z, 2)
    );

    // 가로 거리 (width)
    const horizontalDist = Math.sqrt(
      Math.pow(left.x - right.x, 2) +
        Math.pow(left.y - right.y, 2) +
        Math.pow(left.z - right.z, 2)
    );

    // 둥글기 (aspect ratio)
    const aspectRatio = horizontalDist / (verticalDist + 0.001);

    return {
      openness: Math.min(1, verticalDist / 0.05),
      width: Math.min(1.5, horizontalDist / 0.06),
      roundness: Math.min(1, 1 / aspectRatio), // 세로가 길수록 roundness 증가
    };
  }

  /**
   * VRM 표정 이벤트로 매핑
   *
   * mouthShape 분석 결과를 VRM expression으로 변환
   */
  public mapToVRMExpression(mouthShape: {
    openness: number;
    width: number;
    roundness: number;
  }): {
    neutral: number;
    aa: number;
    ih: number;
    ou: number;
    ee: number;
    oh: number;
  } {
    const { openness, width, roundness } = mouthShape;

    // 2D 공간에서 표정 매핑
    // X축: width (가로), Y축: openness (세로)

    const result = {
      neutral: 0,
      aa: 0, // 크게 벌림 (높은 openness, 넓은 width)
      ih: 0, // 약간 벌림 (중간 openness, 좁은 width)
      ou: 0, // '우' 모양 (중간 openness, 좁은 width, 높은 roundness)
      ee: 0, // '이' 모양 (낮은 openness, 넓은 width)
      oh: 0, // '오' 모양 (높은 openness, 중간 width, 높은 roundness)
    };

    if (openness < 0.2) {
      // 입이 거의 닫힘
      result.neutral = 1.0;
      return result;
    }

    // aa: 크게 벌림 (openness > 0.7, width > 0.8)
    if (openness > 0.7 && width > 0.8) {
      result.aa = openness * width;
    }

    // ih: 약간 벌림 (openness 0.3~0.6, width < 0.7)
    if (openness > 0.3 && openness < 0.6 && width < 0.7) {
      result.ih = openness * (1 - width);
    }

    // ou: '우' 모양 (openness 0.4~0.7, width < 0.6, roundness > 0.6)
    if (openness > 0.4 && openness < 0.7 && width < 0.6 && roundness > 0.6) {
      result.ou = openness * roundness;
    }

    // ee: '이' 모양 (openness < 0.4, width > 0.9)
    if (openness < 0.4 && width > 0.9) {
      result.ee = width * (1 - openness);
    }

    // oh: '오' 모양 (openness > 0.6, width 0.6~0.9, roundness > 0.5)
    if (openness > 0.6 && width > 0.6 && width < 0.9 && roundness > 0.5) {
      result.oh = openness * roundness * 0.8;
    }

    // Normalize (합이 1을 넘지 않도록)
    const sum =
      result.aa +
      result.ih +
      result.ou +
      result.ee +
      result.oh +
      result.neutral;
    if (sum > 1) {
      for (const key of Object.keys(result) as Array<keyof typeof result>) {
        result[key] /= sum;
      }
    }

    return result;
  }
}

/**
 * Expression Blender
 *
 * 여러 표정 간의 부드러운 전환을 위한 보간
 */
export class ExpressionBlender {
  private currentBlend: Map<string, number> = new Map();
  private blendSpeed: number; // 전환 속도 (0~1)

  constructor(blendSpeed: number = 0.2) {
    this.blendSpeed = blendSpeed;
  }

  /**
   * 목표 표정으로 부드럽게 전환
   */
  public blendTo(
    targetExpressions: Record<string, number>
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [key, targetValue] of Object.entries(targetExpressions)) {
      const currentValue = this.currentBlend.get(key) ?? 0;

      // Linear interpolation (lerp)
      const blended =
        currentValue + (targetValue - currentValue) * this.blendSpeed;

      this.currentBlend.set(key, blended);
      result[key] = blended;
    }

    return result;
  }

  /**
   * 블렌드 속도 변경
   */
  public setBlendSpeed(speed: number): void {
    this.blendSpeed = Math.max(0, Math.min(1, speed));
  }

  /**
   * 초기화
   */
  public reset(): void {
    this.currentBlend.clear();
  }
}

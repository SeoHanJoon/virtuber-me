/**
 * 얼굴 상태 계산 유틸리티
 *
 * MediaPipe Face Landmarker의 468개 랜드마크를 분석하여
 * VRM 블렌드셰이프에 적용 가능한 정규화된 얼굴 상태를 계산합니다.
 */

/**
 * 정규화된 얼굴 상태
 */
export interface FaceState {
  // 입 상태
  mouthOpen: number; // 0~1, 입 벌림 정도 (세로)
  mouthWidth: number; // 0~1, 입 너비 정도 (가로)
  mouthSmile: number; // 0~1, 양쪽 입꼬리 상승 정도 (미소)

  // 눈 깜빡임
  blinkLeft: number; // 0~1, 왼쪽 눈 감김 정도
  blinkRight: number; // 0~1, 오른쪽 눈 감김 정도

  // 눈 방향 (시선)
  eyeLookUp: number; // 0~1, 위를 봄
  eyeLookDown: number; // 0~1, 아래를 봄
  eyeLookLeft: number; // 0~1, 왼쪽을 봄
  eyeLookRight: number; // 0~1, 오른쪽을 봄
}

/**
 * MediaPipe 랜드마크 포인트 타입
 */
type Landmark = { x: number; y: number; z: number };

/**
 * 표정 강도 멀티플라이어 설정
 */
export interface ExpressionMultipliers {
  mouthOpen: number; // 입 벌림 강도 (기본: 1.0)
  mouthWidth: number; // 입 너비 강도 (기본: 1.0)
  mouthSmile: number; // 미소 강도 (기본: 1.0)
  blink: number; // 눈 깜빡임 강도 (기본: 1.0)
  eyeLook: number; // 시선 강도 (기본: 1.0)
}

/**
 * 얼굴 상태 계산기 옵션
 */
export interface FaceStateCalculatorOptions {
  smoothingFactor?: number; // 스무딩 강도 (0~1, 기본: 0.7)
  multipliers?: Partial<ExpressionMultipliers>; // 표정 강도 조절
}

/**
 * 얼굴 상태 계산기 클래스
 *
 * 프레임 간 스무딩을 적용하여 떨림 없는 안정적인 애니메이션을 제공합니다.
 */
export class FaceStateCalculator {
  private previousState: FaceState;
  private smoothingFactor: number;
  private multipliers: ExpressionMultipliers;

  // MediaPipe 랜드마크 인덱스 (468개 중 주요 포인트)
  private readonly LANDMARKS = {
    // 입 관련
    MOUTH_UPPER: 13, // 입 윗부분 중앙
    MOUTH_LOWER: 14, // 입 아랫부분 중앙
    MOUTH_LEFT: 61, // 입 왼쪽 끝
    MOUTH_RIGHT: 291, // 입 오른쪽 끝
    MOUTH_CORNER_LEFT: 62, // 왼쪽 입꼬리
    MOUTH_CORNER_RIGHT: 308, // 오른쪽 입꼬리

    // 왼쪽 눈 관련
    LEFT_EYE_UPPER: 159, // 왼쪽 눈 위
    LEFT_EYE_LOWER: 145, // 왼쪽 눈 아래
    LEFT_EYE_LEFT: 33, // 왼쪽 눈 왼쪽 끝
    LEFT_EYE_RIGHT: 133, // 왼쪽 눈 오른쪽 끝
    LEFT_IRIS: 468, // 왼쪽 홍채 중심

    // 오른쪽 눈 관련
    RIGHT_EYE_UPPER: 386, // 오른쪽 눈 위
    RIGHT_EYE_LOWER: 374, // 오른쪽 눈 아래
    RIGHT_EYE_LEFT: 362, // 오른쪽 눈 왼쪽 끝
    RIGHT_EYE_RIGHT: 263, // 오른쪽 눈 오른쪽 끝
    RIGHT_IRIS: 473, // 오른쪽 홍채 중심

    // 얼굴 기준점
    NOSE_TIP: 1, // 코끝
    LEFT_CHEEK: 234, // 왼쪽 볼
    RIGHT_CHEEK: 454, // 오른쪽 볼
  };

  // 정규화를 위한 기준값 (일반적인 얼굴 비율)
  private readonly NORMALIZATION = {
    MOUTH_OPEN_BASE: 0.05, // 입 벌림 기준 거리
    MOUTH_WIDTH_BASE: 0.06, // 입 너비 기준 거리
    EYE_OPEN_BASE: 0.02, // 눈 뜸 기준 거리
    MOUTH_CORNER_LIFT_BASE: 0.02, // 입꼬리 올림 기준 거리
  };

  constructor(options: FaceStateCalculatorOptions = {}) {
    // 초기 중립 상태
    this.previousState = {
      mouthOpen: 0,
      mouthWidth: 1,
      mouthSmile: 0,
      blinkLeft: 0,
      blinkRight: 0,
      eyeLookUp: 0,
      eyeLookDown: 0,
      eyeLookLeft: 0,
      eyeLookRight: 0,
    };

    // 스무딩 강도 (0~1, 높을수록 부드럽지만 반응이 느림)
    this.smoothingFactor = options.smoothingFactor ?? 0.7;

    // 표정 강도 멀티플라이어 (기본값: 모두 1.0)
    this.multipliers = {
      mouthOpen: options.multipliers?.mouthOpen ?? 1.0,
      mouthWidth: options.multipliers?.mouthWidth ?? 1.0,
      mouthSmile: options.multipliers?.mouthSmile ?? 1.0,
      blink: options.multipliers?.blink ?? 1.0,
      eyeLook: options.multipliers?.eyeLook ?? 1.0,
    };
  }

  /**
   * MediaPipe 랜드마크로부터 얼굴 상태를 계산합니다
   *
   * @param landmarks - MediaPipe Face Landmarker 결과 (468개 랜드마크)
   * @returns 정규화되고 스무딩된 얼굴 상태
   */
  public calculateFaceState(landmarks: Landmark[]): FaceState {
    // 랜드마크가 충분하지 않으면 이전 상태를 점진적으로 중립으로
    if (!landmarks || landmarks.length < 468) {
      return this.decayToNeutral();
    }

    try {
      // 원시 값 계산
      const rawState: FaceState = {
        mouthOpen: this.calculateMouthOpen(landmarks),
        mouthWidth: this.calculateMouthWidth(landmarks),
        mouthSmile: this.calculateMouthSmile(landmarks),
        blinkLeft: this.calculateBlink(landmarks, 'left'),
        blinkRight: this.calculateBlink(landmarks, 'right'),
        eyeLookUp: this.calculateEyeLookVertical(landmarks, 'up'),
        eyeLookDown: this.calculateEyeLookVertical(landmarks, 'down'),
        eyeLookLeft: this.calculateEyeLookHorizontal(landmarks, 'left'),
        eyeLookRight: this.calculateEyeLookHorizontal(landmarks, 'right'),
      };

      // 스무딩 적용
      const smoothedState = this.applySmoothng(rawState);

      // 이전 상태 업데이트
      this.previousState = smoothedState;

      return smoothedState;
    } catch (error) {
      console.error('[FaceStateCalculator] 계산 오류:', error);
      return this.previousState;
    }
  }

  /**
   * 입 벌림 정도 계산 (세로 거리)
   */
  private calculateMouthOpen(landmarks: Landmark[]): number {
    const upper = landmarks[this.LANDMARKS.MOUTH_UPPER];
    const lower = landmarks[this.LANDMARKS.MOUTH_LOWER];

    if (!upper || !lower) return 0;

    const distance = this.getDistance(upper, lower);
    const normalized = distance / this.NORMALIZATION.MOUTH_OPEN_BASE;

    // 멀티플라이어 적용
    return this.clamp(normalized * this.multipliers.mouthOpen, 0, 1);
  }

  /**
   * 입 너비 정도 계산 (가로 거리)
   */
  private calculateMouthWidth(landmarks: Landmark[]): number {
    const left = landmarks[this.LANDMARKS.MOUTH_LEFT];
    const right = landmarks[this.LANDMARKS.MOUTH_RIGHT];

    if (!left || !right) return 1;

    const distance = this.getDistance(left, right);
    const normalized = distance / this.NORMALIZATION.MOUTH_WIDTH_BASE;

    // 멀티플라이어 적용
    return this.clamp(normalized * this.multipliers.mouthWidth, 0, 1.5);
  }

  /**
   * 입꼬리 상승 정도 계산 (미소)
   *
   * 양쪽 입꼬리의 평균 상승 높이를 계산합니다.
   */
  private calculateMouthSmile(landmarks: Landmark[]): number {
    const leftCorner = landmarks[this.LANDMARKS.MOUTH_CORNER_LEFT];
    const rightCorner = landmarks[this.LANDMARKS.MOUTH_CORNER_RIGHT];
    const mouthCenter = landmarks[this.LANDMARKS.MOUTH_UPPER];

    if (!leftCorner || !rightCorner || !mouthCenter) return 0;

    // 입꼬리가 중앙보다 얼마나 위에 있는지 계산
    const leftLift = mouthCenter.y - leftCorner.y;
    const rightLift = mouthCenter.y - rightCorner.y;

    // 평균 상승 높이
    const averageLift = (leftLift + rightLift) / 2;

    // 정규화
    const normalized = averageLift / this.NORMALIZATION.MOUTH_CORNER_LIFT_BASE;

    // 음수는 0으로 (입꼬리가 내려간 경우) + 멀티플라이어 적용
    return this.clamp(normalized * this.multipliers.mouthSmile, 0, 1);
  }

  /**
   * 눈 깜빡임 계산
   *
   * @param side - 'left' 또는 'right'
   */
  private calculateBlink(
    landmarks: Landmark[],
    side: 'left' | 'right'
  ): number {
    const isLeft = side === 'left';
    const upper =
      landmarks[
        isLeft ? this.LANDMARKS.LEFT_EYE_UPPER : this.LANDMARKS.RIGHT_EYE_UPPER
      ];
    const lower =
      landmarks[
        isLeft ? this.LANDMARKS.LEFT_EYE_LOWER : this.LANDMARKS.RIGHT_EYE_LOWER
      ];

    if (!upper || !lower) return 0;

    const distance = this.getDistance(upper, lower);
    const normalized = distance / this.NORMALIZATION.EYE_OPEN_BASE;

    // 1 - (현재 거리 / 기준 거리) = 감김 정도
    // 눈이 완전히 열렸을 때 0, 감았을 때 1
    const blinkValue = 1 - normalized * 3;

    return this.clamp(blinkValue, 0, 1);
  }

  /**
   * 눈 상하 방향 계산
   *
   * @param direction - 'up' 또는 'down'
   */
  private calculateEyeLookVertical(
    landmarks: Landmark[],
    direction: 'up' | 'down'
  ): number {
    // 홍채 데이터가 없는 경우 기본값
    if (landmarks.length < 478) {
      // 얼굴 기울기로 추정 (대략적)
      const noseTip = landmarks[this.LANDMARKS.NOSE_TIP];
      if (!noseTip) return 0;

      const verticalPosition = noseTip.y - 0.5; // 중앙 기준

      if (direction === 'up') {
        return this.clamp(-verticalPosition * 2, 0, 1);
      } else {
        return this.clamp(verticalPosition * 2, 0, 1);
      }
    }

    // 왼쪽 눈 홍채와 눈 위/아래 비교
    const leftIris = landmarks[this.LANDMARKS.LEFT_IRIS];
    const leftUpper = landmarks[this.LANDMARKS.LEFT_EYE_UPPER];
    const leftLower = landmarks[this.LANDMARKS.LEFT_EYE_LOWER];

    if (!leftIris || !leftUpper || !leftLower) return 0;

    // 눈의 중앙 위치
    const eyeCenterY = (leftUpper.y + leftLower.y) / 2;
    const eyeHeight = Math.abs(leftUpper.y - leftLower.y);

    // 홍채가 눈 중앙으로부터 얼마나 떨어져있는지
    const offset = (leftIris.y - eyeCenterY) / eyeHeight;

    if (direction === 'up') {
      // 멀티플라이어 적용
      return this.clamp(-offset * 5 * this.multipliers.eyeLook, 0, 1);
    } else {
      // 멀티플라이어 적용
      return this.clamp(offset * 5 * this.multipliers.eyeLook, 0, 1);
    }
  }

  /**
   * 눈 좌우 방향 계산
   *
   * @param direction - 'left' 또는 'right'
   */
  private calculateEyeLookHorizontal(
    landmarks: Landmark[],
    direction: 'left' | 'right'
  ): number {
    // 홍채 데이터가 없는 경우 기본값
    if (landmarks.length < 478) {
      return 0;
    }

    // 왼쪽 눈 홍채와 눈 좌/우 비교
    const leftIris = landmarks[this.LANDMARKS.LEFT_IRIS];
    const leftLeft = landmarks[this.LANDMARKS.LEFT_EYE_LEFT];
    const leftRight = landmarks[this.LANDMARKS.LEFT_EYE_RIGHT];

    if (!leftIris || !leftLeft || !leftRight) return 0;

    // 눈의 중앙 위치
    const eyeCenterX = (leftLeft.x + leftRight.x) / 2;
    const eyeWidth = Math.abs(leftRight.x - leftLeft.x);

    // 홍채가 눈 중앙으로부터 얼마나 떨어져있는지
    const offset = (leftIris.x - eyeCenterX) / eyeWidth;

    if (direction === 'left') {
      // 멀티플라이어 적용
      return this.clamp(-offset * 5 * this.multipliers.eyeLook, 0, 1);
    } else {
      // 멀티플라이어 적용
      return this.clamp(offset * 5 * this.multipliers.eyeLook, 0, 1);
    }
  }

  /**
   * 스무딩 적용 (Lerp)
   *
   * 이전 프레임과 현재 프레임 사이를 선형 보간하여 부드러운 전환을 만듭니다.
   */
  private applySmoothng(rawState: FaceState): FaceState {
    return this.lerpFaceState(
      this.previousState,
      rawState,
      1 - this.smoothingFactor
    );
  }

  /**
   * 얼굴이 감지되지 않을 때 점진적으로 중립 상태로 돌아갑니다
   */
  private decayToNeutral(): FaceState {
    const neutralState: FaceState = {
      mouthOpen: 0,
      mouthWidth: 1,
      mouthSmile: 0,
      blinkLeft: 0,
      blinkRight: 0,
      eyeLookUp: 0,
      eyeLookDown: 0,
      eyeLookLeft: 0,
      eyeLookRight: 0,
    };

    // 천천히 중립으로 (decay factor 0.1)
    this.previousState = this.lerpFaceState(
      this.previousState,
      neutralState,
      0.1
    );

    return this.previousState;
  }

  /**
   * 두 랜드마크 간의 유클리드 거리 계산
   */
  private getDistance(p1: Landmark, p2: Landmark): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 선형 보간 (Linear Interpolation) - 숫자용
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * 선형 보간 (Linear Interpolation) - FaceState용
   */
  private lerpFaceState(a: FaceState, b: FaceState, t: number): FaceState {
    const result: Partial<FaceState> = {};
    for (const key in a) {
      const k = key as keyof FaceState;
      result[k] = this.lerp(a[k], b[k], t);
    }
    return result as FaceState;
  }

  /**
   * 값을 범위 내로 제한
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 스무딩 강도 조정
   */
  public setSmoothingFactor(factor: number): void {
    this.smoothingFactor = this.clamp(factor, 0, 1);
  }

  /**
   * 표정 강도 멀티플라이어 설정
   */
  public setMultipliers(multipliers: Partial<ExpressionMultipliers>): void {
    this.multipliers = {
      ...this.multipliers,
      ...multipliers,
    };
  }

  /**
   * 현재 멀티플라이어 값 가져오기
   */
  public getMultipliers(): ExpressionMultipliers {
    return { ...this.multipliers };
  }

  /**
   * 현재 상태 초기화
   */
  public reset(): void {
    this.previousState = {
      mouthOpen: 0,
      mouthWidth: 1,
      mouthSmile: 0,
      blinkLeft: 0,
      blinkRight: 0,
      eyeLookUp: 0,
      eyeLookDown: 0,
      eyeLookLeft: 0,
      eyeLookRight: 0,
    };
  }
}

/**
 * FaceState를 VRM 블렌드셰이프 값으로 변환하는 헬퍼 함수
 *
 * @param faceState - 계산된 얼굴 상태
 * @returns VRM 표정 매핑
 */
export function mapFaceStateToVRM(faceState: FaceState) {
  const { mouthOpen, mouthWidth, mouthSmile } = faceState;

  // 입 모양 표정 결정 (aa, ih, ou, ee, oh)
  let mouthExpression = 'neutral';
  let mouthValue = 0;

  if (mouthOpen < 0.1) {
    mouthExpression = 'neutral';
    mouthValue = 1;
  } else if (mouthOpen < 0.25) {
    mouthExpression = 'ih';
    mouthValue = (mouthOpen - 0.1) / 0.15;
  } else if (mouthOpen < 0.45) {
    if (mouthWidth > 0.6) {
      mouthExpression = 'ee';
      mouthValue = (mouthOpen - 0.25) / 0.2;
    } else {
      mouthExpression = 'ou';
      mouthValue = (mouthOpen - 0.25) / 0.2;
    }
  } else if (mouthOpen < 0.7) {
    mouthExpression = 'oh';
    mouthValue = (mouthOpen - 0.45) / 0.25;
  } else {
    mouthExpression = 'aa';
    mouthValue = Math.min(1, (mouthOpen - 0.7) / 0.3);
  }

  return {
    // 입 표정
    mouth: {
      expression: mouthExpression,
      value: mouthValue,
    },

    // 눈 깜빡임
    blink: {
      left: faceState.blinkLeft,
      right: faceState.blinkRight,
    },

    // 시선
    look: {
      up: faceState.eyeLookUp,
      down: faceState.eyeLookDown,
      left: faceState.eyeLookLeft,
      right: faceState.eyeLookRight,
    },

    // 감정 (미소)
    emotion: {
      happy: mouthSmile,
    },
  };
}

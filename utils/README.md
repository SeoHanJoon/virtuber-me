# Face State Calculator

MediaPipe Face Landmarker의 468개 랜드마크를 분석하여 VRM 블렌드셰이프에 적용 가능한 정규화된 얼굴 상태를 계산하는 유틸리티입니다.

## 특징

- 🎯 **정밀한 추적**: 입 벌림, 너비, 미소, 눈 깜빡임, 시선 방향 등 9가지 상태 추적
- 🎬 **스무딩**: 프레임 간 선형 보간으로 떨림 없는 부드러운 애니메이션
- ⚡ **성능 최적화**: 효율적인 계산으로 30fps 이상 유지
- 🔄 **자동 decay**: 얼굴 미감지 시 자동으로 중립 상태로 전환
- 📐 **정규화**: 얼굴 크기에 관계없이 일관된 값 제공

## 사용법

### 1. 기본 사용

```typescript
import { FaceStateCalculator, FaceState } from '@/utils/faceStateCalculator';

// 계산기 인스턴스 생성 (눈 깜빡임 강도를 1.5배로)
const calculator = new FaceStateCalculator({
  smoothingFactor: 0.7,
  multipliers: { blink: 1.5 },
});

// MediaPipe 결과로부터 얼굴 상태 계산
function onFaceDetected(landmarks: Array<{ x; y; z }>) {
  const faceState: FaceState = calculator.calculateFaceState(landmarks);

  console.log('입 벌림:', faceState.mouthOpen);
  console.log('미소:', faceState.mouthSmile);
  console.log('왼쪽 눈 깜빡임:', faceState.blinkLeft);
}

// 실시간 강도 조절
calculator.setMultipliers({ blink: 2.0 }); // 눈 깜빡임을 더 강하게
```

### 2. VRM 통합

```typescript
import {
  FaceStateCalculator,
  mapFaceStateToVRM,
} from '@/utils/faceStateCalculator';

const calculator = new FaceStateCalculator();

function applyToVRM(vrm: VRM, landmarks: Landmark[]) {
  // 1. 얼굴 상태 계산
  const faceState = calculator.calculateFaceState(landmarks);

  // 2. VRM 표정으로 변환
  const vrmMapping = mapFaceStateToVRM(faceState);

  // 3. VRM에 적용
  if (vrm.expressionManager) {
    // 입 표정
    vrm.expressionManager.setValue(
      vrmMapping.mouth.expression,
      vrmMapping.mouth.value
    );

    // 눈 깜빡임
    vrm.expressionManager.setValue('blinkLeft', vrmMapping.blink.left);
    vrm.expressionManager.setValue('blinkRight', vrmMapping.blink.right);

    // 시선
    vrm.expressionManager.setValue('lookUp', vrmMapping.look.up);
    vrm.expressionManager.setValue('lookDown', vrmMapping.look.down);
    vrm.expressionManager.setValue('lookLeft', vrmMapping.look.left);
    vrm.expressionManager.setValue('lookRight', vrmMapping.look.right);

    // 감정
    vrm.expressionManager.setValue('happy', vrmMapping.emotion.happy);
  }
}
```

### 3. React 훅과 함께 사용

```typescript
import { useRef, useEffect } from 'react';
import { FaceStateCalculator } from '@/utils/faceStateCalculator';

function useFaceState() {
  const calculatorRef = useRef(new FaceStateCalculator(0.7));

  const updateFaceState = (landmarks: Landmark[]) => {
    return calculatorRef.current.calculateFaceState(landmarks);
  };

  return { updateFaceState };
}
```

## API 레퍼런스

### `FaceStateCalculator`

#### Constructor

```typescript
new FaceStateCalculator(options?: FaceStateCalculatorOptions)
```

**옵션:**

```typescript
interface FaceStateCalculatorOptions {
  smoothingFactor?: number; // 스무딩 강도 (0~1, 기본: 0.7)
  multipliers?: Partial<ExpressionMultipliers>; // 표정 강도 조절
}

interface ExpressionMultipliers {
  mouthOpen: number; // 입 벌림 강도 (기본: 1.0)
  mouthWidth: number; // 입 너비 강도 (기본: 1.0)
  mouthSmile: number; // 미소 강도 (기본: 1.0)
  blink: number; // 눈 깜빡임 강도 (기본: 1.0)
  eyeLook: number; // 시선 강도 (기본: 1.0)
}
```

- `smoothingFactor`: 스무딩 강도
  - 높을수록 부드럽지만 반응이 느림
  - 낮을수록 빠르게 반응하지만 떨림 발생 가능
- `multipliers`: 각 표정의 강도를 조절
  - 1.0보다 크면 강하게, 작으면 약하게
  - VRM 모델마다 최적값이 다를 수 있음

#### Methods

##### `calculateFaceState(landmarks: Landmark[]): FaceState`

MediaPipe 랜드마크로부터 얼굴 상태를 계산합니다.

**반환값:**

```typescript
{
  mouthOpen: number,     // 0~1, 입 벌림 정도
  mouthWidth: number,    // 0~1, 입 너비 정도
  mouthSmile: number,    // 0~1, 양쪽 입꼬리 상승 정도
  blinkLeft: number,     // 0~1, 왼쪽 눈 감김 정도
  blinkRight: number,    // 0~1, 오른쪽 눈 감김 정도
  eyeLookUp: number,     // 0~1
  eyeLookDown: number,   // 0~1
  eyeLookLeft: number,   // 0~1
  eyeLookRight: number,  // 0~1
}
```

##### `setSmoothingFactor(factor: number): void`

스무딩 강도를 동적으로 조정합니다.

##### `setMultipliers(multipliers: Partial<ExpressionMultipliers>): void`

표정 강도 멀티플라이어를 동적으로 조정합니다.

**예제:**

```typescript
// 눈 깜빡임만 2배로
calculator.setMultipliers({ blink: 2.0 });

// 여러 표정 동시 조절
calculator.setMultipliers({
  blink: 1.5,
  mouthOpen: 1.2,
  mouthSmile: 0.8,
});
```

##### `getMultipliers(): ExpressionMultipliers`

현재 멀티플라이어 값을 가져옵니다.

##### `reset(): void`

현재 상태를 초기화하여 중립 상태로 돌아갑니다.

### `mapFaceStateToVRM(faceState: FaceState)`

`FaceState`를 VRM 블렌드셰이프 값으로 변환합니다.

**반환값:**

```typescript
{
  mouth: {
    expression: 'neutral' | 'aa' | 'ih' | 'ou' | 'ee' | 'oh',
    value: number
  },
  blink: {
    left: number,
    right: number
  },
  look: {
    up: number,
    down: number,
    left: number,
    right: number
  },
  emotion: {
    happy: number
  }
}
```

## 랜드마크 인덱스

MediaPipe Face Landmarker의 주요 포인트:

| 부위           | 인덱스 | 설명             |
| -------------- | ------ | ---------------- |
| 입 위          | 13     | 윗입술 중앙      |
| 입 아래        | 14     | 아랫입술 중앙    |
| 입 왼쪽        | 61     | 입 왼쪽 끝       |
| 입 오른쪽      | 291    | 입 오른쪽 끝     |
| 왼쪽 입꼬리    | 62     | 왼쪽 입꼬리      |
| 오른쪽 입꼬리  | 308    | 오른쪽 입꼬리    |
| 왼쪽 눈 위     | 159    | 왼쪽 눈 위       |
| 왼쪽 눈 아래   | 145    | 왼쪽 눈 아래     |
| 오른쪽 눈 위   | 386    | 오른쪽 눈 위     |
| 오른쪽 눈 아래 | 374    | 오른쪽 눈 아래   |
| 왼쪽 홍채      | 468    | 왼쪽 홍채 중심   |
| 오른쪽 홍채    | 473    | 오른쪽 홍채 중심 |

## 성능 최적화 팁

1. **적절한 프레임 레이트**: 30fps로 제한하여 CPU 부하 감소
2. **스무딩 조절**: 떨림이 심하면 `smoothingFactor`를 높이고, 반응이 느리면 낮춤
3. **조건부 업데이트**: 변화가 작으면 업데이트 스킵
4. **웹 워커**: 무거운 계산을 웹 워커로 분리 (선택사항)

```typescript
// 프레임 레이트 제한 예제
let lastUpdate = 0;
const FPS_LIMIT = 30;
const FRAME_INTERVAL = 1000 / FPS_LIMIT;

function animate(timestamp: number) {
  if (timestamp - lastUpdate > FRAME_INTERVAL) {
    const faceState = calculator.calculateFaceState(landmarks);
    applyToVRM(vrm, faceState);
    lastUpdate = timestamp;
  }
  requestAnimationFrame(animate);
}
```

## 문제 해결

### 떨림이 심함

- `smoothingFactor`를 0.8~0.9로 높이기
- 프레임 레이트를 30fps로 제한

### 반응이 느림

- `smoothingFactor`를 0.5~0.6으로 낮추기
- 정규화 기준값 조정

### 입 모양이 부정확

- `NORMALIZATION.MOUTH_OPEN_BASE` 값 조정 (기본: 0.05)
- `NORMALIZATION.MOUTH_WIDTH_BASE` 값 조정 (기본: 0.06)

### 눈 깜빡임이 부정확

- **권장**: `multipliers.blink` 값을 높이기 (1.5~3.0)
  ```typescript
  calculator.setMultipliers({ blink: 2.0 });
  ```
- 또는 `NORMALIZATION.EYE_OPEN_BASE` 값 조정 (기본: 0.02)
- 랜드마크 인덱스 확인 (159, 145, 386, 374)

### VRM 모델마다 반응이 다름

각 VRM 모델은 블렌드셰이프 반응 범위가 다를 수 있습니다.

**해결법:**

1. UI의 "표정 강도 조절" 버튼 클릭
2. 슬라이더로 각 표정의 강도를 실시간 조정
3. 모델에 맞는 최적값을 찾아서 사용

**일반적인 권장값:**

- 눈 깜빡임: 1.5~2.0x (VRM 모델의 눈이 잘 안 감히는 경우)
- 입 벌림: 1.0~1.5x
- 미소: 0.8~1.2x
- 시선: 0.8~1.5x

## 라이선스

MIT License

# 🎯 스마트 VRM 트래킹 시스템 가이드

## 개요

이 시스템은 **어떤 VRM 모델이든** 자연스러운 상체 움직임과 표정 트래킹이 작동하도록 설계된 Adaptive Calibration 기반 트래킹 시스템입니다.

---

## 🏗️ 시스템 아키텍처

### 1️⃣ VRM Calibration System

**파일**: `utils/vrmCalibration.ts`

VRM 모델이 로드될 때 자동으로 본 구조를 분석하고 보정 매트릭스를 생성합니다.

#### 주요 기능:

- ✅ 본(Bone) 구조 자동 스캔
- ✅ 초기 회전 및 위치 저장
- ✅ T-pose vs A-pose 자동 감지
- ✅ 모델별 보정 쿼터니언 계산
- ✅ 캐싱을 통한 재사용

#### 사용 예시:

```typescript
import { globalCalibrationManager } from '@/utils/vrmCalibration';

// VRM 로드 시 자동 호출 (useVRMScene에서)
const profile = globalCalibrationManager.calibrate(vrm, modelPath);

// 디버그 정보 확인
globalCalibrationManager.debugProfile(modelPath);

// 트래킹 회전에 보정 적용
const correctedRotation = globalCalibrationManager.applyCorrectionToTracking(
  'leftUpperArm',
  trackingEuler,
  modelPath
);
```

#### 보정 프로파일 구조:

```typescript
{
  modelId: string,
  basePoseType: 'T-pose' | 'A-pose' | 'unknown',
  initialArmAngle: number, // 팔의 초기 각도 (도)
  bones: {
    leftUpperArm: {
      initialRotation: Quaternion,
      correctionQuaternion: Quaternion,
      length: number,
      exists: boolean
    },
    // ... 다른 본들
  }
}
```

---

### 2️⃣ Advanced Face Tracking

**파일**: `utils/advancedFaceTracking.ts`

MediaPipe landmark를 기반으로 한 정밀한 얼굴 표정 추적 시스템입니다.

#### 주요 컴포넌트:

##### A. EMA Smoother (Exponential Moving Average)

```typescript
import { EMASmoother } from '@/utils/advancedFaceTracking';

const smoother = new EMASmoother(0.3); // alpha = 0.3 (부드러움)

// 값 스무딩
const smoothedValue = smoother.smooth('mouthOpen', rawValue);
```

##### B. Kalman Filter

```typescript
import { FaceStateKalmanSmoother } from '@/utils/advancedFaceTracking';

const kalmanSmoother = new FaceStateKalmanSmoother(
  0.001, // processVariance
  0.1 // measurementVariance
);

const smoothedFaceState = kalmanSmoother.smoothFaceState(rawFaceState);
```

##### C. Advanced Expression Mapper

```typescript
import { AdvancedExpressionMapper } from '@/utils/advancedFaceTracking';

const mapper = new AdvancedExpressionMapper();

// 눈썹 올림 감지
const browRaise = mapper.calculateBrowRaise(landmarks);

// 입 모양 세부 분석
const mouthShape = mapper.analyzeMouthShape(landmarks);

// VRM 표정 이벤트로 매핑
const expressions = mapper.mapToVRMExpression(mouthShape);
```

##### D. Expression Blender

```typescript
import { ExpressionBlender } from '@/utils/advancedFaceTracking';

const blender = new ExpressionBlender(0.2); // blendSpeed = 0.2

// 부드러운 표정 전환
const blendedExpressions = blender.blendTo({
  aa: 0.8,
  neutral: 0.2,
});
```

---

### 3️⃣ Body State Calculator v2

**파일**: `utils/bodyStateCalculator.ts`

Calibration 시스템이 통합된 상체 트래킹 계산기입니다.

#### 새로운 기능:

```typescript
import { BodyStateCalculator } from '@/utils/bodyStateCalculator';

const calculator = new BodyStateCalculator();

// 모델 ID 설정 (calibration 적용을 위해)
calculator.setModelId(modelPath);

// Calibration 사용 여부 설정
calculator.setUseCalibration(true);

// 상체 상태 계산 (자동으로 보정 적용됨)
const bodyState = calculator.calculateBodyState(poseLandmarks);
```

---

### 4️⃣ Tracking Debug Overlay

**파일**: `components/TrackingDebugOverlay.tsx`

실시간 트래킹 데이터와 Calibration 정보를 시각화하는 UI 컴포넌트입니다.

#### 표시 정보:

- 📊 Calibration Profile
  - Base Pose Type (T-pose/A-pose)
  - Initial Arm Angle
  - Detected Bones
- 🎯 Body Tracking (실시간)
  - 각 본의 회전값 (X, Y, Z 도 단위)
- 😊 Face Tracking (실시간)
  - Mouth Open
  - Blink Left/Right
- ⚡ FPS

#### 사용 예시:

```tsx
<TrackingDebugOverlay
  calibrationProfile={calibrationProfile}
  bodyTracking={{
    leftUpperArm: { x: 0.1, y: 0.2, z: -0.4 },
    rightUpperArm: { x: 0.1, y: -0.2, z: 0.4 },
  }}
  faceTracking={{
    mouthOpen: 0.5,
    blinkLeft: 0.0,
    blinkRight: 0.0,
  }}
  fps={60}
/>
```

---

## 🔧 통합 가이드

### Step 1: VRM 로드 시 Calibration 실행

**`hooks/useVRMScene.ts`**:

```typescript
// VRM 로드 완료 시
const calibrationProfile = globalCalibrationManager.calibrate(vrm, modelPath);
```

### Step 2: Body Calculator에 Model ID 설정

**`components/FaceTrackingVRMViewer.tsx`**:

```typescript
useEffect(() => {
  if (vrmRef.current && modelPath) {
    bodyCalculatorRef.current.setModelId(modelPath);
  }
}, [modelPath]);
```

### Step 3: Advanced Face Tracking 적용 (선택)

```typescript
// EMA Smoother 추가
const emaSmoother = new EMASmoother(0.3);

// Kalman Filter 추가
const kalmanSmoother = new FaceStateKalmanSmoother();

// 트래킹 루프에서
const rawFaceState = faceCalculator.calculateFaceState(landmarks);
const smoothedFaceState = kalmanSmoother.smoothFaceState(rawFaceState);
```

### Step 4: 디버그 UI 추가

```tsx
<TrackingDebugOverlay
  calibrationProfile={globalCalibrationManager.getProfile(modelPath)}
  bodyTracking={currentBodyTracking}
  faceTracking={currentFaceTracking}
  fps={currentFPS}
/>
```

---

## 📊 Calibration 작동 원리

### 1. 본 구조 스캔

```
VRM 모델 로드
    ↓
각 본의 초기 로컬 회전 저장
    ↓
부모 본과의 방향 벡터 계산
    ↓
본 길이 측정
```

### 2. 기준 포즈 감지

```
팔의 초기 Z축 회전값 확인
    ↓
|angle| > 70° → T-pose
20° < |angle| < 70° → A-pose
|angle| < 20° → unknown
```

### 3. 보정 쿼터니언 계산

```
목표: 모든 모델을 T-pose 기준으로 통일
    ↓
correctionQuat = targetTPose * initialRot.inverse()
    ↓
finalRot = trackingRot * correctionQuat
```

---

## 🎨 표정 매핑 전략

### 2D 입 모양 분석

```
         openness (세로)
              ↑
    'aa'      |      'oh'
    (크게)    |     (오)
              |
    ─────────┼─────────→ width (가로)
              |
    'ih'      |      'ee'
    (약간)    |     (이)
              |
    'ou' (우) |
```

### VRM Expression 매핑

| 표정        | openness | width   | roundness | 설명      |
| ----------- | -------- | ------- | --------- | --------- |
| **aa**      | > 0.7    | > 0.8   | -         | 크게 벌림 |
| **ih**      | 0.3~0.6  | < 0.7   | -         | 약간 벌림 |
| **ou**      | 0.4~0.7  | < 0.6   | > 0.6     | '우' 모양 |
| **ee**      | < 0.4    | > 0.9   | -         | '이' 모양 |
| **oh**      | > 0.6    | 0.6~0.9 | > 0.5     | '오' 모양 |
| **neutral** | < 0.2    | -       | -         | 입 닫힘   |

---

## 🐛 디버깅 팁

### 1. Calibration 확인

```typescript
// 콘솔에서
globalCalibrationManager.debugProfile(modelPath);
```

출력 예시:

```
🔍 [Calibration] 프로파일 디버그: {
  modelId: "/models/sample.vrm",
  basePose: "T-pose",
  armAngle: "85.3°",
  bones: [
    { name: "leftUpperArm", initialRotation: {...}, length: "0.234" },
    ...
  ]
}
```

### 2. 트래킹 데이터 확인

- 디버그 오버레이 UI 사용 (우측 상단 🐛 버튼)
- 실시간 회전값 및 표정 데이터 확인

### 3. 모델별 차이 비교

- 여러 VRM 모델 로드 시 Calibration Profile 비교
- 각 모델의 `basePoseType`과 `initialArmAngle` 확인

---

## 🚀 성능 최적화

### Calibration 캐싱

- 모델별로 한 번만 분석
- 재로드 시 캐시 사용
- `globalCalibrationManager.clearCache()`로 초기화 가능

### 스무딩 파라미터 조정

#### EMA Smoother:

```typescript
// alpha 값 조정 (0~1)
smoother.setAlpha(0.3); // 낮을수록 부드러움
```

#### Kalman Filter:

```typescript
new FaceStateKalmanSmoother(
  0.001, // processVariance ↓ = 더 부드러움
  0.1 // measurementVariance ↑ = 노이즈 제거 강화
);
```

---

## 📝 TODO: 향후 개선 사항

- [ ] 3D Gizmo로 본 회전 축 시각화
- [ ] 손가락 세부 트래킹 개선
- [ ] 다중 사용자 동기화 시 Calibration 공유
- [ ] 모델별 Calibration 프로파일 export/import
- [ ] Machine Learning 기반 표정 인식

---

## 🎉 결과

이 시스템을 통해:

1. ✅ **모델 독립적**: 어떤 VRM 모델이든 자동으로 보정
2. ✅ **자연스러운 움직임**: Calibration을 통한 정확한 회전 적용
3. ✅ **정밀한 표정**: Landmark 기반 세밀한 표정 추적
4. ✅ **부드러운 애니메이션**: EMA/Kalman 필터로 떨림 제거
5. ✅ **디버깅 편의성**: 실시간 데이터 시각화

---

**작성일**: 2025-10-12  
**버전**: 2.0  
**작성자**: Virtuber-Me Team

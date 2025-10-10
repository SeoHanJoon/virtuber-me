# 🎯 고급 페이셜 트래킹 기능

## 📊 MediaPipe BlendShapes 통합

MediaPipe Face Landmarker가 제공하는 **52개의 ARKit 호환 BlendShapes**를 활용하여 더욱 정밀한 표정 제어가 가능합니다.

### ✨ 주요 개선사항

#### 1. **ARKit BlendShapes 지원**

```typescript
// 52개의 표정 파라미터 실시간 감지
eyeBlinkLeft, eyeBlinkRight       // 눈 깜빡임
eyeSquintLeft, eyeSquintRight     // 눈 가늘게 뜨기
eyeWideLeft, eyeWideRight         // 눈 크게 뜨기
browInnerUp, browOuterUp          // 눈썹 올리기
jawOpen, jawForward               // 턱 움직임
mouthSmile, mouthFrown            // 미소/찡그림
mouthPucker, mouthFunnel          // 입술 오므리기
cheekPuff, cheekSquint            // 볼 부풀리기
noseSneer                         // 코 찡그리기
... 총 52개
```

#### 2. **실시간 BlendShapes 모니터** 🆕

- 화면 좌측 하단 `📊 BlendShapes` 버튼 클릭
- 활성화된 표정 상위 10개 실시간 표시
- 각 표정의 강도(0~1) 시각화
- 디버깅 및 표정 튜닝에 유용

#### 3. **얼굴 랜드마크 시각화** 🆕

- 설정 패널에서 `👁️ 랜드마크 표시` 토글
- 468개 랜드마크 실시간 오버레이
- MediaPipe 공식 스타일 적용:
  - 얼굴 윤곽: 흰색
  - 왼쪽 눈/눈썹: 초록색
  - 오른쪽 눈/눈썹: 빨간색
  - 입술: 흰색
  - 홍채: 초록/빨간색

#### 4. **향상된 표정 매핑**

기존 랜드마크 기반 방식 + BlendShapes 조합으로 더욱 정확한 표정 인식:

```typescript
// 미소 감지 (더 정확)
happiness = mouthSmile * 1.5 + cheekSquint * 0.3 + eyeSquint * 0.2;

// 놀람 감지 (새로 추가)
surprise = browUp * 0.5 + eyeWide * 0.8 + jawOpen * 0.4;

// 슬픔 감지 (새로 추가)
sadness = mouthFrown * 1.2 + browDown * 0.4 + mouthDown * 0.3;

// 화남 감지 (새로 추가)
anger = browInnerUp * 0.4 + noseSneer * 0.8 + jawForward * 0.5;
```

## 🎮 사용 방법

### 1. Face Tracking 페이지 접속

\`\`\`bash
npm run dev

# http://localhost:3000/face-tracking

\`\`\`

### 2. 우측 상단 ⚙️ 설정 열기

- 🙆 상체 추적 ON/OFF
- ✋ 손 추적 ON/OFF
- 👁️ **랜드마크 표시** ON (새로 추가)
- 표정 강도 슬라이더로 미세 조정

### 3. 좌측 하단 📊 BlendShapes 버튼 클릭

- 실시간 표정 파라미터 모니터링
- 어떤 표정이 감지되고 있는지 확인
- 임계값(0.1) 이상인 표정만 표시

## 🔬 BlendShapes 상세

### 눈 관련 (14개)

| BlendShape            | 설명      | VRM 매핑               |
| --------------------- | --------- | ---------------------- |
| eyeBlinkLeft/Right    | 눈 깜빡임 | blinkLeft/Right        |
| eyeSquintLeft/Right   | 눈 가늘게 | happy (조합)           |
| eyeWideLeft/Right     | 눈 크게   | surprised (조합)       |
| eyeLookUp/Down/In/Out | 시선 방향 | lookUp/Down/Left/Right |

### 눈썹 관련 (5개)

| BlendShape            | 설명             | VRM 매핑         |
| --------------------- | ---------------- | ---------------- |
| browInnerUp           | 눈썹 중앙 올림   | surprised, angry |
| browOuterUpLeft/Right | 눈썹 바깥쪽 올림 | surprised        |
| browDownLeft/Right    | 눈썹 내림        | sad, angry       |

### 입 관련 (23개)

| BlendShape     | 설명          | VRM 매핑 |
| -------------- | ------------- | -------- |
| jawOpen        | 턱 열기       | aa       |
| mouthSmile     | 미소          | happy    |
| mouthFrown     | 찡그림        | sad      |
| mouthPucker    | 입술 오므림   | ou       |
| mouthFunnel    | 입술 앞으로   | ou, oh   |
| mouthStretch   | 입 옆으로     | ee       |
| mouthUpperUp   | 윗입술 올림   | -        |
| mouthLowerDown | 아랫입술 내림 | -        |

### 뺨 관련 (3개)

| BlendShape            | 설명        | VRM 매핑     |
| --------------------- | ----------- | ------------ |
| cheekPuff             | 볼 부풀리기 | -            |
| cheekSquintLeft/Right | 볼 올리기   | happy (조합) |

### 코 관련 (2개)

| BlendShape          | 설명      | VRM 매핑     |
| ------------------- | --------- | ------------ |
| noseSneerLeft/Right | 코 찡그림 | angry (조합) |

### 턱 관련 (4개)

| BlendShape    | 설명      | VRM 매핑     |
| ------------- | --------- | ------------ |
| jawOpen       | 턱 열기   | aa           |
| jawForward    | 턱 앞으로 | angry (조합) |
| jawLeft/Right | 턱 좌우   | -            |

### 기타 (1개)

| BlendShape | 설명      | VRM 매핑 |
| ---------- | --------- | -------- |
| tongueOut  | 혀 내밀기 | -        |

## 📈 성능

### Before (랜드마크만 사용)

- 468개 랜드마크 → 수동 거리 계산
- 입 모양: 5가지 (aa, ih, ou, ee, oh)
- 감정: 1가지 (happy)
- 정확도: **보통**

### After (BlendShapes 활용)

- 468개 랜드마크 + 52개 BlendShapes
- 입 모양: 5가지 + 미세 조정
- 감정: 5가지 (happy, sad, angry, surprised, relaxed)
- 정확도: **높음** ⬆️
- 번들 크기: +1.85 KB (305 KB → 10.6 KB 페이지)

## 🛠️ 개발자 가이드

### 커스텀 BlendShapes 매핑

\`\`\`typescript
import { mapBlendShapesToVRM } from '@/utils/mediapipeBlendShapes';

// BlendShapes 데이터 가져오기
const result = faceLandmarker.detectForVideo(video, timestamp);
const blendShapes = result.faceBlendshapes[0];

// VRM 표정으로 변환
const vrmExpressions = mapBlendShapesToVRM(blendShapes);

// VRM에 적용
vrm.expressionManager.setValue('aa', vrmExpressions.mouth.aa);
vrm.expressionManager.setValue('happy', vrmExpressions.emotion.happy);
\`\`\`

### 새로운 감정 추가

\`\`\`typescript
// utils/mediapipeBlendShapes.ts

function calculateCustomEmotion(shapes: Record<string, number>): number {
const feature1 = shapes.someBlendShape || 0;
const feature2 = shapes.anotherBlendShape || 0;

return Math.min(feature1 _ 0.5 + feature2 _ 0.5, 1.0);
}
\`\`\`

## 🐛 문제 해결

### BlendShapes 모니터가 보이지 않아요

- 웹캠이 제대로 초기화되었는지 확인
- 얼굴이 화면에 나타나는지 확인
- 임계값을 낮춰보세요 (기본 0.1)

### 랜드마크가 표시되지 않아요

- 설정 패널에서 `👁️ 랜드마크 표시` 토글 ON
- 브라우저 성능 문제일 수 있음 (468개 점 그리기)
- 다른 추적 기능을 OFF 해보세요

### 표정이 과하게 반응해요

- 설정 패널의 표정 강도 슬라이더 조절
- `utils/mediapipeBlendShapes.ts`에서 multiplier 값 수정
- VRM 모델에 따라 반응이 다를 수 있음

## 📚 참고 자료

- [MediaPipe Face Landmarker](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)
- [ARKit BlendShapes](https://developer.apple.com/documentation/arkit/arfaceanchor/blendshapelocation)
- [VRM Specifications](https://github.com/vrm-c/vrm-specification)

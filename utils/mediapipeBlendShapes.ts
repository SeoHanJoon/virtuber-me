/**
 * MediaPipe BlendShapes 매핑 유틸리티
 *
 * MediaPipe Face Landmarker는 52개의 ARKit 호환 BlendShapes를 제공합니다.
 * 이를 VRM 표정으로 정확하게 매핑합니다.
 */

export interface BlendShapeCategoryData {
  categoryName: string;
  displayName?: string;
  score: number;
}

export interface BlendShapesData {
  categories: BlendShapeCategoryData[];
}

/**
 * MediaPipe BlendShapes를 VRM 표정으로 매핑
 */
export function mapBlendShapesToVRM(blendShapes: BlendShapesData) {
  if (!blendShapes?.categories?.length) {
    return null;
  }

  // BlendShapes를 객체로 변환 (빠른 접근을 위해)
  const shapes: Record<string, number> = {};
  blendShapes.categories.forEach((category) => {
    shapes[category.categoryName] = category.score;
  });

  // VRM 표정 매핑
  return {
    // 입 모양 (더 정확한 매핑)
    mouth: {
      neutral: calculateNeutral(shapes),
      aa: Math.max(shapes.jawOpen || 0, shapes.mouthOpen || 0) * 1.2, // 입 크게 벌림
      ih: (shapes.mouthSmile || 0) * 0.6, // 이 발음
      ou: shapes.mouthFunnel || 0, // 오 발음 (입술을 앞으로)
      ee: (shapes.mouthStretch || 0) * 1.1, // 이 발음 (입 옆으로)
      oh: Math.min(
        (shapes.jawOpen || 0) * 0.5 + (shapes.mouthFunnel || 0) * 0.5,
        1.0
      ), // 오 발음
    },

    // 눈 깜빡임 (더 정밀)
    blink: {
      left: Math.max(
        shapes.eyeBlinkLeft || 0,
        (shapes.eyeSquintLeft || 0) * 0.5
      ),
      right: Math.max(
        shapes.eyeBlinkRight || 0,
        (shapes.eyeSquintRight || 0) * 0.5
      ),
    },

    // 시선 (ARKit 방식)
    look: {
      up: shapes.eyeLookUpLeft || 0,
      down: shapes.eyeLookDownLeft || 0,
      left: shapes.eyeLookInLeft || 0,
      right: shapes.eyeLookOutLeft || 0,
    },

    // 감정 표현 (미세한 표정)
    emotion: {
      happy: calculateHappiness(shapes),
      sad: calculateSadness(shapes),
      angry: calculateAnger(shapes),
      surprised: calculateSurprise(shapes),
      relaxed: calculateRelaxed(shapes),
    },

    // 눈썹 (추가)
    eyebrow: {
      leftUp: shapes.browInnerUp || 0,
      rightUp: shapes.browInnerUp || 0,
      leftDown: shapes.browDownLeft || 0,
      rightDown: shapes.browDownRight || 0,
    },

    // 뺨 (추가)
    cheek: {
      puff: Math.max(shapes.cheekPuff || 0, 0),
      squint:
        ((shapes.cheekSquintLeft || 0) + (shapes.cheekSquintRight || 0)) / 2,
    },

    // 입술 세부 표현 (추가)
    lips: {
      pucker: shapes.mouthPucker || 0,
      funnel: shapes.mouthFunnel || 0,
      stretch: shapes.mouthStretch || 0,
      upperUp: shapes.mouthUpperUpLeft || 0,
      lowerDown: shapes.mouthLowerDownLeft || 0,
    },
  };
}

/**
 * 중립 표정 계산 (모든 표정이 낮을 때)
 */
function calculateNeutral(shapes: Record<string, number>): number {
  const expressiveness =
    (shapes.jawOpen || 0) +
    (shapes.mouthSmile || 0) +
    (shapes.mouthFrown || 0) +
    (shapes.mouthPucker || 0) +
    (shapes.mouthFunnel || 0);

  // 표정이 없을수록 neutral이 높음
  return Math.max(0, 1 - expressiveness * 2);
}

/**
 * 행복 감정 계산
 */
function calculateHappiness(shapes: Record<string, number>): number {
  const smile = (shapes.mouthSmile || 0) * 1.5;
  const cheekRaise =
    ((shapes.cheekSquintLeft || 0) + (shapes.cheekSquintRight || 0)) / 2;
  const eyeSmile =
    ((shapes.eyeSquintLeft || 0) + (shapes.eyeSquintRight || 0)) / 2;

  return Math.min(smile + cheekRaise * 0.3 + eyeSmile * 0.2, 1.0);
}

/**
 * 슬픔 감정 계산
 */
function calculateSadness(shapes: Record<string, number>): number {
  const frown = (shapes.mouthFrown || 0) * 1.2;
  const browDown =
    ((shapes.browDownLeft || 0) + (shapes.browDownRight || 0)) / 2;
  const mouthDown =
    ((shapes.mouthLowerDownLeft || 0) + (shapes.mouthLowerDownRight || 0)) / 2;

  return Math.min(frown + browDown * 0.4 + mouthDown * 0.3, 1.0);
}

/**
 * 화남 감정 계산
 */
function calculateAnger(shapes: Record<string, number>): number {
  const browInner = shapes.browInnerUp || 0;
  const noseSneer =
    ((shapes.noseSneerLeft || 0) + (shapes.noseSneerRight || 0)) / 2;
  const jawForward = shapes.jawForward || 0;

  return Math.min(browInner * 0.4 + noseSneer * 0.8 + jawForward * 0.5, 1.0);
}

/**
 * 놀람 감정 계산
 */
function calculateSurprise(shapes: Record<string, number>): number {
  const browUp = shapes.browOuterUpLeft || 0;
  const eyeWide = ((shapes.eyeWideLeft || 0) + (shapes.eyeWideRight || 0)) / 2;
  const jawOpen = (shapes.jawOpen || 0) * 0.7;

  return Math.min(browUp * 0.5 + eyeWide * 0.8 + jawOpen * 0.4, 1.0);
}

/**
 * 편안함 감정 계산
 */
function calculateRelaxed(shapes: Record<string, number>): number {
  const eyeSquint =
    ((shapes.eyeSquintLeft || 0) + (shapes.eyeSquintRight || 0)) / 2;
  const mouthSmile = (shapes.mouthSmile || 0) * 0.3;

  // 약간 눈을 가늘게 뜨고 살짝 미소
  return Math.min(eyeSquint * 0.7 + mouthSmile, 1.0);
}

/**
 * BlendShapes 데이터를 사람이 읽기 쉬운 형태로 포맷
 */
export function formatBlendShapesForDisplay(
  blendShapes: BlendShapesData,
  threshold = 0.1
): Array<{ name: string; value: number }> {
  if (!blendShapes?.categories?.length) {
    return [];
  }

  return blendShapes.categories
    .filter((category) => category.score > threshold)
    .sort((a, b) => b.score - a.score)
    .map((category) => ({
      name: category.displayName || category.categoryName,
      value: Math.round(category.score * 100) / 100,
    }));
}

/**
 * 주요 BlendShapes 카테고리 (52개)
 */
export const BLEND_SHAPE_CATEGORIES = [
  // 눈 깜빡임
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',

  // 시선
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',

  // 눈썹
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',

  // 턱
  'jawForward',
  'jawLeft',
  'jawRight',
  'jawOpen',

  // 입
  'mouthClose',
  'mouthFunnel',
  'mouthPucker',
  'mouthLeft',
  'mouthRight',
  'mouthSmile',
  'mouthFrown',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthStretch',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',

  // 뺨
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',

  // 코
  'noseSneerLeft',
  'noseSneerRight',

  // 혀
  'tongueOut',
] as const;

export type BlendShapeCategory = (typeof BLEND_SHAPE_CATEGORIES)[number];

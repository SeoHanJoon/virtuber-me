/**
 * 얼굴 랜드마크를 VRM 표정으로 매핑하는 훅
 *
 * MediaPipe의 얼굴 추적 데이터를 VRM 표정 이벤트와
 * 블렌드셰이프 값으로 변환합니다.
 */

import { useMemo } from 'react';
import type { FaceLandmarks, VRMExpression } from '../types/tracking';

/**
 * 표정 매핑 훅
 */
export function useExpressionMapping(
  landmarks: FaceLandmarks | null
): VRMExpression {
  return useMemo(() => {
    if (!landmarks) {
      // 기본 neutral 상태
      return {
        name: 'neutral',
        values: {
          neutral: 1,
          aa: 0,
          ih: 0,
          ou: 0,
          ee: 0,
          oh: 0,
          blink: 0,
          blinkLeft: 0,
          blinkRight: 0,
          happy: 0,
          angry: 0,
          sad: 0,
          relaxed: 0,
          lookUp: 0,
          lookDown: 0,
          lookLeft: 0,
          lookRight: 0,
        },
        mood: 'neutral',
      };
    }

    // 눈 깜빡임 계산
    const blinkLeft = Math.max(0, 1 - landmarks.eyes.leftOpen * 3);
    const blinkRight = Math.max(0, 1 - landmarks.eyes.rightOpen * 3);
    const blink = (blinkLeft + blinkRight) / 2;

    // 입 모양 계산
    const mouthOpenness = landmarks.mouth.openness;
    const mouthWidth = landmarks.mouth.width;

    // 입 모양에 따른 발음 표정
    let aa = 0;
    let ih = 0;
    let ou = 0;
    let ee = 0;
    let oh = 0;
    let neutral = 0;

    if (mouthOpenness < 0.15) {
      // 입 거의 닫힘
      neutral = 1;
    } else if (mouthOpenness < 0.3) {
      // 살짝 벌림 - 'ih' 발음
      ih = (mouthOpenness - 0.15) / 0.15;
    } else if (mouthOpenness < 0.5) {
      // 중간 벌림 - 'ee' 또는 'ou'
      if (mouthWidth > 0.6) {
        // 입이 넓음 - 'ee' (웃는 모양)
        ee = (mouthOpenness - 0.3) / 0.2;
      } else {
        // 입이 좁음 - 'ou' (동그란 모양)
        ou = (mouthOpenness - 0.3) / 0.2;
      }
    } else if (mouthOpenness < 0.7) {
      // 많이 벌림 - 'oh'
      oh = (mouthOpenness - 0.5) / 0.2;
    } else {
      // 크게 벌림 - 'aa'
      aa = Math.min(1, (mouthOpenness - 0.7) / 0.3);
    }

    // 감정 상태 추론
    const eyebrowAvg =
      (landmarks.eyebrows.leftRaise + landmarks.eyebrows.rightRaise) / 2;

    let happy = 0;
    let sad = 0;
    let angry = 0;
    let relaxed = 0;
    let mood: 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed' = 'neutral';

    // 웃는 표정 (입이 넓고 눈썹이 올라감)
    if (mouthWidth > 0.65 && eyebrowAvg > 0.3) {
      happy = Math.min(1, (mouthWidth - 0.65) / 0.25);
      mood = 'happy';
    }
    // 슬픈 표정 (입 모서리가 내려가고 눈썹이 처짐)
    else if (mouthWidth < 0.45 && eyebrowAvg < 0.2 && mouthOpenness < 0.2) {
      sad = Math.min(1, (0.45 - mouthWidth) / 0.2);
      mood = 'sad';
    }
    // 화난 표정 (눈썹이 찌푸려짐)
    else if (eyebrowAvg < 0.1 && blink < 0.3) {
      angry = Math.min(1, (0.1 - eyebrowAvg) * 5);
      mood = 'angry';
    }
    // 편안한 표정 (눈이 살짝 감기고 입이 약간 벌림)
    else if (blink > 0.2 && blink < 0.6 && mouthOpenness < 0.2) {
      relaxed = Math.min(1, blink * 1.5);
      mood = 'relaxed';
    }

    // 시선 방향
    const pitch = landmarks.headRotation.pitch;
    const yaw = landmarks.headRotation.yaw;

    const lookUp = Math.max(0, Math.min(1, -pitch * 2));
    const lookDown = Math.max(0, Math.min(1, pitch * 2));
    const lookLeft = Math.max(0, Math.min(1, -yaw * 2));
    const lookRight = Math.max(0, Math.min(1, yaw * 2));

    // 현재 가장 강한 표정 결정
    let primaryExpression: string = 'neutral';
    let maxValue = neutral;

    const expressionValues = {
      aa,
      ih,
      ou,
      ee,
      oh,
      happy,
      sad,
      angry,
      relaxed,
      blink,
    };

    Object.entries(expressionValues).forEach(([name, value]) => {
      if (value > maxValue && value > 0.3) {
        maxValue = value;
        primaryExpression = name;
      }
    });

    return {
      name: primaryExpression,
      values: {
        neutral,
        aa,
        ih,
        ou,
        ee,
        oh,
        blink,
        blinkLeft,
        blinkRight,
        happy,
        angry,
        sad,
        relaxed,
        lookUp,
        lookDown,
        lookLeft,
        lookRight,
      },
      mood,
    };
  }, [landmarks]);
}

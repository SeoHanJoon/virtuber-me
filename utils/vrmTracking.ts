import { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { FaceStateCalculator, mapFaceStateToVRM } from './faceStateCalculator';
import { BodyStateCalculator } from './bodyStateCalculator';

/**
 * 얼굴 추적 데이터를 VRM 아바타에 적용
 */
export function applyFaceTrackingToVRM(
  vrm: VRM,
  landmarks: Array<{ x: number; y: number; z: number }>,
  calculator: FaceStateCalculator,
  invertPitch: boolean
) {
  if (!landmarks || landmarks.length === 0) return;
  if (!vrm.expressionManager) return;

  // 1. FaceStateCalculator로 얼굴 상태 계산
  const faceState = calculator.calculateFaceState(landmarks);

  // 2. VRM 블렌드셰이프로 변환
  const vrmMapping = mapFaceStateToVRM(faceState);

  // 3. VRM에 적용

  // 3-1. 입 표정 (블렌딩 방식)
  Object.entries(vrmMapping.mouth).forEach(([expression, value]) => {
    try {
      if (value > 0.01) {
        vrm.expressionManager?.setValue(
          expression as VRMExpressionPresetName,
          value as number
        );
      } else {
        vrm.expressionManager?.setValue(
          expression as VRMExpressionPresetName,
          0
        );
      }
    } catch {
      // 표정이 없는 경우 무시
    }
  });

  // 3-2. 눈 깜빡임
  try {
    vrm.expressionManager.setValue(
      'blinkLeft' as VRMExpressionPresetName,
      vrmMapping.blink.left
    );
    vrm.expressionManager.setValue(
      'blinkRight' as VRMExpressionPresetName,
      vrmMapping.blink.right
    );
  } catch {
    // 표정이 없는 경우 무시
  }

  // 3-3. 시선 방향
  try {
    vrm.expressionManager.setValue(
      'lookUp' as VRMExpressionPresetName,
      vrmMapping.look.up
    );
    vrm.expressionManager.setValue(
      'lookDown' as VRMExpressionPresetName,
      vrmMapping.look.down
    );
    vrm.expressionManager.setValue(
      'lookLeft' as VRMExpressionPresetName,
      vrmMapping.look.left
    );
    vrm.expressionManager.setValue(
      'lookRight' as VRMExpressionPresetName,
      vrmMapping.look.right
    );
  } catch {
    // 표정이 없는 경우 무시
  }

  // 3-4. 감정 (미소)
  try {
    vrm.expressionManager.setValue(
      'happy' as VRMExpressionPresetName,
      vrmMapping.emotion.happy
    );
  } catch {
    // 표정이 없는 경우 무시
  }

  // 4. 머리 회전 적용
  if (vrm.humanoid) {
    const head = vrm.humanoid.getNormalizedBoneNode('head');
    if (head && landmarks.length > 454) {
      const noseTip = landmarks[1];
      const leftCheek = landmarks[234];
      const rightCheek = landmarks[454];

      // Yaw (좌우 회전)
      const yaw =
        Math.atan2(rightCheek.x - leftCheek.x, rightCheek.z - leftCheek.z) -
        Math.PI / 2;

      // Pitch (위아래 회전)
      let pitch = (noseTip.y - 0.5) * 1.5;
      if (invertPitch) {
        pitch = -pitch;
      }

      // Roll (기울임)
      const roll =
        Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x) *
        0.5;

      // 부드럽게 적용 (Lerp)
      const smoothFactor = 0.3;
      head.rotation.y += (yaw - head.rotation.y) * smoothFactor;
      head.rotation.x += (pitch - head.rotation.x) * smoothFactor;
      head.rotation.z += (roll - head.rotation.z) * smoothFactor;
    }
  }
}

/**
 * 상체 추적 데이터를 VRM 아바타에 적용
 */
export function applyBodyTrackingToVRM(
  vrm: VRM,
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
  calculator: BodyStateCalculator
) {
  if (!landmarks || landmarks.length === 0) return;
  if (!vrm.humanoid) return;

  // console.log(JSON.stringify(landmarks));
  const sample = [
    {
      x: 0.48966044187545776,
      y: 0.6560090780258179,
      z: -0.621451735496521,
      visibility: 0.999847948551178,
    },
    {
      x: 0.5037058591842651,
      y: 0.6093168258666992,
      z: -0.5393527150154114,
      visibility: 0.999738335609436,
    },
    {
      x: 0.5136070847511292,
      y: 0.6094709634780884,
      z: -0.5382506847381592,
      visibility: 0.9996285438537598,
    },
    {
      x: 0.5235084891319275,
      y: 0.6094459295272827,
      z: -0.5372899174690247,
      visibility: 0.9996142983436584,
    },
    {
      x: 0.4716590940952301,
      y: 0.6084660291671753,
      z: -0.5811365842819214,
      visibility: 0.9999089241027832,
    },
    {
      x: 0.45806461572647095,
      y: 0.608701765537262,
      z: -0.5817290544509888,
      visibility: 0.9999043345451355,
    },
    {
      x: 0.4441566467285156,
      y: 0.6092215776443481,
      z: -0.5816441178321838,
      visibility: 0.9999232888221741,
    },
    {
      x: 0.5288812518119812,
      y: 0.6256092190742493,
      z: -0.14178907871246338,
      visibility: 0.9994593858718872,
    },
    {
      x: 0.41862043738365173,
      y: 0.6325917840003967,
      z: -0.31335723400115967,
      visibility: 0.9999362230300903,
    },
    {
      x: 0.508261501789093,
      y: 0.700303852558136,
      z: -0.4729836881160736,
      visibility: 0.9996870756149292,
    },
    {
      x: 0.4653724133968353,
      y: 0.700898289680481,
      z: -0.5237786173820496,
      visibility: 0.9998742938041687,
    },
    {
      x: 0.615635871887207,
      y: 0.8073131442070007,
      z: -0.02383851632475853,
      visibility: 0.999295711517334,
    },
    {
      x: 0.32733431458473206,
      y: 0.8919907808303833,
      z: -0.2634558081626892,
      visibility: 0.9996129274368286,
    },
    {
      x: 0.6751848459243774,
      y: 0.5009157657623291,
      z: -0.28060898184776306,
      visibility: 0.9371757507324219,
    },
    {
      x: 0.256862074136734,
      y: 1.2340900897979736,
      z: -0.3778010904788971,
      visibility: 0.5233672261238098,
    },
    {
      x: 0.6868232488632202,
      y: 0.11997289210557938,
      z: -0.6812040209770203,
      visibility: 0.9970511198043823,
    },
    {
      x: 0.27394554018974304,
      y: 1.5650877952575684,
      z: -0.6576918363571167,
      visibility: 0.20819520950317383,
    },
    {
      x: 0.684343695640564,
      y: -0.0011962360003963113,
      z: -0.8350305557250977,
      visibility: 0.9926567673683167,
    },
    {
      x: 0.24837274849414825,
      y: 1.682019591331482,
      z: -0.7534530162811279,
      visibility: 0.20188644528388977,
    },
    {
      x: 0.6646954417228699,
      y: -0.022360362112522125,
      z: -0.7825304269790649,
      visibility: 0.9918350577354431,
    },
    {
      x: 0.2966153025627136,
      y: 1.6931750774383545,
      z: -0.819388747215271,
      visibility: 0.3027287423610687,
    },
    {
      x: 0.6620039939880371,
      y: 0.028514934703707695,
      z: -0.7047320008277893,
      visibility: 0.9943084120750427,
    },
    {
      x: 0.313888818025589,
      y: 1.649343490600586,
      z: -0.705297589302063,
      visibility: 0.2749161720275879,
    },
    {
      x: 0.5873211622238159,
      y: 1.5158822536468506,
      z: 0.13153336942195892,
      visibility: 0.011596162803471088,
    },
    {
      x: 0.3980831503868103,
      y: 1.5547879934310913,
      z: -0.12327118217945099,
      visibility: 0.008319788612425327,
    },
    {
      x: 0.6446875333786011,
      y: 2.1665890216827393,
      z: -0.15967175364494324,
      visibility: 0.007731172256171703,
    },
    {
      x: 0.41917458176612854,
      y: 2.1918671131134033,
      z: -0.2046000212430954,
      visibility: 0.010526709258556366,
    },
    {
      x: 0.6184029579162598,
      y: 2.688878059387207,
      z: 0.45111513137817383,
      visibility: 0.00904918648302555,
    },
    {
      x: 0.4145142138004303,
      y: 2.739647388458252,
      z: 0.016169272363185883,
      visibility: 0.008318920619785786,
    },
    {
      x: 0.6054279804229736,
      y: 2.758767604827881,
      z: 0.5148859620094299,
      visibility: 0.012652360834181309,
    },
    {
      x: 0.40063557028770447,
      y: 2.8189523220062256,
      z: 0.031752511858940125,
      visibility: 0.013844533823430538,
    },
    {
      x: 0.6412855982780457,
      y: 2.854297161102295,
      z: 0.234660342335701,
      visibility: 0.008073129691183567,
    },
    {
      x: 0.49191445112228394,
      y: 2.891028881072998,
      z: -0.3652014136314392,
      visibility: 0.00925200991332531,
    },
  ];

  const bodyState = calculator.calculateBodyState(landmarks);
  console.log('bodyState', bodyState);
  if (!bodyState) return;

  const smoothFactor = 0.2;

  // degree → radian 변환 상수 (bodyState는 degree 단위)
  const DEG_TO_RAD = Math.PI / 180;

  // 척추
  const spine = vrm.humanoid.getNormalizedBoneNode('spine');
  if (spine) {
    const targetX = bodyState.spine.x * DEG_TO_RAD;
    const targetZ = bodyState.spine.z * DEG_TO_RAD;
    spine.rotation.x += (targetX - spine.rotation.x) * smoothFactor;
    spine.rotation.z += (targetZ - spine.rotation.z) * smoothFactor;
  }

  // 가슴
  const chest = vrm.humanoid.getNormalizedBoneNode('chest');
  if (chest) {
    const targetX = bodyState.chest.x * DEG_TO_RAD;
    const targetZ = bodyState.chest.z * DEG_TO_RAD;
    chest.rotation.x += (targetX - chest.rotation.x) * smoothFactor;
    chest.rotation.z += (targetZ - chest.rotation.z) * smoothFactor;
  }

  // 왼팔
  const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
  if (leftUpperArm) {
    // bodyState는 degree 단위이므로 라디안으로 변환
    const targetX = bodyState.leftUpperArm.x * DEG_TO_RAD;
    const targetY = bodyState.leftUpperArm.y * DEG_TO_RAD;
    const targetZ = bodyState.leftUpperArm.z * DEG_TO_RAD;

    leftUpperArm.rotation.x +=
      (targetX - leftUpperArm.rotation.x) * smoothFactor;
    leftUpperArm.rotation.y +=
      (targetY - leftUpperArm.rotation.y) * smoothFactor;
    leftUpperArm.rotation.z +=
      (targetZ - leftUpperArm.rotation.z) * smoothFactor;
  }

  const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
  if (leftLowerArm) {
    const targetX = bodyState.leftLowerArm.x * DEG_TO_RAD;
    leftLowerArm.rotation.x +=
      (targetX - leftLowerArm.rotation.x) * smoothFactor;
  }

  // 오른팔
  const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
  if (rightUpperArm) {
    const targetX = bodyState.rightUpperArm.x * DEG_TO_RAD;
    const targetY = bodyState.rightUpperArm.y * DEG_TO_RAD;
    const targetZ = bodyState.rightUpperArm.z * DEG_TO_RAD;

    rightUpperArm.rotation.x +=
      (targetX - rightUpperArm.rotation.x) * smoothFactor;
    rightUpperArm.rotation.y +=
      (targetY - rightUpperArm.rotation.y) * smoothFactor;
    rightUpperArm.rotation.z +=
      (targetZ - rightUpperArm.rotation.z) * smoothFactor;
  }

  const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
  if (rightLowerArm) {
    const targetX = bodyState.rightLowerArm.x * DEG_TO_RAD;
    rightLowerArm.rotation.x +=
      (targetX - rightLowerArm.rotation.x) * smoothFactor;
  }
}

/**
 * 손 추적 데이터를 VRM 아바타에 적용
 */
export function applyHandTrackingToVRM(
  vrm: VRM,
  landmarks: Array<Array<{ x: number; y: number; z: number }>>,
  handednesses: Array<Array<{ categoryName: string }>>,
  calculator: BodyStateCalculator
) {
  if (!landmarks || landmarks.length === 0) return;
  if (!vrm.humanoid) return;

  // 왼손과 오른손 랜드마크 분리
  let leftHandLandmarks = null;
  let rightHandLandmarks = null;

  for (let i = 0; i < landmarks.length; i++) {
    const handedness = handednesses[i]?.[0]?.categoryName;
    if (handedness === 'Left') {
      leftHandLandmarks = landmarks[i];
    } else if (handedness === 'Right') {
      rightHandLandmarks = landmarks[i];
    }
  }

  const handState = calculator.calculateHandState(
    leftHandLandmarks,
    rightHandLandmarks
  );

  const smoothFactor = 0.3;

  // 왼손 손가락
  const leftThumb = vrm.humanoid.getNormalizedBoneNode('leftThumbProximal');
  if (leftThumb) {
    leftThumb.rotation.z +=
      (handState.leftThumb * 0.5 - leftThumb.rotation.z) * smoothFactor;
  }

  const leftIndex = vrm.humanoid.getNormalizedBoneNode('leftIndexProximal');
  if (leftIndex) {
    leftIndex.rotation.z +=
      (handState.leftIndex * 0.5 - leftIndex.rotation.z) * smoothFactor;
  }

  const leftMiddle = vrm.humanoid.getNormalizedBoneNode('leftMiddleProximal');
  if (leftMiddle) {
    leftMiddle.rotation.z +=
      (handState.leftMiddle * 0.5 - leftMiddle.rotation.z) * smoothFactor;
  }

  // 오른손 손가락
  const rightThumb = vrm.humanoid.getNormalizedBoneNode('rightThumbProximal');
  if (rightThumb) {
    rightThumb.rotation.z +=
      (handState.rightThumb * -0.5 - rightThumb.rotation.z) * smoothFactor;
  }

  const rightIndex = vrm.humanoid.getNormalizedBoneNode('rightIndexProximal');
  if (rightIndex) {
    rightIndex.rotation.z +=
      (handState.rightIndex * -0.5 - rightIndex.rotation.z) * smoothFactor;
  }

  const rightMiddle = vrm.humanoid.getNormalizedBoneNode('rightMiddleProximal');
  if (rightMiddle) {
    rightMiddle.rotation.z +=
      (handState.rightMiddle * -0.5 - rightMiddle.rotation.z) * smoothFactor;
  }
}

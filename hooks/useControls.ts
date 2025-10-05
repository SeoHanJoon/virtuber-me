/**
 * WASD 키보드 입력 제어 훅
 *
 * WASD 키로 캐릭터를 이동시키고, 마우스로 방향을 제어합니다.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

/**
 * 입력 상태
 */
interface InputState {
  forward: boolean; // W
  backward: boolean; // S
  left: boolean; // A
  right: boolean; // D
  shift: boolean; // Shift (달리기)
  space: boolean; // Space (점프, 미구현)
}

/**
 * 이동 상태
 */
export interface MovementState {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  velocity: THREE.Vector3;
}

/**
 * 훅 옵션
 */
export interface UseControlsOptions {
  // 이동 속도
  moveSpeed?: number; // 기본값: 5
  sprintSpeed?: number; // 기본값: 10 (Shift)

  // 회전 속도
  rotationSpeed?: number; // 기본값: 0.002

  // 초기 위치
  initialPosition?: THREE.Vector3;

  // 경계 (맵 크기)
  bounds?: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

/**
 * 훅 반환 타입
 */
export interface UseControlsReturn {
  // 현재 이동 상태
  movement: MovementState;

  // 입력 상태 (디버깅용)
  input: InputState;

  // 수동 위치 설정
  setPosition: (position: THREE.Vector3) => void;
  setRotation: (rotation: THREE.Quaternion) => void;
}

/**
 * WASD 컨트롤 훅
 */
export function useControls(
  options: UseControlsOptions = {}
): UseControlsReturn {
  const {
    moveSpeed = 5,
    sprintSpeed = 10,
    rotationSpeed = 0.002,
    initialPosition = new THREE.Vector3(0, 0, 0),
    bounds,
  } = options;

  // 입력 상태
  const [input, setInput] = useState<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false,
    space: false,
  });

  // 이동 상태
  const [movement, setMovement] = useState<MovementState>({
    position: initialPosition.clone(),
    rotation: new THREE.Quaternion(),
    velocity: new THREE.Vector3(),
  });

  const inputRef = useRef<InputState>(input);
  const movementRef = useRef<MovementState>(movement);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const mouseXRef = useRef<number>(0);

  // Ref 동기화
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    movementRef.current = movement;
  }, [movement]);

  /**
   * 키보드 이벤트 리스너
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      setInput((prev) => {
        const next = { ...prev };

        switch (key) {
          case 'w':
            next.forward = true;
            break;
          case 's':
            next.backward = true;
            break;
          case 'a':
            next.left = true;
            break;
          case 'd':
            next.right = true;
            break;
          case 'shift':
            next.shift = true;
            break;
          case ' ':
            next.space = true;
            break;
        }

        return next;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      setInput((prev) => {
        const next = { ...prev };

        switch (key) {
          case 'w':
            next.forward = false;
            break;
          case 's':
            next.backward = false;
            break;
          case 'a':
            next.left = false;
            break;
          case 'd':
            next.right = false;
            break;
          case 'shift':
            next.shift = false;
            break;
          case ' ':
            next.space = false;
            break;
        }

        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  /**
   * 마우스 이동 이벤트 (카메라 회전)
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseXRef.current += e.movementX * rotationSpeed;
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [rotationSpeed]);

  /**
   * 이동 업데이트 루프
   */
  useEffect(() => {
    const updateMovement = () => {
      const now = performance.now();
      const delta = Math.min((now - lastTimeRef.current) / 1000, 0.1); // 최대 0.1초
      lastTimeRef.current = now;

      const currentInput = inputRef.current;
      const currentMovement = movementRef.current;

      // 이동 속도 결정
      const speed = currentInput.shift ? sprintSpeed : moveSpeed;

      // 이동 방향 계산
      const direction = new THREE.Vector3();

      if (currentInput.forward) direction.z -= 1;
      if (currentInput.backward) direction.z += 1;
      if (currentInput.left) direction.x -= 1;
      if (currentInput.right) direction.x += 1;

      // 정규화 (대각선 이동 속도 보정)
      if (direction.length() > 0) {
        direction.normalize();
      }

      // 회전 적용 (Y축 회전만 사용)
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), mouseXRef.current);
      direction.applyQuaternion(rotation);

      // 속도 계산
      const velocity = direction.multiplyScalar(speed * delta);

      // 새 위치 계산
      const newPosition = currentMovement.position.clone().add(velocity);

      // 경계 체크
      if (bounds) {
        newPosition.x = Math.max(
          bounds.minX,
          Math.min(bounds.maxX, newPosition.x)
        );
        newPosition.z = Math.max(
          bounds.minZ,
          Math.min(bounds.maxZ, newPosition.z)
        );
      }

      // 상태 업데이트
      setMovement({
        position: newPosition,
        rotation: rotation,
        velocity: velocity,
      });

      animationFrameRef.current = requestAnimationFrame(updateMovement);
    };

    animationFrameRef.current = requestAnimationFrame(updateMovement);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [moveSpeed, sprintSpeed, bounds]);

  /**
   * 수동 위치 설정
   */
  const setPosition = useCallback((position: THREE.Vector3) => {
    setMovement((prev) => ({
      ...prev,
      position: position.clone(),
    }));
  }, []);

  /**
   * 수동 회전 설정
   */
  const setRotation = useCallback((rotation: THREE.Quaternion) => {
    setMovement((prev) => ({
      ...prev,
      rotation: rotation.clone(),
    }));
  }, []);

  return {
    movement,
    input,
    setPosition,
    setRotation,
  };
}

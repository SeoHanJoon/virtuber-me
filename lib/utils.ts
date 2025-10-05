/**
 * 클래스명을 조건부로 결합하는 유틸리티 함수
 * @param classes - 결합할 클래스명 배열
 * @returns 결합된 클래스명 문자열
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 문자열을 첫 글자만 대문자로 변환
 * @param str - 변환할 문자열
 * @returns 첫 글자가 대문자인 문자열
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

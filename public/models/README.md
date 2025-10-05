# VRM 모델 디렉토리

이 폴더에 VRM 모델 파일을 배치하세요.

## VRM 모델 다운로드 방법

### 1. VRoid Hub
- 웹사이트: https://hub.vroid.com/
- 다양한 무료/유료 VRM 모델 제공
- 다운로드한 `.vrm` 파일을 이 폴더에 저장

### 2. VRoid Studio
- 웹사이트: https://vroid.com/studio
- 직접 캐릭터를 만들고 VRM 파일로 내보내기
- 무료로 사용 가능

### 3. 샘플 모델
- Three-VRM 공식 예제: https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm/examples/models
- 테스트용으로 사용 가능

## 사용 방법

1. VRM 파일을 이 디렉토리(`/public/models/`)에 복사
2. 파일명 예시: `sample.vrm`, `avatar.vrm` 등
3. 웹 애플리케이션에서 `/models/파일명.vrm` 경로로 접근

## 주의사항

- VRM 파일은 라이센스를 확인하고 사용하세요
- 대용량 파일은 로딩 시간이 오래 걸릴 수 있습니다
- Git에 커밋하기 전에 .gitignore 설정을 확인하세요

/* ==========================================================================
   [모듈] 앱 설정값 (config.js)
   [역할]
   - 현재 앱 버전과 업데이트 확인에 사용할 version.json 경로를 정의합니다.
   - Google Drive 백업에 사용할 OAuth Client ID와 Drive API 설정을 정의합니다.
   [참고]
   - GitHub Pages 배포 경로나 버전 정책이 바뀌면 이 파일을 먼저 확인합니다.
   - GOOGLE_CLIENT_ID는 Google Cloud Console에서 발급한 Web client ID로 교체해야 합니다.
   ========================================================================== */
export const APP_VERSION = "v1.0.1";
export const APP_VERSION_URL = "./version.json";
export const REMOTE_VERSION_URL = "https://raw.githubusercontent.com/hgh-dev/E2C/main/version.json";
export const GOOGLE_CLIENT_ID = "453252977528-hmc5ek0e16rfcf38ttdkpuu0ifvp0br8.apps.googleusercontent.com";
export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email";
export const GOOGLE_DRIVE_BACKUP_FILE_NAME = "e2c-decks.json";

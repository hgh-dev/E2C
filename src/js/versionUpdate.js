/* ==========================================================================
   [모듈] 버전 업데이트 확인 (versionUpdate.js)
   [역할]
   - version.json을 확인해 서버 버전이 더 높으면 설정 화면의 업데이트 버튼을 활성화합니다.
   - 업데이트 실행 시 캐시와 서비스 워커를 정리한 뒤 새 버전으로 다시 로드합니다.
   [참고]
   - GitHub Pages 배포 버전 확인이나 업데이트 버튼 동작이 이상할 때 확인합니다.
   ========================================================================== */
import { APP_VERSION, APP_VERSION_URL, REMOTE_VERSION_URL } from "./config.js";

let latestVersionInfo = null;

/**
 * [함수] bindVersionUpdate
 * [역할] 설정 화면의 업데이트 버튼 클릭 이벤트를 연결한다.
 * [원리] 버튼 클릭 시 forceAppUpdate를 호출해 캐시 정리와 재로드를 수행한다.
 */
export function bindVersionUpdate(elements) {
  elements.appUpdateButton.addEventListener("click", forceAppUpdate);
}

/**
 * [함수] checkAppVersion
 * [역할] 현재 앱 버전과 서버의 최신 버전을 비교한다.
 * [원리] version.json 후보 URL을 조회하고 최신 버전이 더 높을 때 업데이트 버튼을 활성화한다.
 */
export async function checkAppVersion(elements) {
  renderVersionState(elements, APP_VERSION, APP_VERSION, false);

  try {
    const versionInfo = await fetchLatestVersionInfo();
    if (!versionInfo?.version) return;

    latestVersionInfo = versionInfo;
    const hasUpdate = compareVersions(versionInfo.version, APP_VERSION) > 0;
    renderVersionState(elements, APP_VERSION, versionInfo.version, hasUpdate);
  } catch (error) {
    console.warn("버전 확인 실패:", error);
  }
}

/**
 * [함수] fetchLatestVersionInfo
 * [역할] 접근 가능한 version.json 정보를 가져온다.
 * [원리] 로컬/배포 환경별 후보 URL을 순서대로 fetch하고 성공한 첫 JSON을 반환한다.
 */
async function fetchLatestVersionInfo() {
  const urls = getVersionInfoUrls();

  for (const url of urls) {
    try {
      const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) continue;
      return await response.json();
    } catch (_error) {
      // 다음 후보 URL을 시도합니다.
    }
  }

  return null;
}

/**
 * [함수] getVersionInfoUrls
 * [역할] 버전 정보를 확인할 URL 우선순위를 결정한다.
 * [원리] localhost에서는 GitHub raw URL을 먼저 쓰고, 배포 환경에서는 현재 배포 경로를 먼저 쓴다.
 */
function getVersionInfoUrls() {
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  // 로컬 개발에서는 배포 경로가 없을 수 있어 GitHub raw URL을 먼저 확인합니다.
  return isLocalHost ? [REMOTE_VERSION_URL, APP_VERSION_URL] : [APP_VERSION_URL, REMOTE_VERSION_URL];
}

/**
 * [함수] renderVersionState
 * [역할] 설정 화면의 버전 표시와 업데이트 버튼 상태를 갱신한다.
 * [원리] 현재/최신 버전 텍스트를 넣고 업데이트 가능 여부를 버튼 class에 반영한다.
 */
function renderVersionState(elements, currentVersion, latestVersion, hasUpdate) {
  elements.appVersionDisplay.textContent = currentVersion;
  elements.latestVersionDisplay.textContent = latestVersion;
  elements.appUpdateButton.classList.toggle("has-update", hasUpdate);
  elements.settingsOpen.classList.toggle("has-update", hasUpdate);
}

/**
 * [함수] forceAppUpdate
 * [역할] 사용자가 업데이트를 실행했을 때 앱을 새로 다운로드하도록 강제한다.
 * [원리] 브라우저 캐시와 서비스 워커 등록을 지운 뒤 cache-busting 쿼리를 붙여 현재 페이지를 다시 연다.
 */
async function forceAppUpdate() {
  const hasUpdate = latestVersionInfo && compareVersions(latestVersionInfo.version, APP_VERSION) > 0;
  const shouldUpdate = window.confirm(
    hasUpdate
      ? "최신 버전을 다운로드하고 앱을 다시 불러올까요?"
      : "캐시를 지우고 최신 파일을 다시 불러올까요?",
  );
  if (!shouldUpdate) return;

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    console.warn("업데이트 캐시 정리 실패:", error);
  }

  const updateUrl = new URL(window.location.href);
  updateUrl.searchParams.set("update", String(Date.now()));
  window.location.replace(updateUrl.toString());
}

/**
 * [함수] compareVersions
 * [역할] 두 semantic version 문자열의 크기를 비교한다.
 * [원리] 점으로 나눈 숫자 조각을 앞에서부터 비교하고 누락된 조각은 0으로 본다.
 */
function compareVersions(a, b) {
  const aParts = String(a || "").replace(/^v/i, "").split(".").map(Number);
  const bParts = String(b || "").replace(/^v/i, "").split(".").map(Number);
  const length = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < length; index += 1) {
    const aPart = Number.isFinite(aParts[index]) ? aParts[index] : 0;
    const bPart = Number.isFinite(bParts[index]) ? bParts[index] : 0;
    if (aPart !== bPart) return aPart > bPart ? 1 : -1;
  }

  return 0;
}

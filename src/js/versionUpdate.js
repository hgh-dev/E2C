import { APP_VERSION, APP_VERSION_URL, REMOTE_VERSION_URL } from "./config.js";

let latestVersionInfo = null;

export function bindVersionUpdate(elements) {
  elements.appUpdateButton.addEventListener("click", forceAppUpdate);
}

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

function getVersionInfoUrls() {
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  return isLocalHost ? [REMOTE_VERSION_URL, APP_VERSION_URL] : [APP_VERSION_URL, REMOTE_VERSION_URL];
}

function renderVersionState(elements, currentVersion, latestVersion, hasUpdate) {
  elements.appVersionDisplay.textContent = currentVersion;
  elements.latestVersionDisplay.textContent = latestVersion;
  elements.appUpdateButton.disabled = !hasUpdate;
  elements.appUpdateButton.classList.toggle("has-update", hasUpdate);
  elements.settingsOpen.classList.toggle("has-update", hasUpdate);
}

async function forceAppUpdate() {
  if (!latestVersionInfo || compareVersions(latestVersionInfo.version, APP_VERSION) <= 0) return;
  const shouldUpdate = window.confirm("최신 버전을 다운로드하고 앱을 다시 불러올까요?");
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

function compareVersions(a, b) {
  const aParts = String(a || "").split(".").map(Number);
  const bParts = String(b || "").split(".").map(Number);
  const length = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < length; index += 1) {
    const aPart = Number.isFinite(aParts[index]) ? aParts[index] : 0;
    const bPart = Number.isFinite(bParts[index]) ? bParts[index] : 0;
    if (aPart !== bPart) return aPart > bPart ? 1 : -1;
  }

  return 0;
}

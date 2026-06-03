/* ==========================================================================
   [모듈] PWA 등록 (pwa.js)
   [역할]
   - 배포 환경에서 서비스워커를 등록해 오프라인 앱 셸을 캐시합니다.
   - localhost 개발 환경에서는 오래된 JS 캐시가 남지 않도록 서비스워커와 캐시를 정리합니다.
   [참고]
   - 로컬에서 코드 수정 후 화면이 안 바뀌면 이 파일과 sw.js 캐시 이름을 확인합니다.
   ========================================================================== */
const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "::1"];

/**
 * [함수] isLocalHost
 * [역할] 현재 실행 환경이 로컬 개발 서버인지 판별한다.
 * [원리] window.location.hostname이 로컬 호스트 이름 목록에 포함되는지 확인한다.
 */
function isLocalHost() {
  return LOCAL_HOSTNAMES.includes(window.location.hostname);
}

/**
 * [함수] clearLocalServiceWorker
 * [역할] 로컬 개발 중 남아 있는 서비스워커와 캐시를 제거한다.
 * [원리] 등록된 서비스워커를 unregister하고 Cache Storage의 모든 캐시를 삭제한다.
 */
async function clearLocalServiceWorker() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // 로컬 캐시 정리 실패는 앱 실행을 막지 않습니다.
  }
}

/**
 * [함수] registerServiceWorker
 * [역할] 배포 환경에서 E2C 서비스워커를 등록한다.
 * [원리] 페이지 load 이후 sw.js를 등록해 앱 셸 캐시를 준비한다.
 */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // PWA 설치 자체를 막지 않도록 등록 실패는 조용히 무시합니다.
    });
  });
}

if (isLocalHost()) {
  clearLocalServiceWorker();
} else {
  registerServiceWorker();
}

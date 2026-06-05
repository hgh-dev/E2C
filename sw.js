const CACHE_NAME = "e2c-pwa-v24";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./version.json",
  "./assets/icons/google-drive.png",
  "./src/styles.css",
  "./src/js/app.js",
  "./src/js/cardListController.js",
  "./src/js/cardRenderer.js",
  "./src/js/config.js",
  "./src/js/controlsRenderer.js",
  "./src/js/dataProcessor.js",
  "./src/js/deckController.js",
  "./src/js/deckRepository.js",
  "./src/js/deckStorage.js",
  "./src/js/excelReader.js",
  "./src/js/filterConstants.js",
  "./src/js/filterSortController.js",
  "./src/js/googleDriveSync.js",
  "./src/js/importController.js",
  "./src/js/modalUi.js",
  "./src/js/pwa.js",
  "./src/js/selectModal.js",
  "./src/js/sidebarRenderer.js",
  "./src/js/state.js",
  "./src/js/stateSerializer.js",
  "./src/js/ui.js",
  "./src/js/utils.js",
  "./src/js/versionUpdate.js",
  "./src/js/viewControlsRenderer.js",
  "./src/js/viewInteractionController.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        const shouldCache =
          networkResponse &&
          (networkResponse.ok || networkResponse.type === "opaque") &&
          ["basic", "cors", "opaque"].includes(networkResponse.type);

        if (shouldCache) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }

        return networkResponse;
      });
    }),
  );
});

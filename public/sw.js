const CACHE_NAME = "bingka61-pos-v3";
const STATIC_ASSETS = [
  "/",
  "/admin",
  "/stats",
  "/manifest.json",
  "/favicon.ico",
  "/logostruk.png",
  "/css/globals.css",
  "/images/1k.png",
  "/images/2k.png",
  "/images/5k.png",
  "/images/10k.png",
  "/images/20k.png",
  "/images/50k.png",
  "/images/100k.png",
  "/images/Bingke.svg",
  "/Fonts/Poppins/Poppins-Regular.ttf",
  "/Fonts/Poppins/Poppins-Medium.ttf",
  "/Fonts/Poppins/Poppins-Bold.ttf",
  "/Fonts/Poppins/Poppins-SemiBold.ttf"
];

// Install Event - Pre-cache Static Assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Pre-caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Deleting old cache", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event - Strategic Caching
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. API GET Requests (Menu & Settings) - Network First
  // This allows the app to stay functional while offline with the latest cached data.
  if (url.pathname.startsWith("/api/") && event.request.method === "GET") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 2. API POST/PUT/DELETE - Network Only
  // These should NOT be cached and will fail naturally when offline.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 3. Static Assets & Pages - Stale-While-Revalidate
  // Fast load from cache, then update in background.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

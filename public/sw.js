// Navigator PWA service worker
// Стратегия:
//  • статика Next.js (/_next/static, /icon) — cache-first (файлы с хешем в имени, безопасно и быстро)
//  • всё остальное на своём домене (страницы, /api/fx) — network-first: онлайн всегда свежее,
//    офлайн отдаём последнюю версию из кэша
//  • внешние API (open-meteo и т.п.) не трогаем
//
// Чтобы принудительно сбросить старый кэш после большого обновления — поднимите версию ниже.
const CACHE = "navigator-v1";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // не вмешиваемся в запросы к внешним API (погода, курс валют с чужих доменов и т.п.)
  if (url.origin !== self.location.origin) return;

  // неизменяемая статика — cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // страницы и прочее на своём домене — network-first с офлайн-фолбэком
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("/"))
      )
  );
});

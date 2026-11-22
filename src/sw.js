/* 离线缓存：首次访问后，断网也能打开
   策略：安装时把核心文件塞进缓存；请求先走缓存，再走网络并回填。
   更新：改 VERSION 即触发全量替换。 */
const VERSION = 'xieji-v3';
const CORE = [
  './',
  './index.html',
  './yuxiaji.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  /* 跨域请求（天气接口等）一律交给浏览器，不拦截、不缓存、不做 HTML 兜底 */
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => {
        /* 只在页面导航时退回首页，避免把 HTML 塞给脚本请求 */
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});

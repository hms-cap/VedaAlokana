/* Vedālokana service worker: makes the installed app work without a connection.
   - The app shell (code, styles, fonts, icons) is stored on install, per app version.
   - Texts (data/*.json) are kept in one cache that outlives app versions. Anything read once,
     or downloaded from Settings → Offline, opens offline from then on; when online it is
     refreshed in the background so corrections in the data still arrive. */
importScripts('version.js');
const VERSION = self.VEDALOKANA.version;
const SHELL = `vedalokana-shell-${VERSION}`;
const DATA = 'vedalokana-data';
const SHELL_FILES = [
  './', 'index.html', 'app.js', 'lipi.js', 'panchanga.js', 'dirgha.js', 'styles.css', 'version.js', 'manifest.webmanifest',
  'fonts/IBMPlexSans-Var.woff', 'fonts/GentiumBookPlus-Regular.woff', 'fonts/GentiumBookPlus-Italic.woff', 'fonts/GentiumBookPlus-Bold.woff',
  'fonts/NotoSerifDevanagari-Vedic.woff', 'fonts/NotoSerifKannada-Vedic.woff',
  'fonts/NotoSerifDevanagari-Std.woff', 'fonts/NotoSerifKannada-Std.woff',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
];
const DATA_CORE = ['data/catalog.json', 'data/suktas.json', 'data/offline.json'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(SHELL_FILES.map((u) => new Request(u, { cache: 'reload' })));
    const data = await caches.open(DATA);
    await Promise.all(DATA_CORE.map(async (u) => { const r = await fetch(u, { cache: 'reload' }); if (r.ok) await data.put(u, r); }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('vedalokana-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

const scopePath = new URL(self.registration.scope).pathname;
const rel = (url) => url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : null;

// Serve from the cache at once; refresh it from the network when there is one.
async function staleWhileRevalidate(e, cacheName, key) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key);
  const net = fetch(e.request).then((r) => { if (r.ok) cache.put(key, r.clone()); return r; }).catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  const r = await net;
  return r || new Response('Offline and not downloaded yet', { status: 503, statusText: 'Offline' });
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = rel(url);
  if (path === null || url.searchParams.has('fresh')) return;  // ?fresh: an update check, straight to the network
  if (e.request.mode === 'navigate') {
    e.respondWith((async () => (await caches.match('index.html', { cacheName: SHELL })) || fetch(e.request))());
  } else if (path.startsWith('data/')) {
    e.respondWith(staleWhileRevalidate(e, DATA, path));
  } else {
    e.respondWith((async () => (await caches.match(path, { cacheName: SHELL })) || fetch(e.request))());
  }
});

self.addEventListener('message', (e) => {
  if (e.data === 'version') e.source?.postMessage({ version: VERSION });
});

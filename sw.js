/* ENEM Natureza: serve o app a partir dos arquivos guardados no aparelho.
   - A página (index.html) e a lista de arquivos: tenta a internet primeiro (para receber atualizações)
     e, sem conexão, usa a cópia guardada.
   - Todo o resto (questões, imagens, bibliotecas): usa a cópia guardada; se não houver, busca e guarda. */
const RUNTIME = 'enem-runtime';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const local = url.origin === self.location.origin;
  const fresco = local && (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/arquivos.json'));
  e.respondWith(fresco ? redePrimeiro(req) : cachePrimeiro(req));
});

async function cachePrimeiro(req) {
  const guardado = await caches.match(req, { ignoreSearch: true });
  if (guardado) return guardado;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') (await caches.open(RUNTIME)).put(req, res.clone());
    return res;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Sem conexão' });
  }
}

async function redePrimeiro(req) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(req, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone());
    return res;
  } catch (err) {
    const guardado = await caches.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? (await caches.match('./', { ignoreSearch: true })) || (await caches.match('index.html', { ignoreSearch: true })) : null);
    return guardado || new Response('Sem conexão e sem cópia guardada.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

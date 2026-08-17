const CACHE='jyyr-store-v4-9-4-assets';
const CORE=[
  './css/shared.css','./css/index.css','./css/login.css','./css/admin.css',
  './css/popup.css','./css/dashboard.css','./css/features.css','./manifest.json'
];
const CACHEABLE=/\.(?:css|png|jpe?g|webp|svg|ico|woff2?|ttf)$/i;

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  if(/\.supabase\.co$/i.test(url.hostname)) return;
  // HTML and JS are intentionally network-only: never serve stale application code.
  if(!CACHEABLE.test(url.pathname)) return;

  event.respondWith(
    fetch(request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
      }
      return response;
    }).catch(()=>
      caches.match(request).then(cached=>cached||new Response('',{status:504,statusText:'Offline'}))
    )
  );
});

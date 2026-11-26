const V="kelma-v34",SHELL=["./","index.html","config.js","manifest.webmanifest","icon-192.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));return res;}).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));});
self.addEventListener("push",e=>{let d={};try{d=e.data.json();}catch(_){}
e.waitUntil(self.registration.showNotification(d.title||"كلمة في سرك",{body:d.body||"وصلتك كلمة جديدة",icon:"icon-192.png",tag:"kelma",renotify:true,dir:"rtl",lang:"ar",data:{url:d.url||"./"}}));});
self.addEventListener("notificationclick",e=>{e.notification.close();const u=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>{for(const c of l){if(c.url.startsWith(self.registration.scope)&&"focus" in c)return c.focus();}return clients.openWindow(u);}));});

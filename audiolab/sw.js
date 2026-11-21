/* 20/11/2026: o RMD AudioLab mudou para https://rmd-audiolab.github.io/ — este service worker antigo se desliga e apaga a cópia guardada. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("rmd-audiolab-casa-")).map((k) => caches.delete(k))))
    .then(() => self.registration.unregister()).then(() => self.clients.matchAll()).then((cs) => cs.forEach((c) => c.navigate(c.url))));
});

/* Minimal service worker to make the site installable as an Edge/Chromium web app.
   No offline caching is implemented (network-only). */
self.addEventListener('install', function () {
  try { self.skipWaiting(); } catch (e) {}
});

self.addEventListener('activate', function (event) {
  try { event.waitUntil(self.clients.claim()); } catch (e) {}
});

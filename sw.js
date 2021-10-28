importScripts("https://storage.googleapis.com/workbox-cdn/releases/3.3.1/workbox-sw.js");

workbox.precaching.precacheAndRoute([
  {
    "url": "icons-actionbar.html",
    "revision": "61685c01cc6c2b8cec602d69f117e40e"
  },
  {
    "url": "icons-app-shortcut.html",
    "revision": "37a73db319f0c8665ddbfd4a5ed5273c"
  },
  {
    "url": "icons-generic.html",
    "revision": "a49b15e53b0d20622f9ebeba2132b468"
  },
  {
    "url": "icons-launcher.html",
    "revision": "e94c767a4e98500cf951cd25d9ebb12b"
  },
  {
    "url": "icons-notification.html",
    "revision": "a865941d056cafe59836f8dc01309ecc"
  },
  {
    "url": "index.html",
    "revision": "77cb6aeb83cc6ae6411145bac26bd8d2"
  },
  {
    "url": "nine-patches.html",
    "revision": "bc4911d92d2633f219c4699232218c91"
  },
  {
    "url": "res/generator-thumbs/icon-animator.svg",
    "revision": "65311bbd1a2658cacdf6a2be539b0d9c"
  },
  {
    "url": "res/generator-thumbs/icons-actionbar.svg",
    "revision": "747ac6e1b23e6f00a86d7baebe76029d"
  },
  {
    "url": "res/generator-thumbs/icons-app-shortcut.svg",
    "revision": "dcd36cf4d4b734e4d4d7993aeb5350ce"
  },
  {
    "url": "res/generator-thumbs/icons-generic.svg",
    "revision": "7e9aaa9edeaf210c7afac117cf094192"
  },
  {
    "url": "res/generator-thumbs/icons-launcher.svg",
    "revision": "ac624b8aabda5851413f3ccfd252b80d"
  },
  {
    "url": "res/generator-thumbs/icons-notification.svg",
    "revision": "bd07505811fade5e742afe6a85cedf03"
  },
  {
    "url": "res/generator-thumbs/nine-patches.svg",
    "revision": "c37457a837ee23a6c1981b5d993ee72e"
  },
  {
    "url": "app.js",
    "revision": "a08b0b6ad252da1b5cb27bb0533589ae"
  },
  {
    "url": "vendor.js",
    "revision": "29a5241ddaf6382e654816a3ac13b65f"
  },
  {
    "url": "app.css",
    "revision": "9ea029ccae023a078cf1cb992c196a6e"
  }
]);

workbox.routing.registerRoute(
  new RegExp('https://(?:fonts|www).(?:googleapis|gstatic).com/(.*)'),
  workbox.strategies.cacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new workbox.expiration.Plugin({
        maxEntries: 20,
        purgeOnQuotaError: true,
      }),
      new workbox.cacheableResponse.Plugin({
        statuses: [0, 200]
      }),
    ],
  }),
);

workbox.googleAnalytics.initialize();

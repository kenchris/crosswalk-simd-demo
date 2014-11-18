var caches = require('./caches');

self.addEventListener('install', function(event) {
  console.log("SW installed");
  event.waitUntil(
    caches.open('static-v1').then(function(cache) {
      return cache.addAll([
        // Web Components:
        '/bower_components/webcomponentsjs/webcomponents.js',

        // Polymer base:
        '/bower_components/polymer/polymer.html',
        '/bower_components/polymer/polymer.js',
        '/bower_components/polymer/layout.html',

        // Components:
        '/bower_components/core-selection/core-selection.html',
        '/bower_components/core-iconset/core-iconset.html',
        '/bower_components/core-icon/core-icon.css',
        '/bower_components/core-style/core-style.html',
        '/bower_components/core-transition/core-transition.html',
        '/bower_components/core-focusable/core-focusable.html',
        '/bower_components/paper-shadow/paper-shadow.css',
        '/bower_components/core-overlay/core-key-helper.html',
        '/bower_components/core-overlay/core-overlay-layer.html',
        '/bower_components/core-range/core-range.html',
        '/bower_components/core-input/core-input.html',
        '/bower_components/paper-input/paper-input-decorator.html',
        '/bower_components/core-transition/core-transition-overlay.css',
        '/bower_components/paper-radio-button/paper-radio-button.css',
        '/bower_components/paper-progress/paper-progress.css',
        '/bower_components/core-focusable/polymer-mixin.js',
        '/bower_components/core-focusable/core-focusable.js',
        '/bower_components/core-meta/core-meta.html',
        '/bower_components/core-a11y-keys/core-a11y-keys.html',
        '/bower_components/core-animated-pages/core-animated-pages.css',
        '/bower_components/core-animated-pages/core-animated-pages.html',
        '/bower_components/core-animated-pages/transitions/core-transition-pages.html',
        '/bower_components/core-animated-pages/transitions/cross-fade.html',
        '/bower_components/core-animated-pages/transitions/hero-transition.html',
        '/bower_components/core-drawer-panel/core-drawer-panel.css',
        '/bower_components/core-drawer-panel/core-drawer-panel.html',
        '/bower_components/core-header-panel/core-header-panel.css',
        '/bower_components/core-header-panel/core-header-panel.html',
        '/bower_components/core-icon/core-icon.html',
        '/bower_components/core-icons/core-icons.html',
        '/bower_components/core-iconset-svg/core-iconset-svg.html',
        '/bower_components/core-item/core-item.css',
        '/bower_components/core-item/core-item.html',
        '/bower_components/core-media-query/core-media-query.html',
        '/bower_components/core-menu/core-menu.css',
        '/bower_components/core-menu/core-menu.html',
        '/bower_components/core-overlay/core-overlay.html',
        '/bower_components/core-selector/core-selector.html',
        '/bower_components/core-toolbar/core-toolbar.css',
        '/bower_components/core-toolbar/core-toolbar.html',
        '/bower_components/core-transition/core-transition-css.html',
        '/bower_components/flatiron-director/director/director.min.js',
        '/bower_components/flatiron-director/flatiron-director.html',
        '/bower_components/paper-button/paper-button-base.html',
        '/bower_components/paper-dialog/paper-dialog-base.html',
        '/bower_components/paper-dialog/paper-dialog.html',
        '/bower_components/paper-icon-button/paper-icon-button.html',
        '/bower_components/paper-input/paper-input.html',
        '/bower_components/paper-item/paper-item.html',
        '/bower_components/paper-progress/paper-progress.html',
        '/bower_components/paper-radio-button/paper-radio-button.html',
        '/bower_components/paper-ripple/paper-ripple.html',
        '/bower_components/paper-shadow/paper-shadow.html',
        '/bower_components/paper-slider/paper-slider.css',
        '/bower_components/paper-slider/paper-slider.html',
        '/bower_components/paper-toast/paper-toast.css',
        '/bower_components/paper-toast/paper-toast.html',
        '/bower_components/paper-toggle-button/paper-toggle-button.css',
        '/bower_components/paper-toggle-button/paper-toggle-button.html',
        '/bower_components/threejs/build/three.min.js',
        '/bower_components/paper-input/paper-input-decorator.css',

        // Styling:
        '/bower_components/font-roboto/roboto.html',
        //'http://fonts.googleapis.com/css?family=RobotoDraft:regular,bold,italic,thin,light,bolditalic,black,medium&lang=en',

        // Custom elements:
        '/elements/demo-card/demo-card.html',
        '/elements/action-toggle-overlay/action-toggle-overlay.html',
        '/elements/action-toggle-overlay/play-button.svg',

        // App:
        '/index.html',
        '/demos/fbird/fbird-demo.html',
        '/demos/fbird/fbird.js',
        '/demos/webgl/webgl-demo.html',
        '/demos/mandelbrot/mandelbrot-demo.html',
        '/demos/mandelbrot/mandelbrot-animation.html',
        '/demos/mandelbrot/mandelbrot-worker.js'

      ]);
    }).then(function() {
      console.log("Successfully cached app")
    }, function() {
      console.log("Failed caching app")
    })
  );
});

self.addEventListener('fetch', function(event) {
  self.cmd = console;
  self.cmd.log(caches);
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (!response) {
        var url = new URL(event.request.url);
        var resource = (url.hostname === self.location.hostname) ? url.pathname : url.href;
        self.cmd.log("Missing resource: " + resource);
      }
      return response || event.default();
    })
  );
});

!function(e){"use strict";function n(){window.Polymer=window.Polymer||{},window.Polymer.dom="shadow";var n=["elements/elements.html"];n.forEach(function(n){var r=e.createElement("link");r.rel="import",r.href=n,e.head.appendChild(r)}),e.dispatchEvent(new CustomEvent("MainUIReady",{bubbles:!0}))}var r="registerElement"in e&&"import"in e.createElement("link")&&"content"in e.createElement("template");if(r)n();else{var t=e.createElement("script");t.src="bower_components/webcomponentsjs/webcomponents-lite.min.js",t.onload=n,e.head.appendChild(t)}var o=e.querySelector("#app");o.displayInstalledToast=function(){e.querySelector("#caching-complete").show()},o.addEventListener("dom-change",function(){console.log("Our app is ready to rock!")}),window.addEventListener("MainUIReady",function(){e.querySelector("body").removeAttribute("unresolved");var n=e.querySelector("#paperDrawerPanel");n.forceNarrow=!0}),o.onMenuSelect=function(){var n=e.querySelector("#paperDrawerPanel");n&&n.narrow&&n.closeDrawer()}}(document);
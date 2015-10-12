'use strict';

function callOnce(fn) {
  var wrapper = function(event) {
    fn();
    event.target.removeEventListener(event.type, wrapper);
  };
  return wrapper;
}

function loadScriptAsync(src) {
  return new Promise(
    function(resolve, reject) {
      var script = document.createElement('script');
      script.async = true;
      script.src = src;
      script.onload = function() {
        resolve();
      }
      document.head.appendChild(script);
    }
  );
}

class BirdsDemo {
	
  constructor () {
    // Defer normal constructor behavior to created because we're only
    // allowed to take the prototype with us from the class.
    Polymer(BirdsDemo.prototype);
  }
  
  get is () {
    return 'birds-demo';
  }
  
  get properties () {
    return {
      useCanvas: { type: Boolean, value: true }
    };
  }
  
  created () {
    this.initialized = false;
  }
	
  init () {
    if (this.initialized)
      return;

    // The fbird code needs a valid size.
    if (this.$.frame.clientWidth > 0) {
      this.initialized = true;
      fbird.init({self: this, basePath: this.resolveUrl('.')});
      return;
    }
  }
  
  ready () {
    loadScriptAsync(this.resolveUrl("fbird.js")).then(
      function() { this.init(); }.bind(this)
    );
  }
  
  simdToggleChange (e, detail, sender) {
    if (e.target.checked && typeof SIMD === "undefined") {
      this.async(function() { this.checked = false; }.bind(e.target), 200);
      this.$.error.show();
      return;
    }
    fbird.setUseSIMD(e.target.checked);
  }

  suspendedChange (suspended) {
    this.$.player.disabled = suspended;
    this.onActionChange();
  }
      
  onActionChange () {
    if (typeof(fbird) == "undefined")
      return;

    if (!this.initialized)
     this.init();

    if (this.$.player.checked)
      fbird.start();
    else
      fbird.stop();
  }
}

new BirdsDemo;
'use strict';

class MandelbrotDemo {
	
  constructor () {
    // Defer normal constructor behavior to created because we're only
    // allowed to take the prototype with us from the class.
	  Polymer(MandelbrotDemo.prototype);
  }

  get is () {
    return 'mandelbrot-demo';
  }
      
  get properties () {
    return {
      maxWorkers: { type: Number, value: navigator.hardwareConcurrency },
      workerCount: { type: Number, value: 1 },
      maxIterationCount: { type: Number, value: 50 }
    };
  }
  
  created () {
    this.resetFpsCount();
  }
      
  ready () {
    Polymer.dom(this.$.player).setAttribute("workerCount", this.workerCount);
    Polymer.dom(this.$.player).setAttribute("maxIterationCount", this.maxIterationCount);
  }

  resetFpsCount () {
    this.measurements = 0;
    this.fpsTotal = 0;
  }
  
  suspendedChange (suspended) {
    this.$.player.disabled = suspended;
  }
  
  simdToggleChange (e, detail, sender) {
    if (e.target.checked && typeof SIMD === "undefined") {
      this.async(function() { this.checked = false; }.bind(e.target), 200);
      this.$.error.show();
      return;
    }
		
    this.resetFpsCount();
    this.$.player.useSIMD = e.target.checked;
  }
	  
  fpsChange (e, detail, sender) {
    this.fpsTotal += detail.value;
    this.$.average.textContent = (this.fpsTotal / ++this.measurements).toFixed(0);
    this.$.fps.textContent = detail.value.toFixed(0);
  }
  
  maxIterationChange (e, detail, sender) {
    this.resetFpsCount();
    this.maxIterationCount = e.target.value;
    this.$.player.maxIterationCount = this.maxIterationCount;
  }
	  
  workerChange (e, detail, sender) {
    this.resetFpsCount();
    this.workerCount = e.target.value;
    this.$.player.workerCount = this.workerCount;
  }
}

new MandelbrotDemo;
'use strict';

// Mandelbrot using SIMD.js and Web Workers
// Author: Peter Jensen, Intel Corporation
//         Kenneth Christiansen, Intel Corporation

class MandelbrotWorker extends Worker {

  constructor (src, onmessage, bufferSize) {
    super(src);
    
    this.buffer = new ArrayBuffer(bufferSize);
    this.addEventListener('message', onmessage, false);
  }
}

class WorkerPool {

  constructor (src) {
    this.source = src;
    this.activeWorkers = [];
    this.activeWorkersCount = 0;
  }

  addWorker (onmessage, bufferSize) {
    var newWorker = new MandelbrotWorker(this.source, onmessage, bufferSize);
    this.activeWorkers[this.activeWorkersCount] = newWorker;

    return this.activeWorkersCount++;
  }

  sendRequest (index, message) {
    var worker = this.activeWorkers[index];
    worker.postMessage(
      {
        message: message,
        worker_index: index,
        buffer: worker.buffer
      }, [worker.buffer]);
  }

  restoreBuffer (index, buffer) {
    var worker = this.activeWorkers[index];
    if (worker)
      worker.buffer = buffer;
  }

  terminateLastWorker () {
    var lastWorker = this.activeWorkers[this.activeWorkersCount - 1];
    lastWorker.postMessage({terminate: true});
    this.activeWorkersCount--;
  }

  terminateAllWorkers () {
    while (this.activeWorkersCount > 0)
      this.terminateLastWorker();
  }

  numberOfWorkers () {
    return this.activeWorkersCount;
  }

  bufferOf (index) {
    return this.activeWorkers[index].buffer;
  }

  workerIsActive (index) {
    return index < this.activeWorkersCount;
  }
}

class MandelbrotAnimation {

  constructor () {
    // Defer normal constructor behavior to created because we're only
    // allowed to take the prototype with us from the class.
    Polymer(MandelbrotAnimation.prototype);
  }
  
  get is () {
    return 'mandelbrot-animation';
  }
 
  get properties () {
    return {
      useSIMD: { type: Boolean, value: false },
      disabled: { type: Boolean, value: false },
      workerCount: { type: Number, value: 1 },
      maxIterationCount: { type: Number, value: 50 },
      scale: { type: Number, value: 100 }
    }
  }
  
  created () {
    this.isAnimating = false;
    this.initialized = false;
    
    this.z = { start: 1.0, end: 0.0005 };
    this.x = { start: -0.5, end: 0.0 };
    this.y = { start: 0.0, end: 0.75 };
    
    var steps = 200.0;
    
    this.z.step = (this.z.end - this.z.start) / steps;
    this.x.step = (this.x.end - this.x.start) / steps;
    this.y.step = (this.y.end - this.y.start) / steps;
    
    this.z.value = this.z.start;
    this.x.value = this.x.start; 
    this.y.value = this.y.start;
  }
  
  _init () {
    this.initialized = true;
    this.workerPool = new WorkerPool(this.resolveUrl("mandelbrot-worker.js"));

    var canvas = this.$.mandel;
    this.ctx = canvas.getContext("2d");

    var ratio = window.devicePixelRatio / (this.ctx.backingStorePixelRatio || 1);
    ratio /= 100 / this.scale;

    this.width = this.$.control.clientWidth;
    this.height = this.$.control.clientHeight;

    this.width = canvas.width = Math.ceil(this.width * ratio);
    this.height = canvas.height = Math.ceil(this.height * ratio);
    
    this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    this.bufferSize  = this.width * this.height * 4;
  }
  
  updateFromImageData (imageData) {
    this.imageData.data.set(imageData);
    this.ctx.putImageData(this.imageData, 0, 0);
  }
    
  disabledChanged () {
    this.$.control.disabled = this.disabled;
  }
  
  _findFrame (index) {
    for (var i = 0, n = this.pendingFrames.length; i < n; i++) {
      var frame = this.pendingFrames[i];
      if (frame.frame_index === index) {
        return i;
      }
    };
    
    return false;
  }
  
  _paintFrame (buffer) {
    this.updateFromImageData(buffer);
    if (this.frameCount > 0 && ((this.frameCount % 10) | 0) === 0) {
      var t = performance.now();
      this.fire("fps-change", { value: 10000 / (t - this.lastPaintTime) });
      this.lastPaintTime = t;
    }
  }
  
  _advanceFrame () {
    if (this.z.value < this.z.end || this.z.value > this.z.start) {
      this.z.step *= -1;
      this.x.step *= -1;
      this.y.step *= -1;
    }
    this.z.value += this.z.step;
    this.x.value += this.x.step;
    this.y.value += this.y.step;
  }
  
  _requestFrame (index) {
    this.workerPool.sendRequest(
      index,
      {
        request_count:  this.requestCount,
        width:          this.width,
        height:         this.height,
        xc:             this.x.value,
        yc:             this.y.value,
        scale:          this.z.value,
        use_simd:       this.useSIMD,
        max_iterations: this.maxIterationCount
      });
    this.requestCount++;
  }
  
  // Called when a worker has computed a frame.
  _updateFrame (e) {
    var worker_index  = e.data.worker_index;
    var requestCount = e.data.message.request_count;

    if (!this.isAnimating) {
      var buffer = new Uint8ClampedArray(e.data.buffer);
      this._paintFrame(buffer);
      this.workerPool.terminateAllWorkers();
      return;
    }

    this.workerPool.restoreBuffer(worker_index, e.data.buffer);

    if (this.workerPool.numberOfWorkers() < this.workerCount) {
      var worker = this.workerPool.addWorker(this._updateFrame.bind(this), this.bufferSize);
      this._requestFrame(worker);
      this._advanceFrame();
    }

    if (this.workerPool.numberOfWorkers() > this.workerCount) {
      this.workerPool.terminateLastWorker();
    }

    if (requestCount !== this.frameCount) {
      // Frame came early, save it for later and do nothing now
      this.pendingFrames.push({worker_index: worker_index, frame_index: requestCount});
      return;
    }

    var buffer = new Uint8ClampedArray(e.data.buffer);
    this._paintFrame(buffer);
    this.frameCount++;

    if (this.pendingFrames.length > 0) {
      // There are delayed frames queued up.  Process them.
      var frame;
      while ((frame = this._findFrame(this.frameCount)) !== false) {
        var windex = this.pendingFrames[frame].worker_index;
        this.pendingFrames.splice(frame, 1); // Remove the frame
        var buffer = new Uint8ClampedArray(this.workerPool.bufferOf(windex));
        this._paintFrame(buffer);
        this.frameCount++;

        if (this.workerPool.workerIsActive(windex)) {
          this._requestFrame(windex);
          this._advanceFrame();
        }
      }
    }

    if (this.workerPool.workerIsActive(e.data.worker_index)) {
      this._requestFrame(e.data.worker_index);
      this._advanceFrame();
    }
  }
  
  onActionChange () {
    if (!this.initialized) {
      if (!this.$.mandel.clientHeight)
        return;
      this._init();
    }

    this.isAnimating = this.$.control.checked;
    if (!this.isAnimating) {
      this.fire("fps-change", { value: 0 });
      return;
    }
    
    this.frameCount = 0;
    this.requestCount = 0;
    this.lastPaintTime = performance.now();
    this.pendingFrames = [];

    this.workerPool.addWorker(this._updateFrame.bind(this), this.bufferSize);
    this._requestFrame(0);
    this._advanceFrame();
  }
}

new MandelbrotAnimation;
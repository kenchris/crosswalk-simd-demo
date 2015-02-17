// Original author: Peter Jensen

var fbird = (function() {
  var initialized = false;
  var maxBirds = 100000;
  var params = null;
  var dom = null;
  var element = null; // Target element (eg. canvas element)

  function BirdTracker() {
    var maxPos      = 1000.0;
    var actualBirds = 0;
    var posArray    = new Float32Array(maxBirds);
    var velArray    = new Float32Array(maxBirds);

    var accelData = {
      steps: 20000,
      interval: 0.002,  // time in ms for each accel value
      values: [
          10.0, 9.0, 8.0, 7.0, 6.0, 5.0,
          6.0, 7.0, 8.0, 9.0, 10.0
        ].map(function(v) {
          return 50 * v;
        }
      ),
      valueConst: 1000.0
    };

    function init(maxPosition) {
      actualBirds = 0;
      maxPos = maxPosition;
      if (params.accelSteps > 0)
        accelData.steps = params.accelSteps;
    }

    function addBird(pos, vel) {
      if (actualBirds >= maxBirds) {
        console.error("maxBirds exceeded");
        return -1;
      }

      posArray[actualBirds] = pos;
      velArray[actualBirds] = vel;
      actualBirds++;

      return actualBirds - 1;
    }

    function removeLastBird() {
      if (actualBirds > 0)
        actualBirds--;
    }

    function updateAllConstantAccel(timeDelta) {
      var timeDeltaSec = timeDelta/1000.0;
      var timeDeltaSecSquared = timeDeltaSec*timeDeltaSec;
      for (var i = 0; i < actualBirds; ++i) {
        var pos = posArray[i];
        var vel = velArray[i];
        var newPos = 0.5*accelData.valueConst*timeDeltaSecSquared + vel*timeDeltaSec + pos;
        var newVel = accelData.valueConst*timeDeltaSec + vel;
        if (newPos > maxPos && newVel > 0) {
          newVel = -newVel;
        }
        posArray[i] = newPos;
        velArray[i] = newVel;
      }
    }

    function updateAll(timeDelta) {
      var steps               = accelData.steps;
      var accelCount          = accelData.values.length;
      var subTimeDelta        = timeDelta / steps / 1000.0;
      var subTimeDeltaSquared = subTimeDelta * subTimeDelta;

      for (var i = 0; i < actualBirds; ++i) {
        var accelIndex = 0;
        var newPos = posArray[i];
        var newVel = velArray[i];
        for (var a = 0; a < steps; ++a) {
          var accel = accelData.values[accelIndex];
          accelIndex = (accelIndex + 1) % accelCount;
          var posDelta = 0.5*accel*subTimeDeltaSquared + newVel*subTimeDelta;
          newPos = newPos + posDelta;
          newVel = accel * subTimeDelta + newVel;

          if (newPos > maxPos) {
            newVel = -newVel;
            newPos = maxPos;
          }
        }
        posArray[i] = newPos;
        velArray[i] = newVel;
      }
    }

    function updateAllSIMD(timeDelta) {
      var steps        = accelData.steps;
      var accelCount   = accelData.values.length;
      var subTimeDelta = timeDelta/steps/1000.0;

      var posArrayx4            = new Float32x4Array(posArray.buffer);
      var velArrayx4            = new Float32x4Array(velArray.buffer);
      var maxPosx4              = SIMD.float32x4.splat(maxPos);
      var subTimeDeltax4        = SIMD.float32x4.splat(subTimeDelta);
      var subTimeDeltaSquaredx4 = SIMD.float32x4.mul(subTimeDeltax4, subTimeDeltax4);
      var point5x4              = SIMD.float32x4.splat(0.5);

      for (var i = 0, len = (actualBirds+3) >> 2; i < len; ++i) {
        var accelIndex = 0;
        var newVelTruex4;
        var newPosx4 = posArrayx4.getAt(i);
        var newVelx4 = velArrayx4.getAt(i);
        for (var a = 0; a < steps; ++a) {
          var accel     = accelData.values[accelIndex];
          var accelx4   = SIMD.float32x4.splat(accel);
          accelIndex    = (accelIndex + 1) % accelCount;
          var posDeltax4;
          posDeltax4 = SIMD.float32x4.mul(point5x4, SIMD.float32x4.mul(accelx4, subTimeDeltaSquaredx4));
          posDeltax4 = SIMD.float32x4.add(posDeltax4, SIMD.float32x4.mul(newVelx4,subTimeDeltax4));
          newPosx4   = SIMD.float32x4.add(newPosx4, posDeltax4);
          newVelx4 = SIMD.float32x4.add(newVelx4, SIMD.float32x4.mul(accelx4, subTimeDeltax4));
          var cmpx4 = SIMD.float32x4.greaterThan(newPosx4, maxPosx4);
          newVelTruex4 = SIMD.float32x4.neg(newVelx4);
          newVelx4 = SIMD.float32x4.select(cmpx4, newVelTruex4, newVelx4);
        }
        posArrayx4.setAt(i, newPosx4);
        velArrayx4.setAt(i, newVelx4);
      }
    }

    function posOf(index) {
      return posArray[index];
    }

    function dumpOne(index) {
      console.log(index + ". pos:" + posArray[index] + ", vel:" + velArray[index]);
    }

    return {
      init:                   init,
      addBird:                addBird,
      removeLastBird:         removeLastBird,
      updateAllConstantAccel: updateAllConstantAccel,
      updateAll:              updateAll,
      updateAllSIMD:          updateAllSIMD,
      posOf:                  posOf,
      dumpOne:                dumpOne
    };
  };

  function Surface() {
    var useCanvas = false;
    var ctx;

    var sprites = [];
    var spritePositions = [];

    function init(useCanvas) {
      useCanvas = useCanvas;
      if (useCanvas) {
        console.log("Using canvas!");
        ctx = element.getContext("2d");
      }

      sprites = [];
      spritePositions = [];
    }

    function createCanvasSprite(width, height, rgbaData) {
      var sprite = ctx.createImageData(width, height);
      var blankSprite = ctx.createImageData(width, height);
      var spriteData = sprite.data;
      var blankSpriteData = blankSprite.data;

      var len  = width * height * 4;
      for (var i = 0; i < len; i += 4) {
        spriteData[i]   = rgbaData[i];
        spriteData[i+1] = rgbaData[i+1];
        spriteData[i+2] = rgbaData[i+2];
        spriteData[i+3] = rgbaData[i+3];
        blankSpriteData[i] = 255;
        blankSpriteData[i+1] = 255;
        blankSpriteData[i+2] = 255;
        blankSpriteData[i+3] = 255;
      }
      sprites.push({sprite: sprite, blankSprite: blankSprite});
      return sprites.length - 1;
    }

    function createDOMSprite(width, height, rgbaData) {
      var canvas = document.createElement("canvas");
      canvas.style.width = width;
      canvas.style.height = height;

      var canvasCtx = canvas.getContext("2d");
      var canvasSprite = canvasCtx.createImageData(width, height);
      var canvasSpriteData = canvasSprite.data;

      for (var i = 0, n = width * height * 4; i < n; i += 4) {
        canvasSpriteData[i] = rgbaData[i];
        canvasSpriteData[i+1] = rgbaData[i+1];
        canvasSpriteData[i+2] = rgbaData[i+2];
        canvasSpriteData[i+3] = rgbaData[i+3];
      }

      canvasCtx.putImageData(canvasSprite, 0, 0);
      var img = document.createElement("img");
      img.src = canvas.toDataURL("image/png");
      img.style.position = "absolute";

      sprites.push({img: img});

      return sprites.length - 1;
    }

    function createImageSprite(imageSrc, width, height, scale) {
      if (useCanvas) {
        console.error("Cannot create canvas image sprite");
        return 0;
      }

      var img = document.createElement("img");
      img.src = imageSrc;
      img.style.position = "absolute";
      img.style.margin =  "0px";
      if (scale != 1.0)
        img.style.transform = "scale(" + scale + ")";

      sprites.push({
          img: img,
          width: width * scale,
          height: height * scale
        });

      return sprites.length - 1;
    }

    function createSprite(width, height, rgbaData) {
      if (useCanvas)
        return createCanvasSprite(width, height, rgbaData);
      return createDOMSprite(width, height, rgbaData);
    }

    function placeCanvasSprite(spriteId, x, y) {
      spritePositions.push({spriteId: spriteId, x: x, y: y});
      ctx.putImageData(sprites[spriteId].sprite, x, y);
      return spritePositions.length - 1;
    }

    function placeDOMSprite(spriteId, x, y) {
      var img = sprites[spriteId].img;
      var imgClone = img.cloneNode(true);
      params.self.$.frame.appendChild(imgClone);
      imgClone.style.left = x + "px";
      imgClone.style.top = y + "px";
      spritePositions.push({img: imgClone, x: x, y: y});
      return spritePositions.length - 1;
    }

    function placeSprite(spriteId, x, y) {
      if (useCanvas)
        return placeCanvasSprite(spriteId, x, y);
      else
        return placeDOMSprite(spriteId, x, y);
    }

    function moveCanvasSprite(posId, x, y) {
      var spritePos = spritePositions[posId]; 
      var sprite    = sprites[spritePos.spriteId];
      ctx.putImageData(sprite.blankSprite, spritePos.x, spritePos.y);
      spritePos.x = x;
      spritePos.y = y;
      ctx.putImageData(sprite.sprite, x, y);
    }

    function moveDOMSprite(posId, x, y) {
      var spritePos = spritePositions[posId];
      var img = spritePos.img;
      img.style.left = x + "px";
      img.style.top  = y + "px";
    }

    function moveSprite(posId, x, y) {
      if (useCanvas)
        moveCanvasSprite(posId, x, y);
      else
        moveDOMSprite(posId, x, y);
    }

    function removeLastCanvasSprite() {
      var spritePos = spritePositions[spritePositions.length-1];
      var sprite    = sprites[spritePos.spriteId];
      ctx.putImageData(sprite.blankSprite, spritePos.x, spritePos.y);
      spritePositions.pop();
    }

    function removeLastDOMSprite() {
      var spritePos = spritePositions[spritePositions.length-1];
      spritePos.img.remove();
      spritePositions.pop();
    }

    function removeLastSprite() {
      if (useCanvas)
        removeLastCanvasSprite();
      else
        removeLastDOMSprite();
    }

    function posOf(posId) {
      return spritePositions[posId];
    }

    function dimOfSprite(spriteId) {
      var sprite = sprites[spriteId];
      return {width: sprite.width, height: sprite.height};
    }

    return {
      init:              init,
      createSprite:      createSprite,
      createImageSprite: createImageSprite,
      placeSprite:       placeSprite,
      moveSprite:        moveSprite,
      removeLastSprite:  removeLastSprite,
      posOf:             posOf,
      dimOfSprite:       dimOfSprite
    };
  };

  function FPSCounter() {
    var targetFps         = 30.0;
    var targetFpsMax      = 30.5;
    var targetFpsMin      = 29.5;
    var frameCountMax     = 30;
    var frameCount        = 0;
    var startTime         = 0.0;
    var currentFpsValue   = 0.0;

    function adjustCount(actualFps, targetFps, birdCount) {
      var diff = Math.abs(actualFps - targetFps);
      if (diff < 2.0)
        return 1;

      var computedAdjust = Math.ceil(diff*(birdCount+1)/actualFps/2);
      return computedAdjust;
    }

    // called for each frame update
    function adjustBirds(time, birdCount, bird, addBirds, removeBirds) {
      var adjustmentMade = false;
      if (frameCount === 0) {
        startTime = time;
        frameCount++;
      } else if (frameCount < frameCountMax) {
        frameCount++;
      } else { // frameCount == frameCountMax
        var delta = time - startTime;
        var fps   = 1000.0*frameCountMax/delta;
        currentFpsValue = fps;
        if (fps > targetFpsMax) {
          var addCount = adjustCount(fps, targetFps, birdCount);
          addBirds(bird, addCount);
          adjustmentMade = true;
        }
        else if (fps < targetFpsMin) {
          var reduceCount = adjustCount(fps, targetFps, birdCount);
          removeBirds(reduceCount);
          adjustmentMade = true;
        }
        startTime  = time;
        frameCount = 1;
      }
      return adjustmentMade;
    }

    function currentFps() {
      return currentFpsValue;
    }

    return {
      currentFps:  currentFps,
      adjustBirds: adjustBirds
    };
  };

  function Animator() {
    var animate;
    var useSIMD = false;
    var birdSprite;
    var birdSpriteBase;
    var birdSpriteSIMD;
    var allBirds = [];
    var lastTime = 0.0;

    this.randomXY = function(max) {
      return Math.floor(Math.random() * max);
    }

    this.randomY = function() {
      return Math.floor(Math.random() * this.element.clientHeight / 2);
    }

    this.randomX = function() {
      return Math.floor(Math.random() * this.element.clientWidth);
    }

    this.getStartValue = function(start, max, randomFunc) {
      if (start === "random")
        return randomFunc(max);

      if (start === "center")
        return Math.floor(max / 2);

      return parseInt(start);
    }

    this.addBird = function(birdSprite) {
      var birdWidth = this.surface.dimOfSprite(this.birdSprite).width;
      var x = this.getStartValue(params.startX, this.element.clientWidth - birdWidth, this.randomXY.bind(this));
      var y = this.getStartValue(params.startY, this.element.clientHeight / 2, this.randomXY.bind(this));
      var birdId   = birds.addBird(y, 0.0);
      var spriteId = this.surface.placeSprite(this.birdSprite, x, y);
      this.allBirds.push({birdId: birdId, spriteId: spriteId, startX: x, startY: y});
    }

    this.removeLastBird = function() {
      if (this.allBirds.length > 0) {
        birds.removeLastBird();
        this.surface.removeLastSprite();
        this.allBirds.pop();
      }
    }

    this.addBirds = function(bird, count) {
      for (var i = 0; i < count; ++i)
        this.addBird(bird);
    }

    this.removeBirds = function(count) {
      for (var i = 0; i < count; ++i)
        this.removeLastBird();
    }

    this.removeAllBirds = function() {
      while (this.allBirds.length > 0)
        this.removeLastBird();
    }

    this.blackDotSprite = function(width, height) {
      var rgbaValues = new Uint8ClampedArray(width * height * 4);
      for (var i = 0, n = width * height * 4; i < n; i += 4) {
        rgbaValues[i] = 0;
        rgbaValues[i+1] = 0;
        rgbaValues[i+2] = 0;
        rgbaValues[i+3] = 255;
      }
      return this.surface.createSprite(width, height, rgbaValues);
    }

    this.setUseSIMD = function(use) {
      this.useSIMD = use;
      this.removeAllBirds();
      if (!this.useSIMD)
        this.birdSprite = this.birdSpriteBase;
      else
        this.birdSprite = this.birdSpriteSIMD;
    }

    // main animation function.  One new frame is created and the next one is requested

    this.moveAll = function(time) {
      if (this.animate) {
        if (params.useSetTimeout) {
          setTimeout(this.moveAll.bind(this), 1);
          time = performance.now();
        } else {
          requestAnimationFrame(this.moveAll.bind(this));
        }
      }

      if (typeof time === "undefined")
        return;

      if (params.adjustBirds) {
        if (fpsAccounting.adjustBirds(time, this.allBirds.length, this.birdSprite, this.addBirds.bind(this), this.removeBirds.bind(this)))
          params.self.$.birds.innerText = this.allBirds.length;

        params.self.$.fps.innerText = fpsAccounting.currentFps().toFixed(0);
      }

      if (this.lastTime !== 0.0) {
        var timeDelta = time - this.lastTime;
        if (params.constantAccel) {
          birds.updateAllConstantAccel(timeDelta);
        } else if (this.useSIMD) {
          birds.updateAllSIMD(time - this.lastTime);
        } else {
          birds.updateAll(time - this.lastTime);
        }
      }
      this.lastTime = time;

      for (var i = 0; i < this.allBirds.length; ++i) {
        var bird = this.allBirds[i];
        var pos = birds.posOf(bird.birdId);
        this.surface.moveSprite(bird.spriteId, bird.startX, pos);
      }
    }

    this.init = function() {
      this.useSIMD  = false;
      this.allBirds = [];
      this.lastTime = 0.0;

      this.element = (params.useCanvas) ? dom.canvas : dom.frame;

      this.surface = Surface(dom);
      this.surface.init();

      this.birdSpriteBase = this.surface.createImageSprite(params.basePath + "fbird-spy2.png", 34, 25, params.scale);
      this.birdSpriteSIMD = this.surface.createImageSprite(params.basePath + "fbird2-spy.png", 34, 25, params.scale);
      this.birdSprite = (this.useSIMD) ? this.birdSpriteSIMD : this.birdSpriteBase;

      var birdDim = this.surface.dimOfSprite(this.birdSprite);
      birds.init(this.element.clientHeight - birdDim.height);

      this.addBirds(this.birdSprite, params.initialBirdCount);
    }

    this.start = function() {
      if (!this.animate) {
        this.animate = true;
        this.lastTime = 0.0;
        this.moveAll();
      }
    }

    this.stop = function() {
      this.animate = false;
    }

    this.close = function() {
      this.stop();
      this.removeAllBirds();
    }
  };

  function URLParamsParser(defaults) {
    var parameters = defaults;

    function setValue(key, value) {
      if (typeof value === "string") {
        if (typeof parameters[key] === "boolean")
          value = value === 'true';
        else if (typeof parameters[key] === "number") {
          if (Number.isInteger(parameters[key]))
            value = parseInt(value);
          else
            value = parseFloat(value);
        }
      }
      parameters[key] = value;
    }

    this.parse = function(options) {
      if (typeof options !== "undefined") {
        for (var key in options) {
          if (options.hasOwnProperty(key)) {
            var value = options[key];
            setValue(key, value);
          }
        }
      }
      // override with URL options
      var href = window.location.href;
      var paramMatch = /(?:\?|\&)(\w+)=((?:\w|\.|\%)+)/g;
      var match = paramMatch.exec(href);
      while (match !== null) {
        setValue(match[1], match[2]);
        match = paramMatch.exec(href);
      }
      return parameters;
    }
  }

  var animator = new Animator();
  var birds = BirdTracker();
  var fpsAccounting = FPSCounter();

  function init(options) {
    params = new URLParamsParser({
      "adjustBirds":        true,
      "initialBirdCount":   20,
      "useCanvas":          false,
      "constantAccel":      false,
      "scale":              1.0,
      "startX":             "random",
      "startY":             "random",
      "useSetTimeout":      false,
      "accelSteps":         -1
    }).parse(options);

    dom = params.self.$;
    animator.init();
    initialized = true;
  }

  function close() {
    if (initialized)
      animator.close();
    initialized = false;
  }

  function start() {
    if (initialized)
      animator.start();
  }

  function stop() {
    if (initialized)
      animator.stop();
  }

  function setUseSIMD(use) {
    animator.setUseSIMD(use);
  }

  return {
    init:  init,
    close: close,
    start: start,
    stop:  stop,
    setUseSIMD: setUseSIMD
  };

}());

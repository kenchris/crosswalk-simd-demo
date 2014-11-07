// Original author: Peter Jensen

var fbird = (function() {

  var config = {
    maxBirds: 100000
  };

  var globals = {
    surface: null,
    params: null,
    initialized: false
  };

  var logger = function () {
    var traceEnabled = true;

    function trace(msg) {
      if (traceEnabled) {
        console.log(msg);
      }
    }

    function error(msg) {
      console.log(msg);
    }

    function traceDisable() {
      traceEnabled = false;
    }

    function traceEnable() {
      traceEnabled = true;
    }

    return {
      trace: trace,
      error: error,
      traceEnable: traceEnable,
      traceDisable: traceDisable
    };
  }();

  // Keep track of bird positions and velocities

  var birds = function() {

    var maxPos      = 1000.0;
    var actualBirds = 0;
    var posArray    = new Float32Array(config.maxBirds);
    var velArray    = new Float32Array(config.maxBirds);

    var accelData = {
      steps:     20000,
      interval:  0.002,  // time in millis seconds for each accel value
      values:   [10.0, 9.0, 8.0, 7.0, 6.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0].map(function(v) { return 50 * v; }),
      valueConst: 1000.0
    };

    function init(maxPosition) {
      actualBirds = 0;
      maxPos = maxPosition;
      if (globals.params.accelSteps > 0)
        accelData.steps = globals.params.accelSteps;
    }

    function addBird(pos, vel) {
      if (actualBirds >= config.maxBirds) {
        logger.error("maxBirds exceeded");
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

      for (var i = 0, len = (actualBirds+3)>>2; i < len; ++i) {
        var accelIndex = 0;
        var newVelTruex4;
        var newPosx4 = posArrayx4.getAt(i);
        var newVelx4 = velArrayx4.getAt(i);
        for (var a = 0; a < steps; ++a) {
          var accel              = accelData.values[accelIndex];
          var accelx4            = SIMD.float32x4.splat(accel);
          accelIndex             = (accelIndex + 1) % accelCount;
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
      logger.trace(index + ". pos:" + posArray[index] + ", vel:" + velArray[index]);
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

  }();


  var surface = function() {
    var useCanvas = false;
    var ctx;

    var sprites = [];
    var spritePositions = [];

    function init(element) {
      self = globals.params.self;
      if (self.$.element.tagName === "CANVAS") {
        useCanvas = true;
        ctx = self.$.element.getContext("2d");
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
        logger.error("Cannot create canvas image sprite");
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
      self.$.frame.appendChild(imgClone);
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
  }();

  var fpsAccounting = function() {
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

    function currentFps(time) {
      return currentFpsValue;
    }

    return {
      currentFps:  currentFps,
      adjustBirds: adjustBirds
    };
  }();


  var animation = function() {
    var animate;
    var useSIMD = false;
    var birdSprite;
    var birdSpriteBase;
    var birdSpriteSIMD;
    var allBirds = [];
    var lastTime = 0.0;

    function randomXY(max) {
      return Math.floor(Math.random() * max);
    }

    function randomY() {
      return Math.floor(Math.random() * self.$.element.clientHeight / 2);
    }

    function randomX() {
      return Math.floor(Math.random() * self.$.element.clientWidth);
    }

    function getStartValue(start, max, randomFunc) {
      if (start === "random")
        return randomFunc(max);

      if (start === "center")
        return Math.floor(max / 2);

      return parseInt(start);
    }

    function addBird(birdSprite) {
      var birdWidth = surface.dimOfSprite(birdSprite).width;
      var x = getStartValue(globals.params.startX, self.$.element.clientWidth - birdWidth, randomXY);
      var y = getStartValue(globals.params.startY, self.$.element.clientHeight / 2, randomXY);
      var birdId   = birds.addBird(y, 0.0);
      var spriteId = surface.placeSprite(birdSprite, x, y);
      allBirds.push({birdId: birdId, spriteId: spriteId, startX: x, startY: y});
    }

    function removeLastBird() {
      if (allBirds.length > 0) {
        birds.removeLastBird();
        surface.removeLastSprite();
        allBirds.pop();
      }
    }

    function addBirds(bird, count) {
      for (var i = 0; i < count; ++i) {
        addBird(bird);
      }
    }

    function removeBirds(count) {
      for (var i = 0; i < count; ++i) {
        removeLastBird();
      }
    }

    function removeAllBirds() {
      while (allBirds.length > 0) {
        removeLastBird();
      }
    }

    function blackDotSprite(width, height) {
      var rgbaValues = new Uint8ClampedArray(width * height * 4);
      for (var i = 0, n = width * height * 4; i < n; i += 4) {
        rgbaValues[i] = 0;
        rgbaValues[i+1] = 0;
        rgbaValues[i+2] = 0;
        rgbaValues[i+3] = 255;
      }
      return surface.createSprite(width, height, rgbaValues);
    }

    function setUseSIMD(use) {
      useSIMD = use;
      if (useSIMD)
        birdSprite = birdSpriteBase;
      else
        birdSprite = birdSpriteSIMD;
    }

    // main animation function.  One new frame is created and the next one is requested

    function moveAll(time) {
      if (animate) {
        if (globals.params.useSetTimeout) {
          setTimeout(moveAll, 1);
          time = performance.now();
        } else {
          requestAnimationFrame(moveAll);
        }
      }

      if (typeof time === "undefined")
        return;

      if (globals.params.adjustBirds) {
        if (fpsAccounting.adjustBirds(time, allBirds.length, birdSprite, addBirds, removeBirds))
          self.$.birds.innerText = allBirds.length;

        self.$.fps.innerText = fpsAccounting.currentFps().toFixed(0);
      }

      if (lastTime !== 0.0) {
        var timeDelta = time - lastTime;
        if (globals.params.constantAccel) {
          birds.updateAllConstantAccel(timeDelta);
        } else if (useSIMD) {
          birds.updateAllSIMD(time - lastTime);
        } else {
          birds.updateAll(time - lastTime);
        }
      }
      lastTime = time;

      for (var i = 0; i < allBirds.length; ++i) {
        var bird = allBirds[i];
        var pos = birds.posOf(bird.birdId);
        surface.moveSprite(bird.spriteId, bird.startX, pos);
      }
    }

    function init() {
      // initalize module variables
      useSIMD  = false;
      allBirds = [];
      lastTime = 0.0;

      self = globals.params.self;
      if (globals.params.useCanvas)
        self.$.element = self.$.canvas;
      else
        self.$.element = self.$.frame;

      surface.init();

      birdSpriteBase = surface.createImageSprite(globals.params.basePath + "fbird-spy2.png", 34, 25, globals.params.scale);
      birdSpriteSIMD = surface.createImageSprite(globals.params.basePath + "fbird2-spy.png", 34, 25, globals.params.scale);
      birdSprite     = birdSpriteBase;

      var birdDim = surface.dimOfSprite(birdSpriteBase);
      birds.init(self.$.element.clientHeight - birdDim.height);

      addBirds(birdSprite, globals.params.initialBirdCount);
    }

    function start() {
      if (!animate) {
        animate = true;
        lastTime = 0.0;
        moveAll();
      }
    }

    function stop() {
      animate = false;
    }

    function close() {
      stop();
      removeAllBirds();
    }

    return {
      init:  init,
      setUseSIMD: setUseSIMD,
      start: start,
      stop:  stop,
      close: close
    };
  }();

  // parse URL parameters

  var parameters = function () {

    // default parameters
    var parameters = {
      "adjustBirds":        true,
      "initialBirdCount":   20,
      "useCanvas":          false,
      "constantAccel":      false,
      "scale":              1.0,
      "startX":             "random",
      "startY":             "random",
      "initialize":         true,
      "useSetTimeout":      false,
      "accelSteps":         -1
    };

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

    function parse(options) {
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

    return {
      parse: parse
    };

  }();

  function init(options) {
    globals.params = parameters.parse(options);
    if (globals.params.initialize) {
      animation.init();
      globals.initialized = true;
    }
  }

  function close() {
    if (globals.initialized)
      animation.close();
    globals.initialized = false;
  }

  function start() {
    if (globals.initialized) {
      animation.start();
    }
  }

  function stop() {
    if (globals.initialized) {
      animation.stop();
    }
  }

  return {
    init:  init,
    close: close,
    start: start,
    stop:  stop
  };

}());

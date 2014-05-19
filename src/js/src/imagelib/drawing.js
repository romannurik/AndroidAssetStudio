/*
Copyright 2010 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

//#REQUIRE "includes.js"

imagelib.drawing = {};

imagelib.drawing.context = function(size) {
  var canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.style.setProperty('image-rendering', 'optimizeQuality', null);
  return canvas.getContext('2d');
};

imagelib.drawing.copy = function(dstCtx, src, size) {
  dstCtx.drawImage(src.canvas || src, 0, 0, size.w, size.h);
};

imagelib.drawing.clear = function(ctx, size) {
  ctx.clearRect(0, 0, size.w, size.h);
};

imagelib.drawing.drawCenterInside = function(dstCtx, src, dstRect, srcRect) {
  if (srcRect.w / srcRect.h > dstRect.w / dstRect.h) {
    var h = srcRect.h * dstRect.w / srcRect.w;
     imagelib.drawing.drawImageScaled(dstCtx, src,
        srcRect.x, srcRect.y,
        srcRect.w, srcRect.h,
        dstRect.x, dstRect.y + (dstRect.h - h) / 2,
        dstRect.w, h);
  } else {
    var w = srcRect.w * dstRect.h / srcRect.h;
     imagelib.drawing.drawImageScaled(dstCtx, src,
        srcRect.x, srcRect.y,
        srcRect.w, srcRect.h,
        dstRect.x + (dstRect.w - w) / 2, dstRect.y,
        w, dstRect.h);
  }
};

imagelib.drawing.drawCenterCrop = function(dstCtx, src, dstRect, srcRect) {
  if (srcRect.w / srcRect.h > dstRect.w / dstRect.h) {
    var w = srcRect.h * dstRect.w / dstRect.h;
    imagelib.drawing.drawImageScaled(dstCtx, src,
        srcRect.x + (srcRect.w - w) / 2, srcRect.y,
        w, srcRect.h,
        dstRect.x, dstRect.y,
        dstRect.w, dstRect.h);
  } else {
    var h = srcRect.w * dstRect.h / dstRect.w;
    imagelib.drawing.drawImageScaled(dstCtx, src,
        srcRect.x, srcRect.y + (srcRect.h - h) / 2,
        srcRect.w, h,
        dstRect.x, dstRect.y,
        dstRect.w, dstRect.h);
  }
};

imagelib.drawing.drawImageScaled = function(dstCtx, src, sx, sy, sw, sh, dx, dy, dw, dh) {
  if ((dw < sw / 2 && dh < sh / 2) && imagelib.ALLOW_MANUAL_RESCALE) {
    // scaling down by more than 50%, use an averaging algorithm since canvas.drawImage doesn't
    // do a good job by default
    sx = Math.floor(sx);
    sy = Math.floor(sy);
    sw =  Math.ceil(sw);
    sh =  Math.ceil(sh);
    dx = Math.floor(dx);
    dy = Math.floor(dy);
    dw =  Math.ceil(dw);
    dh =  Math.ceil(dh);

    var tmpCtx = imagelib.drawing.context({ w: sw, h: sh });
    tmpCtx.drawImage(src.canvas || src, -sx, -sy);
    var srcData = tmpCtx.getImageData(0, 0, sw, sh);

    var outCtx = imagelib.drawing.context({ w: dw, h: dh });
    var outData = outCtx.createImageData(dw, dh);

    var tr, tg, tb, ta; // R/G/B/A totals
    var numOpaquePixels;
    var numPixels;

    for (var y = 0; y < dh; y++) {
      for (var x = 0; x < dw; x++) {
        tr = tg = tb = ta = 0;
        numOpaquePixels = numPixels = 0;

        // Average the relevant region from source image
        for (var j = Math.floor(y * sh / dh); j < (y + 1) * sh / dh; j++) {
          for (var i = Math.floor(x * sw / dw); i < (x + 1) * sw / dw; i++) {
            ++numPixels;
            ta += srcData.data[(j * sw + i) * 4 + 3];
            if (srcData.data[(j * sw + i) * 4 + 3] == 0) {
              // disregard transparent pixels when computing average for R/G/B
              continue;
            }
            ++numOpaquePixels;
            tr += srcData.data[(j * sw + i) * 4 + 0];
            tg += srcData.data[(j * sw + i) * 4 + 1];
            tb += srcData.data[(j * sw + i) * 4 + 2];
          }
        }

        outData.data[(y * dw + x) * 4 + 0] = tr / numOpaquePixels;
        outData.data[(y * dw + x) * 4 + 1] = tg / numOpaquePixels;
        outData.data[(y * dw + x) * 4 + 2] = tb / numOpaquePixels;
        outData.data[(y * dw + x) * 4 + 3] = ta / numPixels;
      }
    }

    outCtx.putImageData(outData, 0, 0);
    dstCtx.drawImage(outCtx.canvas, dx, dy);

  } else {
    // use canvas.drawImage for all other cases, or if the page doesn't allow manual rescale
    dstCtx.drawImage(src.canvas || src, sx, sy, sw, sh, dx, dy, dw, dh);
  }
};

imagelib.drawing.trimRectWorkerJS_ = [
"self['onmessage'] = function(event) {                                       ",
"  var l = event.data.size.w, t = event.data.size.h, r = 0, b = 0;           ",
"                                                                            ",
"  var alpha;                                                                ",
"  for (var y = 0; y < event.data.size.h; y++) {                             ",
"    for (var x = 0; x < event.data.size.w; x++) {                           ",
"      alpha = event.data.imageData.data[                                    ",
"          ((y * event.data.size.w + x) << 2) + 3];                          ",
"      if (alpha >= event.data.minAlpha) {                                   ",
"        l = Math.min(x, l);                                                 ",
"        t = Math.min(y, t);                                                 ",
"        r = Math.max(x, r);                                                 ",
"        b = Math.max(y, b);                                                 ",
"      }                                                                     ",
"    }                                                                       ",
"  }                                                                         ",
"                                                                            ",
"  if (l > r) {                                                              ",
"    // no pixels, couldn't trim                                             ",
"    postMessage({ x: 0, y: 0, w: event.data.size.w, h: event.data.size.h });",
"    return;                                                                 ",
"  }                                                                         ",
"                                                                            ",
"  postMessage({ x: l, y: t, w: r - l + 1, h: b - t + 1 });                  ",
"};                                                                          ",
""].join('\n');

imagelib.drawing.getTrimRect = function(ctx, size, minAlpha, callback) {
  callback = callback || function(){};

  if (!ctx.canvas) {
    // Likely an image
    var src = ctx;
    ctx = imagelib.drawing.context(size);
    imagelib.drawing.copy(ctx, src, size);
  }

  if (minAlpha == 0)
    callback({ x: 0, y: 0, w: size.w, h: size.h });

  minAlpha = minAlpha || 1;

  var worker = imagelib.util.runWorkerJs(
      imagelib.drawing.trimRectWorkerJS_,
      {
        imageData: ctx.getImageData(0, 0, size.w, size.h),
        size: size,
        minAlpha: minAlpha
      },
      callback);

  return worker;
};

imagelib.drawing.getCenterOfMass = function(ctx, size, minAlpha, callback) {
  callback = callback || function(){};

  if (!ctx.canvas) {
    // Likely an image
    var src = ctx;
    ctx = imagelib.drawing.context(size);
    imagelib.drawing.copy(ctx, src, size);
  }

  if (minAlpha == 0)
    callback({ x: size.w / 2, y: size.h / 2 });

  minAlpha = minAlpha || 1;

  var l = size.w, t = size.h, r = 0, b = 0;
  var imageData = ctx.getImageData(0, 0, size.w, size.h);

  var sumX = 0;
  var sumY = 0;
  var n = 0; // number of pixels > minAlpha
  var alpha;
  for (var y = 0; y < size.h; y++) {
    for (var x = 0; x < size.w; x++) {
      alpha = imageData.data[((y * size.w + x) << 2) + 3];
      if (alpha >= minAlpha) {
        sumX += x;
        sumY += y;
        ++n;
      }
    }
  }

  if (n <= 0) {
    // no pixels > minAlpha, just use center
    callback({ x: size.w / 2, h: size.h / 2 });
  }

  callback({ x: Math.round(sumX / n), y: Math.round(sumY / n) });
};

imagelib.drawing.copyAsAlpha = function(dstCtx, src, size, onColor, offColor) {
  onColor = onColor || '#fff';
  offColor = offColor || '#000';

  dstCtx.save();
  dstCtx.clearRect(0, 0, size.w, size.h);
  dstCtx.globalCompositeOperation = 'source-over';
  imagelib.drawing.copy(dstCtx, src, size);
  dstCtx.globalCompositeOperation = 'source-atop';
  dstCtx.fillStyle = onColor;
  dstCtx.fillRect(0, 0, size.w, size.h);
  dstCtx.globalCompositeOperation = 'destination-atop';
  dstCtx.fillStyle = offColor;
  dstCtx.fillRect(0, 0, size.w, size.h);
  dstCtx.restore();
};

imagelib.drawing.makeAlphaMask = function(ctx, size, fillColor) {
  var src = ctx.getImageData(0, 0, size.w, size.h);
  var dst = ctx.createImageData(size.w, size.h);
  var srcData = src.data;
  var dstData = dst.data;
  var i, g;
  for (var y = 0; y < size.h; y++) {
    for (var x = 0; x < size.w; x++) {
      i = (y * size.w + x) << 2;
      g = 0.30 * srcData[i] +
              0.59 * srcData[i + 1] +
              0.11 * srcData[i + 2];
      dstData[i] = dstData[i + 1] = dstData[i + 2] = 255;
      dstData[i + 3] = g;
    }
  }
  ctx.putImageData(dst, 0, 0);

  if (fillColor) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.restore();
  }
};

imagelib.drawing.applyFilter = function(filter, ctx, size) {
  var src = ctx.getImageData(0, 0, size.w, size.h);
  var dst = ctx.createImageData(size.w, size.h);
  filter.apply(src, dst);
  ctx.putImageData(dst, 0, 0);
};

(function() {
  function slowblur_(radius, ctx, size) {
    var rows = Math.ceil(radius);
    var r = rows * 2 + 1;
    var matrix = new Array(r * r);
    var sigma = radius / 3;
    var sigma22 = 2 * sigma * sigma;
    var sqrtPiSigma22 = Math.sqrt(Math.PI * sigma22);
    var radius2 = radius * radius;
    var total = 0;
    var index = 0;
    var distance2;
    for (var y = -rows; y <= rows; y++) {
      for (var x = -rows; x <= rows; x++) {
        distance2 = 1.0*x*x + 1.0*y*y;
        if (distance2 > radius2)
          matrix[index] = 0;
        else
          matrix[index] = Math.exp(-distance2 / sigma22) / sqrtPiSigma22;
        total += matrix[index];
        index++;
      }
    }

    imagelib.drawing.applyFilter(
        new ConvolutionFilter(matrix, total, 0, true),
        ctx, size);
  }

  function glfxblur_(radius, ctx, size) {
    var canvas = fx.canvas();
    var texture = canvas.texture(ctx.canvas);
    canvas.draw(texture).triangleBlur(radius).update();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(canvas, 0, 0);
  }

  imagelib.drawing.blur = function(radius, ctx, size) {
    try {
      if (size.w > 128 || size.h > 128) {
        glfxblur_(radius, ctx, size);
      } else {
        slowblur_(radius, ctx, size);
      }

    } catch (e) {
      // WebGL unavailable, use the slower blur
      slowblur_(radius, ctx, size);
    }
  };
})();

imagelib.drawing.fx = function(effects, dstCtx, src, size) {
  effects = effects || [];

  var outerEffects = [];
  var innerEffects = [];
  var fillEffects = [];

  for (var i = 0; i < effects.length; i++) {
    if (/^outer/.test(effects[i].effect)) outerEffects.push(effects[i]);
    else if (/^inner/.test(effects[i].effect)) innerEffects.push(effects[i]);
    else if (/^fill/.test(effects[i].effect)) fillEffects.push(effects[i]);
  }

  var padLeft = 0, padTop, padRight, padBottom;
  var paddedSize;
  var tmpCtx, tmpCtx2;

  // Render outer effects
  for (var i = 0; i < outerEffects.length; i++) {
    padLeft = Math.max(padLeft, outerEffects[i].blur || 0); // blur radius
  }
  padTop = padRight = padBottom = padLeft;

  paddedSize = {
    w: size.w + padLeft + padRight,
    h: size.h + padTop + padBottom
  };

  tmpCtx = imagelib.drawing.context(paddedSize);

  for (var i = 0; i < outerEffects.length; i++) {
    var effect = outerEffects[i];

    dstCtx.save(); // D1
    tmpCtx.save(); // T1

    switch (effect.effect) {
      case 'outer-shadow':
        // The below method (faster) fails in Safari and other browsers, for some reason. Likely
        // something to do with the source-atop blending mode.
        // TODO: investigate why it fails in Safari

        // imagelib.drawing.clear(tmpCtx, size);
        // imagelib.drawing.copy(tmpCtx, src.canvas || src, size);
        // if (effect.blur)
        //   imagelib.drawing.blur(effect.blur, tmpCtx, size);
        // tmpCtx.globalCompositeOperation = 'source-atop';
        // tmpCtx.fillStyle = effect.color || '#000';
        // tmpCtx.fillRect(0, 0, size.w, size.h);
        // if (effect.translate)
        //   dstCtx.translate(effect.translate.x || 0, effect.translate.y || 0);
        // 
        // dstCtx.globalAlpha = Math.max(0, Math.min(1, effect.opacity || 1));
        // imagelib.drawing.copy(dstCtx, tmpCtx, size);

        imagelib.drawing.clear(tmpCtx, paddedSize);

        tmpCtx.save(); // T2
        tmpCtx.translate(padLeft, padTop);
        imagelib.drawing.copyAsAlpha(tmpCtx, src.canvas || src, size);
        tmpCtx.restore(); // T2

        if (effect.blur)
          imagelib.drawing.blur(effect.blur, tmpCtx, paddedSize);

        imagelib.drawing.makeAlphaMask(tmpCtx, paddedSize, effect.color || '#000');
        if (effect.translate)
          dstCtx.translate(effect.translate.x || 0, effect.translate.y || 0);

        dstCtx.globalAlpha = Math.max(0, Math.min(1, effect.opacity || 1));
        dstCtx.translate(-padLeft, -padTop);
        imagelib.drawing.copy(dstCtx, tmpCtx, paddedSize);
        break;
    }

    dstCtx.restore(); // D1
    tmpCtx.restore(); // T1
  }

  dstCtx.save(); // D1

  // Render object with optional fill effects (only take first fill effect)
  tmpCtx = imagelib.drawing.context(size);

  imagelib.drawing.clear(tmpCtx, size);
  imagelib.drawing.copy(tmpCtx, src.canvas || src, size);
  var fillOpacity = 1.0;

  if (fillEffects.length) {
    var effect = fillEffects[0];

    tmpCtx.save(); // T1
    tmpCtx.globalCompositeOperation = 'source-atop';

    switch (effect.effect) {
      case 'fill-color':
        tmpCtx.fillStyle = effect.color;
        break;

      case 'fill-lineargradient':
        var gradient = tmpCtx.createLinearGradient(
            effect.from.x, effect.from.y, effect.to.x, effect.to.y);
        for (var i = 0; i < effect.colors.length; i++) {
          gradient.addColorStop(effect.colors[i].offset, effect.colors[i].color);
        }
        tmpCtx.fillStyle = gradient;
        break;
    }

    fillOpacity = Math.max(0, Math.min(1, effect.opacity || 1));

    tmpCtx.fillRect(0, 0, size.w, size.h);
    tmpCtx.restore(); // T1
  }

  dstCtx.globalAlpha = fillOpacity;
  imagelib.drawing.copy(dstCtx, tmpCtx, size);
  dstCtx.globalAlpha = 1.0;

  // Render inner effects
  var translate;
  padLeft = padTop = padRight = padBottom = 0;
  for (var i = 0; i < innerEffects.length; i++) {
    translate = effect.translate || {};
    padLeft   = Math.max(padLeft,   (innerEffects[i].blur || 0) + Math.max(0,  translate.x || 0));
    padTop    = Math.max(padTop,    (innerEffects[i].blur || 0) + Math.max(0,  translate.y || 0));
    padRight  = Math.max(padRight,  (innerEffects[i].blur || 0) + Math.max(0, -translate.x || 0));
    padBottom = Math.max(padBottom, (innerEffects[i].blur || 0) + Math.max(0, -translate.y || 0));
  }

  paddedSize = {
    w: size.w + padLeft + padRight,
    h: size.h + padTop + padBottom
  };

  tmpCtx = imagelib.drawing.context(paddedSize);
  tmpCtx2 = imagelib.drawing.context(paddedSize);

  for (var i = 0; i < innerEffects.length; i++) {
    var effect = innerEffects[i];

    dstCtx.save(); // D2
    tmpCtx.save(); // T1

    switch (effect.effect) {
      case 'inner-shadow':
        imagelib.drawing.clear(tmpCtx, paddedSize);

        tmpCtx.save(); // T2
        tmpCtx.translate(padLeft, padTop);
        imagelib.drawing.copyAsAlpha(tmpCtx, src.canvas || src, size, '#fff', '#000');
        tmpCtx.restore(); // T2

        tmpCtx2.save(); // T2
        tmpCtx2.translate(padLeft, padTop);
        imagelib.drawing.copyAsAlpha(tmpCtx2, src.canvas || src, size);
        tmpCtx2.restore(); // T2

        if (effect.blur)
          imagelib.drawing.blur(effect.blur, tmpCtx2, paddedSize);
        imagelib.drawing.makeAlphaMask(tmpCtx2, paddedSize, '#000');
        if (effect.translate)
          tmpCtx.translate(effect.translate.x || 0, effect.translate.y || 0);

        tmpCtx.globalCompositeOperation = 'source-over';
        imagelib.drawing.copy(tmpCtx, tmpCtx2, paddedSize);

        imagelib.drawing.makeAlphaMask(tmpCtx, paddedSize, effect.color);
        dstCtx.globalAlpha = Math.max(0, Math.min(1, effect.opacity || 1));
        dstCtx.translate(-padLeft, -padTop);
        imagelib.drawing.copy(dstCtx, tmpCtx, paddedSize);
        break;
    }

    tmpCtx.restore(); // T1
    dstCtx.restore(); // D2
  };

  dstCtx.restore(); // D1
};

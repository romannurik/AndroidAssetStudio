/*
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {default as tinycolor} from 'tinycolor2';

import {Effects} from './Effects';

export const Drawing = {};

Drawing.context = function(size) {
  var canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.style.setProperty('image-rendering', 'optimizeQuality', null);
  return canvas.getContext('2d');
};

Drawing.drawCenterInside = function(dstCtx, src, dstRect, srcRect) {
  if (srcRect.w / srcRect.h > dstRect.w / dstRect.h) {
    var h = srcRect.h * dstRect.w / srcRect.w;
     Drawing.drawImageScaled(dstCtx, src,
        srcRect.x, srcRect.y,
        srcRect.w, srcRect.h,
        dstRect.x, dstRect.y + (dstRect.h - h) / 2,
        dstRect.w, h);
  } else {
    var w = srcRect.w * dstRect.h / srcRect.h;
     Drawing.drawImageScaled(dstCtx, src,
        srcRect.x, srcRect.y,
        srcRect.w, srcRect.h,
        dstRect.x + (dstRect.w - w) / 2, dstRect.y,
        w, dstRect.h);
  }
};

Drawing.drawCenterCrop = function(dstCtx, src, dstRect, srcRect) {
  if (srcRect.w / srcRect.h > dstRect.w / dstRect.h) {
    var w = srcRect.h * dstRect.w / dstRect.h;
    Drawing.drawImageScaled(dstCtx, src,
        srcRect.x + (srcRect.w - w) / 2, srcRect.y,
        w, srcRect.h,
        dstRect.x, dstRect.y,
        dstRect.w, dstRect.h);
  } else {
    var h = srcRect.w * dstRect.h / dstRect.w;
    Drawing.drawImageScaled(dstCtx, src,
        srcRect.x, srcRect.y + (srcRect.h - h) / 2,
        srcRect.w, h,
        dstRect.x, dstRect.y,
        dstRect.w, dstRect.h);
  }
};

Drawing.drawImageScaled = function(dstCtx, src, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (dw <= 0 || dh <= 0 || sw <= 0 || sh <= 0) {
    console.error('Width/height must be at least 0');
    return;
  }

  src = src.canvas || src;

  // algorithm: when scaling down, downsample by at most a factor of 2 per iteration
  // to avoid poor browser downsampling
  while (dw < sw / 2 || dh < sh / 2) {
    let tmpDw = Math.ceil(Math.max(dw, sw / 2));
    let tmpDh = Math.ceil(Math.max(dh, sh / 2));
    let tmpCtx = Drawing.context({ w: tmpDw, h: tmpDh });

    tmpCtx.clearRect(0, 0, tmpDw, tmpDh);
    tmpCtx.drawImage(src, sx, sy, sw, sh, 0, 0, tmpDw, tmpDh);

    src = tmpCtx.canvas;
    sx = sy = 0;
    sw = tmpDw;
    sh = tmpDh;
  }

  dstCtx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
};

Drawing.drawLayers = function(dstCtx, size, layerTree) {
  drawLayer_(dstCtx, layerTree);

  function drawLayer_(dstCtx, layer) {
    let layerCtx = Drawing.context(size);

    if (layer.children) {
      drawGroup_(layerCtx, layer);
    } else if (layer.draw) {
      layer.draw(layerCtx);
    }

    if (layer.effects) {
      // apply effects in a new buffer
      let effectsCtx = Drawing.context(size);
      Effects.fx(layer.effects, effectsCtx, layerCtx, size);
      layerCtx = effectsCtx;
    }

    dstCtx.drawImage(layerCtx.canvas, 0, 0);
  }

  function drawGroup_(dstCtx, group) {
    let dstCtxStack = [dstCtx];

    group.children.filter(layer => !!layer).forEach(layer => {
      drawLayer_(dstCtxStack[dstCtxStack.length - 1], layer);
      if (layer.mask) {
        // draw future layers into a separate buffer (later gets masked)
        let maskedContentCtx = Drawing.context(size);
        dstCtxStack.push(maskedContentCtx);
      }
    });

    while (dstCtxStack.length > 1) {
      let targetCtx = dstCtxStack[dstCtxStack.length - 2];
      let contentCtx = dstCtxStack[dstCtxStack.length - 1];
      targetCtx.save();
      targetCtx.globalCompositeOperation = 'source-atop';
      targetCtx.drawImage(contentCtx.canvas, 0, 0);
      targetCtx.restore();
      dstCtxStack.pop();
    }
  }
};

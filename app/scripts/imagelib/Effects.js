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

import {Drawing} from './Drawing';

const OUTER_EFFECTS = new Set(['outer-shadow', 'cast-shadow']);
const INNER_EFFECTS = new Set(['inner-shadow', 'score']);
const FILL_EFFECTS = new Set(['fill-color', 'fill-lineargradient', 'fill-radialgradient']);


export const Effects = {
  fx(effects, dstCtx, src, size) {
    effects = effects || [];

    let outerEffects = effects.filter(e => OUTER_EFFECTS.has(e.effect));
    let innerEffects = effects.filter(e => INNER_EFFECTS.has(e.effect));
    let fillEffects = effects.filter(e => FILL_EFFECTS.has(e.effect));

    let tmpCtx, bufferCtx;

    // First render outer effects
    let padLeft, padRight, padBottom, padTop;
    padLeft = padRight = padBottom = padTop =
        outerEffects.reduce((r, e) => Math.max(r, e.blur || 0), 0);

    let paddedSize = {
      w: size.w + padLeft + padRight,
      h: size.h + padTop + padBottom
    };

    tmpCtx = Drawing.context(paddedSize);

    outerEffects.forEach(effect => {
      switch (effect.effect) {
        case 'cast-shadow':
          tmpCtx.clearRect(0, 0, paddedSize.w, paddedSize.h);
          tmpCtx.drawImage(src.canvas || src, padLeft, padTop);
          renderCastShadow_(tmpCtx, paddedSize.w, paddedSize.h);
          dstCtx.drawImage(tmpCtx.canvas, padLeft, padTop, size.w, size.h, 0, 0, size.w, size.h);
          break;

        case 'outer-shadow':
          let tColor = tinycolor(effect.color || '#000');
          let alpha = tColor.getAlpha();
          tColor.setAlpha(1);

          if (supportsCanvasFilters_()) {
            tmpCtx.save();
            tmpCtx.clearRect(0, 0, paddedSize.w, paddedSize.h);
            tmpCtx.filter = `blur(${effect.blur || 0}px)`;
            tmpCtx.drawImage(src.canvas || src, padLeft, padTop);
            tmpCtx.globalCompositeOperation = 'source-atop';
            tmpCtx.fillStyle = tColor.toRgbString();
            tmpCtx.fillRect(0, 0, paddedSize.w, paddedSize.h);
            tmpCtx.restore();

            dstCtx.save();
            dstCtx.translate(effect.translateX || 0, effect.translateY || 0);
            dstCtx.globalAlpha = alpha;
            dstCtx.drawImage(tmpCtx.canvas, padLeft, padTop, size.w, size.h, 0, 0, size.w, size.h);
            dstCtx.restore();
          } else {
            dstCtx.save();
            dstCtx.globalAlpha = alpha;
            dstCtx.shadowOffsetX = paddedSize.w;
            dstCtx.shadowOffsetY = 0;
            dstCtx.shadowColor = tColor.toRgbString();
            dstCtx.shadowBlur = canvasShadowBlurForRadius_(effect.blur || 0);
            dstCtx.drawImage(src.canvas || src,
                (effect.translateX || 0) - paddedSize.w,
                (effect.translateY || 0));
            dstCtx.restore();
          }
          break;
      }
    });

    // Next, render the source, fill effects (first one), and inner effects
    // in a buffer (bufferCtx)
    bufferCtx = Drawing.context(size);
    tmpCtx = Drawing.context(size);
    tmpCtx.drawImage(src.canvas || src, 0, 0);
    tmpCtx.globalCompositeOperation = 'source-atop';

    // Fill effects
    let fillOpacity = 1.0;
    if (fillEffects.length) {
      let effect = fillEffects[0];
      fillOpacity = ('opacity' in effect) ? effect.opacity : 1;

      tmpCtx.save();

      switch (effect.effect) {
        case 'fill-color': {
          tmpCtx.fillStyle = effect.color;
          break;
        }

        case 'fill-lineargradient': {
          let gradient = tmpCtx.createLinearGradient(
              effect.fromX, effect.fromY, effect.toX, effect.toY);
          effect.colors.forEach(({offset, color}) => gradient.addColorStop(offset, color));
          tmpCtx.fillStyle = gradient;
          break;
        }

        case 'fill-radialgradient': {
          let gradient = tmpCtx.createRadialGradient(
              effect.centerX, effect.centerY, 0, effect.centerX, effect.centerY, effect.radius);
          effect.colors.forEach(({offset, color}) => gradient.addColorStop(offset, color));
          tmpCtx.fillStyle = gradient;
          break;
        }
      }

      tmpCtx.fillRect(0, 0, size.w, size.h);
      tmpCtx.restore();
    }

    bufferCtx.save();
    bufferCtx.globalAlpha = fillOpacity;
    bufferCtx.drawImage(tmpCtx.canvas, 0, 0);
    bufferCtx.restore();

    // Render inner effects
    padLeft = padTop = padRight = padBottom = 0;
    innerEffects.forEach(effect => {
      padLeft   = Math.max(padLeft,   (effect.blur || 0) + Math.max(0,  (effect.translateX || 0)));
      padTop    = Math.max(padTop,    (effect.blur || 0) + Math.max(0,  (effect.translateY || 0)));
      padRight  = Math.max(padRight,  (effect.blur || 0) + Math.max(0, -(effect.translateX || 0)));
      padBottom = Math.max(padBottom, (effect.blur || 0) + Math.max(0, -(effect.translateY || 0)));
    });

    paddedSize = {
      w: size.w + padLeft + padRight,
      h: size.h + padTop + padBottom
    };

    tmpCtx = Drawing.context(paddedSize);

    innerEffects.forEach(effect => {
      switch (effect.effect) {
        case 'inner-shadow':
          tmpCtx.save();
          tmpCtx.clearRect(0, 0, paddedSize.w, paddedSize.h);
          if (supportsCanvasFilters_()) {
            tmpCtx.filter = `blur(${effect.blur || 0}px)`;
            tmpCtx.drawImage(bufferCtx.canvas,
                padLeft + (effect.translateX || 0),
                padTop + (effect.translateY || 0));
          } else {
            tmpCtx.shadowOffsetX = paddedSize.w;
            tmpCtx.shadowOffsetY = 0;
            tmpCtx.shadowColor = '#000'; // color doesn't matter
            tmpCtx.shadowBlur = canvasShadowBlurForRadius_(effect.blur || 0);
            tmpCtx.drawImage(bufferCtx.canvas,
                padLeft + (effect.translateX || 0) - paddedSize.w,
                padTop + (effect.translateY || 0));
          }
          tmpCtx.globalCompositeOperation = 'source-out';
          tmpCtx.fillStyle = effect.color;
          tmpCtx.fillRect(0, 0, paddedSize.w, paddedSize.h);
          tmpCtx.restore();

          bufferCtx.save();
          bufferCtx.globalCompositeOperation = 'source-atop';
          bufferCtx.drawImage(tmpCtx.canvas, -padLeft, -padTop);
          bufferCtx.restore();
          break;
      }
    });

    // Draw buffer (source, fill, inner effects) on top of outer effects
    dstCtx.drawImage(bufferCtx.canvas, 0, 0);
  }
}


function renderCastShadow_(ctx, w, h) {
  let tmpCtx = Drawing.context({w, h});
  // render the cast shadow
  for (let o = 1; o < Math.max(w, h); o++) {
    tmpCtx.drawImage(ctx.canvas, o, o);
  }
  tmpCtx.globalCompositeOperation = 'source-in';
  tmpCtx.fillStyle = '#000';
  tmpCtx.fillRect(0, 0, w, h);
  let gradient = tmpCtx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, 'rgba(0, 0, 0, .2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  tmpCtx.fillStyle = gradient;
  tmpCtx.fillRect(0, 0, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(tmpCtx.canvas, 0, 0);
}


function supportsCanvasFilters_() {
  if (!supportsCanvasFilters_.hasOwnProperty('cached')) {
    supportsCanvasFilters_.cached = (
        document.createElement('canvas').getContext('2d').filter == 'none');
  }

  return supportsCanvasFilters_.cached;
}


// determined empirically: http://codepen.io/anon/pen/ggLOqJ
const BLUR_MULTIPLIER = [
  {re: /chrome/i, mult: 2.7},
  {re: /safari/i, mult: 1.8},
  {re: /firefox/i, mult: 1.7},
  {re: /./i, mult: 1.7}, // default
].find(x => x.re.test(navigator.userAgent)).mult;


function canvasShadowBlurForRadius_(radius) {
  return radius * BLUR_MULTIPLIER;
}

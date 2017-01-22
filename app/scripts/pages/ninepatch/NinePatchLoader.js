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

import {imagelib} from '../../imagelib';

const numberForRGBA = (r,g,b,a) => (r << 16) + (g << 8) + (b << 0) + (a << 24);
const BLACK = numberForRGBA(0,0,0,255);
const RED = numberForRGBA(255,0,0,255);

export const NinePatchLoader = {
  loadNinePatchIntoStage(ctx, stage) {
    let srcSize = { w: ctx.canvas.width, h: ctx.canvas.height };
    let imgData = ctx.getImageData(0, 0, srcSize.w, srcSize.h);
    let size = { w: srcSize.w - 2, h: srcSize.h - 2 };
    let rects = {
      contentRect: { x: 0, y: 0, w: size.w, h: size.h },
      stretchRect: { x: 0, y: 0, w: size.w, h: size.h },
      opticalBoundsRect: { x: 0, y: 0, w: size.w, h: size.h }
    };

    function _getPixel(x, y) {
      return (imgData.data[(y * srcSize.w + x) * 4 + 0] << 16) // r
          + (imgData.data[(y * srcSize.w + x) * 4 + 1] << 8) // g
          + (imgData.data[(y * srcSize.w + x) * 4 + 2] << 0) // b
          + (imgData.data[(y * srcSize.w + x) * 4 + 3] << 24); // a
    }

    let inRegion;

    // Read stretch rect
    inRegion = false;
    for (let x = 0; x < size.w; x++) {
      let p = _getPixel(x + 1, 0);
      if (!inRegion && p == BLACK) {
        rects.stretchRect.x = x;
        inRegion = true;
      } else if (inRegion && p != BLACK) {
        rects.stretchRect.w = x - rects.stretchRect.x;
        inRegion = false;
      }
    }

    inRegion = false;
    for (let y = 0; y < size.h; y++) {
      let p = _getPixel(0, y + 1);
      if (!inRegion && p == BLACK) {
        rects.stretchRect.y = y;
        inRegion = true;
      } else if (inRegion && p != BLACK) {
        rects.stretchRect.h = y - rects.stretchRect.y;
        inRegion = false;
      }
    }

    // Read content rect
    inRegion = false;
    for (let x = 0; x < size.w; x++) {
      let p = _getPixel(x + 1, srcSize.h - 1);
      if (!inRegion && p == BLACK) {
        rects.contentRect.x = x;
        inRegion = true;
      } else if (inRegion && p != BLACK) {
        rects.contentRect.w = x - rects.contentRect.x;
        inRegion = false;
      }
    }

    inRegion = false;
    for (let y = 0; y < size.h; y++) {
      let p = _getPixel(srcSize.w - 1, y + 1);
      if (!inRegion && p == BLACK) {
        rects.contentRect.y = y;
        inRegion = true;
      } else if (inRegion && p != BLACK) {
        rects.contentRect.h = y - rects.contentRect.y;
        inRegion = false;
      }
    }

    // Read optical bounds rect
    inRegion = false;
    for (let x = 0; x < size.w; x++) {
      let p = _getPixel(x + 1, srcSize.h - 1);
      if (!inRegion && p != RED) {
        rects.opticalBoundsRect.x = x;
        inRegion = true;
      } else if (inRegion && p == RED) {
        rects.opticalBoundsRect.w = x - rects.opticalBoundsRect.x;
        inRegion = false;
      }
    }
    for (let y = 0; y < size.h; y++) {
      let p = _getPixel(srcSize.w - 1, y + 1);
      if (!inRegion && p != RED) {
        rects.opticalBoundsRect.y = y;
        inRegion = true;
      } else if (inRegion && p == RED) {
        rects.opticalBoundsRect.h = y - rects.opticalBoundsRect.y;
        inRegion = false;
      }
    }

    // Inset the context
    let newCtx = imagelib.Drawing.context(size);
    newCtx.drawImage(ctx.canvas, 1, 1, size.w, size.h, 0, 0, size.w, size.h);
    stage.loadSourceImage(newCtx, rects);
  }
};

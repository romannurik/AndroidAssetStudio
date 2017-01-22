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
import {Summer} from './Summer';

export const NinePatchTrimming = {
  /**
   * Trims excess edges of the nine patch... any pixels that are the same
   * as the top-left most pixel color. Same as Photoshop's Trim feature.
   */
  trimEdges(stage) {
    if (!stage.srcCtx) {
      return;
    }

    const srcData = stage.srcCtx.getImageData(0, 0, stage.srcSize.w, stage.srcSize.h);

    // Always trim by top-left pixel color
    const trimPixel = getPixel_(stage, srcData, 0, 0);

    let insetRect = {l:0, t:0, r:0, b:0};
    let x, y;

    // Trim top
    trimTop:
    for (y = 0; y < stage.srcSize.h; y++) {
      for (x = 0; x < stage.srcSize.w; x++) {
        if (getPixel_(stage, srcData, x, y) != trimPixel) {
          break trimTop;
        }
      }
    }
    insetRect.t = y;
    // Trim left
    trimLeft:
    for (x = 0; x < stage.srcSize.w; x++) {
      for (y = 0; y < stage.srcSize.h; y++) {
        if (getPixel_(stage, srcData, x, y) != trimPixel) {
          break trimLeft;
        }
      }
    }
    insetRect.l = x;
    // Trim bottom
    trimBottom:
    for (y = stage.srcSize.h - 1; y >= 0; y--) {
      for (x = 0; x < stage.srcSize.w; x++) {
        if (getPixel_(stage, srcData, x, y) != trimPixel) {
          break trimBottom;
        }
      }
    }
    insetRect.b = stage.srcSize.h - y - 1;
    // Trim right
    trimRight:
    for (x = stage.srcSize.w - 1; x >= 0; x--) {
      for (y = 0; y < stage.srcSize.h; y++) {
        if (getPixel_(stage, srcData, x, y) != trimPixel) {
          break trimRight;
        }
      }
    }
    insetRect.r = stage.srcSize.w - x - 1;

    if (insetRect.l <= 0 && insetRect.t <= 0 && insetRect.r <= 0 && insetRect.b <= 0) {
      // No-op
      return;
    }

    // Build a new stage with inset values
    const size = {
      w: stage.srcSize.w - insetRect.l - insetRect.r,
      h: stage.srcSize.h - insetRect.t - insetRect.b
    };

    const rects = {
      contentRect: constrain_(size, {
        x: stage.contentRect.x - insetRect.l,
        y: stage.contentRect.y - insetRect.t,
        w: stage.contentRect.w,
        h: stage.contentRect.h
      }),
      stretchRect: constrain_(size, {
        x: stage.stretchRect.x - insetRect.l,
        y: stage.stretchRect.y - insetRect.t,
        w: stage.stretchRect.w,
        h: stage.stretchRect.h
      }),
      opticalBoundsRect: constrain_(size, {
        x: stage.opticalBoundsRect.x - insetRect.l,
        y: stage.opticalBoundsRect.y - insetRect.t,
        w: stage.opticalBoundsRect.w,
        h: stage.opticalBoundsRect.h
      })
    };

    stage.name = `${stage.name}-EDGES_TRIMMED`;
    let newCtx = imagelib.Drawing.context(size);
    newCtx.drawImage(stage.srcCtx.canvas,
        insetRect.l, insetRect.t, size.w, size.h,
        0, 0, size.w, size.h);
    stage.loadSourceImage(newCtx, rects);
  },

  /**
   * Trims excess rows and columns from the stretch region of the given
   * nine patch stage.
   */
  trimStretchRegion(stage) {
    if (!stage.srcCtx) {
      return;
    }

    const srcData = stage.srcCtx.getImageData(0, 0, stage.srcSize.w, stage.srcSize.h);

    let collapseX = stage.stretchRect.w > 4; // generally going to start as true
    let collapseY = stage.stretchRect.h > 4; // generally going to start as true
    let x, y;

    // See if collapse is possible in either direction by comparing row/column sums.
    const summer = new Summer();

    // See if can be horizontally collapsed.
    let first = true;
    let firstSum = -1;
    for (x = stage.stretchRect.x; x < (stage.stretchRect.x + stage.stretchRect.w); x++) {
      // Compute column
      summer.reset();
      for (y = 0; y < stage.srcSize.h; y++) {
        summer.addNext(getPixel_(stage, srcData, x, y));
      }
      if (first) {
        firstSum = summer.compute();
        first = false;
      } else if (summer.compute() != firstSum) {
        collapseX = false;
        break;
      }
    }

    first = true;
    for (y = stage.stretchRect.y; y < (stage.stretchRect.y + stage.stretchRect.h); y++) {
      // Compute row
      summer.reset();
      for (x = 0; x < stage.srcSize.w; x++) {
        summer.addNext(getPixel_(stage, srcData, x, y));
      }
      if (first) {
        firstSum = summer.compute();
        first = false;
      } else if (summer.compute() != firstSum) {
        collapseY = false;
        break;
      }
    }

    if (!collapseX && !collapseY) {
      // No-op
      return;
    }

    const fixed = {
      l: stage.stretchRect.x,
      t: stage.stretchRect.y,
      r: stage.srcSize.w - stage.stretchRect.x - stage.stretchRect.w,
      b: stage.srcSize.h - stage.stretchRect.y - stage.stretchRect.h
    };

    const middle = {
      w: collapseX ? 4 : stage.stretchRect.w,
      h: collapseY ? 4 : stage.stretchRect.h
    };

    const size = {
      w: fixed.l + middle.w + fixed.r,
      h: fixed.t + middle.h + fixed.b
    };

    // Redraw components
    const ctx = imagelib.Drawing.context(size);

    // TL
    if (fixed.l && fixed.t)
      ctx.drawImage(stage.srcCtx.canvas,
          0, 0, fixed.l, fixed.t,
          0, 0, fixed.l, fixed.t);

    // BL
    if (fixed.l && fixed.b)
      ctx.drawImage(stage.srcCtx.canvas,
          0, stage.srcSize.h - fixed.b, fixed.l, fixed.b,
          0, size.h - fixed.b, fixed.l, fixed.b);

    // TR
    if (fixed.r && fixed.t)
      ctx.drawImage(stage.srcCtx.canvas,
          stage.srcSize.w - fixed.r, 0, fixed.r, fixed.t,
          size.w - fixed.r, 0, fixed.r, fixed.t);

    // BR
    if (fixed.r && fixed.b)
      ctx.drawImage(stage.srcCtx.canvas,
          stage.srcSize.w - fixed.r, stage.srcSize.h - fixed.b, fixed.r, fixed.b,
          size.w - fixed.r, size.h - fixed.b, fixed.r, fixed.b);

    // Top
    if (fixed.t)
      ctx.drawImage(stage.srcCtx.canvas,
          fixed.l, 0, stage.stretchRect.w, fixed.t,
          fixed.l, 0, size.w - fixed.l - fixed.r, fixed.t);

    // Left
    if (fixed.l)
      ctx.drawImage(stage.srcCtx.canvas,
          0, fixed.t, fixed.l, stage.stretchRect.h,
          0, fixed.t, fixed.l, size.h - fixed.t - fixed.b);

    // Right
    if (fixed.r)
      ctx.drawImage(stage.srcCtx.canvas,
          stage.srcSize.w - fixed.r, fixed.t, fixed.r, stage.stretchRect.h,
          size.w - fixed.r, fixed.t, fixed.r, size.h - fixed.t - fixed.b);

    // Bottom
    if (fixed.b)
      ctx.drawImage(stage.srcCtx.canvas,
          fixed.l, stage.srcSize.h - fixed.b, stage.stretchRect.w, fixed.b,
          fixed.l, size.h - fixed.b, size.w - fixed.l - fixed.r, fixed.b);

    // Middle
    ctx.drawImage(stage.srcCtx.canvas,
        fixed.l, fixed.t, stage.stretchRect.w, stage.stretchRect.h,
        fixed.l, fixed.t, size.w - fixed.l - fixed.r, size.h - fixed.t - fixed.b);

    const rects = {
      stretchRect: {
        x: stage.stretchRect.x,
        y: stage.stretchRect.y,
        w: middle.w,
        h: middle.h
      },
      contentRect: {
        x: stage.contentRect.x,
        y: stage.contentRect.y,
        w: stage.contentRect.w + middle.w - stage.stretchRect.w,
        h: stage.contentRect.h + middle.h - stage.stretchRect.h
      },
      opticalBoundsRect: {
        x: stage.opticalBoundsRect.x,
        y: stage.opticalBoundsRect.y,
        w: stage.opticalBoundsRect.w + middle.w - stage.stretchRect.w,
        h: stage.opticalBoundsRect.h + middle.h - stage.stretchRect.h
      }
    };

    stage.name = `${stage.name}-STRETCH_TRIMMED`;
    stage.loadSourceImage(ctx, rects);
  },

  /**
   * Tries to automatically detect the given region.
   *
   * Region should be one of 'stretch', 'padding', or 'opticalbounds'
   */
  detectRegion(stage, regionToFind) {
    if (!stage.srcCtx) {
      return null;
    }

    const srcData = stage.srcCtx.getImageData(0, 0, stage.srcSize.w, stage.srcSize.h);

    let x, y;

    // First find optical bounds
    // This works by taking an alpha value histogram and finding two maxima to determine
    // low and high alphas.
    let alphaHistogram = [];
    for (x = 0; x < stage.srcSize.w; x++) {
      for (y = 0; y < stage.srcSize.h; y++) {
        let alpha = srcData.data[(y * stage.srcSize.w + x) * 4 + 3];
        alphaHistogram[alpha] = alphaHistogram[alpha] ? alphaHistogram[alpha] + 1 : 1;
      }
    }

    let max1 = 0, max1Freq = 0, max2 = 0, max2Freq = 0;
    for (let i = 0; i < 256; i++) {
      if (alphaHistogram[i] > max1Freq) {
        max2 = max1;
        max2Freq = max1Freq;
        max1 = i;
        max1Freq = alphaHistogram[i];
      } else if (alphaHistogram[i] > max2Freq) {
        max2 = i;
        max2Freq = alphaHistogram[i];
      }
    }

    let alphaMin = (max1 < max2) ? max1 : max2;
    let alphaMax = (max1 > max2) ? max1 : max2;

    const ALPHA_THRESHOLD = 5;

    var opticalBoundsRect = {l:-1, r:-1, t:-1, b:-1};

    // Find left optical bound
    obrLeft:
    for (x = 0; x < stage.srcSize.w; x++) {
      for (y = 0; y < stage.srcSize.h; y++) {
        var alpha = srcData.data[(y * stage.srcSize.w + x) * 4 + 3];
        if (alpha >= alphaMax - ALPHA_THRESHOLD) {
          opticalBoundsRect.l = x;
          break obrLeft;
        }
      }
    }
    // Find right optical bound
    obrRight:
    for (x = stage.srcSize.w - 1; x >= 0; x--) {
      for (y = 0; y < stage.srcSize.h; y++) {
        var alpha = srcData.data[(y * stage.srcSize.w + x) * 4 + 3];
        if (alpha >= alphaMax - ALPHA_THRESHOLD) {
          opticalBoundsRect.r = x;
          break obrRight;
        }
      }
    }
    // Find top optical bound
    obrTop:
    for (y = 0; y < stage.srcSize.h; y++) {
      for (x = 0; x < stage.srcSize.w; x++) {
        var alpha = srcData.data[(y * stage.srcSize.w + x) * 4 + 3];
        if (alpha >= alphaMax - ALPHA_THRESHOLD) {
          opticalBoundsRect.t = y;
          break obrTop;
        }
      }
    }
    // Find bottom optical bound
    obrBottom:
    for (y = stage.srcSize.h - 1; y >= 0; y--) {
      for (x = 0; x < stage.srcSize.w; x++) {
        let alpha = srcData.data[(y * stage.srcSize.w + x) * 4 + 3];
        if (alpha >= alphaMax - ALPHA_THRESHOLD) {
          opticalBoundsRect.b = y;
          break obrBottom;
        }
      }
    }

    let returnRect;

    if (opticalBoundsRect.l >= 0 && opticalBoundsRect.r > opticalBoundsRect.l
        && opticalBoundsRect.t >= 0 && opticalBoundsRect.b > opticalBoundsRect.t) {
      let rect = {
        x: opticalBoundsRect.l,
        y: opticalBoundsRect.t,
        w: opticalBoundsRect.r - opticalBoundsRect.l + 1,
        h: opticalBoundsRect.b - opticalBoundsRect.t + 1
      };

      if (regionToFind == 'opticalbounds' || regionToFind == 'padding') {
        return rect;
      }
    }

    // Next find stretch regions. Only use them if they're within the optical bounds
    if (regionToFind == 'stretch') {
      let newStretchRect = Object.assign({}, stage.stretchRect);

      const summer = new Summer();
      let sums = [];
      for (y = 0; y < stage.srcSize.h; y++) {
        // Compute row
        summer.reset();
        for (let x = 0; x < stage.srcSize.w; x++) {
          summer.addNext(getPixel_(stage, srcData, x, y));
        }
        sums.push(summer.compute());
      }

      let ranges = getEqualRanges_(sums);
      for (let i = 0; i < ranges.length; i++) {
        let range = ranges[i];
        let passesThreshold = false;
        // Check if this row has a minimum alpha
        for (x = 0; x < stage.srcSize.w; x++) {
          let alpha = srcData.data[(range.start * stage.srcSize.w + x) * 4 + 3];
          if (alpha >= alphaMax - ALPHA_THRESHOLD) {
            passesThreshold = true;
            break;
          }
        }
        if (passesThreshold) {
          newStretchRect.y = range.start;
          newStretchRect.h = range.length;
          if (range.length >= 4) {
            // inset a bit to prevent scaling artifacts
            newStretchRect.y++;
            newStretchRect.h -= 2;
          }
          break;
        }
      }

      summer.reset();
      sums = [];
      for (x = 0; x < stage.srcSize.w; x++) {
        // Compute column
        summer.reset();
        for (y = 0; y < stage.srcSize.h; y++) {
          summer.addNext(getPixel_(stage, srcData, x, y));
        }
        sums.push(summer.compute());
      }

      ranges = getEqualRanges_(sums);
      for (let i = 0; i < ranges.length; i++) {
        let range = ranges[i];
        let passesThreshold = false;
        // Check if this column has a minimum alpha
        for (y = 0; y < stage.srcSize.h; y++) {
          let alpha = srcData.data[(y * stage.srcSize.w + range.start) * 4 + 3];
          if (alpha >= alphaMax - ALPHA_THRESHOLD) {
            passesThreshold = true;
            break;
          }
        }

        if (passesThreshold) {
          newStretchRect.x = range.start;
          newStretchRect.w = range.length;
          if (range.length >= 4) {
            // inset a bit to prevent scaling artifacts
            newStretchRect.x++;
            newStretchRect.w -= 2;
          }
          break;
        }
      }

      return newStretchRect;
    }

    return null;
  },
};


function getPixel_(stage, srcData, x, y) {
  return (srcData.data[(y * stage.srcSize.w + x) * 4 + 0] << 16) // r
      + (srcData.data[(y * stage.srcSize.w + x) * 4 + 1] << 8) // g
      + (srcData.data[(y * stage.srcSize.w + x) * 4 + 2] << 0) // b
      + (srcData.data[(y * stage.srcSize.w + x) * 4 + 3] << 24); // a
}


function constrain_(size, rect) {
  if (rect.x < 0) {
    rect.w += rect.x;
    rect.x += -rect.x;
  }
  if (rect.x + rect.w > size.w) {
    rect.w = size.w - rect.x;
  }
  if (rect.y < 0) {
    rect.h += rect.y;
    rect.y += -rect.y;
  }
  if (rect.y + rect.h > size.h) {
    rect.h = size.h - rect.y;
  }
  return rect;
}

// Finds ranges of equal values within an array
function getEqualRanges_(arr) {
  var equalRanges = [];
  var start = -1;
  var startVal = 0;
  for (var i = 0; i < arr.length; i++) {
    if (start < 0) {
      start = i;
      startVal = arr[i];
    } else if (arr[i] != startVal) {
      if (start != i - 1) {
        equalRanges.push({start: start, length: i - start});
      }

      start = i;
      startVal = arr[i];
    }
  }
  if (start != arr.length - 1) {
    equalRanges.push({start: start, length: arr.length - start});
  }
  return equalRanges.sort(function(x, y){ return y.length - x.length; });
}
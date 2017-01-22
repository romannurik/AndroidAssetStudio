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

export const Analysis = {};

Analysis.TRIM_RECT_WORKER_JS = `
    self.onmessage = function(event) {
      var l = event.data.size.w, t = event.data.size.h, r = 0, b = 0;

      var alpha;
      for (var y = 0; y < event.data.size.h; y++) {
        for (var x = 0; x < event.data.size.w; x++) {
          alpha = event.data.imageData.data[
              ((y * event.data.size.w + x) << 2) + 3];
          if (alpha >= event.data.minAlpha) {
            l = Math.min(x, l);
            t = Math.min(y, t);
            r = Math.max(x, r);
            b = Math.max(y, b);
          }
        }
      }

      if (l > r) {
        // no pixels, couldn't trim
        postMessage({ x: 0, y: 0, w: event.data.size.w, h: event.data.size.h });
        return;
      }

      postMessage({ x: l, y: t, w: r - l + 1, h: b - t + 1 });
    };`

Analysis.MAX_TRIM_SRC_SIZE = 500;

Analysis.getTrimRect = function(ctx, size, minAlpha) {
  if (!ctx.canvas) {
    // Likely an image
    let src = ctx;
    ctx = Drawing.context(size);
    ctx.drawImage(src, 0, 0);
  }

  let scale = 1;
  if (size.w > Analysis.MAX_TRIM_SRC_SIZE || size.h > Analysis.MAX_TRIM_SRC_SIZE) {
    scale = (size.w > Analysis.MAX_TRIM_SRC_SIZE)
        ? Analysis.MAX_TRIM_SRC_SIZE / size.w
        : Analysis.MAX_TRIM_SRC_SIZE / size.h;
    let scaledSize = { w: size.w * scale, h: size.h * scale };
    let tmpCtx = Drawing.context(scaledSize);
    tmpCtx.drawImage(ctx.canvas, 0, 0, size.w, size.h, 0, 0, scaledSize.w, scaledSize.h);
    ctx = tmpCtx;
    size = scaledSize;
  }

  let worker;
  let promise = new Promise((resolve, reject) => {
    if (minAlpha == 0) {
      resolve({ x: 0, y: 0, w: size.w, h: size.h });
    }

    minAlpha = minAlpha || 1;

    worker = runWorkerJs_(
        Analysis.TRIM_RECT_WORKER_JS,
        {
          imageData: ctx.getImageData(0, 0, size.w, size.h),
          size,
          minAlpha
        },
        resultingRect => {
          resultingRect.x /= scale;
          resultingRect.y /= scale;
          resultingRect.w /= scale;
          resultingRect.h /= scale;
          resolve(resultingRect)
          worker = null;
        });
  });

  Object.defineProperty(promise, 'worker', {
    get: () => worker
  });

  return promise;
};

Analysis.getCenterOfMass = function(ctx, size, minAlpha) {
  return new Promise((resolve, reject) => {
    if (!ctx.canvas) {
      // Likely an image
      var src = ctx;
      ctx = Drawing.context(size);
      ctx.drawImage(src, 0, 0);
    }

    if (minAlpha == 0) {
      resolve({ x: size.w / 2, y: size.h / 2 });
    }

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
      resolve({ x: size.w / 2, h: size.h / 2 });
    }

    resolve({ x: Math.round(sumX / n), y: Math.round(sumY / n) });
  });
};


/**
 * Helper method for running inline Web Workers, if the browser can support
 * them. If the browser doesn't support inline Web Workers, run the script
 * on the main thread, with this function body's scope, using eval. Browsers
 * must provide BlobBuilder, URL.createObjectURL, and Worker support to use
 * inline Web Workers. Most features such as importScripts() are not
 * currently supported, so this only works for basic workers.
 * @param {String} js The inline Web Worker Javascript code to run. This code
 *     must use 'self' and not 'this' as the global context variable.
 * @param {Object} params The parameters object to pass to the worker.
 *     Equivalent to calling Worker.postMessage(params);
 * @param {Function} callback The callback to run when the worker calls
 *     postMessage. Equivalent to adding a 'message' event listener on a
 *     Worker object and running callback(event.data);
 */
function runWorkerJs_(js, params, callback) {
  var URL = window.URL || window.webkitURL || window.mozURL;
  var Worker = window.Worker;

  if (URL && Worker && hasBlobConstructor_()) {
    // The Blob constructor, Worker, and window.URL.createObjectURL are all available,
    // so we can use inline workers.
    var bb = new Blob([js], {type:'text/javascript'});
    var worker = new Worker(URL.createObjectURL(bb));
    worker.onmessage = function(event) {
      callback(event.data);
    };
    worker.postMessage(params);
    return worker;

  } else {
    // We can't use inline workers, so run the worker JS on the main thread.
    (function() {
      var __DUMMY_OBJECT__ = {};
      // Proxy to Worker.onmessage
      var postMessage = function(result) {
        callback(result);
      };
      // Bind the worker to this dummy object. The worker will run
      // in this scope.
      eval('var self=__DUMMY_OBJECT__;\n' + js);
      // Proxy to Worker.postMessage
      __DUMMY_OBJECT__.onmessage({
        data: params
      });
    })();

    // Return a dummy Worker.
    return {
      terminate: function(){}
    };
  }
};

// https://github.com/gildas-lormeau/zip.js/issues/17#issuecomment-8513258
// thanks Eric!
function hasBlobConstructor_() {
  try {
    return !!new Blob();
  } catch(e) {
    return false;
  }
}

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

export const Util = {
  getMultBaseMdpi(density) {
    switch (density) {
      case 'xxxhdpi': return 4.00;
      case  'xxhdpi': return 3.00;
      case   'xhdpi': return 2.00;
      case    'hdpi': return 1.50;
      case   'tvdpi': return 1.33125;
      case    'mdpi': return 1.00;
      case    'ldpi': return 0.75;
    }
    return 1.0;
  },

  getDpiForDensity(density) {
    switch (density) {
      case 'xxxhdpi': return 640;
      case  'xxhdpi': return 480;
      case   'xhdpi': return 320;
      case    'hdpi': return 240;
      case   'tvdpi': return 213;
      case    'mdpi': return 160;
      case    'ldpi': return 120;
    }
    return 160;
  },

  mult(s, mult) {
    let d = {};
    for (let k in s) {
      d[k] = s[k] * mult;
    }
    return d;
  },

  multRound(s, mult) {
    let d = {};
    for (let k in s) {
      d[k] = Math.round(s[k] * mult);
    }
    return d;
  },

  sanitizeResourceName(s) {
    return s.toLowerCase().replace(/[\s-\.]/g, '_').replace(/[^\w_]/g, '');
  },

  // TODO: support Safari
  downloadFile(content, filename) {
    let anchor = $('<a>').hide().appendTo(document.body);
    let blob = content;
    if (!(content instanceof Blob)) {
      blob = new Blob([content], {type: 'application/octet-stream'});
    }
    let url = window.URL.createObjectURL(blob);
    anchor.attr({
      href: url,
      download: filename
    });
    anchor.get(0).click();
    setTimeout(() => {
      anchor.remove();
      window.URL.revokeObjectURL(url);
    }, 5000);
  },

  loadImageFromUri(uri) {
    return new Promise((resolve, reject) => {
      let img = document.createElement('img');
      img.onload = () => resolve(img);
      img.onerror = () => reject();
      img.src = uri;
    });
  },

  debugCtx(ctx) {
    if (Util.debugCtx.$lastEl) {
      Util.debugCtx.$lastEl.remove();
    }

    Util.debugCtx.$lastEl = $('<img>')
        .css({
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255, 0, 0, 0.5)',
          pointerEvents: 'none',
        })
        .attr('src', ctx.canvas.toDataURL())
        .appendTo(document.body);
  },

  debounce(delay, fn) {
    let timeout;

    return (...args) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        fn(...args)
        timeout = null;
      }, delay);
    };
  },
};
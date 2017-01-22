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

import {Util} from './Util';

export const Hash = {
  bindFormToDocumentHash(form) {
    if (this.boundForm_) {
      console.error('already bound to a form');
      return;
    }

    this.boundForm_ = form;

    form.onChange(Util.debounce(100, () => {
      this.currentHash_ = paramsToHash_(form.getValuesSerialized());
      window.history.replaceState({}, '', '#' + this.currentHash_);
    }));

    let maybeUpdateHash_ = () => {
      // Don't use document.location.hash because it automatically
      // resolves URI-escaped entities.
      let newHash = paramsToHash_(hashToParams_(
          (document.location.href.match(/#.*/) || [''])[0]));
      if (newHash != this.currentHash_) {
        form.setValuesSerialized(hashToParams_(newHash));
        this.currentHash_ = newHash;
      }
    };

    $(window).on('hashchange', maybeUpdateHash_);

    maybeUpdateHash_();
  }
};

function hashToParams_(hash) {
  const params = {};
  hash = hash.replace(/^[?#]/, '');

  hash.split('&').forEach(entry => {
    let [path, val] = entry.split('=', 2);
    path = decodeURIComponent(path || '');
    val = decodeURIComponent(val || '');

    // Most of the time path == key, but for objects like a.b=1, we need to
    // descend into the hierachy.
    let pathArr = path.split('.');
    let obj = params;
    pathArr.slice(0, -1).forEach(pathPart => {
      obj[pathPart] = obj[pathPart] || {};
      obj = obj[pathPart];
    });
    let key = pathArr[pathArr.length - 1];
    if (key in obj) {
      // Handle array values.
      if (Array.isArray(obj[key])) {
        obj[key].push(val);
      } else {
        obj[key] = [obj[key], val];
      }
    } else {
      obj[key] = val;
    }
  });

  return params;
}

function paramsToHash_(params, prefix) {
  const hashArr = [];
  const keyPath_ = k => encodeURIComponent((prefix ? prefix + '.' : '') + k);
  const pushKeyValue_ = (k, v) => {
    if (v === false) v = 0;
    if (v === true)  v = 1;
    hashArr.push(keyPath_(k) + '=' + encodeURIComponent(v.toString()));
  };

  for (let key in params) {
    let val = params[key];
    if (val === undefined || val === null) {
      continue;
    }

    if (Array.isArray(val)) {
      val.forEach(v => pushKeyValue_(key, v));
    } else if (typeof val == 'object') {
      hashArr.push(paramsToHash_(val, keyPath_(key)));
    } else {
      pushKeyValue_(key, val);
    }
  }

  return hashArr.join('&');
}
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

imagelib.util = {};

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
imagelib.util.runWorkerJs = function(js, params, callback) {
  var URL = window.URL || window.webkitURL || window.mozURL;
  var Worker = window.Worker;

  if (URL && Worker && imagelib.util.hasBlobConstructor()) {
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
imagelib.util.hasBlobConstructor = function() {
  try {
    return !!new Blob();
  } catch(e) {
    return false;
  }
};

// http://en.wikipedia.org/wiki/Adler32
imagelib.util.adler32 = function(arr) {
  arr = arr || [];
  var adler = new imagelib.util.Adler32();
  for (var i = 0; i < arr.length; i++) {
    adler.addNext(arr[i]);
  }
  return adler.compute();
};

imagelib.util.Adler32 = function() {
  this.reset();
};
imagelib.util.Adler32._MOD_ADLER = 65521;
imagelib.util.Adler32.prototype.reset = function() {
  this._a = 1;
  this._b = 0;
  this._index = 0;
};
imagelib.util.Adler32.prototype.addNext = function(value) {
  this._a = (this._a + value) % imagelib.util.Adler32._MOD_ADLER;
  this._b = (this._b + this._a) % imagelib.util.Adler32._MOD_ADLER;
};
imagelib.util.Adler32.prototype.compute = function() {
  return (this._b << 16) | this._a;
};

imagelib.util.Summer = imagelib.util.Adler32;
imagelib.util.Summer.prototype = imagelib.util.Adler32.prototype;
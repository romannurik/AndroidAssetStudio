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

imagelib.loadImageResources = function(images, callback) {
  var imageResources = {};

  var checkForCompletion = function() {
    for (var id in images) {
      if (!(id in imageResources))
        return;
    }
    (callback || function(){})(imageResources);
    callback = null;
  };

  for (var id in images) {
    var img = document.createElement('img');
    img.src = images[id];
    (function(img, id) {
      img.onload = function() {
        imageResources[id] = img;
        checkForCompletion();
      };
      img.onerror = function() {
        imageResources[id] = null;
        checkForCompletion();
      }
    })(img, id);
  }
};

imagelib.loadFromUri = function(uri, callback) {
  callback = callback || function(){};

  var img = document.createElement('img');
  img.src = uri;
  img.onload = function() {
    callback(img);
  };
  img.onerror = function() {
    callback(null);
  }
};

imagelib.toDataUri = function(img) {
  var canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  return canvas.toDataURL();
};
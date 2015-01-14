/*
Copyright 2014 Google Inc.

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
//#REQUIRE "stackblur.js"

imagelib.effects = {};

imagelib.effects.renderLongShadow = function(ctx, w, h, shade) {
  var imgData = ctx.getImageData(0, 0, w, h);

  for(var y = 0; y < imgData.height; y++) {
    for(var x = 0; x < imgData.width; x++) {
      if (imagelib.effects.isInShade(imgData, x, y)) {
        imagelib.effects.castShade(imgData, x, y, shade);
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
};

imagelib.effects.renderDropShadow = function(ctx, w, h, shade) {
  var imgData = ctx.getImageData(0, 0, w, h);
  for(var y = 0; y < imgData.height; y++) {
    for(var x = 0; x < imgData.width; x++) {
      if (imagelib.effects.isUnderImage(imgData, x, y)) {
        var color = [0, 0, 0, shade];
        // Change the image color to semi-transparent black for the shadow
        imagelib.effects.setColor(imgData, x, y, color);
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  // Blur amount must be multiple of size to accommodate different icon sizes
  var blurRadius = w / 20;
  // Blur the shadow
  stackBlurImage(ctx, blurRadius, w, h);
}

imagelib.effects.renderScore = function(ctx, w, h, shade) {
  var scoreShade = shade / 2;
  var imgData = ctx.getImageData(0, 0, w, h);
  for(var y = 0; y < imgData.height/2; y++) {
    for(var x = 0; x < imgData.width; x++) {
      var color = [0, 0, 0, scoreShade];
      imagelib.effects.setColor(imgData, x, y, color);
    }
  }
  ctx.putImageData(imgData, 0, 0);
};

imagelib.effects.isInShade = function(imgData, x, y) {
  var data = imgData.data;
  while (true) {
    // traverse towards top/left
    x -= 1;
    y -= 1;
    if (x < 0 || y < 0) {
      // reached edge
      return false;
    }
    if (imagelib.effects.getAlpha(imgData, x, y)) {
      // alpha value casts shade
      return true;
    }
  }
};

imagelib.effects.isUnderImage = function(imgData, x, y) {
  var data = imgData.data;
  return imagelib.effects.getAlpha(imgData, x, y);
};

imagelib.effects.castShade = function(imgData, x, y, shade) {
  var n = shade;
  // Old linear shade casting
  //var step = n / (imgData.width + imgData.height);
  //var alpha = n - ((x + y) * step);
  
  // Alternate radial shade casting
  var step = n / (Math.sqrt(Math.pow(imgData.width, 2) + Math.pow(imgData.height, 2)));
  var dist = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
  var alpha = n - ((dist) * step);
  var color = [0, 0, 0, alpha];
  //if (imgData.width == 48) console.log('shade alpha = ' + alpha + ' for ' + x + ',' + y);
  return imagelib.effects.setColor(imgData, x, y, color);
};

imagelib.effects.setColor = function(imgData, x, y, color) {
  var index = (y * imgData.width + x) * 4;
  var data = imgData.data;
  data[index] = color[0];
  data[index + 1] = color[1];
  data[index + 2] = color[2];
  data[index + 3] = color[3];
};

imagelib.effects.getAlpha = function(imgData, x, y) {
  var data = imgData.data;
  var index = (y * imgData.width + x) * 4 + 3;
  return data[index];
};

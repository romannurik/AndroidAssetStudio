/*
Copyright 2012 Google Inc.

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

studio.ui = {};

studio.ui.createImageOutputGroup = function(params) {
  return $('<div>')
    .addClass('out-image-group')
    .addClass(params.dark ? 'dark' : 'light')
    .append($('<div>')
      .addClass('label')
      .text(params.label))
    .appendTo(params.container);
};


studio.ui.createImageOutputSlot = function(params) {
  return $('<div>')
    .addClass('out-image-block')
    .append($('<div>')
      .addClass('label')
      .text(params.label))
    .append($('<img>')
      .addClass('out-image')
      .attr('id', params.id))
    .appendTo(params.container);
};


studio.ui.drawImageGuideRects = function(ctx, size, guides) {
  guides = guides || [];

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size.w, size.h);
  ctx.globalAlpha = 1.0;

  var guideColors = studio.ui.drawImageGuideRects.guideColors_;

  for (var i = 0; i < guides.length; i++) {
    ctx.strokeStyle = guideColors[(i - 1) % guideColors.length];
    ctx.strokeRect(guides[i].x + 0.5, guides[i].y + 0.5, guides[i].w - 1, guides[i].h - 1);
  }

  ctx.restore();
};
studio.ui.drawImageGuideRects.guideColors_ = [
  '#f00'
];

studio.ui.setupDragout = function() {
  if (studio.ui.setupDragout.completed_) {
    return;
  }
  studio.ui.setupDragout.completed_ = true;

  $(document).ready(function() {
    document.body.addEventListener('dragstart', function(e) {
      var a = e.target;
      if (a.classList.contains('dragout')) {
        e.dataTransfer.setData('DownloadURL', a.dataset.downloadurl);
      }
    }, false);
  });
};

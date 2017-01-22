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
import {NinePatchTrimming} from './NinePatchTrimming';

const EMPTY_RECT = {x: 0, y: 0, w: 0, h: 0};

const SLOP_PIXELS = 10;

export class NinePatchStage {
  constructor() {
    this.zoom = 1;
    this.matteColor = 'light';
    this.editMode = 'stretch';
    this.stretchRect = Object.assign({}, EMPTY_RECT);
    this.contentRect = Object.assign({}, EMPTY_RECT);
    this.opticalBoundsRect = Object.assign({}, EMPTY_RECT);
    this.name = 'default';
    this.changeListeners_ = [];

    this.$stage = $('.nine-patch-stage');
    this.$canvasContainer = $('.stage-canvas-container');

    this.setupUi();
    this.setupDragging();

    $(window).on('resize', () => {
      this.relayout();
      this.redrawOverlay();
    });
  }

  onChange(listener) {
    this.changeListeners_.push(listener);
  }

  notifyChange_() {
    this.changeListeners_.forEach(fn => fn());
  }

  setupUi() {
    // Stage code
    this.$topLabel = $('<div>').addClass('canvas-label label-vertical').hide().appendTo('body');
    this.$leftLabel = $('<div>').addClass('canvas-label label-horizontal').hide().appendTo('body');
    this.$rightLabel = $('<div>').addClass('canvas-label label-horizontal').hide().appendTo('body');
    this.$bottomLabel = $('<div>').addClass('canvas-label label-vertical').hide().appendTo('body');

    $('.stage-which input').on('change', ev => {
      this.editMode = $(ev.currentTarget).val();
      $('.trim-button').toggle(this.editMode == 'stretch');
      $('.find-region-button').text({
        stretch: 'Auto-stretch',
        padding: 'Auto-padding',
        opticalbounds: 'Auto-bounds'
      }[this.editMode]);
      $('.stage-which input').prop('checked', false);
      $(ev.currentTarget).prop('checked', true);
      this.redrawOverlay();
    });

    $('.stage-matte-color input').on('change', ev => {
      this.matteColor = $(ev.currentTarget).val();
      $(document.body).attr('data-theme', this.matteColor);
      $('.stage-matte-color input').prop('checked', false);
      $(ev.currentTarget).prop('checked', true);
      this.redrawImage();
    });

    $('.trim-edge-button').click(() => NinePatchTrimming.trimEdges(this));
    $('.trim-stretch-button').click(() => NinePatchTrimming.trimStretchRegion(this));
    $('.find-region-button').click(() => {
      let rect = NinePatchTrimming.detectRegion(this, this.editMode);
      if (!rect) {
        return;
      }

      if (this.editMode == 'stretch') {
        this.stretchRect = rect;
      } else if (this.editMode == 'opticalbounds') {
        this.opticalBoundsRect = rect;
      } else if (this.editMode == 'padding') {
        this.contentRect = rect;
      }

      this.saveRects();
      this.redrawOverlay();
      this.notifyChange_();
    });
  }

  setupDragging() {
    let mouseUpHandler_, draggingMouseMoveHandler_;

    let getEditRect_ = () => ({
      stretch: this.stretchRect,
      padding: this.contentRect,
      opticalbounds: this.opticalBoundsRect
    }[this.editMode]);

    this.$canvasContainer
        .on('mousedown', ev => {
          this.dragging = true;
          this.redrawOverlay();
          $(window)
              .on('mouseup', mouseUpHandler_)
              .on('mousemove', draggingMouseMoveHandler_);
        })
        .on('mousemove', ev => {
          if (!this.$imageCanvas) {
            return;
          }

          if (this.dragging) {
            return; // handled by other mousemove handler
          }

          let editRect = getEditRect_();
          let offs = this.$canvasContainer.offset();
          let offsetX = ev.pageX - offs.left;
          let offsetY = ev.pageY - offs.top;

          this.editLeft = this.editRight = this.editTop = this.editBottom = false;

          if (offsetX >= editRect.x * this.zoom - SLOP_PIXELS &&
              offsetX <= editRect.x * this.zoom + SLOP_PIXELS) {
            this.editLeft = true;
          } else if (offsetX >= (editRect.x + editRect.w) * this.zoom - SLOP_PIXELS &&
                     offsetX <= (editRect.x + editRect.w) * this.zoom + SLOP_PIXELS) {
            this.editRight = true;
          }

          if (offsetY >= editRect.y * this.zoom - SLOP_PIXELS &&
              offsetY <= editRect.y * this.zoom + SLOP_PIXELS) {
            this.editTop = true;
          } else if (offsetY >= (editRect.y + editRect.h) * this.zoom - SLOP_PIXELS &&
                     offsetY <= (editRect.y + editRect.h) * this.zoom + SLOP_PIXELS) {
            this.editBottom = true;
          }

          let cursor = 'default';
          if (this.editLeft) {
            if (this.editTop) {
              cursor = 'nw-resize';
            } else if (this.editBottom) {
              cursor = 'sw-resize';
            } else {
              cursor = 'w-resize';
            }
          } else if (this.editRight) {
            if (this.editTop) {
              cursor = 'ne-resize';
            } else if (this.editBottom) {
              cursor = 'se-resize';
            } else {
              cursor = 'e-resize';
            }
          } else if (this.editTop) {
            cursor = 'n-resize';
          } else if (this.editBottom) {
            cursor = 's-resize';
          }
          this.$canvasContainer.css('cursor', cursor);
        });

      mouseUpHandler_ = ev => {
        if (this.dragging) {
          this.dragging = false;
          this.redrawOverlay();
          this.saveRects();
        }

        $(window)
            .off('mousemove', draggingMouseMoveHandler_)
            .off('mouseup', mouseUpHandler_);
      };

      draggingMouseMoveHandler_ = ev => {
        ev.preventDefault();
        ev.stopPropagation();

        let editRect = getEditRect_();
        let offs = this.$canvasContainer.offset();
        let offsetX = ev.pageX - offs.left;
        let offsetY = ev.pageY - offs.top;

        if (this.editLeft) {
          let newX = Math.max(0, Math.min(editRect.x + editRect.w - 1, Math.round(offsetX / this.zoom)));
          editRect.w = editRect.w + editRect.x - newX;
          editRect.x = newX;
        }
        if (this.editTop) {
          let newY = Math.max(0, Math.min(editRect.y + editRect.h - 1, Math.round(offsetY / this.zoom)));
          editRect.h = editRect.h + editRect.y - newY;
          editRect.y = newY;
        }
        if (this.editRight) {
          editRect.w = Math.min(this.srcSize.w - editRect.x,
              Math.max(1, Math.round(offsetX / this.zoom) - editRect.x));
        }
        if (this.editBottom) {
          editRect.h = Math.min(this.srcSize.h - editRect.y,
              Math.max(1, Math.round(offsetY / this.zoom) - editRect.y));
        }

        this.redrawOverlay();
        this.notifyChange_();
      };
  }

  loadSourceImage(srcCtx, initRects = {}) {
    this.$canvasContainer.empty();
    $('.editor-button').attr('disabled', srcCtx ? null : 'disabled');

    if (!srcCtx) {
      return;
    }

    this.srcCtx = srcCtx;

    // Update the stage source size
    let srcSizeChanged = false;
    let newSrcSize = { w: this.srcCtx.canvas.width, h: this.srcCtx.canvas.height };
    srcSizeChanged = !this.srcSize
        || this.srcSize.w != newSrcSize.w
        || this.srcSize.h != newSrcSize.h;
    this.srcSize = newSrcSize;

    // Reset the stretch, padding/content, and optical bounds regions
    if (srcSizeChanged) {
      this.stretchRect = initRects.stretchRect || {
        x: Math.floor(this.srcSize.w / 3),
        y: Math.floor(this.srcSize.h / 3),
        w: Math.ceil(this.srcSize.w / 3),
        h: Math.ceil(this.srcSize.h / 3)
      };

      this.contentRect = initRects.contentRect || { x: 0, y: 0, w: this.srcSize.w, h: this.srcSize.h };
      this.opticalBoundsRect = initRects.opticalBoundsRect || { x: 0, y: 0, w: this.srcSize.w, h: this.srcSize.h };
    }

    if (!initRects.stretchRect) {
      this.loadLastRects();
    }

    // Create the stage canvas
    this.$imageCanvas = $('<canvas>')
        .attr({
          width: this.srcSize.w,
          height: this.srcSize.h
        })
        .appendTo(this.$canvasContainer);

    this.$overlayCanvas = $('<canvas>').addClass('overlay').appendTo(this.$canvasContainer);

    this.relayout();
    this.redrawImage();
    this.redrawOverlay();
    this.notifyChange_();
  }

  relayout() {
    if (!this.$imageCanvas) {
      return;
    }

    // Compute a zoom level that'll show the stage as large as possible
    let horizMaxZoom = Math.floor(this.$stage.width() / this.srcSize.w);
    let vertMaxZoom = Math.floor(this.$stage.height() / this.srcSize.h);
    this.zoom = Math.max(1, Math.min(horizMaxZoom, vertMaxZoom));
    this.zoomedSize = {
      w: this.srcSize.w * this.zoom,
      h: this.srcSize.h * this.zoom
    };

    this.$imageCanvas.css({
      width: this.zoomedSize.w,
      height: this.zoomedSize.h
    });
    this.$overlayCanvas.attr({
      width: this.zoomedSize.w,
      height: this.zoomedSize.h
    });
  }

  redrawImage() {
    if (!this.$imageCanvas) {
      return;
    }

    let imgCtx = this.$imageCanvas.get(0).getContext('2d');
    imgCtx.fillStyle = (this.matteColor == 'light') ? '#eee' : '#555';
    imgCtx.fillRect(0, 0, this.srcSize.w, this.srcSize.h);

    // draw source graphic
    imgCtx.drawImage(this.srcCtx.canvas, 0, 0);
  }

  redrawOverlay() {
    if (!this.srcCtx) {
      return;
    }

    let editRect = {
      stretch: this.stretchRect,
      padding: this.contentRect,
      opticalbounds: this.opticalBoundsRect
    }[this.editMode];

    let ctx = this.$overlayCanvas.get(0).getContext('2d');
    ctx.clearRect(0, 0, this.zoomedSize.w, this.zoomedSize.h);
    ctx.save();

    // draw current edit region
    if (editRect === this.stretchRect) {
      ctx.beginPath();

      ctx.moveTo(0, editRect.y * this.zoom + .5);
      ctx.lineTo(this.zoomedSize.w, editRect.y * this.zoom + .5);

      ctx.moveTo(0, (editRect.y + editRect.h) * this.zoom - .5);
      ctx.lineTo(this.zoomedSize.w, (editRect.y + editRect.h) * this.zoom - .5);

      ctx.moveTo(editRect.x * this.zoom + .5, 0);
      ctx.lineTo(editRect.x * this.zoom + .5, this.zoomedSize.h);

      ctx.moveTo((editRect.x + editRect.w) * this.zoom - .5, 0);
      ctx.lineTo((editRect.x + editRect.w) * this.zoom - .5, this.zoomedSize.h);
    } else {
      ctx.beginPath();
      ctx.rect(
          editRect.x * this.zoom + .5, editRect.y * this.zoom + .5,
          editRect.w * this.zoom - 1, editRect.h * this.zoom - 1);
      ctx.closePath();
    }

    if (this.dragging) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 23, 68, 1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, .5)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0, 0, 0, .5)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

    // draw distance labels
    if (this.dragging) {
      let stageOffset = this.$canvasContainer.offset();

      this.$leftLabel
          .text(editRect.x)
          .css({
            left: stageOffset.left,
            width: editRect.x * this.zoom,
            top: stageOffset.top + (editRect.y + editRect.h / 2) * this.zoom
          })
          .show();

      this.$rightLabel
          .text(this.srcSize.w - editRect.x - editRect.w)
          .css({
            left: stageOffset.left + (editRect.x + editRect.w) * this.zoom,
            width: (this.srcSize.w - editRect.x - editRect.w) * this.zoom,
            top: stageOffset.top + (editRect.y + editRect.h / 2) * this.zoom
          })
          .show();

      this.$topLabel
          .text(editRect.y)
          .css({
            top: stageOffset.top,
            height: editRect.y * this.zoom,
            left: stageOffset.left + (editRect.x + editRect.w / 2) * this.zoom
          })
          .show();

      this.$bottomLabel
          .text(this.srcSize.h - editRect.y - editRect.h)
          .css({
            top: stageOffset.top + (editRect.y + editRect.h) * this.zoom,
            height: (this.srcSize.h - editRect.y - editRect.h) * this.zoom,
            left: stageOffset.left + (editRect.x + editRect.w / 2) * this.zoom
          })
          .show();
    } else {
      this.$topLabel.hide();
      this.$leftLabel.hide();
      this.$rightLabel.hide();
      this.$bottomLabel.hide();
    }
  }

  get localStorageKey() {
    return `assetStudioNinePatchStage-${this.name}`;
  }

  saveRects() {
    localStorage[this.localStorageKey] = JSON.stringify({
      stretchRect: this.stretchRect,
      contentRect: this.contentRect,
      opticalBoundsRect: this.opticalBoundsRect
    });
  }

  loadLastRects() {
    try {
      let store = JSON.parse(localStorage[this.localStorageKey]);
      if (store.stretchRect && store.contentRect && store.opticalBoundsRect) {
        this.stretchRect = fitRect_(store.stretchRect, this.srcSize);
        this.contentRect = fitRect_(store.contentRect, this.srcSize);
        this.opticalBoundsRect = fitRect_(store.opticalBoundsRect, this.srcSize);
      }
    } catch (e) {}
  }
}

function fitRect_(rect, size) {
  let newRect = {};
  newRect.x = Math.max(0, rect.x);
  newRect.y = Math.max(0, rect.y);
  newRect.w = Math.min(size.w - rect.x, rect.w);
  newRect.h = Math.min(size.h - rect.y, rect.h);
  return newRect;
}

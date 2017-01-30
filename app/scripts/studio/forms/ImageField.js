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

import {default as WebFont} from 'webfontloader';

import {Form} from './Form';
import {Field} from './Field';
import {TextField} from './TextField';
import {RangeField} from './RangeField';
import {BooleanField} from './BooleanField';
import {EnumField} from './EnumField';

import {Util} from '../Util';

import {imagelib} from '../../imagelib';

import {CLIPART_NAMES} from './ImageField-clipart';


const WEB_FONTS_API_KEY = 'AIzaSyAtSe8wlXPCUaLQ4LTyPKpbzBBPJAzEXmU';
const WEB_FONTS_API_URL = `https://www.googleapis.com/webfonts/v1/webfonts?key=${WEB_FONTS_API_KEY}&fields=items(family)`;
const WEB_FONTS_CACHE_TIME = 60 * 60 * 1000; // 1 hour


/**
 * Represents a form field for image values.
 */
export class ImageField extends Field {
  constructor(id, params) {
    super(id, params);
    this.valueType_ = null;
    this.textParams_ = {};
    this.imageParams_ = {};
    this.clipartSrc_ = null;
    this.lastNotifiedValue_ = {};
    this.spaceFormValues_ = {}; // cache
  }

  createUi(container) {
    var fieldUI = super.createUi(container);
    var fieldContainer = $('.form-field-container', fieldUI);

    // Set up drag+drop on the entire field container
    fieldUI.addClass('form-field-image');
    this.setupDropTarget_(fieldUI);

    // Create radio buttons
    this.el_ = $('<div>')
        .attr('id', this.getHtmlId())
        .addClass('form-field-buttonset')
        .appendTo(fieldContainer);

    var types;
    if (this.params_.imageOnly) {
      types = [
        ['image', 'Select image']
      ];
    } else {
      types = [
        ['image', 'Image'],
        ['clipart', 'Clipart'],
        ['text', 'Text']
      ];
    }

    var typeEls = {};

    types.forEach(([id, label]) => {
      $('<input>')
          .attr({
            type: 'radio',
            name: this.getHtmlId(),
            id: `${this.getHtmlId()}-${id}`,
            value: id
          })
          .appendTo(this.el_);
      typeEls[id] = $('<label>')
          .attr('for', `${this.getHtmlId()}-${id}`)
          .attr('tabindex', 0)
          .text(label)
          .appendTo(this.el_);
    });

    // Prepare UI for the 'image' type
    this.fileEl_ = $('<input>')
        .addClass('form-image-hidden-file-field')
        .attr({
          id: this.getHtmlId(),
          type: 'file',
          accept: 'image/*'
        })
        .on('change', () => this.loadImage_(this.fileEl_.get(0).files))
        .appendTo(this.el_);

    typeEls.image.click(evt => {
      this.fileEl_.trigger('click');
      this.setValueType_(null);
      this.renderValueAndNotifyChanged_();
      evt.preventDefault();
      return false;
    });

    // Prepare UI for the 'clipart' type
    if (!this.params_.imageOnly) {
      let clipartParamsEl = $('<div>')
          .addClass('form-image-type-params form-image-type-params-clipart is-hidden')
          .appendTo(fieldContainer);

      let clipartListEl = $('<div>')
          .addClass('form-image-clipart-list')
          .addClass('cancel-parent-scroll')
          .appendTo(clipartParamsEl);

      CLIPART_NAMES.forEach(clipartSrc => {
        $('<div>')
            .addClass('form-image-clipart-item')
            .attr('data-name', clipartSrc)
            .attr('title', clipartSrc)
            .text(clipartSrc)
            .click(() => this.loadClipart_(clipartSrc))
            .appendTo(clipartListEl);
      });

      this.$clipartItems = clipartListEl.find('.form-image-clipart-item');

      let clipartFilterEl = $('<input>')
        .addClass('form-image-clipart-filter')
        .attr('placeholder', 'Find clipart')
        .on('input', ev => {
          let $filter = $(ev.currentTarget);
          let val = $filter.val().toLowerCase().replace(/[^\w]+/g, '');
          if (!val) {
            this.$clipartItems.show();
          } else {
            this.$clipartItems.each((_, item) => {
              $(item).toggle($(item).attr('title').indexOf(val) >= 0);
            });
          }
        })
        .prependTo(clipartParamsEl);

      var clipartAttributionEl = $('<div>')
          .addClass('form-image-clipart-attribution')
          .html(`
              For clipart sources, visit
              <a target="_blank"
                 class="external-link"
                 href="https://github.com/google/material-design-icons">
              Material Design Icons on GitHub</a>
              `)
          .appendTo(clipartParamsEl);

      typeEls.clipart.click(evt => {
        this.setValueType_('clipart');
        this.renderValueAndNotifyChanged_();
      });

      // Prepare UI for the 'text' type
      var textParamsEl = $('<div>')
          .addClass('form-subform form-image-type-params form-image-type-params-text is-hidden')
          .appendTo(fieldContainer);

      let fontFamilyField;
      this.textForm_ = new Form({
        id: `${this.form_.id_}-${this.id_}-textform`,
        container: textParamsEl,
        fields: [
          new TextField('text', {
            title: 'Text',
          }),
          (fontFamilyField = new EnumField('font', {
            title: 'Font',
            helpText: 'From fonts.google.com'
          }))
        ]
      });
      this.loadGoogleWebFontsList_().then(fonts => fontFamilyField.setOptions([''].concat(fonts)));

      let tryLoadWebFontDebounced_ = Util.debounce(500, () => this.tryLoadWebFont_());
      this.textForm_.onChange(() => {
        var values = this.textForm_.getValues();
        this.textParams_.text = values.text;
        this.textParams_.fontStack = values.font || 'Roboto, sans-serif';
        tryLoadWebFontDebounced_();
        this.renderValueAndNotifyChanged_();
      });

      typeEls.text.click(evt => {
        this.setValueType_('text');
        this.renderValueAndNotifyChanged_();
      });
    }

    // Create spacing subform
    if (!this.params_.noTrimForm) {
      let spaceFormContainer = $('<div>')
          .addClass('form-subform')
          .appendTo(fieldContainer);
      this.spaceFormValues_ = {};
      this.spaceForm_ = new Form({
        id: `${this.form_.id_}-${this.id_}-spaceform`,
        container: spaceFormContainer,
        fields: [
          (this.spaceFormTrimField_ = new BooleanField('trim', {
            title: 'Trim whitespace',
            defaultValue: true,
            offText: `Don't trim`,
            onText: 'Trim'
          })),
          (this.spaceFormPaddingField_ = new RangeField('pad', {
            title: 'Padding',
            defaultValue: this.params_.defaultValuePadding || 0,
            min: -0.1,
            max: 0.5, // 1/2 of min(width, height)
            step: 0.05,
            textFn(v) {
              return (v * 100).toFixed(0) + '%';
            }
          })),
        ]
      });
      this.spaceForm_.onChange(() => {
        this.spaceFormValues_ = this.spaceForm_.getValues();
        this.renderValueAndNotifyChanged_();
      });
      this.spaceFormValues_ = this.spaceForm_.getValues();
    } else {
      this.spaceFormValues_ = {};
    }

    // Create image preview element
    if (!this.params_.noPreview) {
      this.imagePreview_ = $('<canvas>')
          .addClass('form-image-preview')
          .hide()
          .appendTo(fieldContainer.parent());
    }

    if (this.params_.defaultValueClipart) {
      setTimeout(() => {
        if (!this.valueType_) {
          this.loadClipart_(this.params_.defaultValueClipart);
        }
      }, 0);
    }
  }

  setupDropTarget_(el) {
    let $el = this.params_.dropTarget
        ? $(this.params_.dropTarget)
        : $(el);
    let enterLeaveTimeout;

    $el
        .addClass('form-field-drop-target')
        .on('dragenter', ev => {
          ev.preventDefault();
          if (enterLeaveTimeout) {
            clearTimeout(enterLeaveTimeout);
            enterLeaveTimeout = null;
          }
          $el.addClass('drag-hover');
        })
        .on('dragleave', ev => {
          ev.preventDefault();
          if (enterLeaveTimeout) {
            clearTimeout(enterLeaveTimeout);
          }
          enterLeaveTimeout = setTimeout(() => $el.removeClass('drag-hover'), 100);
        })
        .on('dragover', ev => {
          ev.preventDefault();
          if (enterLeaveTimeout) {
            clearTimeout(enterLeaveTimeout);
            enterLeaveTimeout = null;
          }
          ev.originalEvent.dataTransfer.dropEffect = 'copy';
        })
        .on('drop', ev => {
          $el.removeClass('drag-hover');
          ev.stopPropagation();
          ev.preventDefault();
          this.loadImage_(ev.originalEvent.dataTransfer.files);
        });
  }

  loadImage_(fileList) {
    ImageField.loadImageFromFileList(fileList).then(ret => {
      if (!ret) {
        return;
      }

      this.setValueType_('image');
      this.imageParams_ = ret;
      this.imageFilename_ = ret.name.replace(/\.[^.]+?$/, ''); // basename
      this.renderValueAndNotifyChanged_();
    });
  }

  loadGoogleWebFontsList_() {
    return new Promise((resolve, reject) => {
      if ('assetStudioWebFontsCache' in localStorage) {
        let {fetchTime, fonts} = JSON.parse(localStorage.assetStudioWebFontsCache);
        if (Number(new Date()) - fetchTime < WEB_FONTS_CACHE_TIME) {
          // use cache
          resolve(fonts);
          return;
        }
      }

      $.ajax({
        url: WEB_FONTS_API_URL,
        dataType: 'json'
      }).then(data => {
        let fonts = data.items.map(item => item.family);
        localStorage.assetStudioWebFontsCache = JSON.stringify({
          fetchTime: Number(new Date()),
          fonts
        });
        resolve(fonts);
      }, e => reject(e));
    });
  }

  tryLoadWebFont_() {
    let desiredFont = this.textForm_.getValues().font;
    if (this.loadedWebFont_ == desiredFont || !desiredFont) {
      return;
    }

    WebFont.load({
      google: {
        families: [desiredFont]
      },
      active: () => {
        this.loadedWebFont_ = desiredFont;
        this.renderValueAndNotifyChanged_();
      }
    });
  }

  setValueType_(type) {
    this.valueType_ = type;
    $('input', this.el_).prop('checked', false);
    $('.form-image-type-params', this.el_.parent()).addClass('is-hidden');
    if (type) {
      $(`#${this.getHtmlId()}-${type}`).prop('checked', true);
      $('.form-image-type-params-' + type, this.el_.parent()).removeClass('is-hidden');
    }

    if (this.spaceForm_) {
      this.spaceFormTrimField_.setEnabled(true);
      this.spaceFormPaddingField_.setEnabled(true);
      if (type == 'clipart') {
        if (this.params_.clipartNoTrimPadding) {
          this.spaceFormTrimField_.setEnabled(false);
          this.spaceFormTrimField_.setValue(false);
          this.spaceFormPaddingField_.setEnabled(false);
          this.spaceFormPaddingField_.setValue(0);
        }
      } else if (type == 'text') {
        this.spaceFormTrimField_.setEnabled(false);
        this.spaceFormTrimField_.setValue(true);
      }
    }
  }

  loadClipart_(clipartSrc) {
    this.$clipartItems.removeClass('is-selected');
    this.$clipartItems.filter(`[data-name="${clipartSrc}"]`).addClass('is-selected');

    this.setValueType_('clipart');
    this.clipartSrc_ = clipartSrc;
    this.renderValueAndNotifyChanged_();
  }

  clearValue() {
    this.valueType_ = null;
    this.valueCtx_ = null;
    this.valueOrigImg_ = null;
    this.fileEl_.val('');
    if (this.imagePreview_) {
      this.imagePreview_.hide();
    }
  }

  getValue() {
    let name = null;
    switch (this.valueType_) {
      case 'image':
        name = this.imageFilename_;
        break;

      case 'clipart':
        name = this.clipartSrc_;
        break;

      case 'text':
        name = this.textParams_.text;
        break;
    }

    return {
      ctx: this.valueCtx_,
      origImg: this.valueOrigImg_,
      type: this.valueType_,
      name
    };
  }

  notifyChanged_(newValue, oldValue) {
    super.notifyChanged_(newValue, oldValue);
    this.lastNotifiedValue_ = Object.assign({}, newValue);
  }

  // this function is asynchronous
  renderValueAndNotifyChanged_() {
    if (!this.valueType_) {
      this.valueCtx_ = null;
      this.valueOrigImg_ = null;
      this.notifyChanged_(this.getValue(), this.lastNotifiedValue_);
      return;
    }

    if (this.renderTimeout_) {
      clearTimeout(this.renderTimeout_);
      this.renderTimeout_ = null;
    }

    if (this.rendering_) {
      this.renderTimeout_ = setTimeout(
          () => this.renderValueAndNotifyChanged_(),
          100);
      return;
    }

    this.rendering_ = true;

    this.renderSource_()
        .then(({ctx, size}) => {
          this.computeTrimRect_(ctx, size)
              .then(trimRect => {
                let pad = this.spaceFormValues_.pad || 0;
                let padPx = Math.round(pad * Math.min(trimRect.w, trimRect.h));
                this.valueCtx_ = imagelib.Drawing.context({
                  w: trimRect.w + padPx * 2,
                  h: trimRect.h + padPx * 2
                });
                this.valueCtx_.drawImage(ctx.canvas,
                    trimRect.x, trimRect.y, trimRect.w, trimRect.h,
                    padPx, padPx, trimRect.w, trimRect.h);

                if (this.imagePreview_) {
                  this.imagePreview_.attr({
                    width: this.valueCtx_.canvas.width,
                    height: this.valueCtx_.canvas.height
                  });

                  let previewCtx = this.imagePreview_.get(0).getContext('2d');
                  previewCtx.drawImage(this.valueCtx_.canvas, 0, 0);
                  this.imagePreview_.show();
                }

                this.rendering_ = false;
                this.notifyChanged_(this.getValue(), this.lastNotifiedValue_);
              });
        }).catch(e => {
          console.error('Error: ' + e);
          this.rendering_ = false;
          this.notifyChanged_(this.getValue(), this.lastNotifiedValue_);
        });
  }

  renderSource_() {
    return new Promise((resolve, reject) => {
      // Render the base image (text, clipart, or image)
      switch (this.valueType_) {
        case 'image':
          if (this.imageParams_.uri) {
            Util.loadImageFromUri(this.imageParams_.uri)
                .then(img => {
                  this.valueOrigImg_ = img;
                  let origSize = {
                    w: img.naturalWidth,
                    h: img.naturalHeight
                  };
                  let size = Object.assign({}, origSize);
                  if (this.imageParams_.isSvg && this.params_.maxFinalSize) {
                    if (size.w / size.h > this.params_.maxFinalSize.w / this.params_.maxFinalSize.h) {
                      size.w = this.params_.maxFinalSize.w;
                      size.h = size.w * origSize.h / origSize.w;
                    } else {
                      size.h = this.params_.maxFinalSize.h;
                      size.w = size.h * origSize.w / origSize.h;
                    }
                  }
                  let ctx = imagelib.Drawing.context(size);
                  ctx.drawImage(img,
                      0, 0, origSize.w, origSize.h,
                      0, 0, size.w, size.h);
                  resolve({ctx, size});
                });
          } else {
            reject('no uri');
          }
          break;

        case 'clipart':
          var size = { w: 1536, h: 1536 };
          var ctx = imagelib.Drawing.context(size);
          var text = this.clipartSrc_;

          ctx.fillStyle = '#000';
          ctx.font = `${size.h}px/${size.h}px 'Material Icons'`;
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(text, 0, size.h);

          resolve({ctx, size});
          break;

        case 'text':
          var size = { w: 6144, h: 1536 };
          var textHeight = size.h * 0.75;
          var ctx = imagelib.Drawing.context(size);
          var text = this.textParams_.text || '';
          text = ' ' + text + ' ';

          ctx.fillStyle = '#000';
          ctx.font = `bold ${textHeight}px/${size.h}px ${this.textParams_.fontStack}`;
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(text, 0, textHeight);
          size.w = Math.ceil(Math.min(ctx.measureText(text).width, size.w) || size.w);

          resolve({ctx, size});
          break;

        default:
          reject('No value type');
      }
    });
  }

  computeTrimRect_(ctx, size) {
    return new Promise((resolve, reject) => {
      if (this.spaceFormValues_.trim) {
        if (this.trimPromise_ && this.trimPromise_.worker) {
          this.trimPromise_.worker.terminate();
        }

        this.trimPromise_ = imagelib.Analysis.getTrimRect(ctx, size, 1)
            .then(trimRect => {
              let pad = Math.min(size.w, size.h) * .01;
              // pad a little bit to avoid edge artifacts
              Object.assign(trimRect, {
                x: Math.max(Math.floor(trimRect.x - pad), 0),
                y: Math.max(Math.floor(trimRect.y - pad), 0),
                w: Math.ceil(trimRect.w + pad * 2),
                h: Math.ceil(trimRect.h + pad * 2)
              });
              trimRect.w = Math.min(trimRect.w, size.w - trimRect.x);
              trimRect.h = Math.min(trimRect.h, size.h - trimRect.y);
              resolve(trimRect);
            }).catch(reject);
      } else {
        resolve({ x: 0, y: 0, w: size.w, h: size.h });
      }
    });
  }

  serializeValue() {
    let vals = {
      type: this.valueType_,
      clipart: (this.valueType_ == 'clipart') ? this.clipartSrc_ : null,
      text: (this.valueType_ == 'text') ? this.textForm_.getValuesSerialized() : null
    };

    if (this.spaceForm_) {
      vals.space = this.spaceForm_.getValuesSerialized();
    }

    return vals;
  }

  deserializeValue(o) {
    if (o.type) {
      this.setValueType_(o.type);
    }
    if (o.space) {
      this.spaceForm_.setValuesSerialized(o.space);
      this.spaceFormValues_ = this.spaceForm_.getValues();
    }
    if (o.clipart && this.valueType_ == 'clipart') {
      this.loadClipart_(o.clipart);
    }
    if (o.text && this.valueType_ == 'text') {
      this.textForm_.setValuesSerialized(o.text);
      this.tryLoadWebFont_();
    }
  }
}

/**
 * Loads the first valid image from a FileList (e.g. drag + drop source), as a data URI. This method
 * will throw an alert() in case of errors and call back with null.
 * @param {FileList} fileList The FileList to load.
 * @return Returns a promise, with object containing 'uri' field representing
 *      the loaded image. There will also be a 'name' field indicating the file name, if one
 *      is available.
 */
ImageField.loadImageFromFileList = function(fileList) {
  return new Promise((resolve, reject) => {
    fileList = fileList || [];

    let file = Array.from(fileList).find(file => ImageField.isValidFile_(file));

    if (!file) {
      alert('Please choose a valid image file (PNG, JPG, GIF, SVG, etc.)');
      resolve(null);
      return;
    }

    let isSvg = file.type == 'image/svg+xml';

    let fileReader = new FileReader();

    // Closure to capture the file information.
    fileReader.onload = e => resolve({
      isSvg,
      uri: e.target.result,
      name: file.name
    });

    fileReader.onerror = e => {
      switch (e.target.error.code) {
        case e.target.error.NOT_FOUND_ERR:
          alert('File not found!');
          break;

        case e.target.error.NOT_READABLE_ERR:
          alert('File is not readable');
          break;

        case e.target.error.ABORT_ERR:
          break; // noop

        default:
          alert('An error occurred reading this file.');
      }

      resolve(null);
    };

    fileReader.onabort = e => {
      alert('File read cancelled');
      resolve(null);
    };

    fileReader.readAsDataURL(file);
  });
};

ImageField.isValidFile_ = file => !!file.type.toLowerCase().match(/^image\//);

// Prevent scrolling for clipart per http://stackoverflow.com/questions/7600454
$(document).ready(() => {
  $('.cancel-parent-scroll').on('mousewheel DOMMouseScroll', e => {
    let delta = e.originalEvent.wheelDelta || -e.originalEvent.detail;
    e.currentTarget.scrollTop -= delta;
    e.preventDefault();
  });
});

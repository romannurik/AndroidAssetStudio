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

//#REQUIRE "fields.js"

/**
 * This is needed due to what seems like a bug in Chrome where using drawImage
 * with any SVG, regardless of origin (even if it was loaded from a data URI),
 * marks the canvas's origin dirty flag, precluding us from accessing its pixel
 * data.
 */
var USE_CANVG = window.canvg && true;

/**
 * Represents a form field for image values.
 */
studio.forms.ImageField = studio.forms.Field.extend({
  constructor: function(id, params) {
    this.valueType_ = null;
    this.textParams_ = {};
    this.imageParams_ = {};
    this.spaceFormValues_ = {}; // cache
    this.base(id, params);
  },

  createUI: function(container) {
    var fieldUI = this.base(container);
    var fieldContainer = $('.form-field-container', fieldUI);

    var me = this;

    // Set up drag+drop on the entire field container
    fieldUI.addClass('form-field-drop-target');
    fieldUI.get(0).ondragenter = studio.forms.ImageField.makeDragenterHandler_(
      fieldUI);
    fieldUI.get(0).ondragleave = studio.forms.ImageField.makeDragleaveHandler_(
      fieldUI);
    fieldUI.get(0).ondragover = studio.forms.ImageField.makeDragoverHandler_(
      fieldUI);
    fieldUI.get(0).ondrop = studio.forms.ImageField.makeDropHandler_(fieldUI,
      function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        studio.forms.ImageField.loadImageFromFileList(evt.dataTransfer.files, function(ret) {
          if (!ret)
            return;

          me.setValueType_('image');
          me.imageParams_ = ret;
          me.valueFilename_ = ret.name;
          me.renderValueAndNotifyChanged_();
        });
      });

    // Create radio buttons
    this.el_ = $('<div>')
      .attr('id', this.getHtmlId())
      .addClass('form-field-buttonset')
      .appendTo(fieldContainer);

    var types;
    if (this.params_.imageOnly) {
      types = [
        'image', 'Select Image'
      ];
    } else {
      types = [
        'image', 'Image',
        'clipart', 'Clipart',
        'text', 'Text'
      ];
    }

    var typeEls = {};

    for (var i = 0; i < types.length / 2; i++) {
      $('<input>')
        .attr({
          type: 'radio',
          name: this.getHtmlId(),
          id: this.getHtmlId() + '-' + types[i * 2],
          value: types[i * 2]
        })
        .appendTo(this.el_);
      typeEls[types[i * 2]] = $('<label>')
        .attr('for', this.getHtmlId() + '-' + types[i * 2])
        .text(types[i * 2 + 1])
        .appendTo(this.el_);
    }

    // Prepare UI for the 'image' type
    this.fileEl_ = $('<input>')
      .addClass('form-image-hidden-file-field')
      .attr({
        id: this.getHtmlId(),
        type: 'file',
        accept: 'image/*'
      })
      .change(function() {
        studio.forms.ImageField.loadImageFromFileList(me.fileEl_.get(0).files, function(ret) {
          if (!ret)
            return;

          me.setValueType_('image');
          me.imageParams_ = ret;
          me.valueFilename_ = ret.name;
          me.renderValueAndNotifyChanged_();
        });
      })
      .appendTo(this.el_);

    typeEls.image.click(function(evt) {
      me.fileEl_.trigger('click');
      me.setValueType_(null);
      me.renderValueAndNotifyChanged_();
      evt.preventDefault();
      return false;
    });

    // Prepare UI for the 'clipart' type
    if (!this.params_.imageOnly) {
      var clipartParamsEl = $('<div>')
        .addClass('form-image-type-params form-image-type-params-clipart')
        .hide()
        .appendTo(fieldContainer);

      var clipartListEl;

      var clipartFilterEl = $('<input>')
        .addClass('form-image-clipart-filter')
        .attr('placeholder', 'Find clipart')
        .keydown(function() {
          var $this = $(this);
          setTimeout(function() {
            var val = $this.val().toLowerCase().replace(/[^\w]+/g, '');
            if (!val) {
              clipartListEl.find('img').show();
            } else {
              clipartListEl.find('img').each(function() {
                var $this = $(this);
                $this.toggle($this.attr('title').indexOf(val) >= 0);
              });
            }
          }, 0);
        })
        .appendTo(clipartParamsEl);

      clipartListEl = $('<div>')
        .addClass('form-image-clipart-list')
        .addClass('cancel-parent-scroll')
        .appendTo(clipartParamsEl);

      for (var i = 0; i < studio.forms.ImageField.clipartList_.length; i++) {
        var clipartSrc = 'res/clipart/' + studio.forms.ImageField.clipartList_[i];
        $('<img>')
          .addClass('form-image-clipart-item')
          .attr('src', clipartSrc)
          .attr('title', studio.forms.ImageField.clipartList_[i])
          .click(function(clipartSrc) {
            return function() {
              me.loadClipart_(clipartSrc);
            };
          }(clipartSrc))
          .appendTo(clipartListEl);
      }

      var clipartAttributionEl = $('<div>')
        .addClass('form-image-clipart-attribution')
        .html([
            'For clipart sources, visit ',
            '<a href="http://developer.android.com/design/downloads/">',
                'Android Design: Downloads',
            '</a>.<br>',
            'Additional icons can be found at ',
            '<a href="http://www.androidicons.com">androidicons.com</a>.'
          ].join(''))
        .appendTo(clipartParamsEl);

      typeEls.clipart.click(function(evt) {
        me.setValueType_('clipart');
        if (studio.AUTO_TRIM) {
          me.spaceFormTrimField_.setValue(false);
        }
        me.renderValueAndNotifyChanged_();
      });

      // Prepare UI for the 'text' type
      var textParamsEl = $('<div>')
        .addClass(
          'form-subform ' +
          'form-image-type-params ' +
          'form-image-type-params-text')
        .hide()
        .appendTo(fieldContainer);

      this.textForm_ = new studio.forms.Form(
        this.form_.id_ + '-' + this.id_ + '-textform', {
          onChange: function() {
            var values = me.textForm_.getValues();
            me.textParams_.text = values['text'];
            me.textParams_.fontStack = values['font']
                ? values['font'] : 'Roboto, sans-serif';
            me.valueFilename_ = values['text'];
            me.tryLoadWebFont_();
            me.renderValueAndNotifyChanged_();
          },
          fields: [
            new studio.forms.TextField('text', {
              title: 'Text',
            }),
            new studio.forms.AutocompleteTextField('font', {
              title: 'Font',
              items: studio.forms.ImageField.fontList_
            })
          ]
        });
      this.textForm_.createUI(textParamsEl);

      typeEls.text.click(function(evt) {
        me.setValueType_('text');
        if (studio.AUTO_TRIM) {
          me.spaceFormTrimField_.setValue(true);
        }
        me.renderValueAndNotifyChanged_();
      });
    }

    // Create spacing subform
    if (!this.params_.noTrimForm) {
      this.spaceFormValues_ = {};
      this.spaceForm_ = new studio.forms.Form(
        this.form_.id_ + '-' + this.id_ + '-spaceform', {
          onChange: function() {
            me.spaceFormValues_ = me.spaceForm_.getValues();
            me.renderValueAndNotifyChanged_();
          },
          fields: [
            (this.spaceFormTrimField_ = new studio.forms.BooleanField('trim', {
              title: 'Trim',
              defaultValue: this.params_.defaultValueTrim || false,
              offText: 'Don\'t Trim',
              onText: 'Trim'
            })),
            new studio.forms.RangeField('pad', {
              title: 'Padding',
              defaultValue: 0,
              min: -0.1,
              max: 0.5, // 1/2 of min(width, height)
              step: 0.05,
              textFn: function(v) {
                return (v * 100).toFixed(0) + '%';
              }
            }),
          ]
        });
      this.spaceForm_.createUI($('<div>')
        .addClass('form-subform')
        .appendTo(fieldContainer));
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
  },

  tryLoadWebFont_: function(force) {
    var desiredFont = this.textForm_.getValues()['font'];
    if (this.loadedWebFont_ == desiredFont || !desiredFont) {
      return;
    }

    var me = this;
    if (!force) {
      if (this.tryLoadWebFont_.timeout_) {
        clearTimeout(this.tryLoadWebFont_.timeout_);
      }
      this.tryLoadWebFont_.timeout_ = setTimeout(function() {
        me.tryLoadWebFont_(true);
      }, 500);
      return;
    }

    this.loadedWebFont_ = desiredFont;
    var webFontNodeId = this.form_.id_ + '-' + this.id_ + '-__webfont-stylesheet__';
    $('#' + webFontNodeId).remove();
    $('<link>')
        .attr('id', webFontNodeId)
        .attr('rel', 'stylesheet')
        .attr('href', 'http://fonts.googleapis.com/css?family='
            + encodeURIComponent(desiredFont))
        .bind('load', function() {
          me.renderValueAndNotifyChanged_();
          window.setTimeout(function() {
            me.renderValueAndNotifyChanged_();
          }, 500);
        })
        .appendTo('head');
  },

  setValueType_: function(type) {
    this.valueType_ = type;
    $('input', this.el_).removeAttr('checked');
    $('.form-image-type-params', this.el_.parent()).hide();
    if (type) {
      $('#' + this.getHtmlId() + '-' + type).attr('checked', true);
      $('.form-image-type-params-' + type, this.el_.parent()).show();
    }
  },

  loadClipart_: function(clipartSrc) {
    var useCanvg = USE_CANVG && clipartSrc.match(/\.svg$/);

    $('img.form-image-clipart-item', this.el_.parent()).removeClass('selected');
    $('img[src="' + clipartSrc + '"]').addClass('selected');
    
    this.imageParams_ = {
      canvgSvgUri: useCanvg ? clipartSrc : null,
      uri: useCanvg ? null : clipartSrc
    };
    this.clipartSrc_ = clipartSrc;
    this.valueFilename_ = clipartSrc.match(/[^/]+$/)[0];
    this.renderValueAndNotifyChanged_();
  },

  clearValue: function() {
    this.valueType_ = null;
    this.valueFilename_ = null;
    this.valueCtx_ = null;
    this.fileEl_.val('');
    if (this.imagePreview_) {
      this.imagePreview_.hide();
    }
  },

  getValue: function() {
    return {
      ctx: this.valueCtx_,
      type: this.valueType_,
      name: this.valueFilename_
    };
  },

  // this function is asynchronous
  renderValueAndNotifyChanged_: function() {
    if (!this.valueType_) {
      this.valueCtx_ = null;
    }

    var me = this;

    // Render the base image (text, clipart, or image)
    switch (this.valueType_) {
      case 'image':
      case 'clipart':
        if (this.imageParams_.canvgSvgText || this.imageParams_.canvgSvgUri) {
          var canvas = document.createElement('canvas');
          var size = { w: 800, h: 800 };
          canvas.className = 'offscreen';
          canvas.width = size.w;
          canvas.height = size.h;
          document.body.appendChild(canvas);

          canvg(
            canvas,
            this.imageParams_.canvgSvgText ||
              this.imageParams_.canvgSvgUri,
            {
              scaleWidth: size.w,
              scaleHeight: size.h,
              ignoreMouse: true,
              ignoreAnimation: true,
              ignoreDimensions: true,
              ignoreClear: true
            }
          );
          continue_(canvas.getContext('2d'), size);

          document.body.removeChild(canvas);
        } else if (this.imageParams_.uri) {
          imagelib.loadFromUri(this.imageParams_.uri, function(img) {
            var size = {
              w: img.naturalWidth,
              h: img.naturalHeight
            };
            var ctx = imagelib.drawing.context(size);
            imagelib.drawing.copy(ctx, img, size);
            continue_(ctx, size);
          });
        }
        break;

      case 'text':
        var size = { w: 4800, h: 1600 };
        var textHeight = size.h * 0.75;
        var ctx = imagelib.drawing.context(size);
        var text = this.textParams_.text || '';
        text = ' ' + text + ' ';

        ctx.fillStyle = '#000';
        ctx.font = 'bold ' + textHeight + 'px/' + size.h + 'px ' + this.textParams_.fontStack;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(text, 0, textHeight);
        size.w = Math.ceil(Math.min(ctx.measureText(text).width, size.w) || size.w);

        continue_(ctx, size);
        break;

      default:
        me.form_.notifyChanged_(me);
    }

    function continue_(srcCtx, srcSize) {
      // Apply trimming
      if (me.spaceFormValues_['trim']) {
        if (me.trimWorker_) {
          me.trimWorker_.terminate();
        }
        me.trimWorker_ = imagelib.drawing.getTrimRect(srcCtx, srcSize, 1,
            function(trimRect) {
              continue2_(srcCtx, srcSize, trimRect);
            });
      } else {
        continue2_(srcCtx, srcSize,
            /*trimRect*/{ x: 0, y: 0, w: srcSize.w, h: srcSize.h });
      }
    }

    function continue2_(srcCtx, srcSize, trimRect) {
      // If trimming, add a tiny bit of padding to fix artifacts around the
      // edges.
      var extraPadding = me.spaceFormValues_['trim'] ? 0.001 : 0;
      if (trimRect.x == 0 && trimRect.y == 0 &&
          trimRect.w == srcSize.w && trimRect.h == srcSize.h) {
        extraPadding = 0;
      }

      var padPx = Math.round(((me.spaceFormValues_['pad'] || 0) + extraPadding) *
                  Math.min(trimRect.w, trimRect.h));
      var targetRect = { x: padPx, y: padPx, w: trimRect.w, h: trimRect.h };

      var outCtx = imagelib.drawing.context({
        w: trimRect.w + padPx * 2,
        h: trimRect.h + padPx * 2
      });

      // TODO: replace with a simple draw() as the centering is useless
      imagelib.drawing.drawCenterInside(outCtx, srcCtx, targetRect, trimRect);

      // Set the final URI value and show a preview
      me.valueCtx_ = outCtx;

      if (me.imagePreview_) {
        me.imagePreview_.attr('width', outCtx.canvas.width);
        me.imagePreview_.attr('height', outCtx.canvas.height);

        var previewCtx = me.imagePreview_.get(0).getContext('2d');
        previewCtx.drawImage(outCtx.canvas, 0, 0);

        me.imagePreview_.show();
      }

      me.form_.notifyChanged_(me);
    }
  },

  serializeValue: function() {
    return {
      type: this.valueType_,
      space: this.spaceForm_.getValuesSerialized(),
      clipart: (this.valueType_ == 'clipart') ? this.clipartSrc_ : null,
      text: (this.valueType_ == 'text') ? this.textForm_.getValuesSerialized()
                                        : null
    };
  },

  deserializeValue: function(o) {
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
});

studio.forms.ImageField.clipartList_ = [
  'icons/core_overflow.svg',
  'icons/action_about.svg',
  'icons/action_help.svg',
  'icons/action_search.svg',
  'icons/action_settings.svg',
  'icons/alerts_and_states_add_alarm.svg',
  'icons/alerts_and_states_airplane_mode_off.svg',
  'icons/alerts_and_states_airplane_mode_on.svg',
  'icons/alerts_and_states_error.svg',
  'icons/alerts_and_states_warning.svg',
  'icons/av_add_to_queue.svg',
  'icons/av_download.svg',
  'icons/av_fast_forward.svg',
  'icons/av_full_screen.svg',
  'icons/av_make_available_offline.svg',
  'icons/av_next.svg',
  'icons/av_pause.svg',
  'icons/av_pause_over_video.svg',
  'icons/av_play.svg',
  'icons/av_play_over_video.svg',
  'icons/av_previous.svg',
  'icons/av_repeat.svg',
  'icons/av_replay.svg',
  'icons/av_return_from_full_screen.svg',
  'icons/av_rewind.svg',
  'icons/av_shuffle.svg',
  'icons/av_stop.svg',
  'icons/av_upload.svg',
  'icons/collections_cloud.svg',
  'icons/collections_collection.svg',
  'icons/collections_go_to_today.svg',
  'icons/collections_labels.svg',
  'icons/collections_new_label.svg',
  'icons/collections_sort_by_size.svg',
  'icons/collections_view_as_grid.svg',
  'icons/collections_view_as_list.svg',
  'icons/content_attachment.svg',
  'icons/content_backspace.svg',
  'icons/content_copy.svg',
  'icons/content_cut.svg',
  'icons/content_discard.svg',
  'icons/content_edit.svg',
  'icons/content_email.svg',
  'icons/content_event.svg',
  'icons/content_import_export.svg',
  'icons/content_merge.svg',
  'icons/content_new.svg',
  'icons/content_new_attachment.svg',
  'icons/content_new_email.svg',
  'icons/content_new_event.svg',
  'icons/content_new_picture.svg',
  'icons/content_paste.svg',
  'icons/content_picture.svg',
  'icons/content_read.svg',
  'icons/content_remove.svg',
  'icons/content_save.svg',
  'icons/content_select_all.svg',
  'icons/content_split.svg',
  'icons/content_undo.svg',
  'icons/content_unread.svg',
  'icons/device_access_accounts.svg',
  'icons/device_access_alarms.svg',
  'icons/device_access_battery.svg',
  'icons/device_access_bluetooth.svg',
  'icons/device_access_bluetooth_connected.svg',
  'icons/device_access_bluetooth_searching.svg',
  'icons/device_access_brightness_auto.svg',
  'icons/device_access_brightness_high.svg',
  'icons/device_access_brightness_low.svg',
  'icons/device_access_brightness_medium.svg',
  'icons/device_access_call.svg',
  'icons/device_access_camera.svg',
  'icons/device_access_data_usage.svg',
  'icons/device_access_dial_pad.svg',
  'icons/device_access_end_call.svg',
  'icons/device_access_flash_automatic.svg',
  'icons/device_access_flash_off.svg',
  'icons/device_access_flash_on.svg',
  'icons/device_access_location_found.svg',
  'icons/device_access_location_off.svg',
  'icons/device_access_location_searching.svg',
  'icons/device_access_mic.svg',
  'icons/device_access_mic_muted.svg',
  'icons/device_access_network_cell.svg',
  'icons/device_access_network_wifi.svg',
  'icons/device_access_new_account.svg',
  'icons/device_access_not_secure.svg',
  'icons/device_access_ring_volume.svg',
  'icons/device_access_screen_locked_to_landscape.svg',
  'icons/device_access_screen_locked_to_portrait.svg',
  'icons/device_access_screen_rotation.svg',
  'icons/device_access_sd_storage.svg',
  'icons/device_access_secure.svg',
  'icons/device_access_storage_1.svg',
  'icons/device_access_switch_camera.svg',
  'icons/device_access_switch_video.svg',
  'icons/device_access_time.svg',
  'icons/device_access_usb.svg',
  'icons/device_access_video.svg',
  'icons/device_access_volume_muted.svg',
  'icons/device_access_volume_on.svg',
  'icons/hardware_computer.svg',
  'icons/hardware_dock.svg',
  'icons/hardware_gamepad.svg',
  'icons/hardware_headphones.svg',
  'icons/hardware_headset.svg',
  'icons/hardware_keyboard.svg',
  'icons/hardware_mouse.svg',
  'icons/hardware_phone.svg',
  'icons/images_crop.svg',
  'icons/images_rotate_left.svg',
  'icons/images_rotate_right.svg',
  'icons/images_slideshow.svg',
  'icons/location_directions.svg',
  'icons/location_map.svg',
  'icons/location_place.svg',
  'icons/location_web_site.svg',
  'icons/navigation_accept.svg',
  'icons/navigation_back.svg',
  'icons/navigation_cancel.svg',
  'icons/navigation_collapse.svg',
  'icons/navigation_expand.svg',
  'icons/navigation_forward.svg',
  'icons/navigation_next_item.svg',
  'icons/navigation_previous_item.svg',
  'icons/navigation_refresh.svg',
  'icons/rating_bad.svg',
  'icons/rating_favorite.svg',
  'icons/rating_good.svg',
  'icons/rating_half_important.svg',
  'icons/rating_important.svg',
  'icons/rating_not_important.svg',
  'icons/social_add_group.svg',
  'icons/social_add_person.svg',
  'icons/social_cc_bcc.svg',
  'icons/social_chat.svg',
  'icons/social_forward.svg',
  'icons/social_group.svg',
  'icons/social_person.svg',
  'icons/social_reply.svg',
  'icons/social_reply_all.svg',
  'icons/social_send_now.svg',
  'icons/social_share.svg'
];

studio.forms.ImageField.fontList_ = [
  'Roboto',
  'Helvetica',
  'Arial',
  'Georgia',
  'Book Antiqua',
  'Palatino',
  'Courier',
  'Courier New',
  'Webdings',
  'Wingdings'
];

/**
 * Loads the first valid image from a FileList (e.g. drag + drop source), as a data URI. This method
 * will throw an alert() in case of errors and call back with null.
 * @param {FileList} fileList The FileList to load.
 * @param {Function} callback The callback to fire once image loading is done (or fails).
 * @return Returns an object containing 'uri' or 'canvgSvgText' fields representing
 *      the loaded image. There will also be a 'name' field indicating the file name, if one
 *      is available.
 */
studio.forms.ImageField.loadImageFromFileList = function(fileList, callback) {
  fileList = fileList || [];

  var file = null;
  for (var i = 0; i < fileList.length; i++) {
    if (studio.forms.ImageField.isValidFile_(fileList[i])) {
      file = fileList[i];
      break;
    }
  }

  if (!file) {
    alert('Please choose a valid image file (PNG, JPG, GIF, SVG, etc.)');
    callback(null);
    return;
  }

  var useCanvg = USE_CANVG && file.type == 'image/svg+xml';

  var fileReader = new FileReader();

  // Closure to capture the file information.
  fileReader.onload = function(e) {
    callback({
      uri: useCanvg ? null : e.target.result,
      canvgSvgText: useCanvg ? e.target.result : null,
      name: file.name
    });
  };
  fileReader.onerror = function(e) {
    switch(e.target.error.code) {
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
    callback(null);
  };
  /*fileReader.onprogress = function(e) {
    $('#read-progress').css('visibility', 'visible');
    // evt is an ProgressEvent.
    if (e.lengthComputable) {
      $('#read-progress').val(Math.round((e.loaded / e.total) * 100));
    } else {
      $('#read-progress').removeAttr('value');
    }
  };*/
  fileReader.onabort = function(e) {
    alert('File read cancelled');
    callback(null);
  };
  /*fileReader.onloadstart = function(e) {
    $('#read-progress').css('visibility', 'visible');
  };*/
  if (useCanvg)
    fileReader.readAsText(file);
  else
    fileReader.readAsDataURL(file);
};

/**
 * Determines whether or not the given File is a valid value for the image.
 * 'File' here is a File using the W3C File API.
 * @private
 * @param {File} file Describe this parameter
 */
studio.forms.ImageField.isValidFile_ = function(file) {
  return !!file.type.toLowerCase().match(/^image\//);
};
/*studio.forms.ImageField.isValidFile_.allowedTypes = {
  'image/png': true,
  'image/jpeg': true,
  'image/svg+xml': true,
  'image/gif': true,
  'image/vnd.adobe.photoshop': true
};*/

studio.forms.ImageField.makeDropHandler_ = function(el, handler) {
  return function(evt) {
    $(el).removeClass('drag-hover');
    handler(evt);
  };
};

studio.forms.ImageField.makeDragoverHandler_ = function(el) {
  return function(evt) {
    el = $(el).get(0);
    if (el._studio_frm_dragtimeout_) {
      window.clearTimeout(el._studio_frm_dragtimeout_);
      el._studio_frm_dragtimeout_ = null;
    }
    evt.dataTransfer.dropEffect = 'link';
    evt.preventDefault();
  };
};

studio.forms.ImageField.makeDragenterHandler_ = function(el) {
  return function(evt) {
    el = $(el).get(0);
    if (el._studio_frm_dragtimeout_) {
      window.clearTimeout(el._studio_frm_dragtimeout_);
      el._studio_frm_dragtimeout_ = null;
    }
    $(el).addClass('drag-hover');
    evt.preventDefault();
  };
};

studio.forms.ImageField.makeDragleaveHandler_ = function(el) {
  return function(evt) {
    el = $(el).get(0);
    if (el._studio_frm_dragtimeout_)
      window.clearTimeout(el._studio_frm_dragtimeout_);
    el._studio_frm_dragtimeout_ = window.setTimeout(function() {
      $(el).removeClass('drag-hover');
    }, 100);
  };
};

// Prevent scrolling for clipart per http://stackoverflow.com/questions/7600454
$(document).ready(function() {
  $('.cancel-parent-scroll').on('mousewheel DOMMouseScroll',
    function(e) {
      var delta = e.originalEvent.wheelDelta || -e.originalEvent.detail;
      this.scrollTop -= delta;
      e.preventDefault();
    });
});

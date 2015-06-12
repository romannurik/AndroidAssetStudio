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
var USE_CANVG = false;//window.canvg && true;

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
        'image', '选择图片'
      ];
    } else {
      types = [
        'image', '图片',
        'clipart', '剪贴板',
        'text', '文本'
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
        .attr('placeholder', '选择剪贴板')
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
            '关于剪贴板资源，请访问 ',
            '<a href="https://github.com/google/material-design-icons">',
                'Material Design Icons on GitHub',
            '</a>.<br>',
            '额外的图标可以在这里找到 ',
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
              title: '文字',
            }),
            new studio.forms.AutocompleteTextField('font', {
              title: '字体',
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
              title: '裁剪',
              defaultValue: this.params_.defaultValueTrim || false,
              offText: '不裁剪',
              onText: '裁剪'
            })),
            new studio.forms.RangeField('pad', {
              title: '内边距',
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
    var isSvg = clipartSrc.match(/\.svg$/);
    var useCanvg = USE_CANVG && isSvg;

    $('img.form-image-clipart-item', this.el_.parent()).removeClass('selected');
    $('img[src="' + clipartSrc + '"]').addClass('selected');

    this.imageParams_ = {
      isSvg: isSvg,
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
            if (me.imageParams_.isSvg && me.params_.maxFinalSize) {
              size = {
                w: me.params_.maxFinalSize.w,
                h: me.params_.maxFinalSize.h
              };
            }
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
'icons/action_3d_rotation.svg',
'icons/action_accessibility.svg',
'icons/action_account_balance.svg',
'icons/action_account_balance_wallet.svg',
'icons/action_account_box.svg',
'icons/action_account_child.svg',
'icons/action_account_circle.svg',
'icons/action_add_shopping_cart.svg',
'icons/action_alarm.svg',
'icons/action_alarm_add.svg',
'icons/action_alarm_off.svg',
'icons/action_alarm_on.svg',
'icons/action_android.svg',
'icons/action_announcement.svg',
'icons/action_aspect_ratio.svg',
'icons/action_assessment.svg',
'icons/action_assignment.svg',
'icons/action_assignment_ind.svg',
'icons/action_assignment_late.svg',
'icons/action_assignment_return.svg',
'icons/action_assignment_returned.svg',
'icons/action_assignment_turned_in.svg',
'icons/action_autorenew.svg',
'icons/action_backup.svg',
'icons/action_book.svg',
'icons/action_bookmark.svg',
'icons/action_bookmark_outline.svg',
'icons/action_bug_report.svg',
'icons/action_cached.svg',
'icons/action_class.svg',
'icons/action_credit_card.svg',
'icons/action_dashboard.svg',
'icons/action_delete.svg',
'icons/action_description.svg',
'icons/action_dns.svg',
'icons/action_done.svg',
'icons/action_done_all.svg',
'icons/action_event.svg',
'icons/action_exit_to_app.svg',
'icons/action_explore.svg',
'icons/action_extension.svg',
'icons/action_face_unlock.svg',
'icons/action_favorite.svg',
'icons/action_favorite_outline.svg',
'icons/action_find_in_page.svg',
'icons/action_find_replace.svg',
'icons/action_flip_to_back.svg',
'icons/action_flip_to_front.svg',
'icons/action_get_app.svg',
'icons/action_grade.svg',
'icons/action_group_work.svg',
'icons/action_help.svg',
'icons/action_highlight_remove.svg',
'icons/action_history.svg',
'icons/action_home.svg',
'icons/action_https.svg',
'icons/action_info.svg',
'icons/action_info_outline.svg',
'icons/action_input.svg',
'icons/action_invert_colors.svg',
'icons/action_label.svg',
'icons/action_label_outline.svg',
'icons/action_language.svg',
'icons/action_launch.svg',
'icons/action_list.svg',
'icons/action_lock.svg',
'icons/action_lock_open.svg',
'icons/action_lock_outline.svg',
'icons/action_loyalty.svg',
'icons/action_markunread_mailbox.svg',
'icons/action_note_add.svg',
'icons/action_open_in_browser.svg',
'icons/action_open_in_new.svg',
'icons/action_open_with.svg',
'icons/action_pageview.svg',
'icons/action_payment.svg',
'icons/action_perm_camera_mic.svg',
'icons/action_perm_contact_cal.svg',
'icons/action_perm_data_setting.svg',
'icons/action_perm_device_info.svg',
'icons/action_perm_identity.svg',
'icons/action_perm_media.svg',
'icons/action_perm_phone_msg.svg',
'icons/action_perm_scan_wifi.svg',
'icons/action_picture_in_picture.svg',
'icons/action_polymer.svg',
'icons/action_print.svg',
'icons/action_query_builder.svg',
'icons/action_question_answer.svg',
'icons/action_receipt.svg',
'icons/action_redeem.svg',
'icons/action_reorder.svg',
'icons/action_report_problem.svg',
'icons/action_restore.svg',
'icons/action_room.svg',
'icons/action_schedule.svg',
'icons/action_search.svg',
'icons/action_settings.svg',
'icons/action_settings_applications.svg',
'icons/action_settings_backup_restore.svg',
'icons/action_settings_bluetooth.svg',
'icons/action_settings_cell.svg',
'icons/action_settings_display.svg',
'icons/action_settings_ethernet.svg',
'icons/action_settings_input_antenna.svg',
'icons/action_settings_input_component.svg',
'icons/action_settings_input_composite.svg',
'icons/action_settings_input_hdmi.svg',
'icons/action_settings_input_svideo.svg',
'icons/action_settings_overscan.svg',
'icons/action_settings_phone.svg',
'icons/action_settings_power.svg',
'icons/action_settings_remote.svg',
'icons/action_settings_voice.svg',
'icons/action_shop.svg',
'icons/action_shop_two.svg',
'icons/action_shopping_basket.svg',
'icons/action_shopping_cart.svg',
'icons/action_speaker_notes.svg',
'icons/action_spellcheck.svg',
'icons/action_star_rate.svg',
'icons/action_stars.svg',
'icons/action_store.svg',
'icons/action_subject.svg',
'icons/action_supervisor_account.svg',
'icons/action_swap_horiz.svg',
'icons/action_swap_vert.svg',
'icons/action_swap_vert_circle.svg',
'icons/action_system_update_tv.svg',
'icons/action_tab.svg',
'icons/action_tab_unselected.svg',
'icons/action_theaters.svg',
'icons/action_thumb_down.svg',
'icons/action_thumb_up.svg',
'icons/action_thumbs_up_down.svg',
'icons/action_toc.svg',
'icons/action_today.svg',
'icons/action_track_changes.svg',
'icons/action_translate.svg',
'icons/action_trending_down.svg',
'icons/action_trending_neutral.svg',
'icons/action_trending_up.svg',
'icons/action_turned_in.svg',
'icons/action_turned_in_not.svg',
'icons/action_verified_user.svg',
'icons/action_view_agenda.svg',
'icons/action_view_array.svg',
'icons/action_view_carousel.svg',
'icons/action_view_column.svg',
'icons/action_view_day.svg',
'icons/action_view_headline.svg',
'icons/action_view_list.svg',
'icons/action_view_module.svg',
'icons/action_view_quilt.svg',
'icons/action_view_stream.svg',
'icons/action_view_week.svg',
'icons/action_visibility.svg',
'icons/action_visibility_off.svg',
'icons/action_wallet_giftcard.svg',
'icons/action_wallet_membership.svg',
'icons/action_wallet_travel.svg',
'icons/action_work.svg',
'icons/alert_error.svg',
'icons/alert_warning.svg',
'icons/av_album.svg',
'icons/av_av_timer.svg',
'icons/av_closed_caption.svg',
'icons/av_equalizer.svg',
'icons/av_explicit.svg',
'icons/av_fast_forward.svg',
'icons/av_fast_rewind.svg',
'icons/av_games.svg',
'icons/av_hearing.svg',
'icons/av_high_quality.svg',
'icons/av_loop.svg',
'icons/av_mic.svg',
'icons/av_mnone.svg',
'icons/av_moff.svg',
'icons/av_movie.svg',
'icons/av_my_library_add.svg',
'icons/av_my_library_books.svg',
'icons/av_my_library_music.svg',
'icons/av_new_releases.svg',
'icons/av_not_interested.svg',
'icons/av_pause.svg',
'icons/av_pause_circle_fill.svg',
'icons/av_pause_circle_outline.svg',
'icons/av_play_arrow.svg',
'icons/av_play_circle_fill.svg',
'icons/av_play_circle_outline.svg',
'icons/av_play_shopping_bag.svg',
'icons/av_playlist_add.svg',
'icons/av_queue.svg',
'icons/av_queue_music.svg',
'icons/av_radio.svg',
'icons/av_recent_actors.svg',
'icons/av_repeat.svg',
'icons/av_repeat_one.svg',
'icons/av_replay.svg',
'icons/av_shuffle.svg',
'icons/av_skip_next.svg',
'icons/av_skip_previous.svg',
'icons/av_snooze.svg',
'icons/av_stop.svg',
'icons/av_subtitles.svg',
'icons/av_surround_sound.svg',
'icons/av_video_collection.svg',
'icons/av_videocam.svg',
'icons/av_videocam_off.svg',
'icons/av_volume_down.svg',
'icons/av_volume_mute.svg',
'icons/av_volume_off.svg',
'icons/av_volume_up.svg',
'icons/av_web.svg',
'icons/communication_business.svg',
'icons/communication_call.svg',
'icons/communication_call_end.svg',
'icons/communication_call_made.svg',
'icons/communication_call_merge.svg',
'icons/communication_call_missed.svg',
'icons/communication_call_received.svg',
'icons/communication_call_split.svg',
'icons/communication_chat.svg',
'icons/communication_clear_all.svg',
'icons/communication_comment.svg',
'icons/communication_contacts.svg',
'icons/communication_dialer_sip.svg',
'icons/communication_dialpad.svg',
'icons/communication_dnd_on.svg',
'icons/communication_email.svg',
'icons/communication_forum.svg',
'icons/communication_import_export.svg',
'icons/communication_invert_colors_off.svg',
'icons/communication_invert_colors_on.svg',
'icons/communication_live_help.svg',
'icons/communication_location_off.svg',
'icons/communication_location_on.svg',
'icons/communication_message.svg',
'icons/communication_messenger.svg',
'icons/communication_no_sim.svg',
'icons/communication_phone.svg',
'icons/communication_portable_wifi_off.svg',
'icons/communication_quick_contacts_dialer.svg',
'icons/communication_quick_contacts_mail.svg',
'icons/communication_ring_volume.svg',
'icons/communication_stay_current_landscape.svg',
'icons/communication_stay_current_portrait.svg',
'icons/communication_stay_primary_landscape.svg',
'icons/communication_stay_primary_portrait.svg',
'icons/communication_swap_calls.svg',
'icons/communication_textsms.svg',
'icons/communication_voicemail.svg',
'icons/communication_vpn_key.svg',
'icons/content_add.svg',
'icons/content_add_box.svg',
'icons/content_add_circle.svg',
'icons/content_add_circle_outline.svg',
'icons/content_archive.svg',
'icons/content_backspace.svg',
'icons/content_block.svg',
'icons/content_clear.svg',
'icons/content_content_copy.svg',
'icons/content_content_cut.svg',
'icons/content_content_paste.svg',
'icons/content_create.svg',
'icons/content_drafts.svg',
'icons/content_filter_list.svg',
'icons/content_flag.svg',
'icons/content_forward.svg',
'icons/content_gesture.svg',
'icons/content_inbox.svg',
'icons/content_link.svg',
'icons/content_mail.svg',
'icons/content_markunread.svg',
'icons/content_redo.svg',
'icons/content_remove.svg',
'icons/content_remove_circle.svg',
'icons/content_remove_circle_outline.svg',
'icons/content_reply.svg',
'icons/content_reply_all.svg',
'icons/content_report.svg',
'icons/content_save.svg',
'icons/content_select_all.svg',
'icons/content_send.svg',
'icons/content_sort.svg',
'icons/content_text_format.svg',
'icons/content_undo.svg',
'icons/device_access_alarm.svg',
'icons/device_access_alarms.svg',
'icons/device_access_time.svg',
'icons/device_add_alarm.svg',
'icons/device_airplanemode_off.svg',
'icons/device_airplanemode_on.svg',
'icons/device_battery_20.svg',
'icons/device_battery_30.svg',
'icons/device_battery_50.svg',
'icons/device_battery_60.svg',
'icons/device_battery_80.svg',
'icons/device_battery_90.svg',
'icons/device_battery_alert.svg',
'icons/device_battery_charging_20.svg',
'icons/device_battery_charging_30.svg',
'icons/device_battery_charging_50.svg',
'icons/device_battery_charging_60.svg',
'icons/device_battery_charging_80.svg',
'icons/device_battery_charging_90.svg',
'icons/device_battery_charging_full.svg',
'icons/device_battery_full.svg',
'icons/device_battery_std.svg',
'icons/device_battery_unknown.svg',
'icons/device_bluetooth.svg',
'icons/device_bluetooth_connected.svg',
'icons/device_bluetooth_disabled.svg',
'icons/device_bluetooth_searching.svg',
'icons/device_brightness_auto.svg',
'icons/device_brightness_high.svg',
'icons/device_brightness_low.svg',
'icons/device_brightness_medium.svg',
'icons/device_data_usage.svg',
'icons/device_developer_mode.svg',
'icons/device_devices.svg',
'icons/device_dvr.svg',
'icons/device_gps_fixed.svg',
'icons/device_gps_not_fixed.svg',
'icons/device_gps_off.svg',
'icons/device_location_disabled.svg',
'icons/device_location_searching.svg',
'icons/device_multitrack_audio.svg',
'icons/device_network_cell.svg',
'icons/device_network_wifi.svg',
'icons/device_nfc.svg',
'icons/device_now_wallpaper.svg',
'icons/device_now_widgets.svg',
'icons/device_screen_lock_landscape.svg',
'icons/device_screen_lock_portrait.svg',
'icons/device_screen_lock_rotation.svg',
'icons/device_screen_rotation.svg',
'icons/device_sd_storage.svg',
'icons/device_settings_system_daydream.svg',
'icons/device_signal_cellular_0_bar.svg',
'icons/device_signal_cellular_1_bar.svg',
'icons/device_signal_cellular_2_bar.svg',
'icons/device_signal_cellular_3_bar.svg',
'icons/device_signal_cellular_4_bar.svg',
'icons/device_signal_cellular_connected_no_internet_0_bar.svg',
'icons/device_signal_cellular_connected_no_internet_1_bar.svg',
'icons/device_signal_cellular_connected_no_internet_2_bar.svg',
'icons/device_signal_cellular_connected_no_internet_3_bar.svg',
'icons/device_signal_cellular_connected_no_internet_4_bar.svg',
'icons/device_signal_cellular_no_sim.svg',
'icons/device_signal_cellular_null.svg',
'icons/device_signal_cellular_off.svg',
'icons/device_signal_wifi_0_bar.svg',
'icons/device_signal_wifi_1_bar.svg',
'icons/device_signal_wifi_2_bar.svg',
'icons/device_signal_wifi_3_bar.svg',
'icons/device_signal_wifi_4_bar.svg',
'icons/device_signal_wifi_off.svg',
'icons/device_storage.svg',
'icons/device_usb.svg',
'icons/device_wifi_lock.svg',
'icons/device_wifi_tethering.svg',
'icons/editor_attach_file.svg',
'icons/editor_attach_money.svg',
'icons/editor_border_all.svg',
'icons/editor_border_bottom.svg',
'icons/editor_border_clear.svg',
'icons/editor_border_color.svg',
'icons/editor_border_horizontal.svg',
'icons/editor_border_inner.svg',
'icons/editor_border_left.svg',
'icons/editor_border_outer.svg',
'icons/editor_border_right.svg',
'icons/editor_border_style.svg',
'icons/editor_border_top.svg',
'icons/editor_border_vertical.svg',
'icons/editor_format_align_center.svg',
'icons/editor_format_align_justify.svg',
'icons/editor_format_align_left.svg',
'icons/editor_format_align_right.svg',
'icons/editor_format_bold.svg',
'icons/editor_format_clear.svg',
'icons/editor_format_color_fill.svg',
'icons/editor_format_color_reset.svg',
'icons/editor_format_color_text.svg',
'icons/editor_format_indent_decrease.svg',
'icons/editor_format_indent_increase.svg',
'icons/editor_format_italic.svg',
'icons/editor_format_line_spacing.svg',
'icons/editor_format_list_bulleted.svg',
'icons/editor_format_list_numbered.svg',
'icons/editor_format_paint.svg',
'icons/editor_format_quote.svg',
'icons/editor_format_size.svg',
'icons/editor_format_strikethrough.svg',
'icons/editor_format_textdirection_l_to_r.svg',
'icons/editor_format_textdirection_r_to_l.svg',
'icons/editor_format_underline.svg',
'icons/editor_functions.svg',
'icons/editor_insert_chart.svg',
'icons/editor_insert_comment.svg',
'icons/editor_insert_drive_file.svg',
'icons/editor_insert_emoticon.svg',
'icons/editor_insert_invitation.svg',
'icons/editor_insert_link.svg',
'icons/editor_insert_photo.svg',
'icons/editor_merge_type.svg',
'icons/editor_mode_comment.svg',
'icons/editor_mode_edit.svg',
'icons/editor_publish.svg',
'icons/editor_vertical_align_bottom.svg',
'icons/editor_vertical_align_center.svg',
'icons/editor_vertical_align_top.svg',
'icons/editor_wrap_text.svg',
'icons/file_attachment.svg',
'icons/file_cloud.svg',
'icons/file_cloud_circle.svg',
'icons/file_cloud_done.svg',
'icons/file_cloud_download.svg',
'icons/file_cloud_off.svg',
'icons/file_cloud_queue.svg',
'icons/file_cloud_upload.svg',
'icons/file_file_download.svg',
'icons/file_file_upload.svg',
'icons/file_folder.svg',
'icons/file_folder_open.svg',
'icons/file_folder_shared.svg',
'icons/hardware_cast.svg',
'icons/hardware_cast_connected.svg',
'icons/hardware_computer.svg',
'icons/hardware_desktop_mac.svg',
'icons/hardware_desktop_windows.svg',
'icons/hardware_dock.svg',
'icons/hardware_gamepad.svg',
'icons/hardware_headset.svg',
'icons/hardware_headset_mic.svg',
'icons/hardware_keyboard.svg',
'icons/hardware_keyboard_alt.svg',
'icons/hardware_keyboard_arrow_down.svg',
'icons/hardware_keyboard_arrow_left.svg',
'icons/hardware_keyboard_arrow_right.svg',
'icons/hardware_keyboard_arrow_up.svg',
'icons/hardware_keyboard_backspace.svg',
'icons/hardware_keyboard_capslock.svg',
'icons/hardware_keyboard_control.svg',
'icons/hardware_keyboard_hide.svg',
'icons/hardware_keyboard_return.svg',
'icons/hardware_keyboard_tab.svg',
'icons/hardware_keyboard_voice.svg',
'icons/hardware_laptop.svg',
'icons/hardware_laptop_chromebook.svg',
'icons/hardware_laptop_mac.svg',
'icons/hardware_laptop_windows.svg',
'icons/hardware_memory.svg',
'icons/hardware_mouse.svg',
'icons/hardware_phone_android.svg',
'icons/hardware_phone_iphone.svg',
'icons/hardware_phonelink.svg',
'icons/hardware_phonelink_off.svg',
'icons/hardware_security.svg',
'icons/hardware_sim_card.svg',
'icons/hardware_smartphone.svg',
'icons/hardware_speaker.svg',
'icons/hardware_tablet.svg',
'icons/hardware_tablet_android.svg',
'icons/hardware_tablet_mac.svg',
'icons/hardware_tv.svg',
'icons/hardware_watch.svg',
'icons/image_add_to_photos.svg',
'icons/image_adjust.svg',
'icons/image_assistant_photo.svg',
'icons/image_audiotrack.svg',
'icons/image_blur_circular.svg',
'icons/image_blur_linear.svg',
'icons/image_blur_off.svg',
'icons/image_blur_on.svg',
'icons/image_brightness_1.svg',
'icons/image_brightness_2.svg',
'icons/image_brightness_3.svg',
'icons/image_brightness_4.svg',
'icons/image_brightness_5.svg',
'icons/image_brightness_6.svg',
'icons/image_brightness_7.svg',
'icons/image_brush.svg',
'icons/image_camera.svg',
'icons/image_camera_alt.svg',
'icons/image_camera_front.svg',
'icons/image_camera_rear.svg',
'icons/image_camera_roll.svg',
'icons/image_center_focus_strong.svg',
'icons/image_center_focus_weak.svg',
'icons/image_collections.svg',
'icons/image_color_lens.svg',
'icons/image_colorize.svg',
'icons/image_compare.svg',
'icons/image_control_point.svg',
'icons/image_control_point_duplicate.svg',
'icons/image_crop.svg',
'icons/image_crop_16_9.svg',
'icons/image_crop_3_2.svg',
'icons/image_crop_5_4.svg',
'icons/image_crop_7_5.svg',
'icons/image_crop_din.svg',
'icons/image_crop_free.svg',
'icons/image_crop_landscape.svg',
'icons/image_crop_original.svg',
'icons/image_crop_portrait.svg',
'icons/image_crop_square.svg',
'icons/image_dehaze.svg',
'icons/image_details.svg',
'icons/image_edit.svg',
'icons/image_exposure.svg',
'icons/image_exposure_minus_1.svg',
'icons/image_exposure_minus_2.svg',
'icons/image_exposure_plus_1.svg',
'icons/image_exposure_plus_2.svg',
'icons/image_exposure_zero.svg',
'icons/image_filter.svg',
'icons/image_filter_1.svg',
'icons/image_filter_2.svg',
'icons/image_filter_3.svg',
'icons/image_filter_4.svg',
'icons/image_filter_5.svg',
'icons/image_filter_6.svg',
'icons/image_filter_7.svg',
'icons/image_filter_8.svg',
'icons/image_filter_9.svg',
'icons/image_filter_9_plus.svg',
'icons/image_filter_b_and_w.svg',
'icons/image_filter_center_focus.svg',
'icons/image_filter_drama.svg',
'icons/image_filter_frames.svg',
'icons/image_filter_hdr.svg',
'icons/image_filter_none.svg',
'icons/image_filter_tilt_shift.svg',
'icons/image_filter_vintage.svg',
'icons/image_flare.svg',
'icons/image_flash_auto.svg',
'icons/image_flash_off.svg',
'icons/image_flash_on.svg',
'icons/image_flip.svg',
'icons/image_gradient.svg',
'icons/image_grain.svg',
'icons/image_grid_off.svg',
'icons/image_grid_on.svg',
'icons/image_hdr_off.svg',
'icons/image_hdr_on.svg',
'icons/image_hdr_strong.svg',
'icons/image_hdr_weak.svg',
'icons/image_healing.svg',
'icons/image_image.svg',
'icons/image_image_aspect_ratio.svg',
'icons/image_iso.svg',
'icons/image_landscape.svg',
'icons/image_leak_add.svg',
'icons/image_leak_remove.svg',
'icons/image_lens.svg',
'icons/image_looks.svg',
'icons/image_looks_3.svg',
'icons/image_looks_4.svg',
'icons/image_looks_5.svg',
'icons/image_looks_6.svg',
'icons/image_looks_one.svg',
'icons/image_looks_two.svg',
'icons/image_loupe.svg',
'icons/image_movie_creation.svg',
'icons/image_nature.svg',
'icons/image_nature_people.svg',
'icons/image_navigate_before.svg',
'icons/image_navigate_next.svg',
'icons/image_palette.svg',
'icons/image_panorama.svg',
'icons/image_panorama_fisheye.svg',
'icons/image_panorama_horizontal.svg',
'icons/image_panorama_vertical.svg',
'icons/image_panorama_wide_angle.svg',
'icons/image_photo.svg',
'icons/image_photo_album.svg',
'icons/image_photo_camera.svg',
'icons/image_photo_library.svg',
'icons/image_portrait.svg',
'icons/image_remove_red_eye.svg',
'icons/image_rotate_left.svg',
'icons/image_rotate_right.svg',
'icons/image_slideshow.svg',
'icons/image_straighten.svg',
'icons/image_style.svg',
'icons/image_switch_camera.svg',
'icons/image_switch_video.svg',
'icons/image_tag_faces.svg',
'icons/image_texture.svg',
'icons/image_timelapse.svg',
'icons/image_timer.svg',
'icons/image_timer_10.svg',
'icons/image_timer_3.svg',
'icons/image_timer_auto.svg',
'icons/image_timer_off.svg',
'icons/image_tonality.svg',
'icons/image_transform.svg',
'icons/image_tune.svg',
'icons/image_wb_auto.svg',
'icons/image_wb_cloudy.svg',
'icons/image_wb_incandescent.svg',
'icons/image_wb_irradescent.svg',
'icons/image_wb_sunny.svg',
'icons/maps_beenhere.svg',
'icons/maps_directions.svg',
'icons/maps_directions_bike.svg',
'icons/maps_directions_bus.svg',
'icons/maps_directions_car.svg',
'icons/maps_directions_ferry.svg',
'icons/maps_directions_subway.svg',
'icons/maps_directions_train.svg',
'icons/maps_directions_transit.svg',
'icons/maps_directions_walk.svg',
'icons/maps_flight.svg',
'icons/maps_hotel.svg',
'icons/maps_layers.svg',
'icons/maps_layers_clear.svg',
'icons/maps_local_airport.svg',
'icons/maps_local_atm.svg',
'icons/maps_local_attraction.svg',
'icons/maps_local_bar.svg',
'icons/maps_local_cafe.svg',
'icons/maps_local_car_wash.svg',
'icons/maps_local_convenience_store.svg',
'icons/maps_local_drink.svg',
'icons/maps_local_florist.svg',
'icons/maps_local_gas_station.svg',
'icons/maps_local_grocery_store.svg',
'icons/maps_local_hospital.svg',
'icons/maps_local_hotel.svg',
'icons/maps_local_laundry_service.svg',
'icons/maps_local_library.svg',
'icons/maps_local_mall.svg',
'icons/maps_local_movies.svg',
'icons/maps_local_offer.svg',
'icons/maps_local_parking.svg',
'icons/maps_local_pharmacy.svg',
'icons/maps_local_phone.svg',
'icons/maps_local_pizza.svg',
'icons/maps_local_play.svg',
'icons/maps_local_post_office.svg',
'icons/maps_local_print_shop.svg',
'icons/maps_local_restaurant.svg',
'icons/maps_local_see.svg',
'icons/maps_local_shipping.svg',
'icons/maps_local_taxi.svg',
'icons/maps_location_history.svg',
'icons/maps_map.svg',
'icons/maps_my_location.svg',
'icons/maps_navigation.svg',
'icons/maps_pin_drop.svg',
'icons/maps_place.svg',
'icons/maps_rate_review.svg',
'icons/maps_restaurant_menu.svg',
'icons/maps_satellite.svg',
'icons/maps_store_mall_directory.svg',
'icons/maps_terrain.svg',
'icons/maps_traffic.svg',
'icons/navigation_apps.svg',
'icons/navigation_arrow_back.svg',
'icons/navigation_arrow_drop_down.svg',
'icons/navigation_arrow_drop_down_circle.svg',
'icons/navigation_arrow_drop_up.svg',
'icons/navigation_arrow_forward.svg',
'icons/navigation_cancel.svg',
'icons/navigation_check.svg',
'icons/navigation_chevron_left.svg',
'icons/navigation_chevron_right.svg',
'icons/navigation_close.svg',
'icons/navigation_expand_less.svg',
'icons/navigation_expand_more.svg',
'icons/navigation_fullscreen.svg',
'icons/navigation_fullscreen_exit.svg',
'icons/navigation_menu.svg',
'icons/navigation_more_horiz.svg',
'icons/navigation_more_vert.svg',
'icons/navigation_refresh.svg',
'icons/navigation_unfold_less.svg',
'icons/navigation_unfold_more.svg',
'icons/notification_adb.svg',
'icons/notification_bluetooth_audio.svg',
'icons/notification_disc_full.svg',
'icons/notification_dnd_forwardslash.svg',
'icons/notification_do_not_disturb.svg',
'icons/notification_drive_eta.svg',
'icons/notification_event_available.svg',
'icons/notification_event_busy.svg',
'icons/notification_event_note.svg',
'icons/notification_folder_special.svg',
'icons/notification_mms.svg',
'icons/notification_more.svg',
'icons/notification_network_locked.svg',
'icons/notification_phone_bluetooth_speaker.svg',
'icons/notification_phone_forwarded.svg',
'icons/notification_phone_in_talk.svg',
'icons/notification_phone_locked.svg',
'icons/notification_phone_missed.svg',
'icons/notification_phone_paused.svg',
'icons/notification_play_download.svg',
'icons/notification_play_install.svg',
'icons/notification_sd_card.svg',
'icons/notification_sim_card_alert.svg',
'icons/notification_sms.svg',
'icons/notification_sms_failed.svg',
'icons/notification_sync.svg',
'icons/notification_sync_disabled.svg',
'icons/notification_sync_problem.svg',
'icons/notification_system_update.svg',
'icons/notification_tap_and_play.svg',
'icons/notification_time_to_leave.svg',
'icons/notification_vibration.svg',
'icons/notification_voice_chat.svg',
'icons/notification_vpn_lock.svg',
'icons/social_cake.svg',
'icons/social_domain.svg',
'icons/social_group.svg',
'icons/social_group_add.svg',
'icons/social_location_city.svg',
'icons/social_mood.svg',
'icons/social_notifications.svg',
'icons/social_notifications_none.svg',
'icons/social_notifications_off.svg',
'icons/social_notifications_on.svg',
'icons/social_notifications_paused.svg',
'icons/social_pages.svg',
'icons/social_party_mode.svg',
'icons/social_people.svg',
'icons/social_people_outline.svg',
'icons/social_person.svg',
'icons/social_person_add.svg',
'icons/social_person_outline.svg',
'icons/social_plus_one.svg',
'icons/social_poll.svg',
'icons/social_public.svg',
'icons/social_school.svg',
'icons/social_share.svg',
'icons/social_whatshot.svg',
'icons/toggle_check_box.svg',
'icons/toggle_check_box_outline_blank.svg',
'icons/toggle_radio_button_off.svg',
'icons/toggle_radio_button_on.svg',
'icons/toggle_star.svg',
'icons/toggle_star_half.svg',
'icons/toggle_star_outline.svg'
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

  var isSvg = file.type == 'image/svg+xml';
  var useCanvg = USE_CANVG && isSvg;

  var fileReader = new FileReader();

  // Closure to capture the file information.
  fileReader.onload = function(e) {
    callback({
      isSvg: isSvg,
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

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

//#REQUIRE "includes.js"
//#REQUIRE "forms.js"

/**
 * Represents a form field and its associated UI elements. This should be
 * broken out into a more MVC-like architecture in the future.
 */
studio.forms.Field = Base.extend({
  /**
   * Instantiates a new field with the given ID and parameters.
   * @constructor
   */
  constructor: function(id, params) {
    this.id_ = id;
    this.params_ = params;
  },

  /**
   * Sets the form owner of the field. Internally called by
   * {@link studio.forms.Form}.
   * @private
   * @param {studio.forms.Form} form The owner form.
   */
  setForm_: function(form) {
    this.form_ = form;
  },

  /**
   * Returns a complete ID.
   * @type String
   */
  getLongId: function() {
    return this.form_.id_ + '-' + this.id_;
  },

  /**
   * Returns the ID for the form's UI element (or container).
   * @type String
   */
  getHtmlId: function() {
    return '_frm-' + this.getLongId();
  },

  /**
   * Generates the UI elements for a form field container. Not very portable
   * outside the Asset Studio UI. Intended to be overriden by descendents.
   * @private
   * @param {HTMLElement} container The destination element to contain the
   * field.
   */
  createUI: function(container) {
    container = $(container);
    this.baseEl_ = $('<div>')
      .addClass('form-field-outer')
      .append(
        $('<label>')
          .attr('for', this.getHtmlId())
          .text(this.params_.title)
          .append($('<div>')
            .addClass('form-field-help-text')
            .css('display', this.params_.helpText ? '' : 'none')
            .html(this.params_.helpText))
      )
      .append(
        $('<div>')
          .addClass('form-field-container')
      )
      .appendTo(container);
    return this.baseEl_;
  },

  /**
   * Enables or disables the form field.
   */
  setEnabled: function(enabled) {
    if (this.baseEl_) {
      if (enabled) {
        this.baseEl_.removeAttr('disabled');
      } else {
        this.baseEl_.attr('disabled', 'disabled');
      }
    }
  }
});

studio.forms.TextField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    this.el_ = $('<input>')
      .attr('type', 'text')
      .addClass('form-text')
      .val(this.getValue())
      .bind('change', function() {
        me.setValue($(this).val(), true);
      })
      .bind('keydown change', function() {
        var inputEl = this;
        var oldVal = me.getValue();
        window.setTimeout(function() {
          var newVal = $(inputEl).val();
          if (oldVal != newVal) {
            me.setValue(newVal, true);
          }
        }, 0);
      })
      .appendTo(fieldContainer);
  },

  getValue: function() {
    var value = this.value_;
    if (typeof value != 'string') {
      value = this.params_.defaultValue || '';
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      $(this.el_).val(val);
    }
    this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    return this.getValue();
  },

  deserializeValue: function(s) {
    this.setValue(s);
  }
});

studio.forms.AutocompleteTextField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    var datalistId = this.getHtmlId() + '-datalist';

    this.el_ = $('<input>')
      .attr('type', 'text')
      .addClass('form-text')
      .attr('list', datalistId)
      .val(this.getValue())
      .bind('keydown change', function() {
        var inputEl = this;
        window.setTimeout(function() {
          me.setValue($(inputEl).val(), true);
        }, 0);
      })
      .appendTo(fieldContainer);

    this.datalistEl_ = $('<datalist>')
      .attr('id', datalistId)
      .appendTo(fieldContainer);

    this.params_.items = this.params_.items || [];
    for (var i = 0; i < this.params_.items.length; i++) {
      this.datalistEl_.append($('<option>').attr('value', this.params_.items[i]));
    }
  },

  getValue: function() {
    var value = this.value_;
    if (typeof value != 'string') {
      value = this.params_.defaultValue || '';
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      $(this.el_).val(val);
    }
    this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    return this.getValue();
  },

  deserializeValue: function(s) {
    this.setValue(s);
  }
});

studio.forms.ColorField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;
    this.el_ = $('<input>')
      .addClass('form-color')
      .attr('type', 'text')
      .attr('id', this.getHtmlId())
      .css('background-color', this.getValue().color)
      .appendTo(fieldContainer);

    this.el_.spectrum({
      color: this.getValue().color,
      showInput: true,
      showPalette: true,
      palette: [
        ['#ffffff', '#000000'],
        ['#f44336', '#e91e63'],
        ['#9c27b0', '#673ab7'],
        ['#3f51b5', '#2196f3'],
        ['#03a9f4', '#00bcd4'],
        ['#009688', '#4caf50'],
        ['#8bc34a', '#cddc39'],
        ['#ffeb3b', '#ffc107'],
        ['#ff9800', '#ff5722'],
        ['#9e9e9e', '#607d8b']
      ],
      localStorageKey: 'recentcolors',
      showInitial: true,
      showButtons: false,
      change: function(color) {
        me.setValue({ color: color.toHexString() }, true);
      }
    });

    if (this.params_.alpha) {
      this.alphaEl_ = $('<input>')
        .attr('type', 'range')
        .attr('min', 0)
        .attr('max', 100)
        .val(this.getValue().alpha)
        .addClass('form-range')
        .change(function() {
    			me.setValue({ alpha: Number(me.alphaEl_.val()) }, true);
        })
        .appendTo(fieldContainer);

      this.alphaTextEl_ = $('<div>')
        .addClass('form-range-text')
        .text(this.getValue().alpha + '%')
        .appendTo(fieldContainer);
    }
  },

  getValue: function() {
    var color = this.value_ || this.params_.defaultValue || '#000000';
    if (/^([0-9a-f]{6}|[0-9a-f]{3})$/i.test(color)) {
      color = '#' + color;
    }

    var alpha = this.alpha_;
    if (typeof alpha != 'number') {
      alpha = this.params_.defaultAlpha;
      if (typeof alpha != 'number')
        alpha = 100;
    }

    return { color: color, alpha: alpha };
  },

  setValue: function(val, pauseUi) {
    val = val || {};
    if ('color' in val) {
      this.value_ = val.color;
    }
    if ('alpha' in val) {
      this.alpha_ = val.alpha;
    }

    var computedValue = this.getValue();
    this.el_.css('background-color', computedValue.color);
    if (!pauseUi) {
      $(this.el_).spectrum('set', computedValue.color);
      if (this.alphaEl_) {
        this.alphaEl_.val(computedValue.alpha);
      }
    }
    if (this.alphaTextEl_) {
      this.alphaTextEl_.text(computedValue.alpha + '%');
    }
    this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    var computedValue = this.getValue();
    return computedValue.color.replace(/^#/, '') + ',' + computedValue.alpha;
  },

  deserializeValue: function(s) {
    var val = {};
    var arr = s.split(',', 2);
    if (arr.length >= 1) {
      val.color = arr[0];
    }
    if (arr.length >= 2) {
      val.alpha = parseInt(arr[1], 10);
    }
    this.setValue(val);
  }
});

studio.forms.EnumField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    if (this.params_.buttons) {
      this.el_ = $('<div>')
        .attr('id', this.getHtmlId())
        .addClass('form-field-buttonset')
        .appendTo(fieldContainer);
      for (var i = 0; i < this.params_.options.length; i++) {
        var option = this.params_.options[i];
        $('<input>')
          .attr({
            type: 'radio',
            name: this.getHtmlId(),
            id: this.getHtmlId() + '-' + option.id,
            value: option.id
          })
          .change(function() {
            me.setValueInternal_($(this).val(), true);
          })
          .appendTo(this.el_);
        $('<label>')
          .attr('for', this.getHtmlId() + '-' + option.id)
          .html(option.title)
          .appendTo(this.el_);
      }
      this.setValueInternal_(this.getValue());

    } else {
      this.el_ = $('<select>')
        .attr('id', this.getHtmlId())
        .change(function() {
          me.setValueInternal_($(this).val(), true);
        })
        .appendTo(fieldContainer);
      for (var i = 0; i < this.params_.options.length; i++) {
        var option = this.params_.options[i];
        $('<option>')
          .attr('value', option.id)
          .text(option.title)
          .appendTo(this.el_);
      }

      this.el_.combobox({
        selected: function(evt, data) {
          me.setValueInternal_(data.item.value, true);
          me.form_.notifyChanged_(me);
        }
      });
      this.setValueInternal_(this.getValue());
    }
  },

  getValue: function() {
    var value = this.value_;
    if (value === undefined) {
      value = this.params_.defaultValue || this.params_.options[0].id;
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.setValueInternal_(val, pauseUi);
  },

  setValueInternal_: function(val, pauseUi) {
    // Note, this needs to be its own function because setValue gets
    // overridden in BooleanField and we need access to this method
    // from createUI.
    this.value_ = val;
    if (!pauseUi) {
      if (this.params_.buttons) {
        $('input', this.el_).each(function(i, el) {
          $(el).attr('checked', $(el).val() == val);
        });
      } else {
        this.el_.val(val);
      }
    }
    this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    return this.getValue();
  },

  deserializeValue: function(s) {
    this.setValue(s);
  }
});

studio.forms.BooleanField = studio.forms.EnumField.extend({
  constructor: function(id, params) {
    params.options = [
      { id: '1', title: params.onText || 'Yes' },
      { id: '0', title: params.offText || 'No' }
    ];
    params.defaultValue = params.defaultValue ? '1' : '0';
    params.buttons = true;
    this.base(id, params);
  },

  getValue: function() {
    return this.base() == '1';
  },

  setValue: function(val, pauseUi) {
    this.base(val ? '1' : '0', pauseUi);
  },

  serializeValue: function() {
    return this.getValue() ? '1' : '0';
  },

  deserializeValue: function(s) {
    this.setValue(s == '1');
  }
});

studio.forms.RangeField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    this.el_ = $('<input>')
      .attr('type', 'range')
      .attr('min', this.params_.min || 0)
      .attr('max', this.params_.max || 100)
      .attr('step', this.params_.step || 1)
      .addClass('form-range')
      .change(function() {
        me.setValue(Number(me.el_.val()) || 0, true);
      })
      .val(this.getValue())
      .appendTo(fieldContainer);

    if (this.params_.textFn || this.params_.showText) {
      this.params_.textFn = this.params_.textFn || function(d){ return d; };
      this.textEl_ = $('<div>')
        .addClass('form-range-text')
        .text(this.params_.textFn(this.getValue()))
        .appendTo(fieldContainer);
    }
  },

  getValue: function() {
    var value = this.value_;
    if (typeof value != 'number') {
      value = this.params_.defaultValue;
      if (typeof value != 'number')
        value = 0;
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      this.el_.val(val);
    }
		if (this.textEl_) {
		  this.textEl_.text(this.params_.textFn(val));
	  }
		this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    return this.getValue();
  },

  deserializeValue: function(s) {
    this.setValue(Number(s)); // don't use parseInt nor parseFloat
  }
});

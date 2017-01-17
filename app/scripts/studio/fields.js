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

import {default as tinycolor} from 'tinycolor2';

/**
 * Represents a form field and its associated UI elements. This should be
 * broken out into a more MVC-like architecture in the future.
 */
export class Field {
  /**
   * Instantiates a new field with the given ID and parameters.
   * @constructor
   */
  constructor(id, params) {
    this.id_ = id;
    this.params_ = params;
    this.enabled_ = true;
  }

  /**
   * Sets the form owner of the field. Internally called by
   * {@link studio.forms.Form}.
   * @private
   * @param {studio.forms.Form} form The owner form.
   */
  setForm_(form) {
    this.form_ = form;
  }

  /**
   * Returns a complete ID.
   * @type String
   */
  getLongId() {
    return this.form_.id_ + '-' + this.id_;
  }

  /**
   * Returns the ID for the form's UI element (or container).
   * @type String
   */
  getHtmlId() {
    return '_frm-' + this.getLongId();
  }

  /**
   * Generates the UI elements for a form field container. Not very portable
   * outside the Asset Studio UI. Intended to be overriden by descendents.
   * @private
   * @param {HTMLElement} container The destination element to contain the
   * field.
   */
  createUi(container) {
    container = $(container);
    this.baseEl_ = $('<div>')
        .addClass('form-field-outer')
        .addClass(this.params_.newGroup ? 'is-new-group' : '')
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
  }

  getEnabled() {
    return this.enabled_;
  }

  /**
   * Enables or disables the form field.
   */
  setEnabled(enabled) {
    this.enabled_ = enabled;
    if (this.baseEl_) {
      if (enabled) {
        this.baseEl_.removeAttr('disabled');
      } else {
        this.baseEl_.attr('disabled', 'disabled');
      }
    }
  }
}


export class TextField extends Field {
  createUi(container) {
    var fieldContainer = $('.form-field-container', super.createUi(container));

    this.el_ = $('<input>')
        .attr('type', 'text')
        .attr('placeholder', this.params_.placeholder)
        .addClass('form-field-text')
        .val(this.getValue())
        .on('input', ev => {
          var oldVal = this.getValue();
          var newVal = $(ev.currentTarget).val();
          if (oldVal != newVal) {
            this.setValue(newVal, true);
          }
        })
        .appendTo(fieldContainer);
  }

  getValue() {
    var value = this.value_;
    if (typeof value != 'string') {
      value = this.params_.defaultValue || '';
    }
    return value;
  }

  setValue(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      this.el_.val(val);
    }
    this.form_.notifyChanged_(this);
  }

  serializeValue() {
    return this.getValue();
  }

  deserializeValue(s) {
    this.setValue(s);
  }
}


export class AutocompleteTextField extends Field {
  createUi(container) {
    var fieldContainer = $('.form-field-container', super.createUi(container));

    var datalistId = this.getHtmlId() + '-datalist';

    this.el_ = $('<input>')
        .attr('type', 'text')
        .attr('placeholder', this.params_.placeholder)
        .addClass('form-field-text')
        .attr('list', datalistId)
        .val(this.getValue())
        .on('input', ev => this.setValue($(ev.currentTarget).val(), true))
        .appendTo(fieldContainer);

    this.datalistEl_ = $('<datalist>')
        .attr('id', datalistId)
        .appendTo(fieldContainer);

    this.setOptions(this.params_.options);
  }

  setOptions(options = []) {
    this.datalistEl_.empty();
    options.forEach(option => this.datalistEl_.append($('<option>').attr('value', option)));
  }

  getValue() {
    var value = this.value_;
    if (typeof value != 'string') {
      value = this.params_.defaultValue || '';
    }
    return value;
  }

  setValue(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      $(this.el_).val(val);
    }
    this.form_.notifyChanged_(this);
  }

  serializeValue() {
    return this.getValue();
  }

  deserializeValue(s) {
    this.setValue(s);
  }
}


export class ColorField extends Field {
  createUi(container) {
    var fieldContainer = $('.form-field-container', super.createUi(container));

    this.el_ = $('<input>')
        .attr('type', 'text')
        .attr('id', this.getHtmlId())
        .appendTo(fieldContainer);

    let update_ = color => this.setValue(color, true);

    this.el_.spectrum({
      color: this.getValue().toRgbString(),
      showInput: true,
      showPalette: true,
      showAlpha: this.params_.alpha,
      preferredFormat: 'hex',
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
      change: update_,
      move: update_
    });
  }

  getValue() {
    return this.value_ || tinycolor(this.params_.defaultValue || '#000');
  }

  setValue(val, pauseUi) {
    this.value_ = (val.hasOwnProperty('_r'))
        ? val
        : tinycolor(val || this.params_.defaultValue || '#000');
    if (!pauseUi) {
      this.el_.spectrum('set', this.value_.toRgbString());
    }
    this.form_.notifyChanged_(this);
  }

  serializeValue() {
    return this.getValue().toRgbString();
  }

  deserializeValue(s) {
    this.setValue(s);
  }
}


export class EnumField extends Field {
  createUi(container) {
    let fieldContainer = $('.form-field-container', super.createUi(container));

    if (this.params_.buttons) {
      this.el_ = $('<div>')
          .attr('id', this.getHtmlId())
          .addClass('form-field-buttonset')
          .appendTo(fieldContainer);

    } else {
      this.el_ = $('<div>')
          .addClass('form-field-select')
          .attr('id', this.getHtmlId())
          .appendTo(fieldContainer);

      this.selectEl_ = $('<select>')
          .attr('id', this.getHtmlId())
          .on('input', ev => this.setValueInternal_($(ev.currentTarget).val(), true))
          .appendTo(this.el_);
    }

    this.setOptions(this.params_.options);
  }

  setOptions(options) {
    options = (options || []).map(option =>
        (typeof option == 'string')
            ? {id: option, title: String(option)}
            : option);

    if (this.params_.buttons) {
      this.el_.empty();
      (options || []).forEach(option => {
        $('<input>')
            .attr({
              type: 'radio',
              name: this.getHtmlId(),
              id: `${this.getHtmlId()}-${option.id}`,
              value: option.id
            })
            .on('change', ev => this.setValueInternal_($(ev.currentTarget).val(), false))
            .appendTo(this.el_);
        $('<label>')
            .attr('for', `${this.getHtmlId()}-${option.id}`)
            .attr('tabindex', 0)
            .html(option.title)
            .appendTo(this.el_);
      });
    } else {
      this.selectEl_.empty();
      (options || []).forEach(option =>
          $('<option>')
              .attr('value', option.id)
              .text(option.title)
              .appendTo(this.selectEl_));
    }

    this.setValueInternal_(this.getValue());
  }

  getValue() {
    var value = this.value_;
    if (value === undefined) {
      value = this.params_.defaultValue;
      if (value === undefined && this.params_.options && this.params_.options.length) {
        let firstOption = this.params_.options[0];
        value = ('id' in firstOption) ? firstOption.id : String(firstOption);
      }
    }
    return value;
  }

  setValue(val, pauseUi) {
    this.setValueInternal_(val, pauseUi);
  }

  setValueInternal_(val, pauseUi) {
    // Note, this needs to be its own function because setValue gets
    // overridden in BooleanField and we need access to this method
    // from createUi.
    this.value_ = val;
    if (!pauseUi) {
      if (this.params_.buttons) {
        this.el_.find('input').each((i, el) =>
            $(el).prop('checked', $(el).val() == val));
      } else {
        this.selectEl_.val(val);
      }
    }
    this.form_.notifyChanged_(this);
  }

  serializeValue() {
    return this.getValue();
  }

  deserializeValue(s) {
    this.setValue(s);
  }
}


export class BooleanField extends EnumField {
  constructor(id, params) {
    super(id, params);
    params.options = [
      { id: '1', title: params.onText || 'Yes' },
      { id: '0', title: params.offText || 'No' }
    ];
    params.defaultValue = params.defaultValue ? '1' : '0';
    params.buttons = true;
  }

  getValue() {
    return super.getValue() == '1';
  }

  setValue(val, pauseUi) {
    super.setValue(val ? '1' : '0', pauseUi);
  }

  serializeValue() {
    return this.getValue() ? '1' : '0';
  }

  deserializeValue(s) {
    this.setValue(s == '1');
  }
}


export class RangeField extends Field {
  createUi(container) {
    var fieldContainer = $('.form-field-container', super.createUi(container));
    var me = this;

    this.el_ = $('<div>')
        .addClass('form-field-range')
        .attr('id', this.getHtmlId())
        .appendTo(fieldContainer);

    this.rangeEl_ = $('<input>')
        .attr('type', 'range')
        .attr('min', this.params_.min || 0)
        .attr('max', this.params_.max || 100)
        .attr('step', this.params_.step || 1)
        .on('input', () => this.setValue(Number(this.rangeEl_.val()) || 0, true))
        .val(this.getValue())
        .appendTo(this.el_);

    if (this.params_.textFn || this.params_.showText) {
      this.params_.textFn = this.params_.textFn || (d => d);
      this.textEl_ = $('<div>')
          .addClass('form-field-range-text')
          .text(this.params_.textFn(this.getValue()))
          .appendTo(this.el_);
    }
  }

  getValue() {
    var value = this.value_;
    if (typeof value != 'number') {
      value = this.params_.defaultValue;
      if (typeof value != 'number')
        value = 0;
    }
    return value;
  }

  setValue(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      this.rangeEl_.val(val);
    }
		if (this.textEl_) {
		  this.textEl_.text(this.params_.textFn(val));
	  }
		this.form_.notifyChanged_(this);
  }

  serializeValue() {
    return this.getValue();
  }

  deserializeValue(s) {
    this.setValue(Number(s)); // don't use parseInt nor parseFloat
  }
}

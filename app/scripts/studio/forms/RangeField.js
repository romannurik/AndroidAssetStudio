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

import {Field} from './Field';

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
    let oldValue = this.value_;
    this.value_ = val;
    if (!pauseUi) {
      this.rangeEl_.val(val);
    }
    if (this.textEl_) {
      this.textEl_.text(this.params_.textFn(val));
    }
    this.notifyChanged_(val, oldValue);
  }

  serializeValue() {
    return this.getValue();
  }

  deserializeValue(s) {
    this.setValue(Number(s)); // don't use parseInt nor parseFloat
  }
}

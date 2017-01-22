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
    let oldValue = this.value_;
    this.value_ = val;
    if (!pauseUi) {
      this.el_.val(val);
    }
    this.notifyChanged_(val, oldValue);
  }

  serializeValue() {
    return this.getValue();
  }

  deserializeValue(s) {
    this.setValue(s);
  }
}

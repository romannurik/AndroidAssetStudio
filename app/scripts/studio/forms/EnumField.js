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
    if (!this.el_) {
      return;
    }

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
    let oldValue = this.value_;
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
    this.notifyChanged_(val, oldValue);
  }

  serializeValue() {
    return this.getValue();
  }

  deserializeValue(s) {
    this.setValue(s);
  }
}

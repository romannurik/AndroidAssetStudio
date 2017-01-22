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

import {Field} from './Field';

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
    let oldValue = this.value_;
    this.value_ = (val.hasOwnProperty('_r'))
        ? val
        : tinycolor(val || this.params_.defaultValue || '#000');
    if (!pauseUi) {
      this.el_.spectrum('set', this.value_.toRgbString());
    }
    this.notifyChanged_(val, oldValue);
  }

  serializeValue() {
    return this.getValue().toRgbString();
  }

  deserializeValue(s) {
    this.setValue(s);
  }
}

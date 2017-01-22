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
    if (this.params_.onChange) {
      this.onChange(this.params_.onChange);
    }
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
    this.onChange((newValue, oldValue) => {
      this.form_.notifyChanged_(this, newValue, oldValue);
    });
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

  onChange(listener) {
    this.changeListeners_ = (this.changeListeners_ || []).concat([listener]);
  }

  notifyChanged_(newValue, oldValue) {
    (this.changeListeners_ || []).forEach(listener => listener(newValue, oldValue));
  }
}

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
 * Class defining a data entry form for use in the Asset Studio.
 */
export class Form {
  /**
   * Creates a new form with the given parameters.
   * @constructor
   * @param {Array} [params.inputs] A list of inputs
   */
  constructor(params) {
    this.id_ = params.id;
    this.params_ = params;
    this.fields_ = params.fields;
    this.fields_.forEach(field => field.setForm_(this));
    this.fields_.forEach(field => field.createUi(params.container));
  }

  /**
   * Adds an onchange listener.
   */
  onChange(listener) {
    this.changeListeners_ = (this.changeListeners_ || []).concat([listener]);
  }

  /**
   * Notifies that the form contents have changed;
   * @private
   */
  notifyChanged_(field, newValue, oldValue) {
    if (this.pauseNotify_) {
      return;
    }
    (this.changeListeners_ || []).forEach(listener => listener(field, newValue, oldValue));
  }

  /**
   * Returns the current values of the form fields, as an object.
   * @type Object
   */
  getValues() {
    let values = {};
    this.fields_.forEach(field => values[field.id_] = field.getValue());
    return values;
  }

  /**
   * Returns all available serialized values of the form fields, as an object.
   * All values in the returned object are either strings or objects.
   * @type Object
   */
  getValuesSerialized() {
    let values = {};
    this.fields_.forEach(field => {
      let value = field.serializeValue ? field.serializeValue() : undefined;
      if (value !== undefined) {
        values[field.id_] = field.serializeValue();
      }
    });

    return values;
  }

  /**
   * Sets the form field values for the key/value pairs in the given object.
   * Values must be serialized forms of the form values. The form must be
   * initialized before calling this method.
   */
  setValuesSerialized(serializedValues) {
    this.pauseNotify_ = true;
    this.fields_
        .filter(field => field.id_ in serializedValues && field.deserializeValue)
        .forEach(field => field.deserializeValue(serializedValues[field.id_]));
    this.pauseNotify_ = false;
    this.notifyChanged_();
  }
}

/*
Copyright 2010 Google Inc.

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

studio.forms = {};

/**
 * Class defining a data entry form for use in the Asset Studio.
 */
studio.forms.Form = Base.extend({
  /**
   * Creates a new form with the given parameters.
   * @constructor
   * @param {Function} [params.onChange] A function
   * @param {Array} [params.inputs] A list of inputs
   */
  constructor: function(id, params) {
    this.id_ = id;
    this.params_ = params;
    this.fields_ = params.fields;
    this.pauseNotify_ = false;

    for (var i = 0; i < this.fields_.length; i++) {
      this.fields_[i].setForm_(this);
    }

    this.onChange = this.params_.onChange || function(){};
  },

  /**
   * Creates the user interface for the form in the given container.
   * @private
   * @param {HTMLElement} container The container node for the form UI.
   */
  createUI: function(container) {
    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      field.createUI(container);
    }
  },

  /**
   * Notifies that the form contents have changed;
   * @private
   */
  notifyChanged_: function(field) {
    if (this.pauseNotify_) {
      return;
    }
    this.onChange(field);
  },

  /**
   * Returns the current values of the form fields, as an object.
   * @type Object
   */
  getValues: function() {
    var values = {};

    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      values[field.id_] = field.getValue();
    }

    return values;
  },

  /**
   * Returns all available serialized values of the form fields, as an object.
   * All values in the returned object are either strings or objects.
   * @type Object
   */
  getValuesSerialized: function() {
    var values = {};

    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      var value = field.serializeValue ? field.serializeValue() : undefined;
      if (value !== undefined) {
        values[field.id_] = field.serializeValue();
      }
    }

    return values;
  },

  /**
   * Sets the form field values for the key/value pairs in the given object.
   * Values must be serialized forms of the form values. The form must be
   * initialized before calling this method.
   */
  setValuesSerialized: function(serializedValues) {
    this.pauseNotify_ = true;
    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      if (field.id_ in serializedValues && field.deserializeValue) {
        field.deserializeValue(serializedValues[field.id_]);
      }
    }
    this.pauseNotify_ = false;
    this.notifyChanged_(null);
  }
});
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

import $ from 'jquery';
import tinycolor from 'tinycolor2';

import React from 'react';
import ReactDOM from 'react-dom';
import { SketchPicker } from 'react-color';

import {Field} from './field';

const PRESET_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
  '#009688', '#4caf50', '#8bc34a', '#cddc39',
  '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
  '#9e9e9e', '#607d8b', '#ffffff', '#000000',
];

class ColorPickerWidget extends React.Component {
  constructor(props) {
    super(props);
    this.widgetRef = React.createRef();
    this.state = {
      displayColorPicker: false,
      color: props.color || {r:0,g:0,b:0,a:1},
    };

    this.handleClick = this.handleClick.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  handleKeyDown(event){
    if (event.keyCode === 27) {
      this.handleClose();
    }
  }

  handleClick() {
    let r = this.widgetRef.current.getBoundingClientRect();
    this.setState({
      displayColorPicker: !this.state.displayColorPicker,
      widgetLeft: r.x,
      widgetTop: r.y - 270,
    });
  }

  handleClose() {
    this.setState({ displayColorPicker: false });
  }

  handleChange(color) {
    this.setState({ color: color.rgb });
    if (this.props.onChange) {
      this.props.onChange(this.rgbaString(color.rgb));
    }
  }

  rgbaString(color) {
    return `rgba(${ color.r }, ${ color.g }, ${ color.b }, ${ color.a })`;
  }

  render() {
    return (
      <div id={ this.props.id } onKeyDown={ this.handleKeyDown }>
        <button ref={ this.widgetRef } className="form-field-color-widget" onClick={ this.handleClick }>
          <div className="form-field-color-widget-swatch" style={{
            color: this.rgbaString(this.state.color)
          }} />
        </button>
        { this.state.displayColorPicker
            ? <div className="form-field-color-popup-container" style={{
                  left: this.state.widgetLeft,
                  top: this.state.widgetTop,
                }}>
                <div className="form-field-color-popup-cover" onClick={ this.handleClose }/>
                <SketchPicker
                    presetColors={ PRESET_COLORS }
                    disableAlpha={ !this.props.showAlpha }
                    color={ this.state.color }
                    onChange={ this.handleChange } />
              </div>
            : null }
      </div>
    )
  }
}

export class ColorField extends Field {
  createUi(container) {
    var fieldContainer = $('.form-field-container', super.createUi(container));

    let update_ = color => this.setValue(color, true);

    ReactDOM.render(
      <ColorPickerWidget
          ref={(c) => this.pickerWidget = c}
          id={ this.getHtmlId() }
          color={ this.getValue().toRgb() }
          showAlpha={ this.params_.alpha }
          onChange={ update_ } />,
      $('<div>').appendTo(fieldContainer).get(0));
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
      this.pickerWidget.setState({ color: this.value_.toRgb() });
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

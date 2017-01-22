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

import {EnumField} from './EnumField';

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

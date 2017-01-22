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

import {studio} from '../studio';
import {imagelib} from '../imagelib';
import {BaseGenerator} from './BaseGenerator';

const ICON_SIZE = {w: 24, h: 24};
const TARGET_RECT = {x: 1, y: 1, w: 22, h: 22};

export class NotificationIconGenerator extends BaseGenerator {
  setupForm() {
    super.setupForm();
    $('.outputs-panel').attr('data-theme', 'dark');

    let defaultNameForSourceValue_ = v => {
      let name = studio.Util.sanitizeResourceName(v.name || 'example');
      return `ic_stat_${name}`;
    };

    let nameField;
    this.form = new studio.Form({
      id: 'iconform',
      container: '#inputs-form',
      fields: [
        new studio.ImageField('source', {
          title: 'Source',
          helpText: 'Must be transparent',
          maxFinalSize: { w: 128, h: 128 },
          defaultValueClipart: 'ac_unit',
          dropTarget: document.body,
          onChange: (newValue, oldValue) => {
            if (nameField.getValue() == defaultNameForSourceValue_(oldValue)) {
              nameField.setValue(defaultNameForSourceValue_(newValue));
            }
          }
        }),
        (nameField = new studio.TextField('name', {
          newGroup: true,
          title: 'Name',
          helpText: 'Used when generating ZIP files.',
          defaultValue: defaultNameForSourceValue_({})
        }))
      ]
    });
    this.form.onChange(field => this.regenerateDebounced_());
  }

  regenerate() {
    let values = this.form.getValues();

    this.zipper.clear();
    this.zipper.setZipFilename(`${values.name}.zip`);

    this.densities.forEach(density => {
      let mult = studio.Util.getMultBaseMdpi(density);
      let iconSize = studio.Util.multRound(ICON_SIZE, mult);

      let outCtx = imagelib.Drawing.context(iconSize);
      let tmpCtx = imagelib.Drawing.context(iconSize);

      if (values.source.ctx) {
        let srcCtx = values.source.ctx;
        imagelib.Drawing.drawCenterInside(
            tmpCtx,
            srcCtx,
            studio.Util.mult(TARGET_RECT, mult),
            {x: 0, y: 0, w: srcCtx.canvas.width, h: srcCtx.canvas.height});
      }

      imagelib.Effects.fx([
        {effect: 'fill-color', color: '#fff'}
      ], outCtx, tmpCtx, iconSize);

      this.zipper.add({
        name: `res/drawable-${density}/${values.name}.png`,
        canvas: outCtx.canvas
      });

      this.setImageForSlot_(density, outCtx.canvas.toDataURL());
    });
  }
}

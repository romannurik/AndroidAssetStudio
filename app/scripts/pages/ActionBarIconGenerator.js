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

const ICON_SIZE = { w: 24, h: 24 };
const TARGET_RECT = { x: 0, y: 0, w: 24, h: 24 };

const GRID_OVERLAY_SVG =
    `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd">
            <rect vector-effect="non-scaling-stroke" x="4" y="2" width="16" height="20" rx="2"/>
            <rect vector-effect="non-scaling-stroke" x="3" y="3" width="18" height="18" rx="2"/>
            <rect vector-effect="non-scaling-stroke" x="2" y="4" width="20" height="16" rx="2"/>
            <circle vector-effect="non-scaling-stroke" cx="12" cy="12" r="5"/>
            <circle vector-effect="non-scaling-stroke" cx="12" cy="12" r="10"/>
            <path vector-effect="non-scaling-stroke" d="M0 24L24 0M0 0l24 24m-12 0V0M8 0v24m8-24v24m8-12H0m0 4h24M0 8h24"/>
        </g>
    </svg>`;

export class ActionBarIconGenerator extends BaseGenerator {
  get gridOverlaySvg() {
    return GRID_OVERLAY_SVG;
  }

  setupForm() {
    super.setupForm();

    let defaultNameForSourceValue_ = v => {
      let name = studio.Util.sanitizeResourceName(v.name || 'example');
      return `ic_action_${name}`;
    };

    let nameField, customColorField;
    this.form = new studio.Form({
      id: 'iconform',
      container: '#inputs-form',
      fields: [
        new studio.ImageField('source', {
          title: 'Source',
          helpText: 'Must be transparent',
          maxFinalSize: { w: 128, h: 128 },
          clipartNoTrimPadding: true,
          defaultValueClipart: 'add_circle',
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
        })),
        new studio.EnumField('theme', {
          title: 'Theme',
          buttons: true,
          options: [
            { id: 'light', title: 'Light' },
            { id: 'dark', title: 'Dark' },
            { id: 'custom', title: 'Custom' }
          ],
          defaultValue: 'light'
        }),
        (customColorField = new studio.ColorField('color', {
          title: 'Color',
          defaultValue: 'rgba(33, 150, 243, .6)',
          alpha: true
        }))
      ]
    });
    this.form.onChange(field => {
      let values = this.form.getValues();
      $('.outputs-panel').attr('data-theme', values.theme);
      customColorField.setEnabled(values.theme == 'custom');
      this.regenerateDebounced_();
    });
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

      let color = values.color;
      if (values.theme == 'light') {
        color = tinycolor('rgba(0, 0, 0, .54)');
      } else if (values.theme == 'dark') {
        color = tinycolor('#fff');
      }

      let alpha = color.getAlpha();
      color.setAlpha(1);

      imagelib.Effects.fx([
        {effect: 'fill-color', color: color.toRgbString(), opacity: alpha}
      ], outCtx, tmpCtx, iconSize);

      color.setAlpha(alpha);

      this.zipper.add({
        name: `res/drawable-${density}/${values.name}.png`,
        canvas: outCtx.canvas
      });

      this.setImageForSlot_(density, outCtx.canvas.toDataURL());
    });
  }
}

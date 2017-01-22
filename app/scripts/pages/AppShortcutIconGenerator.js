/*
 * Copyright 2017 Google Inc.
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

const ICON_SIZE = { w: 48, h: 48 };
const TARGET_RECT = { x: 12, y: 12, w: 24, h: 24 };

const GRID_OVERLAY_SVG =
    `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd">
            <rect vector-effect="non-scaling-stroke" x="12" y="12" width="24" height="24"/>
        </g>
    </svg>`;

export class AppShortcutIconGenerator extends BaseGenerator {
  get gridOverlaySvg() {
    return GRID_OVERLAY_SVG;
  }

  setupForm() {
    super.setupForm();

    let defaultNameForSourceValue_ = v => {
      let name = studio.Util.sanitizeResourceName(v.name || 'example');
      return `ic_shortcut_${name}`;
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
          defaultValueClipart: 'search',
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
        new studio.ColorField('foreColor', {
          title: 'Color',
          defaultValue: '#448aff'
        }),
        new studio.ColorField('backColor', {
          title: 'Background color',
          defaultValue: '#f5f5f5'
        })
      ]
    });
    this.form.onChange(() => this.regenerateDebounced_());
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

      outCtx.save();
      outCtx.beginPath();
      outCtx.arc(24 * mult, 24 * mult, 22 * mult, 0, Math.PI * 2);
      outCtx.closePath();
      values.backColor.setAlpha(1);
      outCtx.fillStyle = values.backColor.toRgbString();
      outCtx.fill();
      outCtx.restore();

      if (values.source.ctx) {
        let srcCtx = values.source.ctx;
        imagelib.Drawing.drawCenterInside(
            tmpCtx,
            srcCtx,
            studio.Util.mult(TARGET_RECT, mult),
            {x: 0, y: 0, w: srcCtx.canvas.width, h: srcCtx.canvas.height});
      }

      values.foreColor.setAlpha(1);
      imagelib.Effects.fx([
        {effect: 'fill-color', color: values.foreColor.toRgbString()}
      ], outCtx, tmpCtx, iconSize);

      this.zipper.add({
        name: `res/drawable-${density}/${values.name}.png`,
        canvas: outCtx.canvas
      });

      this.setImageForSlot_(density, outCtx.canvas.toDataURL());
    });
  }
}

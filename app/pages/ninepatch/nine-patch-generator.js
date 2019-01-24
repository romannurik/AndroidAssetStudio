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

import * as studio from '../../studio';

import {BaseGenerator} from '../../base-generator';

import {NinePatchStage} from './nine-patch-stage';
import {NinePatchPreview} from './nine-patch-preview';
import {NinePatchLoader} from './nine-patch-loader';


const DENSITIES = new Set(['xxxhdpi', 'xxhdpi', 'xhdpi', 'hdpi', 'mdpi']);
const SOURCE_DENSITY_OPTIONS = [
  { id: '160', title:   'mdpi<br><small>(160)</small>' },
  { id: '240', title:   'hdpi<br><small>(240)</small>' },
  { id: '320', title:  'xhdpi<br><small>(320)</small>' },
  { id: '480', title: 'xxhdpi<br><small>(480)</small>' },
  { id: '640', title: 'xxxhdpi<br><small>(640)</small>' }
];


if (document.location.search.indexOf('extradensities') >= 0) {
  DENSITIES.add('ldpi');
  DENSITIES.add('tvdpi');
  // SOURCE_DENSITY_OPTIONS.push({ id: '120', title:   'ldpi<br><small>(120)</small>' });
  // SOURCE_DENSITY_OPTIONS.push({ id: '213', title:  'tvdpi<br><small>(213)</small>' });
}


export class NinePatchGenerator extends BaseGenerator {
  constructor() {
    super();
    this.stage = new NinePatchStage();
    this.preview = new NinePatchPreview(this.stage);

    this.stage.onChange(() => {
      this.regenerate();
      this.preview.redraw();
    });

    this.setupOutputsPreviewTabs();
  }

  setupOutputsPreviewTabs() {
    $('.outputs-preview-tabs input').on('change', ev => {
      $('.outputs-preview-sidebar').attr('data-view', $(ev.currentTarget).val());
      $('.outputs-preview-tabs input').prop('checked', false);
      $(ev.currentTarget).prop('checked', true);
    });
  }

  get densities() {
    return DENSITIES;
  }

  setupForm() {
    super.setupForm();
    let nameField;
    this.form = new studio.Form({
      id: 'ninepatchform',
      container: '#inputs-form',
      fields: [
        new studio.ImageField('source', {
          title: 'Source graphic',
          imageOnly: true,
          noTrimForm: true,
          noPreview: true,
          dropTarget: document.body
        }),
        new studio.EnumField('sourceDensity', {
          title: 'Source density',
          buttons: true,
          options: SOURCE_DENSITY_OPTIONS,
          defaultValue: '320'
        }),
        (nameField = new studio.TextField('name', {
          title: 'Drawable name',
          helpText: 'Used when generating ZIP files. Becomes <code>&lt;name&gt;.9.png</code>.',
          defaultValue: 'example'
        }))
      ]
    });
    this.form.onChange(field => {
      let values = this.form.getValues();
      if (!field || field.id_ == 'source') {
        if (values.source) {
          if (!values.source.ctx) {
            return;
          }
          let src = values.source;
          let size = { w: src.ctx.canvas.width, h: src.ctx.canvas.height };
          this.stage.name = `${src.name}-${size.w}x${size.h}`;
          // let isSvg = !!src.name.match(/\.svg$/i);
          if (src.name && src.name.match(/\.9\.png$/i)) {
            NinePatchLoader.loadNinePatchIntoStage(src.ctx, this.stage);
          } else {
            this.stage.loadSourceImage(src.ctx);
          }
          if (src.name) {
            let name = studio.Util.sanitizeResourceName(src.name);
            if (name != nameField.getValue()) {
              nameField.setValue(name);
            }
          }
        } else {
          this.stage.loadSourceImage(null);
        }
      } else {
        this.regenerate();
      }
    });
  }

  regenerate() {
    // this.preview.update();

    if (!this.stage.srcCtx) {
      return;
    }

    let values = this.form.getValues();
    values.name = values.name || 'outline';

    this.zipper.clear();
    this.zipper.setZipFilename(`${values.name}.9.zip`);

    this.densities.forEach(density => {
      let dpi = studio.Util.getDpiForDensity(density);

      // scale source graphic
      // TODO: support better-smoothing option
      let scale = dpi / values.sourceDensity;
      let outSize = {
        w: Math.ceil(this.stage.srcSize.w * scale) + 2,
        h: Math.ceil(this.stage.srcSize.h * scale) + 2
      };
      let outCtx = studio.Drawing.context(outSize);
      studio.Drawing.drawImageScaled(outCtx, this.stage.srcCtx,
          0, 0, this.stage.srcSize.w, this.stage.srcSize.h,
          1, 1, outSize.w - 2, outSize.h - 2);

      // draw optical bounds
      fillRectImageData(outCtx, [255,0,0,255],
          1, outSize.h - 1,
          Math.floor(scale * this.stage.opticalBoundsRect.x), 1);
      fillRectImageData(outCtx, [255,0,0,255],
          outSize.w - 1, outSize.h - 1,
          -Math.ceil(scale * (this.stage.srcSize.w - this.stage.opticalBoundsRect.x - this.stage.opticalBoundsRect.w)), 1);
      fillRectImageData(outCtx, [255,0,0,255],
          outSize.w - 1, 1,
          1, Math.floor(scale * this.stage.opticalBoundsRect.y));
      fillRectImageData(outCtx, [255,0,0,255],
          outSize.w - 1, outSize.h - 1,
          1, -Math.ceil(scale * (this.stage.srcSize.h - this.stage.opticalBoundsRect.y - this.stage.opticalBoundsRect.h)));

      // draw nine-patch tick marks
      fillRectImageData(outCtx, [0,0,0,255],
          1 + Math.floor(scale * this.stage.stretchRect.x), 0,
          Math.ceil(scale * this.stage.stretchRect.w), 1);
      fillRectImageData(outCtx, [0,0,0,255],
          0, 1 + Math.floor(scale * this.stage.stretchRect.y),
          1, Math.ceil(scale * this.stage.stretchRect.h));
      fillRectImageData(outCtx, [0,0,0,255],
          1 + Math.floor(scale * this.stage.contentRect.x), outSize.h - 1,
          Math.ceil(scale * this.stage.contentRect.w), 1);
      fillRectImageData(outCtx, [0,0,0,255],
          outSize.w - 1, 1 + Math.floor(scale * this.stage.contentRect.y),
          1, Math.ceil(scale * this.stage.contentRect.h));

      // add to zip and show preview

      console.log(density, outCtx.getImageData(outSize.w - 1, Math.floor(outSize.h / 2), 1, 1).data.toString());

      this.zipper.add({
        name: `res/drawable-${density}/${values.name}.9.png`,
        canvas: outCtx.canvas
      });

      this.setImageForSlot_(density, outCtx.canvas.toDataURL('image/png', 1.0));
    });
  }
}

function fillRectImageData(ctx, colorArray, x, y, w, h) {
  if (w == 0 || h == 0) {
    return;
  }

  if (w < 0) {
    x += w;
    w = -w;
  }
  if (h < 0) {
    y += h;
    h = -h;
  }

  // This is necessary because fillRect() and other drawing methods have weird
  // alpha channel precision issues
  // see https://stackoverflow.com/questions/22384423/canvas-corrupts-rgb-when-alpha-0
  // see https://github.com/romannurik/AndroidAssetStudio/issues/196
  let imgData = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    imgData.data[i * 4] = colorArray[0];
    imgData.data[i * 4 + 1] = colorArray[1];
    imgData.data[i * 4 + 2] = colorArray[2];
    imgData.data[i * 4 + 3] = colorArray[3];
  }
  ctx.putImageData(imgData, x, y);
}
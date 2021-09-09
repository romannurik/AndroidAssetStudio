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

import * as studio from '../studio';

import {BaseGenerator} from '../base-generator';

const ICON_SIZE = { w: 48, h: 48 }; // now legacy

const ADAPTIVE_ICON_WIDTH = 108;

const TARGET_RECTS_BY_SHAPE = {
  circle: { x:  2, y:  2, w:  44, h:  44 },
  square: { x:  5, y:  5, w:  38, h:  38 },
  vrect: { x:  8, y:  2, w:  32, h:  44 },
  hrect: { x:  2, y:  8, w:  44, h:  32 },
};

const TARGET_RECT_FULL_BLEED = {x: 0, y: 0, w: 48, h: 48};

const TARGET_RECT_ADAPTIVE = {x: 8, y: 8, w: 32, h: 32}; // same as middle 72dp in 108dp square


const DEFAULT_EFFECT_OPTIONS = [
  { id: 'none', title: 'None' },
  { id: 'elevate', title: 'Elevate' },
  { id: 'shadow', title: 'Cast shadow' },
  { id: 'score', title: 'Score' }
];

export class LauncherIconGenerator extends BaseGenerator {
  get densities() {
    return new Set(['xxxhdpi', 'xxhdpi', 'xhdpi', 'hdpi', 'mdpi']);
  }

  get outputSlots() {
    return new Set(['play_store', ...this.densities]);
  }

  setupForm() {
    this.form = new studio.Form({
      id: 'iconform',
      container: '#inputs-form',
      fields: [
        new studio.ImageField('foreground', {
          title: 'Foreground',
          maxFinalSize: { w: 720, h: 720 }, // max render size, for SVGs
          defaultValueTrim: 1,
          defaultValuePadding: .25,
          defaultValueClipart: 'android',
          dropTarget: document.body
        }),
        new studio.ColorField('foreColor', {
          newGroup: true,
          title: 'Color',
          helpText: 'Set to transparent to use original colors',
          alpha: true,
          defaultValue: 'rgba(96, 125, 139, 0)'
        }),
        new studio.ColorField('backColor', {
          title: 'Background color',
          defaultValue: '#448aff'
        }),
        new studio.BooleanField('crop', {
          title: 'Scaling',
          defaultValue: false,
          offText: 'Center',
          onText: 'Crop'
        }),
        new studio.EnumField('backgroundShape', {
          title: 'Shape (Legacy)',
          helpText: 'For older Android devices',
          options: [
            { id: 'square', title: 'Square' },
            { id: 'circle', title: 'Circle' },
            { id: 'vrect', title: 'Tall rect' },
            { id: 'hrect', title: 'Wide rect' }
          ],
          defaultValue: 'circle',
        }),
        new studio.EnumField('effects', {
          title: 'Effect',
          buttons: true,
          options: DEFAULT_EFFECT_OPTIONS,
          defaultValue: 'none'
        }),
        new studio.TextField('name', {
          title: 'Name',
          defaultValue: 'ic_launcher'
        })
      ]
    });
    this.form.onChange(field => this.regenerateDebounced_());
  }

  regenerate() {
    let values = this.form.getValues();
    values.name = values.name || 'ic_launcher';

    this.zipper.clear();
    this.zipper.setZipFilename(`${values.name}.zip`);

    // generate for each density
    for (let density of this.densities) {
      let mult = studio.Util.getMultBaseMdpi(density);

      // legacy version
      let ctx = this.regenerateRaw_({ mult });
      this.zipper.add({
        name: `res/mipmap-${density}/${values.name}.png`,
        canvas: ctx.canvas
      });
      this.setImageForSlot_(density, ctx.canvas.toDataURL());

      // adaptive version background + foreground
      this.zipper.add({
        name: `res/mipmap-${density}/${values.name}_adaptive_back.png`,
        canvas: this.regenerateRaw_({
          mult: mult * ADAPTIVE_ICON_WIDTH / ICON_SIZE.w,
          adaptive: 'back',
        }).canvas
      });

      this.zipper.add({
        name: `res/mipmap-${density}/${values.name}_adaptive_fore.png`,
        canvas: this.regenerateRaw_({
          mult: mult * ADAPTIVE_ICON_WIDTH / ICON_SIZE.w,
          adaptive: 'fore',
        }).canvas
      });
    }

    // generate web/play version
    let ctx = this.regenerateRaw_({ mult: 512 / 48, fullBleed: true });
    this.zipper.add({
      name: 'play_store_512.png',
      canvas: ctx.canvas
    });
    this.setImageForSlot_('play_store', ctx.canvas.toDataURL());

    this.zipper.add({
      name: '1024.png',
      canvas: this.regenerateRaw_({ mult: 1024 / 48, fullBleed: true }).canvas
    });

    // generate adaptive launcher XML
    this.zipper.add({
      name: `res/mipmap-anydpi-v26/${values.name}.xml`,
      textData: this.makeAdaptiveIconXml_(values.name)
    });
  }

  makeAdaptiveIconXml_(name) {
    return (
`<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@mipmap/${name}_adaptive_back"/>
  <foreground android:drawable="@mipmap/${name}_adaptive_fore"/>
</adaptive-icon>`);
  }

  regenerateRaw_({ mult, fullBleed, adaptive }) {
    let values = this.form.getValues();
    let foreSrcCtx = values.foreground ? values.foreground.ctx : null;

    let iconSize = studio.Util.multRound(ICON_SIZE, mult);
    let targetRect = TARGET_RECTS_BY_SHAPE[values.backgroundShape];
    if (fullBleed) {
      targetRect = TARGET_RECT_FULL_BLEED;
    } else if (adaptive) {
      targetRect = TARGET_RECT_ADAPTIVE;
    }

    let outCtx = studio.Drawing.context(iconSize);

    let backgroundLayer = {
      // background layer
      draw: ctx => {
        ctx.scale(mult, mult);
        values.backColor.setAlpha(1);
        ctx.fillStyle = values.backColor.toRgbString();
        if (fullBleed || adaptive) {
          ctx.fillRect(0, 0, ICON_SIZE.w, ICON_SIZE.h);
          return;
        }

        let targetRect = TARGET_RECTS_BY_SHAPE[values.backgroundShape];
        switch (values.backgroundShape) {
          case 'square':
          case 'vrect':
          case 'hrect':
            studio.Util.roundRectPath(ctx, targetRect, 3);
            ctx.fill();
            break;

          case 'circle':
            ctx.beginPath();
            ctx.arc(
                targetRect.x + targetRect.w / 2,
                targetRect.y + targetRect.h / 2,
                targetRect.w / 2,
                0, 2 * Math.PI, false);
            ctx.closePath();
            ctx.fill();
            break;
        }
      },
      mask: true
    };

    let foregroundLayer = {
      // foreground content layer
      draw: ctx => {
        if (!foreSrcCtx) {
          return;
        }

        let drawFn_ = studio.Drawing[values.crop ? 'drawCenterCrop' : 'drawCenterInside'];
        drawFn_(ctx, foreSrcCtx, studio.Util.mult(targetRect, mult),
            {x: 0, y: 0, w: foreSrcCtx.canvas.width, h: foreSrcCtx.canvas.height});
      },
      effects: [],
    };

    if (values.effects == 'shadow') {
      foregroundLayer.effects.push({effect: 'cast-shadow'});
    }

    if (values.foreColor.getAlpha()) {
      foregroundLayer.effects.push({
        effect: 'fill-color',
        color: values.foreColor.toRgbString()
      });
    }

    if (values.effects == 'elevate' || values.effects == 'shadow') {
      foregroundLayer.effects = [
        ...foregroundLayer.effects,
        {
          effect: 'outer-shadow',
          color: 'rgba(0, 0, 0, 0.2)',
          translateY: .25 * mult
        },
        {
          effect: 'outer-shadow',
          color: 'rgba(0, 0, 0, 0.2)',
          blur: 1 * mult,
          translateY: 1 * mult
        }
      ];
    }

    let finalEffects = [
      {
        effect: 'inner-shadow',
        color: 'rgba(255, 255, 255, 0.2)',
        translateY: .25 * mult
      },
      {
        effect: 'inner-shadow',
        color: 'rgba(0, 0, 0, 0.2)',
        translateY: -.25 * mult
      },
      {
        effect: 'outer-shadow',
        color: 'rgba(0, 0, 0, 0.3)',
        blur: .7 * mult,
        translateY: .7 * mult
      },
      {
        effect: 'fill-radialgradient',
        centerX: 0,
        centerY: 0,
        radius: iconSize.w,
        colors: [
          { offset: 0, color: 'rgba(255,255,255,.1)' },
          { offset: 1.0, color: 'rgba(255,255,255,0)' }
        ]
      }
    ];

    if (fullBleed || adaptive) {
      finalEffects = finalEffects.filter(e => e.effect.match(/fill/));
    }

    studio.Drawing.drawLayers(outCtx, iconSize, {
      children: [
        (!adaptive || adaptive == 'back') && backgroundLayer,
        (!adaptive || adaptive == 'fore') && foregroundLayer,
        (values.effects == 'score' && adaptive !== 'back') && {
          draw: ctx => {
            ctx.fillStyle = 'rgba(0, 0, 0, .1)';
            ctx.fillRect(0, 0, iconSize.w, iconSize.h / 2);
          }
        },
      ],
      effects: finalEffects,
    });

    return outCtx;
  }
}

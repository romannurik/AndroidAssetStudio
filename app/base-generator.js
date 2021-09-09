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

import * as studio from './studio';

const DENSITIES = new Set(['xxxhdpi', 'xxhdpi', 'xhdpi', 'hdpi', 'mdpi']);
const REGENERATE_DEBOUNCE_TIME = 200;

const DEFAULT_VISIBLE_SLOT = 'xxxhdpi';

export class BaseGenerator {
  constructor() {
    this.regenerateDebounced_ = studio.Util.debounce(
        REGENERATE_DEBOUNCE_TIME,
        () => this.regenerate());

    this.setupZipper();
    this.setupOutputUi();
    this.setupOutputSlots();
    this.setupForm();
    studio.Hash.bindFormToDocumentHash(this.form);
    setTimeout(() => this.regenerate(), 0);
  }

  setupZipper() {
    this.zipper = studio.Zip.createDownloadifyZipButton($('#download-zip-button'));
  }

  setupOutputUi() {
    // grid toggle
    if (this.gridOverlaySvg) {
      let defaultChecked = ('assetStudioShowGrid' in localStorage)
          ? localStorage.assetStudioShowGrid === 'true'
          : true;
      $('#grid-toggle').prop('checked', defaultChecked);
      $('.outputs-panel').toggleClass('show-grid', defaultChecked);

      $('#grid-toggle').click(ev => {
        let checked = $(ev.currentTarget).is(':checked');
        localStorage.assetStudioShowGrid = String(checked);
        $('.outputs-panel').toggleClass('show-grid', checked);
      });
    } else {
      $('#grid-toggle-container').hide();
    }

    // additional slots toggle
    $('.outputs-additional-toggle').click(() => $('.outputs-panel').toggleClass('is-showing-all'));
  }

  setupOutputSlots() {
    (this.outputSlots || this.densities).forEach(slot => {
      this.createImageOutputSlot_({
        container: (slot == DEFAULT_VISIBLE_SLOT) ? $('.outputs-main') : $('.outputs-additional'),
        id: slot,
        label: slot
      });
    });
  }

  get densities() {
    return DENSITIES;
  }

  createImageOutputSlot_(params) {
    let $imageContainer = $('<div>')
        .addClass('outputs-image-container')
        .append($('<img>')
          .addClass('outputs-image')
          .attr('data-id', `out-icon-${params.id}`));

    if (this.gridOverlaySvg) {
      $('<div>')
          .addClass('outputs-image-overlay')
          .html(this.gridOverlaySvg)
          .appendTo($imageContainer);
    }

    let $block = $('<div>')
        .addClass('outputs-image-block')
        .append($('<div>')
          .addClass('outputs-label')
          .text(params.label))
        .append($imageContainer)
        .appendTo(params.container);

    return $block;
  }

  setImageForSlot_(id, url) {
    studio.Util.loadImageFromUri(url)
        .then(img => $(`[data-id="out-icon-${id}"]`).attr('src', img.src));
  }

  setupForm() {
  }

  regenerate() {
  }
}

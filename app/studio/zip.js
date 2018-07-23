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

import JSZip from 'jszip/lib';

import {Util} from './util';


export const Zip = {
  createDownloadifyZipButton(element, options) {
    return new DownloadZipButton(element, options);
  }
};


class DownloadZipButton {
  constructor(element, options) {
    this.fileSpecs_ = [];
    this.el_ = element;
    this.el_.click(() => this.generateAndDownloadZipFile_());
    this.updateUI_();
  }

  setZipFilename(zipFilename) {
    this.zipFilename_ = zipFilename;
  }

  clear() {
    this.fileSpecs_ = [];
    this.updateUI_();
  }

  add(spec) {
    this.fileSpecs_.push(spec);
    this.updateUI_();
  }

  updateUI_() {
    if (this.fileSpecs_.length && !this.isGenerating_) {
      this.el_.removeAttr('disabled');
    } else {
      this.el_.attr('disabled', 'disabled');
    }
  }

  generateAndDownloadZipFile_() {
    let filename = this.zipFilename_ || 'output.zip';
    if (!this.fileSpecs_.length) {
      return;
    }

    this.isGenerating_ = true;
    this.updateUI_();

    let zip = new JSZip();

    this.fileSpecs_.forEach(fileSpec => {
      if (fileSpec.canvas) {
        zip.file(fileSpec.name, fileSpec.canvas.toDataURL().replace(/.*?;base64,/, ''), {base64: true});
      } else {
        zip.file(fileSpec.name, fileSpec.textData);
      }
    });

    zip.generateAsync({type: 'blob'}).then(blob => {
      Util.downloadFile(blob, filename);
      this.isGenerating_ = false;
      this.updateUI_();
    }).catch(error => {
      console.error(error);
      this.isGenerating_ = false;
      this.updateUI_();
    });
  }
}

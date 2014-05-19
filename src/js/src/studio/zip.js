/*
Copyright 2012 Google Inc.

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

studio.zip = {};

(function() {
  /**
   * Converts a base64 string to a Blob
   */
  function base64ToBlob_(base64, mimetype) {
    var BASE64_MARKER = ';base64,';
    var raw = window.atob(base64);
    var rawLength = raw.length;
    var uInt8Array = new Uint8Array(rawLength);
    for (var i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    if (imagelib.util.hasBlobConstructor()) {
      return new Blob([uInt8Array], {type: mimetype})
    }

    var bb = new BlobBuilder();
    bb.append(uInt8Array.buffer);
    return bb.getBlob(mimetype);
  }

  /**
   * Gets the base64 string for the Zip file specified by the
   * zipperHandle (an Asset Studio-specific thing).
   */
  function getZipperBase64Contents(zipperHandle) {
    if (!zipperHandle.fileSpecs_.length)
      return '';

    var zip = new JSZip();
    for (var i = 0; i < zipperHandle.fileSpecs_.length; i++) {
      var fileSpec = zipperHandle.fileSpecs_[i];
      if (fileSpec.base64data)
        zip.add(fileSpec.name, fileSpec.base64data, {base64:true});
      else if (fileSpec.textData)
        zip.add(fileSpec.name, fileSpec.textData);
    }
    return zip.generate();
  }

  window.URL = window.URL || window.webkitURL || window.mozURL;
  window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
                       window.MozBlobBuilder;

  studio.zip.createDownloadifyZipButton = function(element, options) {
    // TODO: badly needs to be documented :-)

    var zipperHandle = {
      fileSpecs_: []
    };

    var link = $('<a>')
        .addClass('dragout')
        .addClass('form-button')
        .attr('disabled', 'disabled')
        .text('Download .ZIP')
        .get(0);

    $(element).replaceWith(link);

    var updateZipTimeout_ = null;

    function updateZip_(now) {
      // this is immediate

      if (link.href) {
        window.URL.revokeObjectURL(link.href);
        link.href = null;
      }

      if (!now) {
        $(link).attr('disabled', 'disabled');

        if (updateZipTimeout_) {
          window.clearTimeout(updateZipTimeout_);
        }

        updateZipTimeout_ = window.setTimeout(function() {
          updateZip_(true);
          updateZipTimeout_ = null;
        }, 500)
        return;
      }

      // this happens on a timeout for throttling

      var filename = zipperHandle.zipFilename_ || 'output.zip';
      if (!zipperHandle.fileSpecs_.length) {
        //alert('No ZIP file data created.');
        return;
      }

      link.download = filename;
      link.href = window.URL.createObjectURL(base64ToBlob_(
          getZipperBase64Contents(zipperHandle),
          'application/zip'));
      link.draggable = true;
      link.dataset.downloadurl = ['application/zip', link.download, link.href].join(':');

      $(link).removeAttr('disabled');
    }

    // Set up zipper control functions
    zipperHandle.setZipFilename = function(zipFilename) {
      zipperHandle.zipFilename_ = zipFilename;
      updateZip_();
    };
    zipperHandle.clear = function() {
      zipperHandle.fileSpecs_ = [];
      updateZip_();
    };
    zipperHandle.add = function(spec) {
      zipperHandle.fileSpecs_.push(spec);
      updateZip_();
    };

    return zipperHandle;
  };

  // Requires the body listener to be set up
  studio.ui.setupDragout();
})();
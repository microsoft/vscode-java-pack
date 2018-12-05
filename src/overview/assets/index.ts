// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as $ from "jquery";
import './index.scss';

window.addEventListener('message', event => {
  if (event.data.command === 'hideInstalledExtensions') {
    hideInstalledExtensions(event.data.installedExtensions);
    hideEmptySections();
  } else if (event.data.command === 'setOverviewVisibility') {
    $('#showWhenUsingJava').prop('checked', event.data.visibility);
  }
});

function hideInstalledExtensions(extensions: any) {
  $('div[ext]').each((index, elem) => {
    const anchor = $(elem);
    const ext = (anchor.attr('ext') || '').toLowerCase();
    if (extensions.indexOf(ext) !== -1) {
      anchor.hide();
    }
  });
}

function hideEmptySections() {
  $('div h3').parent().each((i, div) => {
    if (!$(div).children('h3 ~ div').is(':visible')) {
      $(div).hide();
    }
  });
}

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

$('#showWhenUsingJava').change(function () {
  vscode.postMessage({
    command: 'setOverviewVisibility',
    visibility: $(this).is(':checked')
  });
});

/*
Copyright 2010 Google Inc.

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

var TESTS_INTERACTIVE = 0x01;
var TESTS_AUTOMATED = 0x02;
var TESTS_ALL = TESTS_INTERACTIVE | TESTS_AUTOMATED;

var g_tests = [];
var g_testsByName = {};

function init() {
  discoverTests();
  buildTestTable();
}

function discoverTests() {
  g_testsByName = {};
  
  if (navigator.userAgent.toLowerCase().indexOf('msie') >= 0) {
    // IE doesn't support enumerating custom members of window
    for (var i = 0; i < document.scripts.length; i++) {
      var scriptNode = document.scripts[i];
      var scriptBody = '';
      if (scriptNode.innerHTML) {
        scriptBody += scriptNode.innerHTML;
      }
      
      if (scriptNode.src) {
        try {
          var xhr = new ActiveXObject('Msxml2.XMLHTTP');
          xhr.open('get', scriptNode.src, false); // false -- not async
          xhr.send();
          scriptBody += xhr.responseText;
        } catch (e) {}
      }
      
      // parse script body for test_xx functions
      var possibleTests = scriptBody.match(/test_\w+/g);
      if (possibleTests) {
        for (var j = 0; j < possibleTests.length; j++) {
          if (possibleTests[j] in window &&
              typeof window[possibleTests[j]] === 'function')
            g_testsByName[possibleTests[j]] = true;
        }
      }
    }    
  } else {
    for (var f in window) {
      if (f.substr(0, 5) == 'test_' &&
          typeof window[f] === 'function')
        g_testsByName[f] = true;
    }
  }

  // convert into an array
  g_tests = [];
  for (var test in g_testsByName) {
    g_tests.push(test);
  }

  g_tests.sort();
}

function buildTestTable() {
  var testTable = jQuery('#test-table');
  for (var i = 0; i < g_tests.length; i++) {
    var row = jQuery('<tr id="testrow_' + g_tests[i] + '" "class="test">');
    row.append(jQuery('<td class="test-number">' + (i + 1) + '</tr>'));
    row.append(jQuery('<td class="test-name">' + g_tests[i] + '</td>'));
    row.append(jQuery('<td class="test-status">&nbsp;</td>'));
    
    var runTestButton = jQuery('<input type="button" value="Run">')
                          .click(function(testName) {
                            return function() {
                              enableUI(false);
                              runSingleTest(testName, function() {
                                enableUI(true);
                              });
                            };
                          }(g_tests[i]));
    
    row.append(jQuery('<td class="test-actions"></td>').append(runTestButton));
    
    var notes = [];
    if (window[g_tests[i]].interactive) notes.push('Interactive');
    if (window[g_tests[i]].async) notes.push('Async');
    
    row.append(jQuery('<td class="test-notes">' +
        (notes.join(', ') || '&nbsp;') + '</td>'));

    testTable.append(row);
  }
}

function clearResults() {
  jQuery('tr.test').removeClass('pass').removeClass('fail');
  jQuery('.test-status').html('&nbsp;');
}

function isEmptyObjectLiteral(o) {
  if (!o)
    return true;
  
  for (var k in o)
    return false;
  
  return true;
}

function logResult(testName, pass, message, otherInfo) {
  var testRow = jQuery('#testrow_' + testName);
  if (!testRow || !testRow.length)
    return;
  
  testRow.removeClass('pass').removeClass('fail');
  testRow.addClass(pass ? 'pass' : 'fail');
  
  var testStatusCell = jQuery('.test-status', testRow);
  
  message = message ? message.toString() : (pass ? 'pass' : 'fail')
  testStatusCell.text(message);
  
  if (!isEmptyObjectLiteral(otherInfo)) {
    testStatusCell.append(jQuery('<div><a href="#">[More Info]</a></div>')
                            .click(function() {
                              jQuery('.other-info', testStatusCell).toggle();
                              return false;
                            }));
    var otherInfoHtml = ['<ul class="other-info" style="display: none">'];
    for (var k in otherInfo) {
      otherInfoHtml.push('<li><span>' + (k || '&nbsp;') + '</span>');
      otherInfoHtml.push((otherInfo[k] || '&nbsp;') + '</li>');
    }
    otherInfoHtml.push('</ul>');
    testStatusCell.append(jQuery(otherInfoHtml.join('')));
  }
}

function enableUI(enable) {
  if (enable)
    jQuery('input').removeAttr('disabled');
  else
    jQuery('input').attr('disabled', true);
}

function runSingleTest(testName, completeFn) {
  completeFn = completeFn || function(){};
  
  var testFn = window[testName];
  
  var successFn = function() {
    // log result and run next test
    logResult(testName, true);
    completeFn();
  };
  
  var errorFn = function(e) {
    var message = '';
    var otherInfo = {};
  
    if (e.jsUnitMessage) {
      message = new String(e.jsUnitMessage);
    } else if (e.message) {
      message = new String(e.message);
    } else if (e.comment) {
      message = new String(e.comment);
    } else if (e.description) {
      message = new String(e.description);
    }
      
    // log result and run next test
    for (var k in e) {
      var val = e[k];

      if (val === null)
        val = '<null>';
      else if (typeof(e[k]) == 'undefined')
        val = '<undefined>';
      
      val = val.toString();
      
      if (k == 'stackTrace') {
        var MAX_LENGTH = 500;
        if (val.length >= MAX_LENGTH)
          val = val.substr(0, MAX_LENGTH - 3) + '...';
      }
      
      otherInfo[k] = val;
    }
    
    logResult(testName, false, message, otherInfo);
    completeFn();
  };

  var runFunc = function() {
    if (testFn.interactive || testFn.async) {
      testFn.call(null, successFn, errorFn);
    } else {
      testFn.call(null);
      successFn();
    }
  };

  var passExceptions = document.getElementById('passexceptions').checked;

  if (passExceptions) {
    runFunc.call();
  } else {
    try {
      runFunc.call();
    } catch (e) {
      errorFn(e);
    }
  }
}

function runTests(type) {
  if (!type)
    type = TESTS_ALL;
  
  enableUI(false);
  clearResults();
  
  var i = -1;
  
  var runNextTest = function() {
    i++;
    if (i >= g_tests.length) {
      enableUI(true);
      return;
    }
    
    var testName = g_tests[i];
    var testFn = window[testName];
    
    if (testFn.interactive) {
      if (!(type & TESTS_INTERACTIVE)) {
        runNextTest();
        return;
      }
    } else {
      if (!(type & TESTS_AUTOMATED)) {
        runNextTest();
        return;
      }
    }
    
    runSingleTest(testName, runNextTest);
  }
  
  runNextTest();
}

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

studio.util = {};

studio.util.getMultBaseMdpi = function(density) {
  switch (density) {
    case 'xxxhdpi': return 4.00;
    case  'xxhdpi': return 3.00;
    case   'xhdpi': return 2.00;
    case    'hdpi': return 1.50;
    case    'mdpi': return 1.00;
    case    'ldpi': return 0.75;
  }
  return 1.0;
};

studio.util.mult = function(s, mult) {
  var d = {};
  for (k in s) {
    d[k] = s[k] * mult;
  }
  return d;
};

studio.util.multRound = function(s, mult) {
  var d = {};
  for (k in s) {
    d[k] = Math.round(s[k] * mult);
  }
  return d;
};

studio.util.sanitizeResourceName = function(s) {
  return s.toLowerCase().replace(/[\s-\.]/g, '_').replace(/[^\w_]/g, '');
};

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

// http://en.wikipedia.org/wiki/Adler32
const MOD_ADLER = 65521;

class Adler32 {
  constructor() {
    this.reset();
  }

  reset() {
    this._a = 1;
    this._b = 0;
    this._index = 0;
  }

  addNext(value) {
    this._a = (this._a + value) % MOD_ADLER;
    this._b = (this._b + this._a) % MOD_ADLER;
  }

  compute() {
    return (this._b << 16) | this._a;
  }
}

export const Summer = Adler32;

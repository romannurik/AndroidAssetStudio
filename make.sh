#!/bin/sh

# Copyright 2010 Google Inc.
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#      http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

rm -rf _gh-pages/*
mkdir -p _gh-pages/js
mkdir -p _gh-pages/lib
mkdir -p _gh-pages/css

cd src/

cd js/
ant clean
ant dist
cd ..

find css -iname \*.css -exec java -jar ../lib/yuicompressor-2.4.2.jar -o ../_gh-pages/{} {} \;

cp -rf lib/ ../_gh-pages/lib/

cp -rf res/ ../_gh-pages/res/

cd html
find . -iname \*.html -exec cp {} ../../_gh-pages/{} \;
cd ..
cd ..

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

rm -rf dist
mkdir -p dist
mkdir -p dist/js
#mkdir -p dist/images
mkdir -p dist/css

cd src/
#find images -iname \*.png -exec pngcrush {} ../dist/{} \;

cd js/
ant clean
ant dist
cd ..

find css -iname \*.css -exec java -jar ../lib/yuicompressor-2.4.2.jar -o ../dist/{} {} \;

cp -rf lib/ ../dist/lib/

cp -rf res/ ../dist/res/

cd html
#find . -iname \*.html -exec java -jar ../../lib/htmlcompressor-0.9.jar --remove-intertag-spaces --remove-quotes -o ../out/{} {} \;
find . -iname \*.html -exec cp {} ../../dist/{} \;
#find . -iname \*.manifest -exec cp {} ../../dist/{} \;
#find . -iname .htaccess -exec cp {} ../../dist/{} \;
cd ..
cd ..

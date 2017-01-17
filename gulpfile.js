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

'use strict';

// Include Gulp & Tools We'll Use
const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const del = require('del');
const fs = require('fs');
const buffer = require('vinyl-buffer');
const runSequence = require('run-sequence');
const browserSync = require('browser-sync');
const browserify = require('browserify');
const exclude = require('gulp-ignore').exclude;
const reload = browserSync.reload;
const merge = require('merge-stream');
const source = require('vinyl-source-stream');
const swig = require('swig');
const swigExtras = require('swig-extras');
const through = require('through2');
const url = require('url');
const yaml = require('js-yaml');
const path = require('path');


var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'ios >= 7',
  'android >= 4.4'
];


var DEV_MODE = false;
var BASE_HREF = DEV_MODE ? '/' : '/AndroidAssetStudio/';


function errorHandler(error) {
  console.error(error.stack);
  this.emit('end'); // http://stackoverflow.com/questions/23971388
}

// Lint JavaScript
gulp.task('scripts', function () {
  return browserify('./app/scripts/app.js', {
        debug: true, // debug generates sourcemap
        basedir: '.',
        paths: [
          './app/scripts/',
          './node_modules/'
        ]
      })
      .transform('babelify', {presets: ['es2015'], plugins: ['es6-promise']})
      .transform('require-globify')
      .bundle()
      .on('error', errorHandler)
      .pipe(source('app.js'))
      .pipe(buffer())
      .pipe(gulp.dest('.tmp/scripts'))
      .pipe($.if(!DEV_MODE, $.uglify({
        mangle:false
      })))
      .pipe(gulp.dest('dist/scripts'));
});

// Bower
gulp.task('bower', function(cb) {
  return $.bower('.tmp/lib')
      .pipe(exclude('!**/*.{js,css,map}'))
      .pipe(exclude('**/test/**'))
      .pipe(exclude('**/tests/**'))
      .pipe(exclude('**/modules/**'))
      .pipe(exclude('**/demos/**'))
      .pipe(exclude('**/src/**'))
      .pipe(gulp.dest('dist/lib'));
});

// Optimize Images
gulp.task('res', function () {
  return gulp.src('app/res/**/*')
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest('dist/res'))
    .pipe($.size({title: 'res'}));
});

// Copy All Files At The Root Level (app) and lib
gulp.task('copy', function () {
  var s1 = gulp.src([
    'app/*',
    '!app/html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'))
    .pipe($.size({title: 'copy'}));

  var s2 = gulp.src('older-version/**/*', {dot: true})
    .pipe(gulp.dest('dist/older-version'))
    .pipe($.size({title: 'copy'}));

  return merge(s1, s2);
});

// Compile and Automatically Prefix Stylesheets
gulp.task('styles', function () {
  // For best performance, don't add Sass partials to `gulp.src`
  return gulp.src('app/styles/app.scss')
    .pipe($.changed('styles', {extension: '.scss'}))
    .pipe($.sassGlob())
    .pipe($.sass({
      style: 'expanded',
      precision: 10,
      quiet: true
    }).on('error', errorHandler))
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest('.tmp/styles'))
    // Concatenate And Minify Styles
    .pipe($.if(!DEV_MODE, $.if('*.css', $.csso())))
    .pipe(gulp.dest('dist/styles'))
    .pipe($.size({title: 'styles'}));
});


gulp.task('html', () => {
  let pages = [];

  return gulp.src([
      'app/html/**/*.html',
      '!app/html/**/_*.html'
    ])
    // Extract frontmatter
    .pipe($.frontMatter({
      property: 'frontMatter',
      remove: true
    }).on('error', errorHandler))
    // Start populating context data for the file, globalData, followed by file's frontmatter
    .pipe($.tap(function(file, t) {
      file.contextData = Object.assign({}, file.frontMatter);
    }))
    // Populate the global pages collection
    // Wait for all files first (to collect all front matter)
    .pipe($.util.buffer())
    .pipe(through.obj(function(filesArray, enc, callback) {
      var me = this;
      filesArray.forEach(function(file) {
        var pageInfo = {path: file.path, data: file.frontMatter || {}};
        pages.push(pageInfo);
      });
      // Re-emit each file into the stream
      filesArray.forEach(function(file) {
        me.push(file);
      });
      callback();
    }))
    .pipe($.tap(function(file, t) {
      // Finally, add pages array to collection
      file.contextData = Object.assign(file.contextData, {all_pages: pages});
    }))
    // Run everything through swig templates
    .pipe($.swig({
      setup: function(sw) {
        swigExtras.useTag(sw, 'markdown');
        swigExtras.useFilter(sw, 'markdown');
        swigExtras.useFilter(sw, 'trim');
      },
      data: function(file) {
        return file.contextData;
      },
      defaults: {
        cache: false
      }
    }).on('error', errorHandler))
    // Concatenate And Minify JavaScript
    .pipe($.if('*.js', $.uglify({preserveComments: 'some'})))
    // Concatenate And Minify Styles
    // In case you are still using useref build blocks
    .pipe($.if('*.css', $.csso()))
    // Minify Any HTML
    .pipe($.replace(/%%BASE_HREF%%/g, BASE_HREF))
    .pipe(gulp.dest('.tmp'))
    .pipe($.if('*.html', $.minifyHtml()))
    // Output Files
    .pipe(gulp.dest('dist'));
});

// Clean Output Directory
gulp.task('clean', function(cb) {
  del.sync(['.tmp', 'dist']);
  $.cache.clearAll();
  cb();
});

// Watch Files For Changes & Reload
gulp.task('serve', ['styles', 'html', 'scripts', 'bower'], function () {
  DEV_MODE = true;

  browserSync({
    notify: false,
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: ['.tmp', 'app']
    }
  });

  gulp.watch(['app/html/**/*.html'], ['html', reload]);
  gulp.watch(['app/**/*.{scss,css}'], ['styles', reload]);
  gulp.watch(['app/**/*.js'], ['scripts', reload]);
  gulp.watch(['app/res/**/*'], reload);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function () {
  browserSync({
    notify: false,
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: 'dist'
  });
});

// Build Production Files, the Default Task
gulp.task('default', ['clean'], function (cb) {
  runSequence('styles',
      ['scripts', 'bower', 'html', 'res', 'copy'],
      cb);
});

// Deploy to GitHub pages
gulp.task('deploy', function() {
  return gulp.src('dist/**/*', {dot: true})
    .pipe($.ghPages());
});

// Load custom tasks from the `tasks` directory
try { require('require-dir')('tasks'); } catch (err) {}

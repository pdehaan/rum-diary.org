/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

module.exports = function (grunt) {
  // show elapsed time at the end
  require('time-grunt')(grunt);
  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({});
  grunt.loadTasks('grunttasks');

  grunt.registerTask('build', [
    'selectconfig:dist',
    'jshint',
    'preprocess',
    'browserify:dist',
    'sass',
    'autoprefixer',
    'mocha',
    'clean',
    'copy',
    'uglify',
    'zopfli'
  ]);

  grunt.registerTask('default', [
    'jshint',
    'preprocess',
    /*'mocha'*/
  ]);

  grunt.registerTask('test', [
    'mocha'
  ]);

  grunt.registerTask('server', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'serverproc:dist']);
    }

    var selectConfig = target === 'test' ? 'selectconfig:test' : 'selectconfig';
    var browserifyConfig = target === 'test' ? 'browserify:test' : 'browserify';

    grunt.task.run([
      selectConfig,
      'jshint',
      'autoprefixer',
      'preprocess',
      'sass',
      browserifyConfig,
      'serverproc'
    ]);
  });
};



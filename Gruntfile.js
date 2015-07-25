'use strict';

var loadGruntTasks = require('load-grunt-tasks');

module.exports = function(grunt) {
  loadGruntTasks(grunt);

  grunt.initConfig({
    standard: {
      options: {
        lint: false,
        format: true
      },
      lib: {
        src: [
          'lib/*.js'
        ]
      }
    }
  });

  grunt.registerTask('format', [ 'standard' ]);
};

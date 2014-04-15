/*global module:false, es5:true*/
module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    connect: {
      server: {
        options: {
          port: 8000,
          base: '.'
        }
      }
    },
    watch: {
      scripts: {
        files: 'css/*.scss',
        tasks: ['sass'],
        options: {
          interrupt: true
        }
      }
    },
    sass: {
      dist: {
        files: {
          'css/playerjs.css': 'css/playerjs.scss'
        }
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: false,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true,
        es3:true,
        ignores: ['src/intro.js', 'src/outro.js']
      },
      all: ['Gruntfile.js', 'scripts/*.js']
    }
  });

  grunt.registerTask("default", ['sass', 'connect', 'watch']);

};
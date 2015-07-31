'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');

var src = [
	'lib/**/*.js',
];

gulp.task('jshint', function () {
	return gulp.src(src)
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish'));
});

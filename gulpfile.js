'use strict';

var babel = require('gulp-babel');
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var mocha = require('gulp-spawn-mocha');
var sequence = require('gulp-sequence');
var shell = require('gulp-shell');

var src = [
	'lib/**/*.js',
];

var test = [
	'test/**/*.js',
];

var dest = 'build';

gulp.task('babel', function () {
	return gulp.src(src)
		.pipe(babel())
		.pipe(gulp.dest(dest));
});

gulp.task('jshint', function () {
	return gulp.src([].concat(src, test))
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish'))
		.pipe(jshint.reporter('fail'));
});

gulp.task('mocha', function () {
	return gulp.src(test, {read: false})
		.pipe(mocha());
});

gulp.task('coverage', shell.task(
	'babel-node ./node_modules/isparta/bin/isparta cover --report text --report html --report lcov ./node_modules/mocha/bin/_mocha'
));

gulp.task('coveralls', ['coverage'], shell.task(
	'node_modules/.bin/coveralls < coverage/lcov.info'
));

gulp.task('watch', function () {
	gulp.watch([].concat(src, test), ['test']);
});

gulp.task('prepublish', ['babel']);
gulp.task('test', function (cb) {
	sequence('mocha', 'jshint', cb);
});
gulp.task('default', ['watch']);

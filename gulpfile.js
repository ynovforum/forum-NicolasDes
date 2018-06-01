const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const cssnano = require('gulp-cssnano');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();


gulp.task('sass', function () {
    return gulp.src('./sass/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(autoprefixer()) // Add vendor prefixes to CSS rules by Can I Use
        .pipe(cssnano()) // Minify CSS
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./public/css'));
});

// Static Server + watching SCSS/HTML files
gulp.task('serve', ['sass'], function() {

    browserSync.init({
        proxy: "localhost:3000"
    });

    gulp.watch("./sass/**/*.scss", ['sass']);
    gulp.watch("./views/*.pug").on('change', browserSync.reload);
})
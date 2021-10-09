'use strict';

const fs = require("fs");
const { src, dest } = require("gulp");
const gulp = require("gulp");
const browsersync = require("browser-sync").create();
const fileinclude = require("gulp-file-include");
const del = require("del");
const scss = require("gulp-sass")(require("sass"));
const autoprefixer = require("gulp-autoprefixer");
const group_media = require("gulp-group-css-media-queries");
const clean_css = require("gulp-clean-css");
const rename = require("gulp-rename");
const uglify = require("gulp-uglify-es").default;
const babel = require("gulp-babel");
const imagemin = require("gulp-imagemin");
const webp = require("gulp-webp");
const webphtml = require("gulp-webp-html");
const webpcss = require("gulp-webpcss");
const svgSprite = require("gulp-svg-sprite");
const ttf2woff = require("gulp-ttf2woff");
const ttf2woff2 = require("gulp-ttf2woff2");
const fonter = require("gulp-fonter");

// Paths
const distPath = require('path').basename(__dirname);;
const srcPath = "src";


// Path object
const path = {
  build: {
    html: distPath + "/",
    css: distPath + "/css/",
    js: distPath + "/js/",
    img: distPath + "/img/",
    fonts: distPath + "/fonts/",
  },
  src: {
    html: [srcPath + "/*.html", "!" + srcPath + "/_*.html"],
    css: srcPath + "/scss/style.scss",
    js: srcPath + "/js/script.js",
    img: srcPath + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
    fonts: srcPath + "/fonts/**/*.{eot,woff,woff2,ttf,svg}",
  },
  watch: {
    html: srcPath + "/**/*.html",
    scss: srcPath + "/scss/**/*.scss",
    js: srcPath + "/js/**/*.js",
    img: srcPath + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
  },
  clean: "./" + distPath + "/",
};

// BrowserSync
function browserSync() {
  browsersync.init({
    server: {
      baseDir: "./" + distPath + "/",
    },
    port: 3000,
    notify: false,
  });
}

// HTML
function html() {
  return src(path.src.html)
    .pipe(fileinclude())
    .pipe(webphtml())
    .pipe(dest(path.build.html))
    .pipe(browsersync.stream());
}

// CSS
function css() {
  return src(path.src.css)
    .pipe(scss({ outputStyle: "expanded" }).on("error", scss.logError))
    .pipe(group_media())
    .pipe(
      autoprefixer({
        cascade: true,
      })
    )
    .pipe(webpcss({ webpClass: ".webp", noWebpClass: ".no-webp" }))
    .pipe(dest(path.build.css))
    .pipe(clean_css())
    .pipe(
      rename({
        extname: ".min.css",
      })
    )
    .pipe(dest(path.build.css))
    .pipe(browsersync.stream());
}

// Javascript
function js() {
  return src(path.src.js)
    .pipe(fileinclude())
    .pipe(dest(path.build.js))
    .pipe(
      babel({
        presets: ["@babel/env"],
      })
    )
    .pipe(uglify())
    .pipe(
      rename({
        extname: ".min.js",
      })
    )
    .pipe(dest(path.build.js))
    .pipe(browsersync.stream());
}

// Images
function images() {
  return src(path.src.img)
    .pipe(
      webp({
        quality: 80,
      })
    )
    .pipe(dest(path.build.img))
    .pipe(src(path.src.img))
    .pipe(
      imagemin({
        progressive: true,
        svgoPlugins: [{ removeViewBox: false }],
        interlaced: true,
        optimizationLevel: 4,
      })
    )
    .pipe(dest(path.build.img))
    .pipe(browsersync.stream());
}

// Fonts
function fonts() {
  src(path.src.fonts).pipe(ttf2woff()).pipe(dest(path.build.fonts));
  return src(path.src.fonts).pipe(ttf2woff2()).pipe(dest(path.build.fonts));
}

// Converting .otf fonts to .ttf
gulp.task("otf2ttf", function () {
  return src([srcPath + "/fonts/*.otf"])
    .pipe(
      fonter({
        formats: [".tff"],
      })
    )
    .pipe(dest(srcPath + "/fonts/"));
});

// SVG Sprite packing
gulp.task("svgSprite", function () {
  return gulp
    .src([srcPath + "/iconsprite/*.svg"])
    .pipe(
      svgSprite({
        mode: {
          stack: {
            sprite: "../icons/icons.svg",
            // example: true,
          },
        },
      })
    )
    .pipe(dest(path.build.img));
});

// Including fonts to fonts.scss
function fontsStyle() {
  let file_content = fs.readFileSync(srcPath + "/scss/fonts.scss");
  if (file_content == "") {
    fs.writeFile(srcPath + "/scss/fonts.scss", "", cb);
    return fs.readdir(path.build.fonts, function (err, items) {
      if (items) {
        let c_fontname;
        for (var i = 0; i < items.length; i++) {
          let fontname = items[i].split(".");
          fontname = fontname[0];
          if (c_fontname != fontname) {
            fs.appendFile(
              srcPath + "/scss/fonts.scss",
              '@include font("' +
                fontname +
                '", "' +
                fontname +
                '", "400", "normal");\r\n',
              cb
            );
          }
          c_fontname = fontname;
        }
      }
    });
  }
}

function cb() {}

function watchFiles() {
  gulp.watch([path.watch.html], html);
  gulp.watch([path.watch.scss], css);
  gulp.watch([path.watch.js], js);
  gulp.watch([path.watch.img], images);
}

function clean() {
  return del(path.clean);
}

const build = gulp.series(clean, gulp.parallel(html, css, js, images, fonts, fontsStyle));
const watch = gulp.parallel(build, watchFiles, browserSync);

// Exports tasks
exports.html = html;
exports.css = css;
exports.js = js;
exports.images = images;
exports.fonts = fonts;
exports.fontsStyle = fontsStyle;
exports.build = build;
exports.watch = watch;
exports.default = watch;

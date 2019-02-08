"use strict";

// ◘◘◘◘◘◘ Load Gulp ◘◘◘◘◘◘◘ 
const { src, dest, task, watch, series, parallel } = require("gulp"),

        // ◘◘◘◘◘◘ Gulp Packages ◘◘◘◘◘◘◘ 
        gulpLoadPlugins           = require('gulp-load-plugins'),
        browserSync               = require("browser-sync").create(),
        sourcemaps                = require('gulp-sourcemaps'),

        webpack                   = require('webpack-stream'),
        modernizr                 = require('gulp-modernizr'),
        uglify                    = require('gulp-uglify'),

        pug                       = require("gulp-pug"),

        autoprefixer              = require("autoprefixer"),
        postcss                   = require("gulp-postcss"),
        nested                    = require("postcss-nested"),
        cssImport                 = require("postcss-import"),
        mixins                    = require("postcss-mixins"),
        responsiveType            = require("postcss-responsive-type"),
        postcssCustomProperties   = require("postcss-custom-properties"),
        simpleVars                = require("postcss-simple-vars"),
        each                      = require("postcss-each"),
        functions                 = require("postcss-functions"),
        conditionals              = require("postcss-conditionals"),
        postcssPresetEnv          = require('postcss-preset-env'),
        cssnano                   = require('cssnano'),

   
        svgSprite                 = require("gulp-svg-sprite"),
        svg2png                   = require("gulp-svg2png"),

        imagemin                  = require('gulp-imagemin'),
        imageminPngquant          = require('imagemin-pngquant'),
        imageminMozjpeg           = require('imagemin-mozjpeg'),

        rename                    = require("gulp-rename"),
        plumber                   = require( 'gulp-plumber' ),
        RevAll                    = require('gulp-rev-all'),
        inject                    = require('gulp-inject'),
        del                       = require("del"),

        $                         = gulpLoadPlugins(),
    
        // ◘◘◘◘◘◘ Paths ◘◘◘◘◘◘◘ 
        srcDir                    = './src/',
        buildDir                  = './docs/', // Or dist, I renamed it to 'docs' for github pages
        tempDir                   = './.tmp/',

        styleSRC                  = srcDir  + 'assets/styles/App.css',
        styleDEST                 = tempDir + 'styles',
    
        htmlSRC                   = srcDir  + '*.pug',
        htmlDEST                  = tempDir,
    
        jsAppSRC                  = srcDir  + 'assets/scripts/App.js',
        jsVendorSRC               = srcDir  + 'assets/scripts/vendor/Vendor.js',
        jsAppDEST                 = tempDir + 'scripts/',
        //jsFiles                 = [ jsAppSRC, jsVendor ],
      
        styleWatch                = srcDir + 'assets/styles/**/*.css',
        htmlWatch                 = srcDir + '**/*.pug',
        jsWatch                   = srcDir + 'assets/scripts/**/*.js',
        
        imagesSRC                 = srcDir   + 'assets/images/**/*',
        imagesDEST                = buildDir + 'assets/images',

        svgSRC                    = srcDir + 'assets/images/icons/**/*.svg',
        svgTemplateSRC            = srcDir + 'assets/styles/templates/sprite.css',

        all                       = srcDir + '**/*';
        
/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ Server ◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

 function browser_sync(done) {
	browserSync.init({
        notify: false,
        port: 9000,
		server: {
            baseDir: [tempDir, srcDir] 
            // we add 'src' because we want to watch for other assets from it.
                // try to remove './src' then all images will be disappear from the server
        }
	});
	
	done();
}

function reload(done) {
    browserSync.reload();
    done();
}


/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ HTML ◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

 function html() {
    return src( htmlSRC )
        .pipe($.plumber())
        .pipe($.pug({ pretty: true }))
        .pipe(dest( htmlDEST ))
        .pipe( browserSync.stream() );
}

/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ Styles ◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

function styles() {
    return src(styleSRC)
        //.pipe(rename({ suffix: ".min" }))
        .pipe(sourcemaps.init())
        .pipe($.plumber())
        .pipe($.postcss(
            [
                cssImport,
                mixins,
                each,
                functions,
                conditionals,
                simpleVars,
                postcssCustomProperties,
                responsiveType,
                nested,
                autoprefixer,
                postcssPresetEnv({ stage: 0 }),
                cssnano()
            ]
        ))

        .on("error", function (errorInfo) {
            console.log(errorInfo.toString());
            this.emit("end");
        })

        .pipe(sourcemaps.write('.'))
        .pipe(dest( styleDEST ))
        .pipe( browserSync.stream() );
}

/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ Scripts ◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

 function scripts() {
    return src( jsAppSRC )
        .pipe(webpack(
            {
                // Webpack configuration
                entry: {
                    App: jsAppSRC, // App.js
                    'vendor/Vendor': jsVendorSRC, //Vendor.js
                },
                output: {
                    filename: '[name].js' 
                    // [name] to generate the default name. [the name of enrty points: 'App', 'vendor/Vendor']
                    // We can't rename more than one entry in Webpack, so this is a workaround to rename the enrty point:
                    // We have to write the path of the file without `.js`:
                    // "vendor/Vendor" is going to be "vendor/Vendor.js" .. File name will be Vendor.js
                },
                mode: 'production', // | 'development' | 'none'

                // Babel configuration
                module: {
                    rules: [
                        {
                            test: /\.js$/,
                            exclude: /node_modules/,
                            use: {
                                loader: 'babel-loader',
                                options: {
                                    presets: ['@babel/preset-env']
                                }
                            }
                        }
                    ]
                }
            }
        ))
        .pipe(sourcemaps.init({ loadMaps: true }))

        .pipe($.uglify())

        .on("error", function(err, stats, callback) {
            if (err) {
                console.log(err.toString());
                this.emit("end");
              }

              console.log(stats.toString());
              callback();
        })
        
        .pipe(sourcemaps.write('.'))

        .pipe(dest(jsAppDEST))
        .pipe( browserSync.stream() );
}


/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ SVGSpirte ◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */


function beginCleanSprite() { // Begin with delete the current sprite folders for build new on
    return del([tempDir+'sprite', srcDir+'assets/images/sprites']);
}

function createSprite() {
    return src(svgSRC)
        .pipe(svgSprite( // Gulp SVG Sprite Config
            {
                shape: {
                    spacing: {
                        padding: 1
                    }
                },
                mode: {
                    css: {
                        variables: {
                            replaceSvgWithPng: () => {
                                return (sprite, render) => {
                                    return render(sprite).split('.svg').join('.png');
                                }
                            }
                        },
                        sprite: "sprite.svg",
                        render: {
                            css: {
                                template: svgTemplateSRC
                            }
                        }
                    }
                }
            }
        ))

        .pipe(dest(tempDir + 'sprite/'));  
}

function createPngCopy() {
    return src(tempDir + 'sprite/css/*.svg')
        .pipe(svg2png())
        .pipe(dest(tempDir + 'sprite/css'));
}

function copySpriteGraphic() {
    return src(tempDir + 'sprite/css/**/*.{svg,png}')
        .pipe(dest(srcDir + 'assets/images/sprites'));
}

function copySpriteCSS() {
    return src(tempDir + 'sprite/css/*.css')
        .pipe(rename('_sprite.css'))
        .pipe(dest(srcDir + 'assets/styles/modules'));
}

function endCleanSprite() { // End with delete the temporary sprite folder in .tmp folder
    return del(tempDir + 'sprite');
}


/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ Modernizr ◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

function modernizrTask() {
    const paths = [
        srcDir + 'assets/styles/**/*.css',
        srcDir + 'assets/scripts/**/*.js'
    ];
    return src(paths)
        .pipe($.modernizr({
            "options": [
                "setClasses"
            ]
        }))

        .pipe(dest(jsAppDEST));
}


/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ Build ◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

function deleteDistFolder() { // Begin build with delete the current build folder (dist);
    return del(buildDir);
}

/* 
 * Copy all extra files in src folder for future work
 * & Don't copy paths of DONTCopy */
function copyExtraFiles() {
    const DONTCopy = [
        `!${srcDir}index.pug`,
        `!${srcDir}includes`,
        `!${srcDir}includes/**`,
        `!${srcDir}assets/images/**`,
        `!${srcDir}assets/styles/**`,
        `!${srcDir}assets/scripts/**`,
    ];
    return src([all, ...DONTCopy])
        .pipe(dest(buildDir));
}

function optimizeImages() {
    const DONTCopy = [
        `!${srcDir}assets/images/icons`,
        `!${srcDir}assets/images/icons/**/*`
    ];
    return src([imagesSRC, ...DONTCopy])
        .pipe(imagemin([
            //imagemin.jpegtran({progressive: true}),
            imagemin.gifsicle({interlaced: true}),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            }),
            imageminPngquant({
                speed: 1,
                quality: 50
            }),
            imageminMozjpeg({
                quality: 80
            }) 

        ], {
            verbose: true
        }
        ))

        .pipe(dest(imagesDEST));
}

/*
 * Rev all .tmp folder files
 * & Don't copy paths of DONTCopy */
function revFiles() {
    const DONTCopy = [
        `!${tempDir}scripts/modernizr.js`,
        `!${tempDir}index.html`,
        `!${tempDir}**/*.map`
    ];
    return src([tempDir+'**/*', ...DONTCopy])
        .pipe(RevAll.revision({ dontRenameFile: ['.html'] }))
        .pipe(dest(buildDir + 'assets'))
}

/*
 * Inject all new revisioned files.
 * & Copy index.html from .tmp to dist folder */
function injectFileNames() { 
    return src(tempDir + 'index.html')
        .pipe(inject(src([buildDir + 'assets/styles/**/*.css'], {read: false}), {ignorePath: '/docs', addRootSlash: false}))
        .pipe(inject(src(buildDir + 'assets/scripts/vendor/*.js', {read: false}), {name: 'head', ignorePath: '/docs', addRootSlash: false}))
        .pipe(inject(src([buildDir + 'assets/scripts/*.js', `!${buildDir}/assets/scripts/vendor/**/*.js`,`!${buildDir}/assets/scripts/vendor`], {read: false}), {ignorePath: '/docs', addRootSlash: false}))
        .pipe(dest(buildDir));
}

/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ WATCH ◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

function watch_files() {
    watch(styleWatch, series(styles, reload));
    watch(htmlWatch,  series(html, reload));
    watch(jsWatch,    series(modernizrTask, scripts, reload));
}

/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ ALL TASKS ◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

/* task("html", html);
task("styles", styles);
task('scripts', scripts);

task('modernizrTask', modernizrTask);

task('deleteDistFolder', deleteDistFolder);
task('optimizeImages', optimizeImages);
task('revFiles', revFiles);
task('injectFileNames', injectFileNames);
task('copyExtraFiles', copyExtraFiles);

task("beginCleanSprite", beginCleanSprite);
task("createSprite", createSprite);
task("createPngCopy", createPngCopy);
task("copySpriteGraphic", copySpriteGraphic);
task("copySpriteCSS", copySpriteCSS);
task("endCleanSprite", endCleanSprite); */

exports.html = html;
exports.styles = styles;
exports.scripts = scripts;

exports.modernizrTask = modernizrTask;

exports.deleteDistFolder = deleteDistFolder;
exports.optimizeImages = optimizeImages;
exports.revFiles = revFiles;
exports.injectFileNames = injectFileNames;
exports.copyExtraFiles = copyExtraFiles;

exports.beginCleanSprite = beginCleanSprite;
exports.createSprite = createSprite;
exports.createPngCopy = createPngCopy;
exports.copySpriteGraphic = copySpriteGraphic;
exports.copySpriteCSS = copySpriteCSS;
exports.endCleanSprite = endCleanSprite;


/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ ICONS ◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

task("icons",
    series(
        // Begin with delete the current sprite folders for build new on
        beginCleanSprite,
        createSprite,
        createPngCopy,
        copySpriteGraphic,
        copySpriteCSS,
        endCleanSprite
        // End with delete the temporary sprite folder in .tmp folder
    )
);

/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ Default ◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

task("default", parallel(
    browser_sync,
    watch_files
));

/* ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘ Build ◘◘◘◘◘◘ *
 * ◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘◘ */

task("build", series(
    deleteDistFolder, // Begin build with delete the current build folder (dist);
    // Build a new one
    'icons',
    styles,
    html,
    modernizrTask,
    scripts,
    parallel(optimizeImages, copyExtraFiles),
    revFiles,
    injectFileNames,
    // Serve that kid
    function (done) {
        browserSync.init({
            notify: false,
            port: 9000,
            server: {
                baseDir: buildDir
            }
        });
        done();
    }
));




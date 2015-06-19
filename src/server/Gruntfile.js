// Gruntfile for easy frontend development of Soundbounce
module.exports = function(grunt) {
    "use strict";

    require('load-grunt-tasks')(grunt);

    var distDir = 'public',
        tmpDir = 'tmp',
        srcDir = 'resources',
        config = {
            src: {
                fonts: srcDir + '/fonts',
                images: srcDir + '/img',
                react: distDir + '/jsx',
                scripts: srcDir + '/js',
                styles: srcDir + '/scss'
            },
            tmp: {
                scripts: tmpDir + '/js',
                styles: tmpDir + '/css'
            },
            dist: {
                fonts: distDir + '/fonts',
                images: distDir + '/img',
                scripts: distDir + '/js',
                styles: distDir + '/css'
            }
        };

    grunt.initConfig({
        config: config,
        clean: {
            options: {
                force: true
            },
            dist: [config.dist.styles],
            tmp: [tmpDir]
        },
        react: {
            files: {
              expand: true,
              cwd: config.src.react,
              src: ['**/*.jsx'],
              dest: config.dist.scripts,
              ext: '.jsx.js'
            }
        },
        sass: {
            options: {
                sourceMap: true,
                style: 'expanded',
                debugInfo: true
            },
            dist: {
                cwd: config.src.styles,
                ext: '.css',
                expand: true,
                src: ['main.scss'],
                dest: config.dist.styles
            }
        },
        cssmin: {
            options: {
                keepSpecialComments: 1
            },
            build: {
                cwd: config.tmp.styles,
                ext: '.min.css',
                expand: true,
                src: ['**/*.css'],
                dest: config.dist.styles
            }
        },
        copy: {
            fonts: {
                cwd: config.src.fonts,
                expand: true,
                src: ['**'],
                dest: config.dist.fonts
            },
            images: {
                cwd: config.src.images,
                expand: true,
                src: ['**'],
                dest: config.dist.images
            }
        },
        notify: {
            scripts: {
                options: {
                    title: 'Task Complete',
                    message: 'Uglify finished running',
                }
            },
            styles: {
                options: {
                    title: 'Task Complete',
                    message: 'SASS finished compiling',
                }
            },
            build: {
                options: {
                    title: 'Task Complete',
                    message: 'Application rebuild finished'
                }
            }
        },
        // connect: {
        //     dev: {
        //         options: {
        //             port: 9000,
        //             hostname: 'localhost',
        //             base: 'public',
        //             keepalive: true,
        //             livereload: true,
        //             open: {
        //                 target: 'localhost:9000/app.html'
        //             }
        //         }
        //     }
        // },
        express: {
            options: {},
            dev: {
                options: {
                    port: 3000,
                    script: 'server.js'
                }
            }
        },
        watch: {
            options: {
                livereload: true
            },
            styles: {
                files: config.src.styles + '/**/*.scss',
                tasks: ['styles']
            },
            scripts: {
                files: config.src.scripts + '/**/*.js',
                tasks: ['scripts']
            },
            react:{
                files: config.src.react + '/**/*.jsx',
                tasks: ['compile']
            },
            copy: {
                files: [
                    config.src.images + '/**/*',
                    config.src.fonts + '/**/*'
                ],
                tasks: ['copy']
            }
        },
        concurrent: {
            build: ['compile', 'styles', 'copy']
        }
    });

    grunt.registerTask('server', ['express']);
    grunt.registerTask('compile', ['react']);
    grunt.registerTask('styles', ['sass', /*'cssmin',*/ 'notify:styles']);
    // grunt.registerTask('scripts', ['jshint', 'concat', 'uglify', 'notify:scripts']);
    grunt.registerTask('build', ['clean', 'concurrent:build', 'notify:build']);
    grunt.registerTask('dev', ['build', 'server', 'watch']);
    grunt.registerTask('default', 'build');
}

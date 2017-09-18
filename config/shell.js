var path = require('path');

module.exports = function (grunt, options) {
    return {
        compile_protobuf_server: {
            command: function () {
                var tmpDir    = 'compile/obj/lib/share/protobuf';
                var statement = ['mkdir -p ' + tmpDir];
                var pbjs      = ['server_use'].map(function (value) {
                    return 'pbjs lib/share/protobuf/' + value + '.proto --target=json -o ' + path.join(tmpDir, value + '.json');
                });
                return statement.concat(pbjs).join('&&');
            }
        },

        compile_protobuf_client: {
            command: function () {
                var tmpDir    = 'client_share/trunk';
                var pbjs      = ['client_use'].map(function (value) {
                    return 'pbjs lib/share/protobuf/' + value + '.proto --target=json -o ' + path.join(tmpDir, value + '.json');
                });
                console.log('pbjs: ' + pbjs.join('&&'));
                return pbjs.join('&&');
            }
        },

        docker_build: {
            command: function () {
                var pkg = grunt.config.get('pkg');
                var gitDescribe = grunt.config.get('gitDescribe');
                var cmd = ['docker', 'build', '--build-arg', 'name='+pkg.name, '-t', 'docker-repo.gamed9.com/dh/' + pkg.name + ':' + gitDescribe, 'compile/docker'].join(' ');
                grunt.log.ok('docker build command: ' + cmd);
                return cmd;
            },
            options: {
                execOptions: {
                    maxBuffer: Infinity
                }
            }
        },

        push_docker_image: {
            command: function () {
                var pkg = grunt.config.get('pkg');
                var gitDescribe = grunt.config.get('gitDescribe');
                var cmd = ['docker', 'push', 'docker-repo.gamed9.com/dh/' + pkg.name + ':' + gitDescribe].join(' ');
                grunt.log.ok('docker push command: ' + cmd);
                return cmd;
            },
            options: {
                execOptions: {
                    maxBuffer: Infinity
                }
            }
        },

        "git-describe": {
            command: 'git describe --tags',
            options: {
                stdout  : false,
                callback: function (err, stdout, stderr, cb) {
                    if (err) grunt.fatal('git describe --tags failed: ' + err.message);
                    var version = stdout.trim();
                    grunt.log.debug('version: ' + version);
                    //var RE = /(?:(.*)-(\d+)-g)?([a-fA-F0-9]{7})(-dirty)?$/;
                    //if (!RE.test(version)) grunt.fatal('describe not valid: ' + version);

                    grunt.log.ok('git describe: ' + version);
                    grunt.config.set('gitDescribe', version);
                    cb();
                }
            }

        }
    };
};
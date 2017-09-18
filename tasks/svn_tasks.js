var async       = require('async');
var path        = require('path');
var spawn       = require('child_process').spawn;
var parseString = require('xml2js').parseString;

module.exports = function (grunt, options) {

    function svnInfo(url, revision, done) {
        if (arguments.length == 2) {
            done     = revision;
            revision = null;
        }
        var args = ['info', url, '--xml'];
        if (revision) {
            args = args.concat(['-r', revision]);
        }

        var info    = spawn('svn', args);
        var buff    = '',
            errBuff = '';

        grunt.log.debug(args.join(' '));

        info.stdout.on('data', function (data) {
            buff += data;
        });

        info.stderr.on('data', function (data) {
            errBuff += data;
        });

        info.on('close', function (code) {
            grunt.log.debug('exit code: ' + code);
            if (code) return done(new Error(errBuff));

            parseString(buff, function (err, obj) {
                if (err) return done(err);

                var entry  = obj.info.entry[0];
                var result = {
                    "path"         : entry.$.path,
                    "revision"     : entry.$.revision,
                    "kind"         : entry.$.kind,
                    "url"          : entry.url[0],
                    "repo_root"    : entry.repository[0].root[0],
                    "repo_uuid"    : entry.repository[0].uuid[0],
                    //"wc_abspath"   : entry['wc-info'][0]['wcroot-abspath'][0],
                    //"wc_schedule"  : entry['wc-info'][0].schedule[0],
                    //"wc_depth"     : entry['wc-info'][0].depth[0],
                    "last_revision": entry.commit[0].$.revision,
                    "last_author"  : entry.commit[0].author[0],
                    "last_date"    : entry.commit[0].date[0]
                };
                done(null, result);
            });
        });
    }

    grunt.registerTask('svn-export-data', 'export ts/json file', function (dest, branch, revision) {
        var done = this.async();
        grunt.log.debug('dest: ' + dest);
        grunt.log.debug('branch: ' + branch);
        grunt.log.debug('revision: ' + revision);

        var url = 'http://172.16.0.2/svn/three_art/branches/' + branch + '/design/ts2';

        async.waterfall([
            function (next) {
                svnInfo(url, revision, function (err, result) {
                    if (err) return next(err);
                    revision = result.revision;
                    result.branch = branch;
                    grunt.config.set('svn_info_data', result);

                    grunt.log.writeln('svn info:' + JSON.stringify(result, null, 2));
                    next();
                });
            },
            function (next) {
                var ept = spawn('svn', ['export', url, dest, '-r', revision]);
                var err = '';
                ept.stderr.on('data', function (data) {
                    err += data;
                });
                ept.on('close', function (code) {
                    next(code ? new Error(err) : null);
                });
            }
        ], function (err) {
            if (err) {
                grunt.fatal('svn export ' + revision + ' error: ' + err.message);
                return;
            }
            var svn_info_data = grunt.config.get('svn_info_data');
            grunt.file.write(path.join(dest, '_svn_info.json'), JSON.stringify(svn_info_data, null, 2));
            grunt.log.ok('svn export ' + revision + ' successfully');
            done();
        });

    });

    grunt.registerTask('svn-struct-info', 'write struct svn info', function () {
        var done = this.async();

        var url = './lib/config/struct',
            revision;

        async.waterfall([
            function (next) {
                svnInfo(url, function (err, result) {
                    if (err) return next(err);
                    revision = result.revision;
                    grunt.config.set('svn_info_struct', result);

                    grunt.log.writeln('svn info:' + JSON.stringify(result, null, 2));
                    next();
                });
            }
        ], function (err) {
            if (err) {
                grunt.fatal('struct svn ' + revision + ' error: ' + err.message);
                return;
            }
            var svn_info_struct = grunt.config.get('svn_info_struct');
            grunt.file.write(path.join('./lib//config/struct', '_svn_info.json'), JSON.stringify(svn_info_struct, null, 2));
            grunt.log.ok('svn export ' + revision + ' successfully');
            done();
        });
    });

};
#!/usr/bin/env node

var debug = require('debug');
var log   = debug('dh:cli');

var fs        = require('fs');
var async     = require('async');
var path      = require('path');
var commander = require('commander');
var child     = require('child_process');
//var UX        = require('./UNIX');
//var tabtab    = require('../lib/completion/completion');

var pkg = require('../package.json');

var ExitCode = {
    SUCCESS_EXIT: 0,
    ERROR_EXIT  : 1
};

commander.version(pkg.version)
    .description(pkg.description)
    .usage('[command] [options]');


commander.command('start <config>')
    .description('start a dh-server instance')
    //.option('-w, --overwrite', 'overwrite even has exist process on this config path', null, null)
    .action(function (config) {
        var filename = path.isAbsolute(config) ? config : path.join(process.cwd(), config);
        log(filename);

        function work() {
            var content = fs.readFileSync(filename);
            var config  = JSON.parse(content);

            var type   = config.type,
                region = config.region;

            if (!region) throw new Error('REGION_ERROR, No valid region option in file: ' + filename);

            var scriptPath = path.join(__dirname, '../lib');
            switch (type) {
                case 'game':
                    scriptPath = path.join(scriptPath, 'gameserver/game_cli.js');
                    break;
                case 'center':
                    scriptPath = path.join(scriptPath, 'centerserver/center_cli.js');
                    break;
                case 'login':
                    scriptPath = path.join(scriptPath, 'loginserver/login_cli.js');
                    break;
                default:
                    throw new Error('TYPE_ERROR: only support type login, center, game');
            }

            var app = {};

            app.name            = [region, type, config[type].work.serverId].join('-');
            app.script          = scriptPath;
            app.args            = filename;
            app.exec_mode       = 'fork';
            app.log_date_format = 'YYYY-MM-DD HH:mm Z';
            app.out_file        = '/dev/null';
            app.watch           = false;
            app.autorestart     = false;

            app.env = {
                DH_SERVER: true
            };

            //app.error_file      = path.join('/var/log/', pkg.name, app.name, 'server.stderr.log');

            log('app=' + JSON.stringify(app));

            child.spawn('node', [app.script, app.args], {
                stdio: 'inherit'
            });

            //pm2.start(app, function (err, apps) {
            //    if (err) return next(err);
            //
            //    console.log(app.name);
            //    next();
            //});
        }

        work();

    });


process.on('uncaughtException', function (e) {
    console.error(e.message);
    log(e.stack);
    process.exit(ExitCode.ERROR_EXIT);
});

commander.parse(process.argv);
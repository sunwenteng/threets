#!/usr/bin/env node

var debug = require('debug');
var log   = debug('dh:cli');

var fs        = require('fs');
var pm2       = require('pm2');
var async     = require('async');
var path      = require('path');
var commander = require('commander');
var UX        = require('./UNIX');
var tabtab    = require('../lib/completion/completion');

var pkg = require('../package.json');

var ExitCode = {
    SUCCESS_EXIT: 0,
    ERROR_EXIT  : 1
};

commander.version(pkg.version)
    .description(pkg.description)
    .usage('[command] [options]');

function filterAppList(prc) {
    return prc.pm2_env.env.DH_SERVER;
}

//
// Start Server command
//
commander.command('start <config>')
    .description('start a dh-server instance')
    //.option('-w, --overwrite', 'overwrite even has exist process on this config path', null, null)
    .action(function (config) {
        var filename = path.isAbsolute(config) ? config : path.join(process.cwd(), config);
        log(filename);

        async.waterfall([
            function (next) {
                pm2.connect(next);
            },
            function (next) {
                pm2.list(function (err, processList) {
                    if (err) return next(err);
                    var list = processList.filter(function (proc) {
                        if (!proc.pm2_env.args || proc.pm2_env.args.length === 0) return false;
                        return filterAppList(proc) && (proc.pm2_env.args[0] === filename);
                    });
                    if (list.length > 0) return next(new Error('already has instance, server: ' + list[0].name));
                    next(null);
                });
            },
            function (next) {
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

                pm2.start(app, function (err, apps) {
                    if (err) return next(err);

                    console.log(app.name);
                    next();
                });
            }
        ], function (err) {
            if (err) console.error(err.message);
            pm2.disconnect(function () {
                process.exit(err ? ExitCode.ERROR_EXIT : ExitCode.SUCCESS_EXIT);
            });
        });

    });

//
// Delete Server Instance command
//
commander.command('delete <server>')
    .description('stop a dh-server instance')
    .action(function (server) {
        async.waterfall([
            function (next) {
                pm2.connect(next);
            },
            function (next) {
                pm2.list(function (err, processList) {
                    if (err) return next(err);
                    var list = processList.filter(function (proc) {
                        return filterAppList(proc) && (proc.name === server);
                    });
                    if (list.length === 0) return next(new Error('could not find server: ' + server));
                    next(null);
                });
            },
            function (next) {
                pm2.delete(server, function (err, proc) {
                    if (err) return next(err);
                    console.log('delete ' + server + ' successfully');
                    next(null);
                });
            }
        ], function (err) {
            if (err) console.error(err.message);
            pm2.disconnect(function () {
                process.exit(err ? ExitCode.ERROR_EXIT : ExitCode.SUCCESS_EXIT);
            });
        });
    });

//
// Restart Server
//
commander.command('restart <server>')
    .description('restart a dh-server instance')
    .option('-f, --force', 'restart even if server is already running')
    .action(function (server, options) {
        async.waterfall([
            function (next) {
                pm2.connect(next);
            },
            function (next) {
                pm2.list(function (err, processList) {
                    if (err) return next(err);
                    var list = processList.filter(function (proc) {
                        return filterAppList(proc) && (proc.name === server);
                    });
                    if (list.length === 0) return next(new Error('could not find server: ' + server));
                    var status = list[0].pm2_env.status;

                    if (status === 'online' && !options.force) {
                        return next(new Error('server ' + server + ' is already running, status: ' + status));
                    }
                    next(null);
                });
            },
            function (next) {
                pm2.restart(server, function (err, proc) {
                    if (err) return next(err);
                    console.log('restart ' + server + ' successfully');
                    next(err);
                });
            }
        ], function (err) {
            if (err) console.error(err.message);
            pm2.disconnect(function () {
                process.exit(err ? ExitCode.ERROR_EXIT : ExitCode.SUCCESS_EXIT);
            });
        });
    });


//
// Stop
//
commander.command('stop <server>')
    .description('stop a dh-server instance')
    .action(function (server) {
        async.waterfall([
            function (next) {
                pm2.connect(next);
            },
            function (next) {
                pm2.list(function (err, processList) {
                    if (err) return next(err);
                    var list = processList.filter(function (proc) {
                        return filterAppList(proc) && (proc.name === server);
                    });
                    if (list.length === 0) return next(new Error('could not find server: ' + server));
                    var status = list[0].pm2_env.status;
                    if (status !== 'online') {
                        return next(new Error('server ' + server + ' is already not running, status: ' + status));
                    }
                    next(null);
                });
            },
            function (next) {
                pm2.stop(server, function (err, proc) {
                    if (err) return next(err);
                    console.log('stop ' + server + ' successfully');
                    next(null);
                });
            }
        ], function (err) {
            if (err) console.error(err.message);
            pm2.disconnect(function () {
                process.exit(err ? ExitCode.ERROR_EXIT : ExitCode.SUCCESS_EXIT);
            });
        });
    });

//
// List Servers Running Info command
//
commander.command('list')
    .alias('ls')
    .action(function () {
        async.waterfall([
            function (next) {
                pm2.connect(next);
            },
            function (next) {
                pm2.list(function (err, processList) {
                    if (err) return next(err);

                    var list = processList.filter(filterAppList);

                    UX.dispAsTable(list);

                    next(null);
                });
            }
        ], function (err) {
            if (err) console.error(err.message);
            pm2.disconnect(function () {
                process.exit(err ? ExitCode.ERROR_EXIT : ExitCode.SUCCESS_EXIT);
            });
        });
    });

//
// List Servers Static Info command
//
commander.command('show')
    .action(function () {
        async.waterfall([
            function (next) {
                pm2.connect(next);
            },
            function (next) {
                pm2.list(function (err, processList) {
                    if (err) return next(err);

                    var list = processList.filter(filterAppList);

                    UX.dispStaticTable(list);

                    next(null);
                });
            }
        ], function (err) {
            if (err) console.error(err.message);
            pm2.disconnect(function () {
                process.exit(err ? ExitCode.ERROR_EXIT : ExitCode.SUCCESS_EXIT);
            });
        });
    });

//
// Describe Servers detail info
//
commander.command('describe <server>')
    .alias('desc')
    .action(function (server) {
        async.waterfall([
            function (next) {
                pm2.connect(next);
            },
            function (next) {
                pm2.list(function (err, processList) {
                    if (err) return next(err);

                    var list = processList.filter(function (proc) {
                        return filterAppList(proc) && (proc.name === server);
                    });

                    list.forEach(function(proc) {
                        UX.describeTable(proc);
                    });

                    next(null);
                });
            }
        ], function (err) {
            if (err) console.error(err.message);
            pm2.disconnect(function () {
                process.exit(err ? ExitCode.ERROR_EXIT : ExitCode.SUCCESS_EXIT);
            });
        });
    });


//
// Uncaught command
//
commander.command('*')
    .action(function () {
        console.log('Command not found');
        commander.outputHelp();
        process.exit(ExitCode.ERROR_EXIT);
    });

process.on('uncaughtException', function (e) {
    console.error(e.message);
    log(e.stack);
    process.exit(ExitCode.ERROR_EXIT);
});

function beginCommandProcessing() {
    commander.parse(process.argv);
}

function checkCompletion() {
    var completed = 'dhserver';
    return tabtab.complete(completed, function (err, data) {
        if (err || !data) return;
        if (/^--\w?/.test(data.last)) return tabtab.log(commander.options.map(function (data) {
            return data.long;
        }), data);
        if (/^-\w?/.test(data.last)) return tabtab.log(commander.options.map(function (data) {
            return data.short;
        }), data);

        //if (data.prev === 'start') {
        //    fs.readdir(process.cwd(), function (err, files) {
        //        if (err) return tabtab.log([], data);
        //        tabtab.log(files.filter(function (filename) {
        //            return /.*\.json$/.test(filename);
        //        }), data);
        //    });
        //    return ;
        //}

        var dependOnAppName = ['delete', 'restart', 'stop', 'desc', 'describe'];

        if (dependOnAppName.indexOf(data.prev) > -1) {
            pm2.connect(function () {
                pm2.list(function (err, processList) {
                    if (err) return tabtab.log([], data);
                    var list = processList.filter(filterAppList);
                    tabtab.log(list.map(function (proc) {
                        return proc.name;
                    }), data);
                    pm2.disconnect();
                });
            });
            return;
        }

        if (data.prev === completed) {
            tabtab.log(commander.commands.map(function (data) {
                return data._name;
            }).filter(function (data) {
                return !!data && data.length > 0 && data !== '*';
            }), data);
        }
    });
}

//console.log(commander.commands.map(function (data) {
//    return data._name;
//}).filter(function (data) {
//    return !!data && data.length > 0 && data !== '*';
//}));

if (process.argv.length === 2) {
    commander.parse(process.argv);
    commander.outputHelp();
    process.exit(ExitCode.SUCCESS_EXIT);
}

if (process.argv.slice(2)[0] === 'completion') {
    checkCompletion();
} else {
    beginCommandProcessing();
}
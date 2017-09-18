var debug = require('debug');
var log   = debug('dh:UNIX');

var fs    = require('fs');
var Table = require('cli-table');
var chalk = require('chalk');
var path  = require('path');

var UX = module.exports = {};

UX.dispAsTable = function dispAsTable(list) {
    var app_table = new Table({
        head     : ['Server name', 'pm_id', 'pid', 'status', 'restart', 'uptime', 'cpu', 'memory'],
        colAligns: ['left', 'left', 'left', 'left', 'left', 'left', 'left', 'left'],
        style    : {'padding-left': 1, head: ['cyan', 'bold'], compact: true}
    });

    var module_table = new Table({
        head     : ['Module', 'version', 'target PID', 'status', 'restart', 'cpu', 'memory'],
        colAligns: ['left', 'left', 'left', 'left'],
        style    : {'padding-left': 1, head: ['cyan', 'bold'], compact: true}
    });

    if (!list)
        return console.log('list empty');

    list.forEach(function (l) {
        var obj = {};

        var mode   = l.pm2_env.exec_mode;
        var status = l.pm2_env.status;
        var port   = l.pm2_env.port;
        var key    = l.pm2_env.name || path.basename(l.pm2_env.pm_exec_path.script);

        if (l.pm2_env.pmx_module == true) {
            obj[key] = [
                chalk.bold(l.pm2_env.axm_options.module_version || 'N/A'),
                l.pid,
                colorStatus(status),
                l.pm2_env.restart_time ? l.pm2_env.restart_time : 0,
                l.monit.cpu + '%',
                l.monit ? bytesToSize(l.monit.memory, 3) : ''
            ];
            safe_push(module_table, obj);
            //module_table.push(obj);
        }
        else {
            obj[key] = [
                l.pm2_env.pm_id,
                //mode == 'fork_mode' ? chalk.inverse.bold('fork') : chalk.blue.bold('cluster'),
                l.pid,
                colorStatus(status),
                l.pm2_env.restart_time ? l.pm2_env.restart_time : 0,
                (l.pm2_env.pm_uptime && status == 'online') ? timeSince(l.pm2_env.pm_uptime) : 0,
                l.monit ? l.monit.cpu + ' %' : '0 %',
                l.monit ? bytesToSize(l.monit.memory, 3) : ''
            ];
            safe_push(app_table, obj);
            //app_table.push(obj);
        }

    });

    console.log(app_table.toString());
    if (module_table.length > 0) {
        console.log(chalk.bold(' Module activated'));
        console.log(module_table.toString());
    }
};

UX.dispStaticTable = function dispStaticTable(list) {
    var app_table = new Table({
        head     : ['Name', 'Id', 'Type', 'Region', 'NetPort', 'Database', 'LogLevel', 'DataRevision', 'Test'],
        colAligns: ['left', 'left', 'left', 'left', 'left', 'left', 'left', 'left', 'left'],
        style    : {'padding-left': 1, head: ['cyan', 'bold'], compact: true}
    });

    if (!list)
        return console.log('list empty');

    list.forEach(function (l) {
        var obj = {};

        var key    = l.pm2_env.name || path.basename(l.pm2_env.pm_exec_path.script);
        var config = null;

        var args = l.pm2_env.args;
        if (!Array.isArray(args) || args.length <= 0) return;

        var filename, content;
        try {
            filename = path.isAbsolute(args[0]) ? args[0] : path.join(l.pm2_env.pm_cwd, args[0]);
            log('[dispStaticTable] server config path:' + filename);

            content = fs.readFileSync(filename);
            config  = JSON.parse(content);
        } catch (err) {
            console.error('[dispStaticTable] ' + err.message);
            return;
        }

        var type = config.type;
        if (!type) return;
        var data         = config[type],
            dataRevision = 'N/A',
            svn_info;

        try {
            switch (type) {
                case 'game':
                    filename = path.join(config.game.work.configPath, '_svn_info.json');
                    break;
                case 'center':
                    filename = path.join(config.center.work.configPath, '_svn_info.json');
                    break;
                case 'login':
                    filename = path.join(config.login.work.configPath, '_svn_info.json');
                    break;
                default:
                    dataRevision = chalk.red('ERROR');
                    break;
            }
            content = fs.readFileSync(filename);
            svn_info  = JSON.parse(content);
            dataRevision = svn_info.revision == svn_info.last_revision ? svn_info : svn_info.revision + '/' + svn_info.last_revision;
        } catch (err) {
            dataRevision = err.code;
        }

        obj[key] = [
            data.work.serverId,
            type,
            config.region,
            data.net.port,
            [data.database.intranet, data.database.database].join(':'),
            data.work.logLevel,
            dataRevision,
            data.work.test ? chalk.green.bold('✔') : '✘'
        ];
        safe_push(app_table, obj);
    });

    console.log(app_table.toString());
};

/**
 * Description
 * @method describeTable
 * @param {} process
 * @return
 */
UX.describeTable = function (process) {
    var table = new Table({
        style: {'padding-left': 1, head: ['cyan', 'bold'], compact: true}
    });

    var pm2_env = process.pm2_env;

    var created_at = 'N/A';

    try {
        if (pm2_env.created_at != null)
            created_at = new Date(pm2_env.created_at).toISOString();
    } catch (e) {
        throw new Error(pm2_env.created_at + ' is not a valid date: ' + e.message, e.fileName, e.lineNumber);
    }

    console.log('Describing process with id %d - name %s', pm2_env.pm_id, pm2_env.name);
    safe_push(table,
        {'status': colorStatus(pm2_env.status)},
        {'name': pm2_env.name},
        {'id': pm2_env.pm_id},
        {'path': pm2_env.pm_exec_path},
        {'args': pm2_env.args ? (typeof pm2_env.args == 'string' ? JSON.parse(pm2_env.args.replace(/'/g, '"')) : pm2_env.args).join(' ') : ''},
        {'exec cwd': pm2_env.pm_cwd},
        {'error log path': pm2_env.pm_err_log_path},
        {'out log path': pm2_env.pm_out_log_path},
        {'pid path': pm2_env.pm_pid_path},
        {'mode': pm2_env.exec_mode},
        {'node v8 arguments': pm2_env.node_args.length != 0 ? pm2_env.node_args : ''},
        {'watch & reload': pm2_env.watch ? chalk.green.bold('✔') : '✘'},
        {'interpreter': pm2_env.exec_interpreter},
        {'restarts': pm2_env.restart_time},
        {'unstable restarts': pm2_env.unstable_restarts},
        {'uptime': (pm2_env.pm_uptime && pm2_env.status == 'online') ? timeSince(pm2_env.pm_uptime) : 0},
        {'created at': created_at}
    );

    if ('pm_log_path' in pm2_env) {
        table.splice(6, 0, {'entire log path': pm2_env.pm_log_path});
    }

    console.log(table.toString());

    /**
     * Module conf display
     */
    if (pm2_env.axm_options && pm2_env.axm_options.module_conf) {
        var table_conf = new Table({
            style: {'padding-left': 1, head: ['cyan', 'bold'], compact: true}
        });
        console.log('Process configuration');

        Object.keys(pm2_env.axm_options.module_conf).forEach(function (key) {
            var tmp  = {};
            tmp[key] = pm2_env.axm_options.module_conf[key];
            safe_push(table_conf, tmp);
        });

        console.log(table_conf.toString());
    }

    /**
     * Versioning metadata
     */
    if (pm2_env.versioning) {

        var table2 = new Table({
            style: {'padding-left': 1, head: ['cyan', 'bold'], compact: true}
        });

        console.log('Revision control metadata');
        safe_push(table2,
            {'revision control': pm2_env.versioning.type},
            {'remote url': pm2_env.versioning.url},
            {'repository root': pm2_env.versioning.repo_path},
            {'last update': pm2_env.versioning.update_time},
            {'revision': pm2_env.versioning.revision},
            {'comment': pm2_env.versioning.comment},
            {'branch': pm2_env.versioning.branch}
        );
        console.log(table2.toString());
    }

    if (pm2_env.axm_monitor && Object.keys(pm2_env.axm_monitor).length > 0) {
        var table_probes = new Table({
            style: {'padding-left': 1, head: ['cyan', 'bold'], compact: true}
        });

        console.log('Probes value');
        Object.keys(pm2_env.axm_monitor).forEach(function (key) {
            var obj   = {};
            var value = pm2_env.axm_monitor[key].hasOwnProperty("value") ? pm2_env.axm_monitor[key].value : pm2_env.axm_monitor[key];
            obj[key]  = value;
            safe_push(table_probes, obj);
        });

        console.log(table_probes.toString());
    }
};

/**
 * Description
 * @method colorStatus
 * @param {} status
 * @return
 */
function colorStatus(status) {
    switch (status) {
        case 'online':
            return chalk.green.bold('online');
            break;
        case 'launching':
            return chalk.blue.bold('launching');
            break;
        default:
            return chalk.red.bold(status);
    }
}

function safe_push() {
    var argv  = arguments;
    var table = argv[0];

    for (var i = 1; i < argv.length; ++i) {
        var elem = argv[i];
        if (elem[Object.keys(elem)[0]] === undefined
            || elem[Object.keys(elem)[0]] === null) {
            elem[Object.keys(elem)[0]] = 'N/A';
        }
        else if (Array.isArray(elem[Object.keys(elem)[0]])) {
            elem[Object.keys(elem)[0]].forEach(function (curr, j) {
                if (curr === undefined || curr === null)
                    elem[Object.keys(elem)[0]][j] = 'N/A';
            });
        }
        table.push(elem);
    }
}

/**
 * Description
 * @method timeSince
 * @param {Number} date
 * @return {String} BinaryExpression
 */
function timeSince(date) {

    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return interval + 'Y';
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + 'M';
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + 'D';
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + 'h';
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + 'm';
    }
    return Math.floor(seconds) + 's';
}

/**
 * Description
 * @method bytesToSize
 * @param {} bytes
 * @param {} precision
 * @return
 */
function bytesToSize(bytes, precision) {
    var kilobyte = 1024;
    var megabyte = kilobyte * 1024;
    var gigabyte = megabyte * 1024;
    var terabyte = gigabyte * 1024;

    if ((bytes >= 0) && (bytes < kilobyte)) {
        return bytes + ' B   ';
    } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
        return (bytes / kilobyte).toFixed(precision) + ' KB  ';
    } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
        return (bytes / megabyte).toFixed(precision) + ' MB  ';
    } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
        return (bytes / gigabyte).toFixed(precision) + ' GB  ';
    } else if (bytes >= terabyte) {
        return (bytes / terabyte).toFixed(precision) + ' TB  ';
    } else {
        return bytes + ' B   ';
    }
}
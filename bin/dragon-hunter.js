#!/usr/bin/env node

/**
 * used for docker entrypoint
 */

var debug = require('debug');
var log   = debug('dh:cli');

var fs        = require('fs');
var async     = require('async');
var path      = require('path');
var commander = require('commander');
var child     = require('child_process');
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

function list(val) {
    return val.split(',');
}

function check(obj, key, deft) {
    if (!obj[key]) {
        if (deft) return deft;
        throw new Error('E_NEED_MORE_PARAM, ' + key);
    }
    return obj[key];
}

commander.command('run')
    .description('run dragon hunter server')
    .option('-m, --mode <value>', 'using predefined mode to startup', /^(local|product|dev)$/i, 'local')
    .option('-b, --bind <bindIp>', '[ip:port]')
    .option('-n, --region-name <name>', 'specify region name (product mode)')
    .option('-s, --service <items>', 'startup by specify services (product mode)', list)
    .option('-h, --handler <items>', 'startup by specify handler (product mode)', list)
    .option('--redis <options>', '[ip:port]  default (mc:6379)')
    .option('--mysql <options>', '[ip:port:user:password:database]  default (db:3306:root:root:dh)')
    .option('--consul <options>', '[ip:port]')
    .option('--debug', 'support remote debug, expose port 5858')
    .action(function (options) {
        var env = process.env;

        var mode = options.mode;
        if (!mode) mode = 'dev';

        env.DH_RUN_MODE = mode;

        switch (mode) {
            case 'product':
                env.DH_REGION_NAME = check(options, 'region-name');
                if (options.service)
                    env.DH_SERVICE_LIST = options.service;
                if (options.handler) {
                    env.DH_HANDLER_LIST = options.handler;
                    env.DH_BIND_IP = check(options, 'bind');
                }
                env.DH_CONSUL = 'consul://' + check(options, 'consul', 'localhost:8500');
                break;

            case 'local':   // use consul
                env.DH_REGION_NAME = 'local';
                env.DH_BIND_IP = check(options, 'bind');
                env.DH_CONSUL = 'consul://' + check(options, 'consul', 'localhost:8500');
                break;

            case 'dev':     // not use consul
                env.DH_REGION_NAME = 'dev';
                env.DH_BIND_IP = check(options, 'bind');
                break;
            //case 'debug':
            //    env.DH_REGION_NAME = 'debug';
            //    env.DH_BIND_IP = check(options, 'bind');
            //    break;
            default:
                throw new Error('unknown mode [' + mode + '], available mode (dev, local, product)');
        }

        env.DH_REDIS = check(options, 'redis', 'mc:6379');
        env.DH_MYSQL = check(options, 'mysql', 'db:3306:root:root:dh');

        var scriptPath = path.join(__dirname, '../lib/main.js');
        var args = [scriptPath];
        if (options.debug) {
            args = ['--debug-brk', '--nolazy'].concat(args);

            var inspector = child.spawn('node-inspector', ['--web-port=8080', '--hidden=\'["node_modules/"]\''], {
                detached: true,
                stdio: ['ignore']
            });

            inspector.unref();
        }

        child.spawn('node', args, {
            env: env,
            stdio: 'inherit'
        });

    });

process.on('uncaughtException', function (e) {
    console.error(e.message);
    log(e.stack);
    process.exit(ExitCode.ERROR_EXIT);
});

if (process.argv.length === 2) {
    commander.parse(process.argv);
    commander.outputHelp();
    process.exit(ExitCode.SUCCESS_EXIT);
}

commander.parse(process.argv);
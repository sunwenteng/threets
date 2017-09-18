import os = require('os');
import path = require('path');
import url = require('url');
import pbstream = require('node-protobuf-stream');

import Common = require('../server_share/common');
import Log = require('../util/log');
import Util = require('../util/game_util');
import Enter = require('../config/template/enter_file');
import ConsulManager = require('../consul/consul_manager');
import DH = require('../global');

import Server = require('./server');

var server:Server = null;

export var shortTitle = 'dh';
export var regionName = 'local';

class Running {
    handler:string[];
    service:string[];
}

export function startup():void {

    /****************************************
     * Low Level startup
     * @xienanjie 16-5-19
     ****************************************/

    // init Log
    Log.init(path.join(DH.work.rootPath, 'logs'), DH.work.logLevel);

    // register process event
    process.on('SIGINT', () => {
        console.log('caught signal SIGINT');
        if (server) server.emit('shutdown');
    });
    process.on('uncaughtException', (e:Error) => {
        Log.sFatalError(e, 'uncaughtException', e.message + ', ' + e['stack']);
        process.exit(Common.ExitCode.UNCAUGHT_EXCEPTION);
    });
    process.on('exit', (code) => {
        console.log('server exit with code ' + code);
    });

    // create pid file
    try {
        Util.createPidFile(path.join(DH.work.rootPath, '.pid'));
    } catch (err) {
        Log.sError('StartupServer', 'create pid file failed');
        process.exit(Common.ExitCode.CREATE_PID_FILE_FAILED);
    }

    // initial protobuf
    try {
        pbstream.initStream(path.join(__dirname, '../share/protobuf/server_use.json'));
    } catch (err) {
        Log.sError('StartupServer', 'initial protocol and router failed, message=' + err);
        process.exit(Common.ExitCode.INIT_PROTOCOL_AND_ROUTER_FAILED);
    }

    regionName = DH.region.name;

    ConsulManager.connectConsul({
        host: DH.consul.hostname,
        port: DH.consul.port
    });

    var networkInterfaces = os.networkInterfaces();
    var eths = Object.keys(networkInterfaces).filter(key => {return /^eth\d+$/.test(key)});
    if (!eths.length) {
        Log.sFatal('StartupServer', 'no valid eth network interfaces, exist ' + Object.keys(networkInterfaces).join(','));
        DH.eth = {address: '0.0.0.0'};
    } else {
        DH.eth = networkInterfaces[eths[0]].filter(x => {return x.family === 'IPv4';})[0];
    }

    /****************************************
     * Run Server
     * @xienanjie 16-5-19
     ****************************************/

    server = new Server();
    server.on('shutdown', () => {
        server.shutdown((code) => {
            process.exit(code);
        });
    });
    server.startup();
}


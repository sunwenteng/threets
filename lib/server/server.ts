import fs = require('fs');
import path = require('path');
import yaml = require('js-yaml');
import async = require('async');
import events = require('events');
import pbstream = require('node-protobuf-stream');
import consul = require('consul');

import Util = require('../util/game_util');
import Log = require('../util/log');
import Time = require('../util/time');
import DepUtil = require('../util/dependence_util');
import EnterFile = require('../config/template/enter_file');
import Tcp = require('../net/tcp');
import ConsulManager = require('../consul/consul_manager');

import Config = require('../config');
import DH = require('../global');

import DepManager = require('./dependence_manager');
import App = require('./app');

// Managers
import DatabaseManager = require('../database/database_manager');
import RedisManager = require('../redis/redis_manager');
import ServiceManager = require('../service/service_manager');
import HandlerManager = require('../handler/handler_manager');


enum EXIT_CODE {
    SUCCESS                         = 0,
    CREATE_PID_FILE_FAILED          = 1,
    INIT_PROTOCOL_AND_ROUTER_FAILED = 2,
    UNHANDLED_ERROR                 = 3,
    UNCAUGHT_EXCEPTION              = 9
}

class Server extends events.EventEmitter {

    isShutdowning:boolean = false;

    constructor() {
        super();
    }

    /****************************************
     *                                      *
     *   High Level startup                 *
     *                                      *
     ****************************************/

    public startup():void {
        Log.sInfo('StartupServer', 'startup info: version=%s, region=%s', DH.pkg.version, JSON.stringify(DH.region));
        async.waterfall(
            [
                (next) => {
                    Config.reloadAllConfig(path.resolve(DH.work.configPath));
                    next();
                },
                (next) => {
                    ConsulManager.createSession(next);
                },
                (next) => {
                    async.eachSeries(
                        DepUtil.startupSort,
                        (dep, next) => {
                            if (DH.run.component.indexOf(dep) !== -1) {
                                if (/^service\..+$/.test(dep)) {
                                    ServiceManager.startupService(dep, next);
                                } else if (/^handler\..+$/.test(dep)) {
                                    HandlerManager.startupHandler(dep, next);
                                } else next();
                            } else next();

                        },
                        (err) => { next(err); }
                    );
                }
            ],
            (err) => {
                if (err) {
                    Log.sFatal('StartupServer', 'startup failed: ' + err['stack']);
                    process.nextTick(() => {
                        process.exit(EXIT_CODE.UNHANDLED_ERROR);
                    });
                    return;
                }

                fs.writeFileSync(path.join(DH.work.rootPath, '.lastSuccessConf.yml'), yaml.safeDump(DH));
                Log.sInfo('StartupServer', 'server startup successfully');
            }
        );
    }

    public shutdown(done):void {
        //if (this.isShutdowning) return;
        //this.isShutdowning = true;

        async.waterfall([
            (next) => {
                async.eachSeries(
                    DepUtil.shutdownSort,
                    (dep, next) => {
                        if (DH.run.component.indexOf(dep) !== -1) {
                            if (/^service\..+$/.test(dep)) {
                                ServiceManager.shutdownService(dep, next);
                            } else if (/^handler\..+$/.test(dep)) {
                                HandlerManager.shutdownHandler(dep, next);
                            } else {
                                next();
                            }
                        } else next();
                    },
                    (err) => {
                        next();
                    }
                );
            },
            (next) => {
                RedisManager.disconnectAll();
                next();
            },
            (next) => {
                Time.clearAllInterval();
                next();
            },
            (next) => {
                ConsulManager.destroySession(next);
            }
        ], (err) => {
            this.isShutdowning = false;
            process.emit('cleanup');
            done(err);
        });
    }

}

export  = Server;
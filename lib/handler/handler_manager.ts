import async = require('async');
import Tcp = require('../net/tcp');
import Log = require('../util/log');
import EnterFile = require('../config/template/enter_file');

import Enum = require('../util/enum');
import DepUtil = require('../util/dependence_util');
import DepManager = require('../server/dependence_manager');
import DepConnection = require('../server/dependence_connection');
import DBManager = require('../database/database_manager');
import ServiceManager = require('../service/service_manager');
import ConsulManager = require('../consul/consul_manager');
import RedisManager = require('../redis/redis_manager');

import DH = require('../global');

import Handler = require('./handler');
import LoginHandler = require('./login/login_handler');
import GameHandler = require('./game/game_handler');

var loginHandler:LoginHandler = null;
var gameHandler:GameHandler = null;

var handlerList:Handler[] = [];
var handlers:string[] = [];
var localHandlers:{[name:string]:Handler} = {};

function createHandler(name:string):Handler {
    switch (name) {
        case 'game': return (gameHandler = new GameHandler());
        case 'login': return (loginHandler = new LoginHandler());
    }
    return null;
}

export function startupHandler(fullName:string, done) {
    async.waterfall([
        (next) => {
            var deps = DepUtil.getDependencies(fullName);
            async.eachSeries(
                deps,
                (dep, next) => {
                    DepManager.connectDependence(dep, (err, depConn) => {
                        if (err) return next(err);
                        switch (depConn.dependenceType) {
                            case Enum.DependenceType.RPC:
                                ServiceManager.registerRemoteService(dep.split('.')[1], depConn.connection);
                                break;
                            case Enum.DependenceType.MYSQL:
                                break;
                            case Enum.DependenceType.REDIS:
                                RedisManager.initConnection(depConn.connection);
                                break;
                        }
                        next();
                    });
                },
                (err) => {
                    next(err);
                }
            );
        },
        (next) => {
            DBManager.initAllDatabase(next);
        },
        (next) => {
            var shortName = fullName.split('.')[1];
            var handler = createHandler(shortName);
            localHandlers[handler.shortName] = handler;

            handler.once('error', (err, forced) => {
                if (err) {
                    Log.stackError(err, 'Service.Startup',
                        'local service ' + shortName + ' startup failed, message=' + err.message);
                    if (forced) return next(err);
                }
                next();
            });

            handler.once('ready', () => {
                Log.sInfo('Service.Startup',
                    'local service ' + shortName + ' startup successfully.');

                ConsulManager.registerService({
                    name: handler.shortName,
                    tags: [DH.fullTitle, DH.shortTitle, 'handler', DH.region.name],
                    address: DH.bind.hostname,
                    port: DH.bind.port,
                    checks: [
                        {
                            ttl: '30s'
                        }
                    ]
                }, (err, id) => {
                    ConsulManager.passNewCheck('service:' + id);
                    next(err);
                });
            });

            handler.startupHandler();
        }
    ], done);
}

export function shutdownHandler(fullName, done) {
    var shortName = fullName.split('.')[1];
    var handler = localHandlers[shortName];
    if (!handler || !handler.running) return done();

    async.waterfall([
        (next) => {
            Log.sInfo('Handler', 'handler %s is shutting down', shortName);
            handler.once('shutdown', () => {
                Log.sInfo('Handler', 'handler %s has shut down', shortName);
                next();
            });
            handler.shutdownHandler();
        },
        (next) => {
            var deps = DepUtil.getDependencies(fullName);
            async.eachSeries(
                deps,
                (dep, next) => {
                    DepManager.disconnectDependence(dep, () => {
                        next();
                    });
                },
                (err) => {
                    next(err);
                }
            );
        }
    ], (err) => {
        done(err);
    });
}

export function handler(session:Tcp.SyncSession, fqnArr:string[], message, done:(response)=>void):void {
    //if (handlers.indexOf(fqnArr[1]) === -1) return ;

    if (fqnArr[1] === 'login') {
        loginHandler.handlerMessage(session, fqnArr, message, done);
        return ;
    }
    gameHandler.handlerMessage(session, fqnArr, message, done);
}

export function updateHandler():void {
    handlerList.forEach((handler) => {
        handler.update();
    });
}
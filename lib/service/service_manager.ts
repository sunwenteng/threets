import events = require('events');
import async = require('async');
import pbstream = require('node-protobuf-stream');

import Enum = require('../util/enum');
import ERRC = require('../util/error_code');
import CE = require('../util/errors');
import Log = require('../util/log');
import DepUtil = require('../util/dependence_util');
import Time = require('../util/time');

import Tcp = require('../net/tcp');
import DepManager = require('../server/dependence_manager');
import DepConnection = require('../server/dependence_connection');
import DBManager = require('../database/database_manager');
import ConsulManager = require('../consul/consul_manager');
import RedisManager = require('../redis/redis_manager');

import DH = require('../global');

import Service = require('./service');
import ServiceUtil = require('./service_util');

import ChatService = require('./chat/chat_service');
import FriendService = require('./friend/friend_service');
import CoordinateService = require('./coordinate/coordinate_service');
import BossService = require('./boss/boss_service');
import ArenaService = require('./arena/arena_service');
import GuildService = require('./guild/guild_service');
import RoleService = require('./role/role_service');

type RemoteService = Tcp.RPCSession;
type LocalService = Service;

var serviceEvent:events.EventEmitter = new events.EventEmitter();
var remoteServices:{[name:string]:RemoteService} = {};
var localServices:{[name:string]:LocalService} = {};

function createService(name:string):Service {
    switch (name) {
        case 'chat': return new ChatService();
        case 'friend': return new FriendService();
        case 'coordinate': return new CoordinateService();
        case 'boss': return new BossService();
        case 'arena': return new ArenaService();
        case 'guild': return new GuildService();
        case 'role': return new RoleService();
        default:
            Log.sError('CreateService', 'service %s do not found', name);
    }
    return null;
}

export function registerLocalService(name:string):void {
    var service = createService(name);
    localServices[service.serviceName] = service;
}

export function registerRemoteService(serviceName, serviceSession:Tcp.RPCSession):void {
    remoteServices[serviceName] = serviceSession;
}

export function startupService(fullName:string, done) {
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
                                //ServiceManager.registerRemoteService(dep.split('.')[1], depConn.connection);
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
            var service = createService(shortName);
            localServices[service.serviceName] = service;

            service.once('error', (err, forced) => {
                if (err) {
                    Log.stackError(err, 'Service.Startup',
                        'local service ' + shortName + ' startup failed, message=' + err.message);
                    if (forced) return next(err);
                }
                next();
            });

            service.once('ready', () => {
                Log.sInfo('Service.Startup',
                    'local service ' + shortName + ' startup successfully.');

                ConsulManager.registerService({
                    name: service.serviceName,
                    tags: [DH.fullTitle, DH.shortTitle, 'service', DH.region.name],
                    address: DH.eth.address,
                    port: 6102,
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

            service.startupService(null);
        }
    ], done);

}

export function shutdownService(fullName:string, done) {
    var shortName = fullName.split('.')[1];
    var service = localServices[shortName];
    if (!service) return done();

    async.waterfall([
        (next) => {
            Log.sInfo('Service', 'service %s is shutting down', shortName);
            service.once('shutdown', () => {
                Log.sInfo('Service', 'service %s has shut down', shortName);
                next();
            });
            service.shutdownService();
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

export function startupAllLocalService(done):void {
    done();
}

export function callLocal(session, methodPath:string, request:any, done) {
    var arr = methodPath.split(':');
    var serviceName = arr[0], methodName = arr[1];
    var localService:LocalService = localServices[serviceName];
    if (localService) {
        if (!localService.running) return done(new CE.UserError(ERRC.RPC.SERVICE_NOT_RUNNING, {msg: 'SERVICE_NOT_RUNNING, ' + serviceName}));
        if (!localService[methodName]) return done(new CE.UserError(ERRC.RPC.CANNOT_FIND_METHOD, {msg: 'CANNOT_FIND_METHOD, ' + methodPath}));
        return localService[methodName](request, done, session);
    }

    return done(new CE.UserError(ERRC.RPC.CANNOT_FIND_SERVICE, {msg: 'CANNOT_FIND_SERVICE, ' + serviceName}));
}

export function callRemote(methodPath:string, request:any, done):void {
    var arr = methodPath.split(':');
    var serviceName = arr[0], methodName = arr[1];

    // remote service
    var remoteService:RemoteService = remoteServices[serviceName];
    if (remoteService) {
        var MessageType = pbstream.get(['.Rpc', serviceName, methodName, 'Request'].join('.'));
        return remoteService.sendRequest(new MessageType(request), done);
    }

    return done(new Error('CANNOT_FIND_SERVICE, ' + serviceName));
}
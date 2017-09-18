import async = require('async');
import path = require('path');
import pb = require('node-protobuf-stream');
import uuid = require('uuid');

import EnterFile = require('../config/template/enter_file');
import Time = require('../util/time');
import Tcp = require('../net/tcp');
import Log = require('../util/log');

import ServiceManager = require('../service/service_manager');
import HandlerManager = require('../handler/handler_manager');

import Config = require('../config');

var MAIN_LOOP_TIME:number = 100;

/**
 * Handler & Service Manager Class
 */
class World {

    public initWorld(mode:EnterFile.Mode, done):void {
        Config.reloadAllConfig(path.resolve(process.env.DH_CONFIG));

        async.waterfall([
            (next) => {
                mode.service.forEach((value) => {
                    ServiceManager.registerLocalService(value.split('.')[1]);
                });
                next();
            },
            (next) => {
                ServiceManager.startupAllLocalService(next);
            },
            (next) => {
                Tcp.connect({
                    port: 6102,
                    host: '127.0.0.1'
                }, (err, socket) => {
                    if (err) return next(err);
                    var session:Tcp.RPCSession = new Tcp.RPCSession();
                    session.bindSocket(socket);
                    session.on('error', (err) => {
                        Log.uError(session.sessionId, 'SessionError', 'message=' + err.message);
                        session.destroySocket();
                    });
                    session.on('close', () => {
                        //var bindData:any = session.getBindingData();
                        //if (!bindData) return ;
                        //bindData.onSessionClosed(() => {
                        //    Log.sInfo('PlayerSession', 'offline, socketUid=%d, player_session_count=%d',
                        //        session.sessionUid, 0);
                        //});
                    });
                    mode.service.forEach((value) => {
                        ServiceManager.registerRemoteService(value.split('.')[1], session);
                    });

                    var Request = pb.get('.Rpc.coordinate.register.Request');
                    ServiceManager.callRemote(
                        'coordinate:register',
                        new Request({uuid: uuid.v1()}),
                        () => {
                            next();
                        }
                    );
                });
            },
            (next) => {
                //HandlerManager.startupHandlers(mode, next);
            }
        ], done);
    }

    public startWorld():void {
        Time.pushInterval(setInterval(this.updateWorld.bind(this), MAIN_LOOP_TIME));
    }

    public updateWorld():void {
        HandlerManager.updateHandler();
    }

    public endWorld(done):void {
        Time.clearAllInterval();
        done();
    }

    public isTest():boolean {
        return true;
    }
}

export = World;
import async = require('async');

import Enum = require('../../util/enum');
import Log = require('../../util/log');
import Tcp = require('../../net/tcp');
import NetManager = require('../../server/net_manager');
import Handler = require('../handler');
import LoginCharacter = require('./login_character');
import DB = require('../../database/database_manager');

import GameDiscovery = require('./game_discovery');
import LoginSystem = require('./api/login_system');

class LoginHandler extends Handler {

    constructor() {
        super('login');
    }

    public startupHandler():void {
        this.running = true;
        this.on('shutdown', () => {
            this.running = false;
        });

        async.waterfall([
            (next) => {
                DB.Login.initTables(next);
            },
            (next) => {
                GameDiscovery.initDiscovery();
                next();
            }
        ], (err) => {
            if (err) return this.emit('error', err, true);
            try {
                NetManager.startApiListening('0.0.0.0', 6103);
            } catch (e) {
                this.emit('error', e, true);
                return ;
            }
            this.emit('ready');
        });
    }
    public shutdownHandler():void {
        this.running = false;
        async.waterfall([
            (next) => {
                GameDiscovery.endWatch();
                next();
            }
        ], (err) => {
            NetManager.stopTcpListening('0.0.0.0', 6103, () => {
                this.emit('shutdown');
            });
        });
    }
    public handlerMessage(session:Tcp.SyncSession, fqnArr:string[], message:any, done):void {
        var method = fqnArr[2];
        var Handler = LoginSystem[method];
        if (!Handler) return done(this.handlerError(session, fqnArr, message, new Error('E_NO_HANDLER')));
        try {
            Handler(session, message, (err, res) => {
                if (err) return done(this.handlerError(session, fqnArr, message, err));
                done(res);
            });
        } catch (e) {
            return done(this.handlerError(session, fqnArr, message, e));
        }

        return ;

        //var character:LoginCharacter = session.getBindingData();
        //if (!character) {
        //    // not online
        //    switch (session.getBindStatus()) {
        //        case Enum.BindStatus.NOT_BIND:
        //            if (fqn === 'Api.login.auth.Request') {
        //                session.setBindStatus(Enum.BindStatus.IS_BINDING);
        //                LoginSystem.auth(session, message, (err, res) => {
        //                    if (err) {
        //                        session.setBindStatus(Enum.BindStatus.NOT_BIND);
        //                        return done(this.handlerError(session, message, err));
        //                    }
        //                    session.setBindStatus(Enum.BindStatus.HAS_BOUND);
        //                    done(res);
        //                });
        //            } else {
        //                return done(this.handlerError(session, message, new Error('')));
        //            }
        //            break;
        //        case Enum.BindStatus.IS_BINDING:
        //            return done(this.handlerError(session, message, new Error('OTHER_IS_BINDING')));
        //        case Enum.BindStatus.HAS_BOUND:
        //            Log.uError(session.sessionId, 'DataBinding', 'session.status is bound, but no binding data');
        //            return done(this.handlerError(session, message, new Error('HAS_BIND')));
        //        case Enum.BindStatus.UNBOUND:
        //            // need ?
        //            break;
        //        default:
        //            break;
        //    }
        //    return ;
        //}
        //
        //if (character instanceof LoginCharacter) {
        //    var method = fqnArr[2];
        //    var Handler = LoginSystem[method];
        //    if (!Handler) return done(this.handlerError(session, message, new Error('E_NO_HANDLER')));
        //    try {
        //        Handler(character, message, done);
        //    } catch (e) {
        //        return done(this.handlerError(session, message, e));
        //    }
        //    return ;
        //}
    }
}

export = LoginHandler;
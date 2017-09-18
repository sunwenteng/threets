
import Log = require('../util/log');
import Tcp = require('../net/tcp');

import ErrorMsg = require('../util/error_msg');
import CE = require('../util/errors');

import ServiceManager = require('../service/service_manager');
import HandlerManager = require('../handler/handler_manager');

class TcpStruct {
    count:number = 0;
    tcpServer:Tcp.Server = new Tcp.Server();
}

var tcpServers:{[hostPort:string]:TcpStruct} = {};

export function startRpcListening(host, port) {
    var name = host + ':' + port;

    var stc = tcpServers[name];
    if (!stc) {
        stc = tcpServers[name] = new TcpStruct();
        stc.count++;
        var listener:Tcp.Server = stc.tcpServer;
        listener.start(host, port,
            (socket:Tcp.Socket) => {
                var session:Tcp.RPCSession = new Tcp.RPCSession();
                session.bindSocket(socket);

                session.setHandler((fqn:string, message:any, done:(res?)=>void) => {
                    var names = fqn.split('.');
                    if (names[1] !== 'Rpc') {
                        session.destroySocket();
                        return ;
                    }
                    // TODO handler error
                    ServiceManager.callLocal(session, [names[2], names[3]].join(':'), message, (error, res) => {
                        if (error) {
                            var e = ErrorMsg.handlerError(error);

                            if (error instanceof CE.UserError) {
                                Log.userError(error, session.sessionId, 'HandlePacket', fqn + ', errorId=' + error.errorId +
                                    ', message=' + (error.message || 'NoMsg'));
                            } else {
                                Log.userError(error, session.sessionId, 'HandlePacket', fqn + ', errorId=' + e.code +
                                    ', message=' + (error.message || 'NoMsg'));
                            }
                            return done({error: e});
                        }

                        done(res);
                    });
                });

                Log.uDebug(session.sessionId, 'SessionInitial', 'World.addRPCSession, sessionUid=' + session.sessionUid);
            }
        );
    } else {
        stc.count++;
    }
}

export function stopTcpListening(host, port, done) {
    var name = host + ':' + port;
    var stc = tcpServers[name];
    if (!stc) return done();

    stc.count--;
    if (!stc.count) {
        stc.tcpServer.close((err) => {
            delete tcpServers[name];
            done(err);
        });
    } else {
        done();
    }
}

export function startApiListening(host, port) {
    var name = host + ':' + port;
    var stc = tcpServers[name];
    if (!stc) {
        stc = tcpServers[name] = new TcpStruct();
        stc.count++;
        var listener:Tcp.Server = stc.tcpServer;
        listener.start(host, port,
            (socket:Tcp.Socket) => {
                var session:Tcp.SyncSession = new Tcp.SyncSession();
                session.bindSocket(socket);
                session.on('error', (err) => {
                    Log.uError(session.sessionId, 'SessionError', 'message=' + err.message);
                    session.destroySocket();
                });
                session.on('close', () => {
                    var bindData:any = session.getBindingData();
                    if (!bindData) return ;
                    bindData.onSessionClosed(() => {
                        Log.sInfo('PlayerSession', 'offline, socketUid=%d, player_session_count=%d',
                            session.sessionUid, 0);
                    });
                });
                session.setHandler((fqn:string, message:any, done:(res?)=>void) => {
                    var names = fqn.split('.').slice(1);
                    if (names[0] !== 'Api') {
                        session.destroySocket();
                        return ;
                    }

                    HandlerManager.handler(session, names, message, (response) => {
                        done(response ? response : {});
                    });
                });

                Log.uDebug(session.sessionId, 'SessionInitial', 'World.addRPCSession, sessionUid=' + session.sessionUid);
            }
        );
    } else {
        stc.count++;
    }
}
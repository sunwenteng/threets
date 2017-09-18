import events = require('events');

import Tcp = require('../net/tcp');
import Log = require('../util/log');
import ErrorMsg = require('../util/error_msg');
import CE = require('../util/errors');


class Handler extends events.EventEmitter {

    shortName:string = '';
    running:boolean = false;

    constructor(name:string) {
        super();
        this.shortName = name;
    }

    public startupHandler():void {

    }

    public shutdownHandler():void {

    }

    public update() {

    }

    public handlerMessage(session:Tcp.SyncSession, fqnArr:string[], message:any, done:(res?)=>void):void {

    }

    protected handlerError(session:Tcp.SyncSession, fqn, message:any, error:any):any {
        var e = ErrorMsg.handlerError(error);

        if (error instanceof CE.UserError) {
            Log.userError(error, session.sessionId, 'HandlePacket', '<' + fqn.join(':') + '>: errorId=' + error.errorId +
                ', message=' + (error.message || 'NoMsg'));
        } else if (error['stack']) {
            Log.userError(error, session.sessionId, 'HandlePacket', '<' + fqn.join(':') + '>: errorId=' + e.code +
                ', message=' + (error.message || 'NoMsg'));
        } else {
            Log.uError(session.sessionId, 'HandlePacket', '<' + fqn.join(':') + '>: errorId=' + e.code +
                ', message=' + (error.message || 'NoMsg'));
        }

        return {error: e};
    }

}

export = Handler;
import net      = require('net');
import events   = require('events');
import pbstream = require('node-protobuf-stream');

import Log = require('../util/log');
import Enum = require('../util/enum');
import Util = require('../util/game_util');

export class Address {
    address:string = '';
    port:number = 0;
    family:string = '';
}

export class HostPort {
    hostname: string = '0.0.0.0';
    port: number = 0;
    constructor(address?:string) {
        if (address) {
            this.setAddress(address);
        }
    }
    setAddress(address:string) {
        var match = address.match(/(.*):(\d+)$/);
        if (match) {
            this.hostname = match[1];
            this.port = parseInt(match[2]);
        }
    }
    toString():string {
        return this.hostname + ':' + this.port;
    }
}


/****************************************
 *                                      *
 *   Socket module                      *
 *                                      *
 ****************************************/

var maxSocketUid:number = 0;
function genNextSocketUid():number {
    return ++maxSocketUid;
}

export class Socket extends events.EventEmitter {
    socket:net.Socket = null;
    socketUid:number = 0;
    serializer:pbstream.Serializer = null;
    parser:pbstream.Parser = null;
    session:SyncSession = null;
    isAlive:boolean = false;

    constructor(socket:net.Socket) {
        super();
        var self = this;
        self.isAlive = true;
        self.socket = socket;
        self.socketUid = genNextSocketUid();
        self.serializer = new pbstream.Serializer();
        self.parser = new pbstream.Parser();

        /****************************************
         * # emitter.removeAllListeners([eventName])
         * Note that it is bad practice to remove listeners added elsewhere in the code,
         * particularly when the EventEmitter instance was created by some other component or module (e.g. sockets or file streams).
         *
         * @xienanjie 16-5-3
         ****************************************/
        //socket.removeAllListeners();  // don't use removeAllListeners
        self.serializer.pipe(socket);
        socket.pipe(self.parser);

        /****************************************
         * serializer event
         ****************************************/

        self.serializer.on('error', (error) => {
            self.emit('error', error);
        });

        /****************************************
         * parser event
         ****************************************/

        self.parser.on('data', (message) => {
            self.emit('data', message);
        });

        self.parser.on('error', (err) => {
            self.emit('error', err);
        });

        /****************************************
         * socket event
         ****************************************/

        /**
         * Event: 'end'
         *  Emitted when the other end of the socket sends a FIN packet.
         *
         *  By default (allowHalfOpen == false) the socket will destroy its file descriptor once it has written out its
         * pending write queue.
         *  However, by setting allowHalfOpen == true the socket will not automatically end() its side allowing the user
         * to write arbitrary amounts of data, with the caveat that the user is required to end() their side now.
         */
        socket.on('end', () => {
            Log.sDebug('Tcp.Socket', 'socket end, socketUid=' + this.socketUid);
            self.emit('end');
        });

        /**
         * Event: 'timeout'
         *
         *  Emitted if the socket times out from inactivity. This is only to notify that the socket has been idle.
         *  The user must manually close the connection.
         *
         *  See also: socket.setTimeout()
         */
        socket.on('timeout', () => {
            Log.sDebug('Tcp.Socket', 'socket timeout, socketUid=' + this.socketUid);
            self.emit('timeout');
        });

        /**
         * Event: 'error'
         *     - Error object
         *  Emitted when an error occurs. The 'close' event will be called directly following this event.
         */
        socket.on('error', (err) => {
            if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
                Log.sError('Socket', 'Socket is forced to close by remote socket, uid=' + self.socketUid +
                    ', session_info=' + self._sessionInfo());
                return ;
            }
            else {
                Log.sError('Socket', 'Socket Error: code=' + err.code + ', uid=' + self.socketUid +
                    ', session_info=' + self._sessionInfo() +
                    ', stack=' + err.stack);
            }

            self.emit('error', err);
        });

        /**
         * Event: 'close'
         *      - had_error Boolean true if the socket had a transmission error.
         *
         *  Emitted once the socket is fully closed. The argument had_error is a boolean which says if the socket was
         *  closed due to a transmission error.
         */
        socket.on('close', (had_error:boolean) => {
            self.isAlive = false;
            self.emit('close', had_error);
        });

    }

    public setTimeout(second:number):void {
        this.socket.setTimeout(second * 1000);
    }

    public sendProtoMessage(protoMsg:any):void {
        this.serializer.write(protoMsg);
    }

    public end(protoMsg?:any):void {
        this.serializer.end(protoMsg);
    }

    public destroy():void {
        this.socket.destroy();
    }

    public _bindSession(session:SyncSession):void {
        this.session = session;
    }

    public _sessionInfo():string {
        return this.session ? this.session.logDescription() : 'no session info';
    }

    public remoteAddress():Address {
        var address:Address = new Address();
        address.address = this.socket.remoteAddress;
        address.family = this.socket.remoteFamily;
        address.port = this.socket.remotePort;
        return address;
    }
}


/****************************************
 *                                      *
 *   Session module                     *
 *                                      *
 ****************************************/

var maxSessionUid:number = 0;
function genNextSessionUid():number {
    return ++maxSessionUid;
}

export interface WorkHandler {
    (fqn:string, message:any, done:(res?)=>void):void;
}

export class Session extends events.EventEmitter {
    public sessionUid:number = 0;
    public sessionId:number = 0;
    public address:Address = null;
    public socket:Socket = null;
    public requestHandler:WorkHandler = null;

    protected bindingData:any = null;
    protected bindStatus:Enum.BindStatus = Enum.BindStatus.NOT_BIND;

    constructor() {
        super();
        this.sessionUid = genNextSessionUid();
    }

    public setHandler(handler:WorkHandler):void {
        this.requestHandler = handler;
    }

    public bindSocket(socket:Socket):void {
        this.socket = socket;
        this.address = socket.remoteAddress();

        socket.on('close', (had_error:boolean) => {
            Log.uWarn(this.sessionId, 'Tcp.Session', 'session close, had_error=' + had_error);
            this.emit('close', had_error);
        });

        socket.on('error', (error) => {
            this.emit('error', error);
        });

        socket.on('timeout', () => {
            Log.uWarn(this.sessionId, 'Tcp.Session', 'session timeout, manually close the connection');
            socket.end();
        });
    }

    public closeSocket(message?):void {
        if (message) {
            var content = JSON.stringify(message);
            Log.uWarn(this.sessionId, 'CloseSocket', 'sessionUid=%d, name=%s, content=%s',
                this.sessionUid, message.$type.fqn(), content.length > 200 ? content.substring(0, 200) + ' ...' : content);
        } else {
            Log.uWarn(this.sessionId, 'CloseSocket', 'sessionUid=%d, session close with no message', this.sessionUid);
        }

        this.socket.end(message);
    }

    public destroySocket():void {
        this.socket.destroy();
    }

    public setBindingData(value:any):void {
        this.bindingData = value;
    }

    public getBindingData():any {
        return this.bindingData;
    }

    public unbindData():void {
        this.bindingData = null;
    }

    public setBindStatus(status:Enum.BindStatus):void {
        this.bindStatus = status;
    }

    public getBindStatus():Enum.BindStatus {
        return this.bindStatus;
    }


    public logDescription():string {
        return "Tcp.Session";
    }

    public emitSessionClosed():void {
        this.emit('session:closed');
    }

    public sendProtoMessage(protoMsg:any) {
        if (this.socket.isAlive) {
            var content = JSON.stringify(protoMsg.toRaw());
            Log.uDebug(this.sessionId, 'NetPacket', 'netMsg, name=%s, content=%s',
                protoMsg.$type.fqn(), content.length > 200 ? content.substring(0, 200) + ' ...' : content);

            this.socket.sendProtoMessage(protoMsg);
        }
    }
}

export interface BindingData {
    onSessionClosed(done):void;
}

function getMessageName(message:any):string {
    var fqn = message.$type.fqn();
    return '<' + fqn.split('.').slice(1).join(':') + '>';
}

export class SyncSession extends Session {

    private messageQueue:ProtoBuf.Message[] = [];
    private working:any = null;

    constructor() {
        super();
    }

    public bindSocket(socket:Socket):void {
        super.bindSocket(socket);
        Log.uDebug(0, 'Tcp.Session.BindSocket', 'sessionUid=' + this.sessionUid + ', socketUid=' + socket.socketUid);

        socket.setTimeout(10 * 60);

        this.initData();
        socket.on('data', (message:any) => {
            if (this.messageQueue.length > 60 || !this.socket.isAlive)
                return ;

            this.messageQueue.push(message);
            if (!this.working) {
                this.work();
            }
        });

        socket.on('close', () => {
            this.initData();
        });
    }

    public logDescription():string {
        return "Tcp.ServerSession";
    }

    private work():void {
        if (this.messageQueue.length === 0) return ;
        if (this.messageQueue.length > 50) {
            Log.uError(this.sessionId, 'Tcp.Session',
                "There's too many message in MessageQueue, length=" + this.messageQueue.length);

            this.initData();
            this.closeSocket();
            return ;
        }

        this.working = this.messageQueue.shift();

        /****************************************
         * need handler error in workHandler
         * @xienanjie 16-4-21
         ****************************************/
        var requestName = this.working.$type.fqn();
        var raw = this.working.toRaw();

        Log.uInfo(this.sessionId, 'HandlePacket', getMessageName(this.working) + ':' + JSON.stringify(raw));

        this.requestHandler(requestName, raw, (res) => {
            if (res) {
                var responseName = Util.getResponseName(requestName);
                if (responseName) {
                    var MessageType = pbstream.get(responseName);
                    if (MessageType) {
                        var content = JSON.stringify(res);
                        var response = new MessageType(res);
                        Log.uInfo(this.sessionId, 'HandlePacket',
                            getMessageName(response) + ':' + (content.length > 200 ? content.substring(0, 200) + ' ...' : content));

                        this.socket.sendProtoMessage(response);
                    }
                }
            }
            this.working = null;
            this.work();
        });
    }

    private initData():void {
        this.messageQueue = [];
        this.working = null;
    }
}

/****************************************
 *                                      *
 *   RPC Session module                 *
 *                                      *
 ****************************************/


export class RPCSession extends Session {

    rpcUid:number = 0;
    callbackStore:{[uid:number]:(err, response?)=>void} = {};

    constructor() {
        super();
    }

    public bindSocket(socket:Socket):void {
        super.bindSocket(socket);
        Log.uDebug(this.sessionId, 'Tcp.Session.BindSocket', 'sessionUid=' + this.sessionUid + ', socketUid=' + socket.socketUid);

        this.rpcUid = 0;
        this.callbackStore = {};

        socket.on('data', (message:any) => {
            var messageName = message.$type.fqn();
            var RequestType, ResponseType, Response;
            switch (messageName) {

                case '.Rpc.Request':
                    Response = pbstream.get('.Rpc.Response');
                    RequestType = pbstream.get(message.name);
                    var request = RequestType.decode(message.data);

                    Log.uInfo(this.sessionId, 'HandleRPC', getMessageName(request) + ':' + JSON.stringify(request));

                    var requestName = request.$type.fqn();
                    this.requestHandler(requestName, request.toRaw(), (res) => {
                        var responseName = Util.getResponseName(requestName);
                        if (responseName) {
                            ResponseType = pbstream.get(responseName);
                            if (ResponseType) {
                                var response = new ResponseType(res);

                                var content = JSON.stringify(response);
                                Log.uInfo(this.sessionId, 'HandleRPC',
                                    getMessageName(response) + ':' + (content.length > 200 ? content.substring(0, 200) + ' ...' : content));

                                this.socket.sendProtoMessage(new Response({
                                    id: message.id,
                                    name: response.$type.fqn(),
                                    data: response.encode().toBuffer()
                                }));
                            }
                        }
                    });
                    break;

                case '.Rpc.Response':
                    var callback = this.callbackStore[message.id];
                    try {
                        if (callback) {
                            ResponseType = pbstream.get(message.name);
                            var response = ResponseType.decode(message.data);
                            callback(null, response.toRaw());
                        }
                    } catch (e) {
                        if (callback) callback(e);
                    }

                    delete this.callbackStore[message.id];
                    break;

                default:
                    return ;
            }

        });

        socket.on('close', (had_error) => {
            Object.keys(this.callbackStore).forEach((key) => {
                this.callbackStore[key](new Error('SocketClosed'));
            });
            this.callbackStore = {};
        });
    }

    public sendRequest(request, callback:(err, response?)=>void):void {
        try {
            var Request = pbstream.get('.Rpc.Request');

            var message = new Request({
                id: this.genRPCUid(),
                name: request.$type.fqn(),
                data: request.encode().toBuffer()
            });

            this.socket.sendProtoMessage(message);

            this.callbackStore[message.id] = callback;
        } catch (e) {
            return callback(e);
        }
    }

    public logDescription():string {
        return "Tcp.RPCSession";
    }

    private genRPCUid():number {
        return ++this.rpcUid;
    }

}


/****************************************
 *                                      *
 *   Server module                      *
 *                                      *
 ****************************************/

export class Server {
    server:net.Server = null;
    newSocketFn:(socket:Socket)=>void = null;
    connectionCount:number = 0;
    maxSocketUid:number = 0;
    listenAddress:Address = null;
    socketStores:{[socketUid:number]:Socket} = {};

    constructor() {
    }

    public start(host:string, port:number, newSocketFn:(socket:Socket)=>void):void {
        this.initialize(newSocketFn);
        this.server.listen(port);
    }

    public close(done:(error?)=>void):void {

        /****************************************
         * server.close([callback])#
         *
         * Stops the server from accepting new connections and keeps existing connections.
         *
         * This function is asynchronous, the server is finally closed when all connections are ended and the server
         *  emits a 'close' event.
         *
         * The optional callback will be called once the 'close' event occurs.
         *
         * Unlike that event, it will be called with an Error as its only argument if the server was not open when
         *  it was closed.
         *
         * @xienanjie 16-4-27
         ****************************************/

        this.server.close(done);

        Object.keys(this.socketStores).forEach((key) => {
            if (this.socketStores[key]) {
                this.socketStores[key].destroy();
            }
        });
    }

    private initialize(newSocketFn:(socket:Socket)=>void):void {
        this.newSocketFn = newSocketFn;

        this.server = net.createServer();

        this.server.on('listening', () => {
            this.listenAddress = this.server.address();

            Log.sInfo('Tcp.Server', 'Server is listening on ' + this.listenAddress.address + ':' + this.listenAddress.port);
        });

        this.server.on('error', (err) => {
            Log.sError('Tcp.Server', 'Server Error: ' + err.message + '\nStack: ' + err.stack);
        });

        this.server.on('close', () => {
            Log.sInfo('Tcp.Server', 'Server closed on ' + this.listenAddress.address + ':' + this.listenAddress.port);
        });

        this.server.on('connection', (socket:net.Socket) => {
            var socketUid = this.genNextSocketUid();
            var tcpSocket = new Socket(socket);
            var address = tcpSocket.remoteAddress();
            ++this.connectionCount;
            this.socketStores[tcpSocket.socketUid] = tcpSocket;

            Log.sTrace('Tcp.Server', 'New Connection From ' + address.address + ':' + address.port + ' [' + address.family + ']');

            tcpSocket.on('close', (had_error:boolean) => {
                --this.connectionCount;
                delete this.socketStores[socketUid];
            });

            this.newSocketFn(tcpSocket);
        });
    }

    private genNextSocketUid():number {
        return ++this.maxSocketUid;
    }


}


/****************************************
 *                                      *
 *   Client module                      *
 *                                      *
 ****************************************/

export interface ConnectOptions {
    host:string;
    port:number;
    initMessage?:any;
    reconnect?:number;
}

/**
 * connect remote
 *      which support reconnect and send initMessage immediately after connected
 *
 * @param {ConnectOptions} options
 * @param callback
 */
export function connect(options:ConnectOptions, callback:(err, socket:Socket)=>void):void {
    var socket = net.connect(options.port, options.host);
    socket.on('connect', () => {
        var tcpSocket = new Socket(socket);
        if (options.initMessage) {
            tcpSocket.sendProtoMessage(options.initMessage);
        }
        callback(null, tcpSocket);
    });

    socket.on('error', (error) => {
        if (error.code === 'ECONNREFUSED' && options.reconnect) {
            setTimeout(() => {
                socket.connect(options.port, options.host);
            }, options.reconnect);
            Log.sError('Tcp.Client', 'reconnect remote ' + options.host + ':' + options.port +
                ' after ' + options.reconnect + ' millisecond');
            return ;
        }
        Log.sError('Tcp.Client', 'Connect Error: code=' + error.code + ', message=' + error.message);
        callback(error, null);
    });
}

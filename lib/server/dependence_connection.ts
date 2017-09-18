import events = require('events');
import redis = require('redis');

import Log = require('../util/log');
import Tcp = require('../net/tcp');
import Enum = require('../util/enum');
import MysqlConnection = require('../database/mysql_connection');

/**
 * events
 *      - connect  ()
 *      - error  (error)
 *      - close  (isQuit)
 */
class DependenceConnection extends events.EventEmitter {
    dependenceName:string = '';
    dependenceType:Enum.DependenceType = Enum.DependenceType.NULL;
    connection:any = null;
    connectOptions:any = null;

    remoteAddress:Tcp.HostPort = null;

    constructor(name:string) {
        super();
        this.dependenceName = name;
        switch (this.dependenceName.split('.')[0]) {
            case 'mysql': this.dependenceType = Enum.DependenceType.MYSQL; break;
            case 'redis': this.dependenceType = Enum.DependenceType.REDIS; break;
            case 'service': this.dependenceType = Enum.DependenceType.RPC; break;
        }
    }

    name():string {
        return this.remoteAddress ? this.remoteAddress.toString() : '';
    }

    connect(options):void {
        var con;
        switch (this.dependenceType) {
            case Enum.DependenceType.MYSQL:
                con = this.connection = new MysqlConnection();
                con.startDb(options, (err) => {
                    if (err) this.emit('error', err);
                    else this.emit('connect');
                });
                break;
            case Enum.DependenceType.REDIS:
                con = this.connection = redis.createClient(options);
                con.on('error', (err) => { this.emit('error', err); });
                con.on('end', () => { this.emit('close'); });
                con.on('ready', (err) => {
                    if (err) return this.emit('error', err);
                    Log.sInfo('Redis', 'redis connection ' + this.dependenceName + ' connect, ip=' + options.host);

                    this.emit('connect');
                });
                break;
            case Enum.DependenceType.RPC:
                Tcp.connect(
                    options,
                    (err, socket) => {
                        if (err) return this.emit('error', err);
                        var session:Tcp.RPCSession = new Tcp.RPCSession();
                        session.bindSocket(socket);
                        session.on('error', (err) => {
                            Log.uError(session.sessionId, 'SessionError', 'message=' + err.message);
                            this.emit('error', err);
                        });
                        session.on('close', () => {
                            this.emit('close');
                        });
                        this.connection = session;
                        this.emit('connect');
                    }
                );
                break;
        }
        this.connectOptions = options;
        this.remoteAddress = new Tcp.HostPort(options.host + ':' + options.port);
    }

    disconnect(done):void {
        switch (this.dependenceType) {
            case Enum.DependenceType.MYSQL:
                this.connection.closeDb((err) => {
                    if (err) Log.sError('Dependence', 'close ' + this.dependenceName + ' occurs error, ' + err.message);
                    else Log.sInfo('Dependence', 'close %s successfully', this.dependenceName);
                    done();
                });
                break;
            case Enum.DependenceType.REDIS:
                this.connection.quit();
                Log.sInfo('Dependence', 'close %s successfully', this.dependenceName);
                done();
                break;
            case Enum.DependenceType.RPC:
                this.connection.closeSocket();
                Log.sInfo('Dependence', 'close %s successfully', this.dependenceName);
                done();
                break;
        }
    }
}

export = DependenceConnection;
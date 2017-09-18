import events = require('events');

import NetManager = require('../server/net_manager');

/**
 * event:
 *  - ready
 *  - error
 *  - close
 */
class Service extends events.EventEmitter {
    serviceName: string;
    running: boolean;

    constructor(name:string) {
        super();
        this.serviceName = name;
    }

    public startupService(param:any): void {
        // register service info on redis
        try {
            NetManager.startRpcListening('0.0.0.0', 6102);
        } catch (e) {
            this.emit('error', true);
            return ;
        }

        this.running = true;
        this.on('close', () => {
            this.running = false;
        });
        this.emit('ready');
    }
    public shutdownService():void {
        this.running = false;
        NetManager.stopTcpListening('0.0.0.0', 6102, () => {
            this.emit('shutdown');
        });
    }

    public updateService():void {
    }
}

export = Service;
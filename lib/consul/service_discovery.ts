import events = require('events');

import Log = require('../util/log');
import DH = require('../global');
import ConsulManager = require('./consul_manager');

class ServiceDiscovery extends events.EventEmitter {
    serviceName:string = '';
    watch = null;
    lastServiceModifyIndex:number = 0;

    constructor(name:string) {
        super();
        this.serviceName = name;
    }

    startDiscovery() {
        if (DH.run.mode === 'dev') {
            this.emit('discovery', { Address: 'localhost', Port: 6102 });
            return ;
        }

        var watch = ConsulManager.watchService(this.serviceName);
        this.watch = watch;
        watch.on('change', (data, res) => {
            if (data.length === 0) return ; // 继续监听

            var node = data[0];
            var status = '';

            node.Checks.forEach((check:any) => {
                if (check.ServiceName === this.serviceName) {
                    status = check.Status;
                }
            });

            if (status !== 'passing') return ;

            var service = node.Service;

            if (this.lastServiceModifyIndex < service.ModifyIndex) {
                this.lastServiceModifyIndex = service.ModifyIndex;
                this.emit('discovery', service);
            }
        });
        watch.on('error', (err) => {
            this.emit('error', err);
        });
    }

    stopDiscovery() {
        if (this.watch) {
            this.watch.end();
            this.watch = null;
        }
    }
}

export = ServiceDiscovery;
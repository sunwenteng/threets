import consul = require('consul');

import Log = require('../../util/log');

import DH = require('../../global');
import ConsulManager = require('../../consul/consul_manager');

var watch:consul.Watch;


class FrontEnd {
    serviceID:string = '';
    address:string = '';
    port:number = 0;
}

var availableEnd:FrontEnd = null;

export function initDiscovery() {
    if (DH.run.mode === 'dev') {
        availableEnd = new FrontEnd();
        availableEnd.serviceID = 'dev';
        availableEnd.address = DH.bind.hostname;
        availableEnd.port = DH.bind.port;
        return ;
    }

    var name = DH.region.name + ':game';
    var options:any = {
        service: name,
        tag: [DH.shortTitle, DH.region.name]
    };

    var cli = ConsulManager.getConsul();
    watch = cli.watch({
        method : cli.health.service,
        options: options
    });

    watch.on('change', (data, res) => {
        data.forEach((node:any) => {
            var valid = node.Checks.some((ch:any) => {
                return ch.ServiceName == name && ch.Status == 'passing';
            });
            if (valid) {
                if (!availableEnd) availableEnd = new FrontEnd();
                var service:any = node.Service;
                availableEnd.serviceID = service.ID;
                availableEnd.address = service.Address;
                availableEnd.port = service.Port;
            }
        });
    });

    watch.on('error', (err) => {
        Log.sError('GameDiscovery', 'watch error occurs: ' + err.message);
    });
}

export function endWatch() {
    if (watch) watch.end();
}

export function getAvailableFrontEnd():FrontEnd {
    return availableEnd;
}
import Enum = require('../util/enum');
import Log = require('../util/log');
import DH = require('../global');

import ServiceDiscovery = require('../consul/service_discovery');
import DepConn = require('./dependence_connection');

class DepStruct {
    count:number = 0;
    depConn:DepConn = null;
    constructor(name:string) {
        this.depConn = new DepConn(name);
    }
}

var depConns:{[depName:string]:DepStruct} = {};

export function connectDependence(depName:string, done:(err, dep:DepConn)=>void) {
    if (depConns[depName]) {
        depConns[depName].count++;
        return done(null, depConns[depName].depConn);
    }

    var dep = depConns[depName] = new DepStruct(depName);
    dep.count++;
    var depConn = dep.depConn;

    depConn.once('connect', () => {
        depConn.removeAllListeners('error');
        done(null, depConn);
    });

    depConn.once('error', (err) => {
        done(err, depConn);
    });

    var tmp = [];
    switch (depConn.dependenceType) {
        case Enum.DependenceType.MYSQL:
            tmp = process.env.DH_MYSQL.split(':');
            depConn.connect({
                name: depConn.dependenceName,
                host: tmp[0],
                port: parseInt(tmp[1]),
                user: tmp[2],
                password: tmp[3],
                database: tmp[4]
            });
            break;
        case Enum.DependenceType.REDIS:
            tmp = process.env.DH_REDIS.split(':');
            depConn.connect({
                host: tmp[0],
                port: parseInt(tmp[1]),
                detect_buffers: true
            });
            break;
        case Enum.DependenceType.RPC:
            var discovery = new ServiceDiscovery(DH.region.name + ':' + depConn.dependenceName.split('.')[1]);
            discovery.on('discovery', (service) => {
                Log.sDebug('ServiceDiscovery', 'find service ' + JSON.stringify(service));
                discovery.stopDiscovery();

                depConn.connect({
                    host: service.Address,
                    port: service.Port
                });
            });

            discovery.on('error', (err) => {
                Log.sError('ServiceDiscovery', 'service Error: ' + err.message);
                depConn.emit('error', err);
            });

            discovery.startDiscovery();
            break;
    }
}

export function disconnectDependence(depName:string, done) {
    var dep = depConns[depName];
    if (!dep || !dep.count) return done();

    dep.count--;
    if (!dep.count)
        dep.depConn.disconnect(done);
    else
        done();
}

export function getDependence(depName:string):DepConn {
    return depConns[depName] ? depConns[depName].depConn : null;
}
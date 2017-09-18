import events = require('events');


export class Dependence extends events.EventEmitter {
    name:string = '';
    connect(done) {}
    disconnect(done) {}
}

export class ServiceDependence extends Dependence {
    connect(done) {}
    disconnect(done) {}
}
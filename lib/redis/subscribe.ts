import redis = require('redis');
import pb = require('node-protobuf-stream');

import RedisConnection = require('./redis_connection');

class Subscribe extends RedisConnection {
    constructor() {
        super('redis.world');
    }
    public onMessage(on):void {
        this.conn.on('message', (channel, buffer) => {
            console.log('sub: ' + JSON.stringify(buffer));
            var message = pb.Parser.unwrapBuffer(buffer.slice(2));
            on(channel, message.$type.fqn(), message);
        });
    }
    public subscribe(channel):void {
        this.conn.subscribe(channel);
    }
}
export = Subscribe;
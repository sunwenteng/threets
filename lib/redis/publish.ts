import redis = require('redis');
import pb = require('node-protobuf-stream');

import RedisConnection = require('./redis_connection');

class Publish extends RedisConnection {
    constructor() {
        super('redis.world');
    }
    public publish(channel, message) {
        this.conn.publish(channel, message);
    }
    public publishWorld(message) {
        var buffer = pb.Serializer.wrapMessage(message);
        console.log('pub: ' + JSON.stringify(buffer));
        this.conn.publish('world', buffer);
    }
}
export = Publish;
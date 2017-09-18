import redis = require('redis');
import uuid = require('uuid');

import Role = require('../handler/game/role');

import RedisConnection = require('./redis_connection');

function setnx(conn, lockname, identifier, left, done) {
    conn.setnx(lockname, identifier, (err, res) => {
        if (err) return done(err);
        if (res) {
            conn.expire(lockname, 10);  // 过期时间为10s
            return done(null, identifier, lockname);
        }
        if (left === 1) return done(null, null);    // 最终未获取锁

        setTimeout(() => {
            setnx(conn, lockname, identifier, done, left - 1);
        }, 500);
    });
}

class RoleCache extends RedisConnection {
    constructor() {
        super('redis.world');
    }

    public acquireLock(key:string, done, tryCount = 1):void {
        var lockname = 'lock:' + key;
        var identifier = uuid.v1();
        setnx(this.conn, lockname, identifier, tryCount, done);
    }

    public releaseLock(key, identifier):void {
        var lockname = 'lock:' + key;
        this.conn.ttl(lockname, (err, left) => {
            if (err) return;
            if (left >= 1) {
                this.conn.get(lockname, (err, val) => {
                    if (err) return ;
                    if (val === identifier) this.conn.del(lockname);
                });
            }
        });
    }

}

export = RoleCache;
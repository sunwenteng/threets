import redis = require('redis');
import async = require('async');

import Log = require('../util/log');
import EnterFile = require('../config/template/enter_file');

import Redis = require('./redis_connection');
import Publish = require('./publish');
import Subscribe = require('./subscribe');
import RoleCache = require('./role_cache');

export var pub:Publish = new Publish();
export var sub:Subscribe = new Subscribe();
export var role:RoleCache = new RoleCache();

var redisInstances:Redis[] = [];

export function initConnection(conn:redis.RedisClient) {
    role.setConnection(conn);
    sub.setConnection(conn['duplicate']({
        detect_buffers: false,
        return_buffers: true
    }));
    pub.setConnection(conn['duplicate']({
        detect_buffers: false,
        return_buffers: true
    }));
}

export function disconnectAll() {
    role.quit();
    sub.quit();
    pub.quit();

    Log.sInfo('Redis', 'disconnected all redis connection');

}

//export function connectAllRedis(redisList:EnterFile.RedisList, done):void {
//    redisInstances.push(pub, sub, role);
//
//    async.eachSeries(
//        redisInstances,
//        (ri, next) => {
//
//            var conn:redis.RedisClient = null;
//
//            for (var i = 0; i < redisList.length; i++) {
//                if (redisList[i].name === ri.useName) {
//                    var rs = redisList[i];
//                    conn = redis.createClient(rs.port, rs.hostname, {
//                        //auth_pass: 'root',
//                        detect_buffers: true
//                    });
//                    break;
//                }
//            }
//
//            if (!conn) {
//                return next(new Error('Redis Connection not found, ' + ri.useName));
//            }
//
//            conn.once('error', (err) => {
//                next(err);
//            });
//
//            conn.once('ready', (err) => {
//                if (err) return next(err);
//                //conn.auth();
//                ri.setConnection(conn);
//                next();
//            });
//        },
//        (err) => {
//            done(err);
//        }
//    );
//}
//
//export function disconnectAllRedis(done):void {
//    async.each(
//        redisInstances,
//        (ri, next) => {
//            ri.quit();
//            Log.sInfo('Redis', 'disconnected [%s]', ri.useName);
//            next();
//        },
//        (err) => {
//            done(err);
//        }
//    );
//}
import redis = require('redis');
import RBase = require('./builtin/base');
import Log = require('../util/log');
import util = require('util');

export enum STATUS {
    NOT_READY   = 0,
    CONNECTING  = 1,
    ESTABLISHED = 2,
    SYNCHRONOUS = 3
}

export var client:redis.RedisClient = null;
export var status:STATUS = STATUS.NOT_READY;

export function initRedis(port, host, cb:(err) => void) {
    //redis.debug_mode = true;
    status = STATUS.NOT_READY;

    client = redis.createClient(port, host, {
        //auth_pass: 'root'
        detect_buffers: true
    });
    status = STATUS.CONNECTING;

    client.on('error', (err) => {
        Log.sError('Redis', "Redis Error [on error]: " + err.stack);
    });

    client.once('ready', (err) => {
        if (err) {
            Log.sError('Redis', "Redis Error [on ready]: " + err.stack);
            cb(err);
        } else {
            //client.auth();
            status = STATUS.ESTABLISHED;
            Log.sInfo('Redis', 'redis start successfully, %s:%d', host, port);
            cb(null);
            // synchronous leaderboard
            //LeaderboardMgr.synchronousRedis((err) => {
            //    if (!err) status = STATUS.SYNCHRONOUS;
            //});
        }
    });

    client.on('end', (err) => {
        if (err) Log.sError('Redis', "Redis Error [on end]: " + err.stack);
        status = STATUS.NOT_READY;
    });
}

export function del(obj:RBase, callback:redis.ResCallbackT<any>):void {
    client.del(obj.key, callback);
}

export function exists(obj:RBase, callback:redis.ResCallbackT<number>):void {
    client.exists(obj.key, callback);
}

/**
 * 时间复杂度：
 *      O(1)
 * 返回值：
 *      设置成功返回 1 。
 *      当 key 不存在或者不能为 key 设置生存时间时(比如在低于 2.1.3 版本的 Redis 中你尝试更新 key 的生存时间)，返回 0 。
 */
export function expire(obj:RBase, seconds:number, callback:redis.ResCallbackT<number>):void {
    client.expire(obj.key, seconds, callback);
}

/**
 * 时间复杂度：
 *      O(1)
 * 返回值：
 *      当生存时间移除成功时，返回 1 .
 *      如果 key 不存在或 key 没有设置生存时间，返回 0 。
 */
export function persist(obj:RBase, callback:redis.ResCallbackT<number>):void {
    client.persist(obj.key, callback);
}

export function quit() {
    if (client) {
        client.quit();
        client = null;
    }
}
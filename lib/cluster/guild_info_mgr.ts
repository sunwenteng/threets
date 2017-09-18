import async = require('async');
import redis = require('redis');

import RedisMgr = require('../redis/redis_mgr');

var rc:redis.RedisClient = null;

export function initMgr():void {
    rc = RedisMgr.client;
}

export function guildBasic(guildId:number, done):void {

}

export function getGuildView(guildId:number, key:string, done):void {
    rc.hgetall('view:role:' + guildId + ':' + key, done);
}
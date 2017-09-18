import async = require('async');
import redis = require('redis');
import util = require('util');
import pb = require('node-protobuf-stream');

import Enum = require('../util/enum');
import Log = require('../util/log');
import Util = require('../util/game_util');
import RedisMgr = require('../redis/redis_manager');
import RoleManager = require('../handler/game/role_manager');
import HeroSuite = require('../handler/game/hero/hero_suite');

import GuildInfoMgr = require('./guild_info_mgr');

//var cmd = require('../share/cmd');

var rc:redis.RedisClient = null;
var keyStore:{[key:number]:KeyStc} = {};

export enum Key {
    BASIC = 1,
    MAIN_HERO = 2,
    GUILD = 3
}

class KeyStc {
    protoKey:string = '';
    redisKey:string = '';
    mysqlKey:string = '';
    constructor(protoKey, redisKey, mysqlKey) {
        this.protoKey = protoKey;
        this.redisKey = redisKey;
        this.mysqlKey = mysqlKey;
    }
}


export function initMgr():void {
    rc = RedisMgr.role.conn;

    keyStore[Key.BASIC] = new KeyStc('Basic', 'basic', 'basic');
    keyStore[Key.MAIN_HERO] = new KeyStc('MainHero', 'mainHero', 'mainHero');
    keyStore[Key.GUILD] = new KeyStc('Guild', 'guild', 'guild');
}

/**
 * 更新basic冗余数据
 * @param accountId
 * @param basic
 * @param done
 */
export function updateBasic(accountId:number, basic:any, done):void {
    var content = {};
    content[Key.BASIC] = basic;
    updateKeyCache(accountId, content, done);
}

export function updateMainHero(accountId:number, mainHero:any, done):void {
    var content = {};
    content[Key.MAIN_HERO] = mainHero;
    updateKeyCache(accountId, content, done);
}

export function updateGuild(accountId:number, guild:any, done):void {
    var content = {};
    content[Key.GUILD] = guild;
    updateKeyCache(accountId, content, done);
}

export function fetchGuild(accountId:number, done):void {
    fetchKeyCache(accountId, [Key.GUILD], done);
}

export function fetchBasic(accountId:number, done):void {
    fetchKeyCache(accountId, [Key.BASIC], done);
}

export function fetchNormalMode(accountId:number, suiteType:HeroSuite.SuiteType, done):void {
    fetchKeyCache(accountId, [Key.BASIC, Key.MAIN_HERO], (err, cache:any) => {
        if (err) return done(err);
        var normalMode:any = {};
        normalMode.accountId = accountId;
        normalMode.basic = cache.basic;
        normalMode.avatar = cache.mainHero.avatar;
        normalMode.suite = cache.mainHero[suiteType].suite;
        normalMode.attack = cache.mainHero[suiteType].attack;
        normalMode.defence = cache.mainHero[suiteType].defence;
        Log.uWarn(accountId, 'NormalMode', JSON.stringify(normalMode));
        done(null, normalMode);
    });
}

/**
 * give keys list, return result object
 *
 * example:
 *      keys = [Key.BASIC, Key.MAIN_HERO]
 *      result = { basic: obj, mainHero: obj }
 */
function fetchKeyCache(accountId:number, keys:Key[], done):void {
    var keyList:Buffer[] = keys.map((key) => {
        return new Buffer(redisKey(accountId, keyStore[key].redisKey));
    });

    var needSyncKeys:Key[] = [];

    rc.mget(keyList, (err, res) => {
        if (err) return done(err);
        var cache:any = {};
        keys.forEach((key, index) => {
            if (!res[index]) {
                needSyncKeys.push(key);
                return ;
            }
            //var content = new Buffer(res[index], 'binary');
            var content = res[index];
            cache[ keyStore[key].redisKey ] = pb.get('.Cache.Player.' + keyStore[key].protoKey).decode(content).toRaw();
        });
        Log.uDebug(accountId, 'RedisCache', JSON.stringify(cache));

        if (needSyncKeys.length > 0) {
            syncRedis(accountId, needSyncKeys, (err, left) => {
                if (!err) Util.extend(cache, left);
                done(err, cache);
            });
            return ;
        }

        done(null, cache);
    });
}

function syncRedis(accountId:number, keys:Key[], done):void {
    if (accountId >= Enum.VALID_ROLE_ID) {
        RoleManager.attach(accountId, (err, role) => {
            if (err) return done(err);

            var result:any = {};
            result.basic = role.buildCacheBasic();
            result.mainHero = role.buildCacheMainHero();

            var redisParam:any[] = [];
            Object.keys(result).forEach((key) => {
                var Type = pb.get('.Cache.Player.' + keyStore[key].protoKey);
                var content = (new Type(result[key])).encode().toBuffer();
                redisParam.push(redisKey(accountId, key));
                redisParam.push(content);
            });

            rc.msetnx(redisParam, (err, res) => {});

            done(null, result);
        });
    } else {
        done(null, {});
    }
}

function updateKeyCache(accountId:number, cache:any, done):void {
    var redisParam:any[] = [],
        mysqlParam:any = {};
    Object.keys(cache).forEach((key) => {
        var keyStc:KeyStc = keyStore[key];
        if (!keyStc) return ;
        redisParam.push(redisKey(accountId, keyStc.redisKey));
        var Type = pb.get('.Cache.Player.' + keyStore[key].protoKey);
        var content = (new Type(cache[key])).encode().toBuffer();
        redisParam.push(content);
        mysqlParam[keyStc.mysqlKey] = content;
    });

    rc.mset(redisParam, (err, res) => {
        if (err) return done(err);
        Log.uWarn(accountId, 'RedisCache', res.toString());

        done();
    });
}

function redisKey(accountId:number, key:string):string {
    return 'cache:role:' + accountId + ':' + key;
}
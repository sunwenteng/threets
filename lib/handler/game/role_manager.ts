import pb = require('node-protobuf-stream');
import async = require('async');

import Time = require('../../util/time');
import Log = require('../../util/log');

import Tcp = require('../../net/tcp');
import CacheHolder = require('../util/cache_holder');
import DB = require('../../database/database_manager');
import RedisManager = require('../../redis/redis_manager');
import RedisUtil = require('../../redis/redis_util');
import ServiceManager = require('../../service/service_manager');

import Role = require('./role');

var Key = RedisUtil.Key;
var cacheHolder:CacheHolder = new CacheHolder();

export function initManager():void {
}

export function saveManager(done) {
    done();
}

export function exist(accountId:number, done):void {
    DB.World.existRole(accountId, done);
}

export function create(accountId:number, account:string, username:string, serverId:number, done):void {
    DB.World.createNewRole(accountId, account, username, serverId, done);
}

function fetch(accountId:number, persist:boolean, done:(err, roleObject?)=>void) {
    var key = new Buffer(Key.dataRole(accountId));
    var client = RedisManager.role.conn;
    if (persist) {
        client.persist(key);
    }

    client.hgetall(key, (err, data) => {
        if (err) return done(err);

        if (!data) {
            ServiceManager.callRemote('role:cacheRoleData', {accountId:accountId}, (err) => {
                if (err) done(err);
                client.hgetall(key, (err, obj) => {
                    done(err, obj);
                });
            });
        } else
            done(err, data);
    });
}

function save(accountId:number, data:any, all:boolean, done) {
    var cache:any = cacheHolder.getCache(accountId) || {};
    var diff:any;

    if (all) {
        diff = data;
    } else {
        diff = {};
        Object.keys(data).forEach((key) => {
            var v1:any = data[key], v2:any = cache[key];
            if (Buffer.isBuffer(data[key])) {
                if (!Buffer.isBuffer(cache[key]) || Buffer['compare'](v1, v2) !== 0)
                    diff[key] = data[key];
            } else {
                if (data[key] != cache[key]) {  // must use != (not !==)
                    diff[key] = data[key];
                }
            }
        });
    }
    if (Object.keys(diff).length) {
        Log.sDebug('SyncRedis', 'save role %d [%s]', accountId, Object.keys(diff).join(','));
        diff._updateTime = Time.gameNow();
        RedisManager.role.conn.hmset(Key.dataRole(accountId), diff, (err, rep) => {
            RedisManager.role.conn.zadd(Key.checkSaveSet(), 'NX', Time.gameNow() - 9999, accountId);
            cacheHolder.setCache(accountId, data);
            done(err);
        });
    } else done();
}

export function saveRole(role:Role, all:boolean, done) {
    var data = role.saveAllData();
    save(role.accountId, data, all, done);
}

export function read(accountId:number, done:(err, role?:Role) => void) {
    var role = cacheHolder.getData(accountId);
    if (role) return done(null, role);

    role = new Role();
    role.accountId = accountId;
    fetch(accountId, false, (err, data) => {
        if (err) return done(err);
        role.loadAllData(data);
        done(null, role);
    });
}

export function attach(accountId:number, done:(err, role:Role)=>void):void {
    cacheHolder.attach(
        accountId,
        (accountId, cb) => {
            var role = new Role();
            role.accountId = accountId;
            fetch(accountId, true, (err, data) => {
                if (err) return cb(err);
                role.loadAllData(data);
                cb(null, role);
            });
        },
        (err, role) => {
            done(err, role);
        }
    );
}

export function detach(accountId:number, forceSave=false):void {
    cacheHolder.detach(accountId, forceSave);
}

export function isOnline(accountId:number, done:(err, isOnline, isLocal)=>void):void {
    var role:Role = cacheHolder.getData(accountId);
    if (!role) {

        return done(null, false, false);
    }
    done(null, role.bOnline, true);
}

export function kickOff(accountId, otherSession:Tcp.SyncSession, done):void {
    var role:Role = cacheHolder.getData(accountId);
    if (!role || !role.bOnline) return done();
    if (role.session) {
        var kickOff = pb.get('.Api.role.kickOff.Notify');
        role.session.closeSocket(new kickOff({
            other_ip:otherSession.address.address
        }));
        role.session = null;
    }
    done();
}

export function update():void {
    //cacheHolder.update();
}

export function broadcast(message, done?):void {
    cacheHolder.forEach(
        (role:Role, next) => {
            role.sendPacket(message);
            next();
        },
        done
    );
}

export function forEachRole(fn, done?) {
    cacheHolder.forEach(fn, done);
}
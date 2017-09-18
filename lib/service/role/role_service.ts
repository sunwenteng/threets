import async = require('async');
import redis = require('redis');

import Log = require('../../util/log');
import Time = require('../../util/time');
import DB = require('../../database/database_manager');
import CacheRole = require('../../cluster/cache_role');
import RedisUtil = require('../../redis/redis_util');
import RedisManager = require('../../redis/redis_manager');

import Service = require('../service');

var Key = RedisUtil.Key;

function syncFromDBToRedis(accountId, key, done) {
    var cacheRole = new CacheRole();
    async.waterfall(
        [
            (cb) => {
                DB.World.fetchRoleInfo(accountId, (err, result) => {
                    Object.keys(result).forEach((key) => {
                        cacheRole.setUpdateValue(key, result[key].toString());
                    });
                    cb(err);
                });
            },
            (cb) => {
                var tables = ['role_blob_1', 'role_blob_2'];
                async.eachSeries(tables, (table, next) => {
                    DB.World.fetchRoleBlobTable(table, accountId, (err, result) => {
                        if (err)
                            return next(err);
                        if (!result)
                            return next();
                        Object.keys(result).forEach((key) => {
                            cacheRole.setUpdateValue(key, result[key]);
                        });
                        next();
                    });
                }, (err) => {
                    cb(err);
                });
            },
            (cb) => {
                RedisManager.role.conn.hmset(
                    new Buffer(key),
                    cacheRole.buildUpdateObject(),
                    (err) => {
                        if (err) return cb(err);
                        RedisManager.role.conn.zadd(
                            Key.checkSaveSet(),
                            Time.gameNow(),
                            accountId,
                            (err) => {
                                cb(err);
                            }
                        );
                    }
                );
            }
        ],
        (err) => {
            if (err) {
                Log.sError('CacheRoleData', 'cache role data failed: ' + err.message);
                return done(err);
            }
            done();
        }
    );
}

function checkSaveToDB() {
    var client = RedisManager.role.conn;
    client.zrangebyscore(Key.checkSaveSet(), 0, Time.gameNow() - 180, 'limit', 0, 20, 'withscores', (err, result) => {
        if (err) {
            Log.sError('CheckSaveToDB', 'redis zrange error: ' + err.message);
            return setTimeout(checkSaveToDB, 3000);
        }

        if (result.length === 0)
            return setTimeout(checkSaveToDB, 3000);

        var i, len:number = Math.floor(result.length / 2);
        var list = [];
        for (i = 0; i < len; i++) {
            list.push({
                accountId: parseInt(result[i * 2]),
                checkTime: parseInt(result[i * 2 + 1])
            });
        }

        async.each(list, (item, next) => {
            var accountId = item.accountId;
            client.hgetall(new Buffer(Key.dataRole(accountId)), (err, data) => {
                if (err) {
                    Log.sError('Redis', 'hgetall %d error: %s', accountId, err.message);
                    return next(err);
                }

                if (!data) {
                    client.zrem(Key.checkSaveSet(), accountId, (err) => {
                        next();
                    });
                    return ;
                }

                var updateTime = parseInt(data._updateTime);
                var saveTime = data._saveTime ? parseInt(data._saveTime) : 0;


                if (saveTime >= updateTime) {
                    var loginTime = parseInt(data.loginTime),
                        logoutTime = parseInt(data.logoutTime);

                    if (loginTime < logoutTime) {
                        var multi:any = client.multi();
                        multi.zrem(Key.checkSaveSet(), accountId);
                        multi.expire(Key.dataRole(accountId), 60);
                        multi.exec((err, reply) => {
                            next();
                        });
                    } else next();

                } else {
                    DB.World.saveRoleData(accountId, data, (err) => {
                        if (err) {
                            Log.sError('Mysql.SaveRole', 'save role %d data error: %s', accountId, err.message);
                        } else {
                            Log.sInfo('Mysql.SaveRole', 'save role %d success', accountId);
                        }

                        client.hmset(Key.dataRole(accountId), {
                            _saveTime: updateTime
                        });
                        client.zadd(Key.checkSaveSet(), Time.gameNow(), item.accountId, (err) => {
                            next();
                        });

                    });
                }
            });
        }, (err) => {
            checkSaveToDB();
        });
    });
}

class RoleService extends Service {

    constructor() {
        super('role');
    }

    public startupService(param:any):void {
        this.running = true;
        this.on('close', () => {
            this.running = false;
        });

        async.waterfall([
            (next) => {
                DB.World.initTables(next);
            },
            (next) => {
                checkSaveToDB();
                next();
            },
        ], (err) => {
            this.emit('ready');
        });
    }

    /**
     * 保证redis有role数据，但是不能确认checkSaveSet一定有key，需要确认一遍
     */
    public onlineOperation(request, done) {
        var accountId = request.accountId;
        var client = RedisManager.role.conn;
        client.zscore(Key.checkSaveSet(), accountId.toString(), (err, score) => {
            if (err) return done(err);
            if (score) return done();

            client.zadd(Key.checkSaveSet(), Time.gameNow(), accountId, (err) => {
                done(err);
            });
        });
    }

    public offlineOperation(request, done) {
        var accountId = request.accountId;
    }

    public fetchFightTeam(request, done) {
        var accountId = request.accountId;
    }

    public cacheRoleData(request, done) {
        var accountId = request.accountId;
        var key = 'data:role:' + accountId;
        async.waterfall(
            [
                (next) => {
                    RedisManager.role.conn.exists(key, (err, rep) => {
                        if (err) return next(err);

                        if (!rep) {
                            syncFromDBToRedis(accountId, key, next);
                        } else {
                            next();
                        }
                    });
                }
            ],
            (err) => {
                if (err) {
                    Log.sError('CacheRoleData', 'cache role data failed: ' + err.message);
                    return done(err);
                }
                done();
            }
        );
    }
}

export = RoleService;
import async    = require('async');
import redis    = require('redis');

import Log      = require('../util/log');
//import CenterDB = require('../database/impl/center_db');

export enum LBType {
    ARENA_SCORE = 1,
    ARENA_MATCH = 2,
    BOSS_DAMAGE = 3
}

var LBStatus = {
    INITIALIZED: 'INITIALIZED'
};

class LBKey {
    redisKey:string = '';
    dbKey:string = '';

    constructor(redisKey:string, dbKey:string) {
        this.redisKey = redisKey;
        this.dbKey = dbKey;
    }
}

class RedisKey {
    dataKey:string;
    infoKey:string;

    constructor() {
        this.dataKey = '';
        this.infoKey = '';
    }
}


var lbKeyMap = {
    //arenaScore: new LBKey('ArenaScore', CenterDB.Leaderboard.arenaScore),
    //arenaMatch: new LBKey('ArenaMatch', CenterDB.Leaderboard.matchScore),
    //bossDamage: new LBKey('BossDamage', CenterDB.Leaderboard.bossDamage)
};

function transLBType(lbType:LBType, obj:ILeaderboard):void {
    var lbInfo:LBKey = null;
    switch (lbType) {
        case LBType.ARENA_SCORE:
            //lbInfo = lbKeyMap.arenaScore;
            break;
        case LBType.ARENA_MATCH:
            //lbInfo = lbKeyMap.arenaMatch;
            break;
        case LBType.BOSS_DAMAGE:
            //lbInfo = lbKeyMap.bossDamage;
            break;
    }

    obj.redisKey.dataKey = lbInfo.redisKey + ':data';
    obj.redisKey.infoKey = lbInfo.redisKey + ':info';
    obj.dbKey = lbInfo.dbKey;
}

interface ILeaderboard {
    dbKey:string;
    redisKey:RedisKey;
}

class LBServer implements ILeaderboard {

    redisClient:redis.RedisClient = null;

    dbKey:string = '';
    redisKey:RedisKey = new RedisKey();

    constructor(redisClient, lbType:LBType) {
        this.redisClient = redisClient;
        //this.addListener();

        transLBType(lbType, this);
    }

    public initLeaderboard(done:(err)=>void):void {

        var client = this.redisClient,
            redisKey = this.redisKey,
            dbKey = this.dbKey;

        //CenterDB.fetchBigThanZero('leaderboard', 'accountId', this.dbKey, (err, result:any[]) => {
        //    if (err) return done(err);
        //
        //    var count = 0, length = result.length, step = 100;
        //    async.until(
        //        () => {
        //            return count >= length;
        //        },
        //        (next) => {
        //            var content:string[] = [];
        //            for (var i = count; i < length && i < count + step; i++) {
        //                content.push(result[i].accountId, result[i][dbKey]);
        //            }
        //            if (content.length > 0) {
        //                client.zadd(redisKey.dataKey, content, (err, reply) => {
        //                    next(err);
        //                });
        //            } else {
        //                next(null);
        //            }
        //        },
        //        (err) => {
        //            if (err) return done(err);
        //
        //            client.set(redisKey.infoKey, LBStatus.INITIALIZED, (err, reply) => {
        //                done(err);
        //            });
        //        }
        //    );
        //});

    }

    public clearLeaderboard(done:(err)=>void):void {
        // TODO not finished
        this.redisClient.del([this.redisKey.dataKey, this.redisKey.infoKey], (err) => {
            //CenterDB.Leaderboard.clearLeaderboardScore(this.dbKey, (err) => {
            //    CenterDB.Leaderboard.deleteZeroScorePlayer((err) => {
            //        done(err);
            //    });
            //});
        });
    }

    private addListener():void {
        // unhandled error
        this.redisClient.on('error', (err) => {
            Log.sError('Leaderboard', 'Unhandled Redis Error: ' + err.message);
        });

        this.redisClient.on('reconnecting', (info:{delay:number; attempt:number}):void => {
            Log.sWarn('Leaderboard', 'Redis Reconnect: %d attempt with $d ms delay',
                info.attempt, info.delay);
        });

        this.redisClient.on('ready', () => {
            var client = this.redisClient;
            client.get(this.redisKey.infoKey, (err, reply) => {
                if (err) return;

                if (reply !== LBStatus.INITIALIZED) {
                    this.initLeaderboard((err) => {
                        if (err) {
                            Log.sError('Leaderboard', 'initLeaderboard Failed, message=' + err.message);
                        }
                    });
                }
            });
        });
    }

}

class LBClient implements ILeaderboard {

    redisClient:redis.RedisClient = null;

    dbKey:string = '';
    redisKey:RedisKey = new RedisKey();

    lbIsInit:boolean = false;

    constructor(redisClient, lbType:LBType) {
        this.redisClient = redisClient;
        //this.addListener();

        transLBType(lbType, this);
    }

    public addListener():void {
        // unhandled error
        this.redisClient.on('error', (err) => {
            Log.sError('Leaderboard', 'Unhandled Redis Error: ' + err.message);
        });

        this.redisClient.on('reconnecting', (info:{delay:number; attempt:number}):void => {
            Log.sWarn('Leaderboard', 'Redis Reconnect: %d attempt with $d ms delay',
                info.attempt, info.delay);
        });

        this.redisClient.on('ready', () => {
            var client = this.redisClient;

            function checkLBIsInit():void {
                client.get(this.redisKey.infoKey, (err, reply) => {
                    if (err) {

                        if (!client || !client.connected) return;   // 已断开连接，等待下次ready

                        setTimeout(() => {
                            checkLBIsInit();
                        }, 20000);      // 20s 检查一次

                        return ;
                    }

                    if (reply === LBStatus.INITIALIZED) {
                        this.lbIsInit = true;
                    } else {
                        setTimeout(() => {
                            checkLBIsInit();
                        }, 20000);      // 20s 检查一次
                    }
                });
            }

            checkLBIsInit();
        });
    }

    public checkLeaderboardStatus():void {
        var client = this.redisClient;

        if (!client || !client.connected || !this.lbIsInit) {
            throw new Error('RedisNotReady');
        }
    }

    public setScore(accountId:number, score:number, done:(err)=>void):void {
        var client = this.redisClient;
        client.zadd([this.redisKey.dataKey, score.toString(), accountId.toString()], (err) => {
            if (err) {
                Log.uError(accountId, 'Leaderboard', 'Redis ZADD Error: score=' + score + ', message=' + err.message);
            }

            // even error occurs in redis, we still need apply mysql
            //CenterDB.Leaderboard.updateScore(this.dbKey, accountId, score, (err) => {
            //    done(err);
            //});
        });
    }

    public queryRank(primaryId:number, cb:(err, rank:number)=>void):void {
        this.redisClient.zrevrank(primaryId.toString(), (err, rank) => {
            cb(err, (rank || rank === 0) ? rank + 1 : 0);
        });
    }

}
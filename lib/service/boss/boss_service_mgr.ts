import async        = require('async');
import pbstream     = require('node-protobuf-stream');

import RedisStruct  = require('../../redis/struct');
import Leaderboard  = require('../../redis/leaderboard');

//import CenterDB     = require('../../database/impl/center_db');
import DB           = require('../../database/database_manager');

import Time         = require('../../util/time');
import Log          = require('../../util/log');

import Universal    = require('../../handler/game/universal');
import LeaderboardMgr   = require('../../handler/game/leaderboard_mgr');

//import CenterWorld  = require('../center_world');
import BossDef      = require('./defines');

var cm = require('../../config').configMgr;

var worldBoss:BossDef.WorldBoss = null;

var isUpdating:boolean = false;

export function initWorldBoss(callback:(err) => void):void {

    async.waterfall([
        (next) => {
            DB.Boss.getLatestLog((err, boss) => {
                if (!boss) worldBoss = new BossDef.WorldBoss();
                else worldBoss = boss;
                next(err);
            });
        },
        (next) => {
            var realCurrentBossID = getRealCurrentWorldBossID();

            if (worldBoss.bossID !== realCurrentBossID) {
                startNewWorldBoss(realCurrentBossID, next);
            } else {
                switch (worldBoss.progress) {
                    case BossDef.PROGRESS.NOT_START:
                        break;
                }
                next(null);
            }
        }
    ], (err) => {
        callback(err);
    });
}

export function updateWorldBoss():void {
    if (isUpdating) return ;
    isUpdating = true;

    var now = Time.gameNow();
    if (worldBoss.bossID > 0) {
        var config = cm.boss_infodb.get(worldBoss.bossID);
        if (now > Time.toSecTime(config.finish)) {
            switch (worldBoss.progress) {
                case BossDef.PROGRESS.NOT_START:
                    isUpdating = false;
                    break;
                case BossDef.PROGRESS.START:
                    worldBoss.progress = BossDef.PROGRESS.RESULT_SORTING;
                    syncWorldBoss(worldBoss, (err) => {
                        var realId = getRealCurrentWorldBossID();
                        startNewWorldBoss(realId, (err)=>{
                            Log.sWarn('Boss', 'start new world boss finished, error ' + err + ', id=' + realId);
                            isUpdating = false;
                        });
                    });
                    break;
                case BossDef.PROGRESS.RESULT_SORTING:
                case BossDef.PROGRESS.BOSS_END:
                default:
                    isUpdating = false;
                    break;
            }
        } else {
            switch (worldBoss.progress) {
                case BossDef.PROGRESS.NOT_START:
                    worldBoss.progress = BossDef.PROGRESS.START;
                    syncWorldBoss(worldBoss, (err) => {
                        isUpdating = false;
                    });
                    break;
                case BossDef.PROGRESS.START:
                case BossDef.PROGRESS.RESULT_SORTING:
                case BossDef.PROGRESS.BOSS_END:
                default:
                    isUpdating = false;
                    break;
            }
        }
    } else {
        var realCurrentBossID = getRealCurrentWorldBossID();
        if (worldBoss.bossID !== realCurrentBossID) {
            startNewWorldBoss(realCurrentBossID, () => {
                isUpdating = false;
            });
        }
    }
}

export function getBoss():BossDef.WorldBoss {
    return {
        bossID: worldBoss.bossID,
        startTime: worldBoss.startTime,
        endTime: worldBoss.endTime,
        progress: worldBoss.progress
    };
}


function getRealCurrentWorldBossID():number {
    var now = Time.gameNow();
    var realCurrentBossID = 0;
    var worldBossConfig = cm.boss_infodb.all();
    Object.keys(worldBossConfig).forEach((key) => {
        var config = cm.boss_infodb.get(key);
        if (Time.toSecTime(config.start) <= now && now < Time.toSecTime(config.finish)) {
            realCurrentBossID = config.ID;
        }
    });
    return realCurrentBossID;
}

function startNewWorldBoss(newBossID:number, callback:(err)=>void):void {
    Log.sWarn('Boss', 'startNewWorldBoss');
    async.waterfall([
        (next) => {
            if (!!worldBoss.bossID) {    // 0, null, undefined
                worldBoss.progress = BossDef.PROGRESS.RESULT_SORTING;
                syncWorldBoss(worldBoss, (err) => {
                    Log.sWarn('Boss', 'sortResult, bossID=' + worldBoss.bossID);
                    sortResult((err) => {
                        if (err) {
                            Log.sError('Boss', 'sort result Error: ' + err.stack);
                        }

                        worldBoss.progress = BossDef.PROGRESS.BOSS_END;
                        syncWorldBoss(worldBoss, (err) => {
                            next(null);
                        });
                    });
                });
            } else {
                next(null);
            }
        },
        (next) => {
            if (newBossID > 0) {
                // start a new arena world boss
                var config = cm.boss_infodb.get(newBossID);
                worldBoss.bossID = config.ID;
                worldBoss.startTime = Time.toSecTime(config.start);
                worldBoss.endTime = Time.toSecTime(config.finish);
                worldBoss.progress = BossDef.PROGRESS.NOT_START;

                Log.sWarn('Boss', 'LeaderboardMgr.bossDamageLB.clearBoard');

                worldBoss.progress = BossDef.PROGRESS.START;
                syncWorldBoss(worldBoss, (err) => {
                    next(null);
                });
                //LeaderboardMgr.bossDamageLB.clearBoard((err, res) => {
                //    worldBoss.progress = BossDef.PROGRESS.BOSS_END;
                //    syncWorldBoss(worldBoss, (err) => {
                //        next(null);
                //    });
                //});
            } else {
                worldBoss.bossID = 0;
                worldBoss.startTime = 0;
                worldBoss.endTime = 0;
                worldBoss.progress = BossDef.PROGRESS.NOT_START;
                syncWorldBoss(worldBoss, (err) => {
                    next(null);
                });
            }
        },
        (next) => {
            Log.sWarn('Boss', 'start a new world boss, bossID=' + worldBoss.bossID);
            worldBoss.progress = BossDef.PROGRESS.START;
            syncWorldBoss(worldBoss, (err) => {
                Log.sWarn('Boss', 'worldBoss.progress = BossDef.PROGRESS.START');
                next(err);
            });
        }
    ], (err) => {
        callback(err);
    });
}

function syncWorldBoss(worldBoss:BossDef.WorldBoss, callback:(err) => void):void {
    var Message = pbstream.get('.Rpc.common.updateWorldBoss.Request');
    //if (Message) CenterWorld.routeRequestAll(new Message());

    DB.Boss.insertOrUpdateLog(worldBoss, (err, result) => {
        callback(null);
    });
}

function sortResult(callback:(err)=>void):void {
    var finished = false;
    async.until(() => {
        return finished;
    }, (cb) => {
        handlePartResult(100, 50000, (err, _finished) => {
            if (err) {
                cb(err);
                return;
            }
            finished = _finished;
            cb(null);
        });
    }, (err) => {
        Log.sInfo('Boss', 'sortResult finished');
        callback(err);
    });
}

function handlePartResult(count:number, max:number, callback:(err, finished:boolean)=>void):void {
    var leaderboard:Leaderboard = LeaderboardMgr.bossDamageLB;
    var bossID = worldBoss.bossID;

    DB.Boss.fetchMaxBossRank(bossID, (err, start) => {
        if (err) {
            callback(err, true);
            return ;
        }
        leaderboard.fetchRange(start, start + count - 1, (err, result) => {
            if (err) {
                callback(err, true);
                return ;
            }

            var len:number = Math.floor(result.length / 2);
            if (len === 0) {
                callback(null, true);
                return ;
            }

            var i, values:number[][] = [];

            var accountId, score, rank;
            for (i = 0; i < len; i += 1) {
                accountId = parseInt(result[i * 2]);
                score = parseInt(result[i * 2 + 1]);
                rank = start + i + 1;
                if (score > 0) {
                    values.push([accountId, bossID, score, rank]);
                }
            }

            async.waterfall([
                (next) => {
                    DB.Boss.insertBossRankHistory(values, (err) => {
                        if (err) {
                            next(err, true);
                            return ;
                        }

                        if (result.length < 2 * count) {
                            next(null, true);
                        } else if (start + count >= max) {
                            next(null, true);
                        } else {
                            next(null, false);
                        }
                    });
                }
            ], (err, finished:any) => {
                callback(err, finished);
            });
        });
    });
}
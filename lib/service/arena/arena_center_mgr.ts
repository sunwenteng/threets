import async        = require('async');
import pbstream     = require('node-protobuf-stream');

import Time         = require('../../util/time');
import Log          = require('../../util/log');
import ArenaDef     = require('./defines');
//import CenterDB     = require('../../database/impl/center_db');
import Robot        = require('./robot');
import RobotMgr     = require('./robot_center_mgr');
import Universal    = require('../../handler/game/universal');
import Leaderboard  = require('../../redis/leaderboard');

import LeaderboardMgr   = require('../../handler/game/leaderboard_mgr');
import ArenaGlobalMgr   = require('../../handler/game/arena/arena_global_mgr');

import DB = require('../../database/database_manager');

var cm = require('../../config').configMgr;
//var cmd = require('../../share/cmd');

var arenaTournament:ArenaDef.ArenaTournament = null;

var isLoading:boolean = false;
var TOP_RECORD_APPEARANCE_COUNT = 3;

var isUpdating:boolean = false;

export function initArenaTournament(callback:(err) => void) {
    Log.sInfo('Arena', 'start initArenaTournament');

    async.waterfall([
        (next) => {
            DB.Arena.getLatestLog((err, tournament) => {
                if (!tournament) arenaTournament = new ArenaDef.ArenaTournament();
                else arenaTournament = tournament;
                next(err);
            });
        },
        (next) => {
            var realCurrentArenaId = getRealCurrentTournamentId();

            if (arenaTournament.tournamentId !== realCurrentArenaId) {
                startNewArenaTournament(realCurrentArenaId, next);
            } else {
                if (arenaTournament.tournamentId > 0) {
                    switch (arenaTournament.progress) {
                        case ArenaDef.TOURNAMENT_PROGRESS.NOT_START:
                            loadMatchLeaderboard((err) => {
                                if (err) {
                                    Log.sError('Arena', 'sort result Error: ' + err.stack);
                                }
                                arenaTournament.progress = ArenaDef.TOURNAMENT_PROGRESS.PVP_START;
                                syncArenaTournament(arenaTournament, (err) => {
                                    next(null);
                                });
                            });
                            break;
                        case ArenaDef.TOURNAMENT_PROGRESS.PVP_START:
                            syncArenaTournament(arenaTournament, (err) => {
                                next(null);
                            });
                            break;
                        case ArenaDef.TOURNAMENT_PROGRESS.RESULT_SORTING:
                            sortResult((err) => {
                                if (err) {
                                    Log.sError('Arena', 'sort result Error: ' + err.stack);
                                }
                                arenaTournament.progress = ArenaDef.TOURNAMENT_PROGRESS.TOURNAMENT_END;
                                syncArenaTournament(arenaTournament, (err) => {
                                    next(null);
                                });
                            });
                            break;
                        case ArenaDef.TOURNAMENT_PROGRESS.TOURNAMENT_END:
                        default:
                            next(null);
                            break;
                    }
                    Log.sInfo('Arena', 'finish initArenaTournament, progress=' + arenaTournament.progress);
                }
            }
        }
    ], (err) => {
        callback(err);
    });
}

function finishCurrentArenaTournament(callback:(err) => void):void {
    arenaTournament.progress = ArenaDef.TOURNAMENT_PROGRESS.RESULT_SORTING;
    syncArenaTournament(arenaTournament, (err) => {
        Log.sWarn('Arena', 'sortResult, tournamentId=' + arenaTournament.tournamentId);
        sortResult((err) => {
            if (err) {
                Log.sError('Arena', 'sort result Error: ' + err.stack);
            }

            arenaTournament.progress = ArenaDef.TOURNAMENT_PROGRESS.TOURNAMENT_END;
            syncArenaTournament(arenaTournament, (err) => {
                callback(null);
            });

            broadcastAndGenerateType3Robot(arenaTournament.tournamentId, (err) => {});
        });
        // ...
    });
}

// 结束当前联赛，并且开启下一场
export function startNewArenaTournament(newTournament:number, callback:(err) => void):void {
    // end last arena tournament
    Log.sWarn('Arena', 'startNewArenaTournament');
    async.waterfall([
        (next) => {
            if (!!arenaTournament.tournamentId) {    // 0, null, undefined
                finishCurrentArenaTournament(next);
            } else {
                next(null);
            }
        },
        (next) => {
            // start a new arena tournament
            if (newTournament > 0) {
                var config = cm.arena_tournamentdb.get(newTournament);
                arenaTournament.tournamentId = config.ID;
                arenaTournament.startTime = Time.toSecTime(config.start);
                arenaTournament.endTime = Time.toSecTime(config.finish);
                arenaTournament.progress = ArenaDef.TOURNAMENT_PROGRESS.NOT_START;

                async.waterfall([
                    (next) => {
                        syncArenaTournament(arenaTournament, (err) => {
                            next(null);
                        });
                    },
                    (next) => {
                        Log.sWarn('Arena', 'LeaderboardMgr.arenaScoreLB.clearBoard');
                        LeaderboardMgr.arenaScoreLB.clearBoard((err, res) => {
                            next(null);
                        });
                    },
                    (next) => {
                        Log.sWarn('Arena', 'loadMatchLeaderboard');
                        loadMatchLeaderboard((err) => {
                            next(err);
                        });
                    },
                    (next) => {
                        arenaTournament.progress = ArenaDef.TOURNAMENT_PROGRESS.PVP_START;
                        syncArenaTournament(arenaTournament, (err) => {
                            Log.sWarn('Arena', 'arenaTournament.progress = ArenaDef.TOURNAMENT_PROGRESS.PVP_START');
                            next(err);
                        });
                    }
                ], (err) => {
                    Log.sWarn('Arena', 'start a new arena tournament, tournamentId=' + config.ID);
                    next(err);
                });
            } else {
                arenaTournament.tournamentId = 0;
                arenaTournament.startTime = 0;
                arenaTournament.endTime = 0;
                arenaTournament.progress = ArenaDef.TOURNAMENT_PROGRESS.NOT_START;
                syncArenaTournament(arenaTournament, (err) => {
                    next(null);
                });
            }
        }
    ], (err) => {
        callback(err);
    });
}

export function updateTournament() {
    if (isUpdating) return ;
    isUpdating = true;

    var now = Time.gameNow();
    if (arenaTournament.tournamentId) {
        var config = cm.arena_tournamentdb.get(arenaTournament.tournamentId);
        if (now > Time.toSecTime(config.finish)) {
            switch (arenaTournament.progress) {
                case ArenaDef.TOURNAMENT_PROGRESS.NOT_START:
                    isUpdating = false;
                    break;
                case ArenaDef.TOURNAMENT_PROGRESS.PVP_START:
                    arenaTournament.progress = ArenaDef.TOURNAMENT_PROGRESS.RESULT_SORTING;
                    syncArenaTournament(arenaTournament, (err) => {
                        var realId = getRealCurrentTournamentId();
                        startNewArenaTournament(realId, (err)=>{
                            Log.sWarn('Arena', 'start new arena tournament finished, error ' + err + ', id=' + realId);
                            isUpdating = false;
                        });
                    });
                    break;
                case ArenaDef.TOURNAMENT_PROGRESS.RESULT_SORTING:
                case ArenaDef.TOURNAMENT_PROGRESS.TOURNAMENT_END:
                default:
                    isUpdating = false;
                    break;
            }
        } else {
            switch (arenaTournament.progress) {
                case ArenaDef.TOURNAMENT_PROGRESS.NOT_START:
                    loadMatchLeaderboard((err) => {
                        arenaTournament.progress = ArenaDef.TOURNAMENT_PROGRESS.PVP_START;
                        syncArenaTournament(arenaTournament, (err) => {
                            isUpdating = false;
                        });
                    });
                    break;
                case ArenaDef.TOURNAMENT_PROGRESS.PVP_START:
                case ArenaDef.TOURNAMENT_PROGRESS.RESULT_SORTING:
                case ArenaDef.TOURNAMENT_PROGRESS.TOURNAMENT_END:
                default:
                    isUpdating = false;
                    break;
            }
        }
    } else {
        var realCurrentArenaId = getRealCurrentTournamentId();

        if (arenaTournament.tournamentId !== realCurrentArenaId) {
            startNewArenaTournament(realCurrentArenaId, ()=>{
                isUpdating = false;
            });
        }
    }
}

export function getTournament():ArenaDef.ArenaTournament {
    if (!arenaTournament) return {
        tournamentId: 0,
        startTime: 0,
        endTime: 0,
        progress: 0
    };
    return {
        tournamentId: arenaTournament.tournamentId,
        startTime: arenaTournament.startTime,
        endTime: arenaTournament.endTime,
        progress: arenaTournament.progress
    };
}

function getRealCurrentTournamentId():number {
    var now = Time.gameNow();
    var realCurrentArenaId = 0;
    var tournamentConfig = cm.arena_tournamentdb.all();
    Object.keys(tournamentConfig).forEach((key) => {
        var config = cm.arena_tournamentdb.get(key);
        if (Time.toSecTime(config.start) <= now && now < Time.toSecTime(config.finish)) {
            realCurrentArenaId = config.ID;
        }
    });
    return realCurrentArenaId;
}

function syncArenaTournament(arenaTournament:ArenaDef.ArenaTournament, callback:(err) => void):void {
    var Message = pbstream.get('.Rpc.common.arenaUpdateTournament.Request');
    //if (Message) CenterWorld.routeRequestAll(new Message());

    //CenterDB.TournamentLog.insertOrUpdateLog(arenaTournament, (err, result) => {
    //    callback(err);
    //});
    callback(null);
}

interface WriteType3RobotResponse {
    successList:number[];
}

function broadcastAndGenerateType3Robot(tournamentId:number, callback:(err)=>void):void {
    var Message = pbstream.get('.Rpc.common.writeRobot.Request');
    //CenterWorld.routeRequestAll(new Message({
    //    tournamentId: tournamentId
    //}));
}

function sortResult(callback:(err)=>void):void {
    var finished = false;
    async.until(() => {
        return finished;
    }, (cb) => {
        handlePartResult(100, 75000, (err, _finished) => {
            if (err) {
                cb(err);
                return;
            }
            finished = _finished;
            cb(null);
        });
    }, (err) => {
        Log.sInfo('Arena', 'sortResult finished');
        callback(err);
    });
}

export class TournamentPlayerAvatar {
    accountId:number = 0;
    tournamentId:number = 0;
    score:number = 0;
    rank:number = 0;
    username:string = '';
    level:number = 0;
    achievementId:number = 0;

    hairType:number;      // 发型
    hairColor:number;     // 发色
    faceType:number;      // 脸型
    skinColor:number;     // 肤色
    cape:number;

    arenaArmorID:number;
    arenaArmorLevel:number;
}

function handlePartResult(count:number, max:number, callback:(err, finished:boolean)=>void):void {
    var leaderboard:Leaderboard = LeaderboardMgr.arenaScoreLB;
    var tournamentId = arenaTournament.tournamentId;

    //CenterDB.fetchMaxArenaRank(tournamentId, (err, start) => {
    //    if (err) {
    //        callback(err, true);
    //        return ;
    //    }
    //    leaderboard.fetchRange(start, start + count - 1, (err, result) => {
    //        if (err) {
    //            callback(err, true);
    //            return ;
    //        }
    //
    //        var len:number = Math.floor(result.length / 2);
    //        if (len === 0) {
    //            callback(null, true);
    //            return ;
    //        }
    //
    //        var i,
    //            values:number[][] = [],
    //            tops:{[accountId:number]:TournamentPlayerAvatar} = null;
    //
    //        var accountId, score, rank;
    //        for (i = 0; i < len; i += 1) {
    //            accountId = parseInt(result[i * 2]);
    //            score = parseInt(result[i * 2 + 1]);
    //            rank = start + i + 1;
    //            if (score > 0) {
    //                values.push([accountId, tournamentId, score, rank]);
    //
    //                if (rank <= TOP_RECORD_APPEARANCE_COUNT) {
    //                    var player = new TournamentPlayerAvatar();
    //                    player.accountId = accountId;
    //                    player.tournamentId = tournamentId;
    //                    player.score = score;
    //                    player.rank = rank;
    //                    if (!tops) tops = {};
    //                    tops[player.accountId] = player;
    //                }
    //            }
    //        }
    //
    //        async.waterfall([
    //            (next) => {
    //                if (tops) {
    //                    var topList:string[] = Object.keys(tops);
    //                    CenterDB.fetchPlayerROInfo(topList, (err, infos:CenterDB.CenterPlayerInfo[]) => {
    //                        if (err) {
    //                            Log.sError('Arena', 'fetchPlayerROInfo Error: ' + err.stack);
    //                            next(err);
    //                            return ;
    //                        }
    //
    //                        infos.forEach((info) => {
    //                            var entry = tops[info.accountId];
    //                            entry.level = info.level;
    //                            entry.username = info.username;
    //                            entry.hairType = info.hairType;
    //                            entry.hairColor = info.hairColor;
    //                            entry.faceType = info.faceType;
    //                            entry.skinColor = info.skinColor;
    //                            entry.cape = info.cape;
    //                            entry.arenaArmorID = info.arenaArmorID;
    //                            entry.arenaArmorLevel = info.arenaArmorLevel;
    //                            entry.achievementId = info.achievementId;
    //                        });
    //
    //                        async.each(topList, (key, cb) => {
    //                            var entry = tops[key];
    //                            CenterDB.insertArenaTopHistory(entry, (err) => {
    //                                cb(err);
    //                            });
    //                        }, (err) => {
    //                            next(err);
    //                        });
    //                    });
    //                } else {
    //                    next(null);
    //                }
    //            },
    //            (next) => {
    //                CenterDB.insertArenaRankHistory(values, (err) => {
    //                    if (err) {
    //                        next(err, true);
    //                        return ;
    //                    }
    //
    //                    if (result.length < 2 * count) {
    //                        next(null, true);
    //                    } else if (start + count >= max) {
    //                        next(null, true);
    //                    } else {
    //                        next(null, false);
    //                    }
    //                });
    //            }
    //        ], (err, finished:any) => {
    //            callback(err, finished);
    //        });
    //    });
    //});
}

// 载入隐藏积分
// 预先载入
//      1. 机器人数据
//      2. 上次竞技场有排名玩家数据
// 其他玩家在上线的时候判断是否新加数据
// 注意：多次调用会覆盖之前的结果
function loadMatchLeaderboard(callback:(err)=>void):void {
    if (isLoading) {
        callback(null);
        return ;
    }

    isLoading = true;

    async.series([
        (next) => {
            loadRobotMatchScore((err) => {
                next(err, null);
            });
        },
        (next) => {
            loadLastTournamentPlayerMatchScore((err) => {
                next(err, null);
            });
        }
    ], (err) => {
        Log.sInfo('Arena', 'loadMatchLeaderboard Finished');
        isLoading = false;
        callback(err);
    });
}

function loadRobotMatchScore(callback:(err)=>void):void {
    callback(null);
    //var matchBoard = LeaderboardMgr.arenaMatchLB;
    //
    //var robotId = 1, succeed = 0;
    //async.until(() => {
    //    return robotId >= RobotMgr.maxRobotT2Id;
    //}, (cb) => {
    //    var robot = RobotMgr.getRobot(robotId);
    //    if (!ArenaGlobalMgr.isArenaOpen(robot.level)) {
    //        robotId += 1;
    //        cb(null);
    //        return ;
    //    }
    //
    //    var rating = Universal.calcEloRating(0);
    //    if (rating > 0) {
    //        matchBoard.setScore(robotId, rating, (err) => {
    //            if (err) {
    //                Log.sError('Arena', 'loadRobotMatchScore setScore error, robotId=' + robotId + ', rating=' + rating);
    //            } else {
    //                succeed += 1;
    //            }
    //            robotId += 1;
    //            cb(null);
    //        });
    //    } else {
    //        robotId += 1;
    //        cb(null);
    //    }
    //}, (err) => {
    //    Log.sInfo('Arena', 'loadRobotMatchScore finished, succeed=' + succeed);
    //    callback(err);
    //});
}

function loadLastTournamentPlayerMatchScore(callback:(err)=>void):void {
    return callback(null);
    //var count = 100, max = 75000,
    //    start = 1;
    //var finished = false;
    //var matchBoard = LeaderboardMgr.arenaMatchLB;
    //
    //async.waterfall([
    //    (next) => {
    //        //CenterDB.fetchMaxArenaId((err, tournamentId) => {
    //        //    next(err, tournamentId);
    //        //});
    //    },
    //    (tournamentId, next) => {
    //        Log.sDebug('loadLastTournamentPlayerMatchScore', 'tournamentId=%d', tournamentId);
    //        async.until(() => {
    //            return finished;
    //        }, (cb) => {
    //            //CenterDB.fetchTournamentHistoryRangeByRank(tournamentId, start, start+count-1, (err, result) => {
    //            //    if (err) {
    //            //        cb(err);
    //            //        return ;
    //            //    }
    //            //    if (result.length < count) finished = true;
    //            //    else if (start + count - 1 > max) finished = true;
    //            //
    //            //    Log.sDebug('loadLastTournamentPlayerMatchScore', 'result.length=%d, start=%d, finished=%s',
    //            //        result.length, start, finished);
    //            //
    //            //    var eachList = result.map((e, i) => {
    //            //        return {accountId: e.accountId, index: i};
    //            //    });
    //            //    async.each(eachList, (ele, cb) => {
    //            //        var accountId = ele.accountId,
    //            //            rank = start + ele.index;
    //            //
    //            //        if (!RobotMgr.hasRobot(accountId)) {
    //            //            var rating = Universal.calcEloRating(rank);
    //            //            matchBoard.setScore(accountId, rating, (err) => { cb(err); });
    //            //        } else {
    //            //            cb(null);
    //            //        }
    //            //    }, (err) => {
    //            //        start = start + count;
    //            //        Log.sDebug('loadLastTournamentPlayerMatchScore', 'start=%d', start);
    //            //        cb(err);
    //            //    });
    //            //})
    //
    //        }, (err) => {
    //            Log.sDebug('loadLastTournamentPlayerMatchScore', 'next');
    //            next(err);
    //        });
    //    }
    //], (err) => {
    //    Log.sDebug('loadLastTournamentPlayerMatchScore', 'callback');
    //    callback(err);
    //});

}
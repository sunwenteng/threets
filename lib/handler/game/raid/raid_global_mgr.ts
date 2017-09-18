/**
 * Created by liang on 7/6/16.
 */
import LeaderboardMgr = require('../leaderboard_mgr');
import async = require('async');
import RedisStruct = require('../../../redis/struct');
import Log = require('../../../util/log');
import Util = require('../../../util/game_util');
import RoleManager = require('../role_manager');
import log = require('../../../util/log');
import RaidMgr = require('./raid_mgr');
var cm = require('../../../config').configMgr;

export var MAX_OPPONENT_SIZE:number = 3;

export function randomOpponent(accountId:number, currentOpponents:number[], callback:(err, list:{[accountId:number]:RaidMgr.Opponent})=>void):void {
    var leaderboard = LeaderboardMgr.raidMatchLB;
    var oppoList:{[accountId:number]:RaidMgr.Opponent} = {};
    var needRandom = MAX_OPPONENT_SIZE;

    async.auto({
        size: (cb) => {
            leaderboard.fetchSize((err, size) => {
                cb(err, size);
            });
        },
        rank: (cb) => {
            leaderboard.queryRank(accountId, (err, rank) => {
                cb(err, rank === null ? 0 : rank);
            });
        },
        final: ['size', 'rank', (result, finalCallback) => {
            var size = result.size,
                rank = result.rank;

            if (size === 0) {
                return finalCallback(null, []);
            }

            var start, end;

            start = 0;
            end = size;

            var tryCount = 0;
            async.until(() => {
                return needRandom <= 0 || tryCount >= 50;
            }, (next) => {
                var ran = Util.randInt(start, end);
                tryCount += 1;
                if (isNaN(ran)) {
                    Log.uError(accountId, 'Arena', 'ran=' + ran);
                    return next(new Error('ran is NaN'));
                }
                leaderboard.fetchRange(ran, ran, (err, result:string[]) => {
                    if (err) return next(err);
                    var oppoId = parseInt(result[0]);

                    RoleManager.read(oppoId, (err, opp) => {
                        if (err) {
                            log.uError(opp.accountId, 'RaidOpponent', 'randomOpponent error: ' + err.stack);
                            next();
                        }

                        var raidGoldRate = 0;
                        var raidCount = opp.raid.raidCount + 1 > 10 ? 10 : opp.raid.raidCount + 1;
                        //读表
                        Object.keys(cm.Raid_Golddb.all()).forEach((ID) => {
                            if (cm.Raid_Golddb.get(parseInt(ID)).ID === raidCount) {
                                raidGoldRate = cm.Raid_Golddb.get(parseInt(ID)).Gold_cut;
                            }
                        });

                        var tmp = new RaidMgr.Opponent();
                        tmp.accountId = opp.accountId;
                        tmp.level = opp.level;
                        tmp.username = opp.username;
                        tmp.socre = opp.raid.playerStatus.score;
                        tmp.raidGold = Math.ceil(opp.gold * raidGoldRate / 100);

                        if (!isNaN(opp.accountId) && accountId !== opp.accountId && !oppoList[opp.accountId] && !opp.bOnline && !opp.raid.isLock) {
                            oppoList[opp.accountId] = tmp;
                            //opp.raid.isLock = true;
                            --needRandom;
                        }
                        next(null);
                    });
                });
            }, (err) => {
                finalCallback(err);
            });
        }]
    }, (err, results) => {
        callback(err, oppoList);
    });
}
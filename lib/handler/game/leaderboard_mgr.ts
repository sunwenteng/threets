import async = require('async');

import Leaderboard = require('../../redis/leaderboard');
import log = require('../../util/log');
import Util = require('../../util/game_util');
import PlayerInfoMgr = require('../../cluster/player_info_mgr');

import Universal = require('./universal');
import HeroSuite = require('./hero/hero_suite');

export var arenaScoreLB = new Leaderboard('arenaScore', 'leaderboard', 'accountId', 'arenaScore');
export var arenaMatchLB = new Leaderboard('arenaMatch', 'leaderboard', 'accountId', 'matchScore');
export var bossDamageLB = new Leaderboard('bossDamage', 'leaderboard', 'accountId', 'bossDamage');
export var raidMatchLB  = new Leaderboard('raidMatch', 'leaderboard', 'accountId', 'matchScore');

export var LEADERBOARD_PAGE_SIZE:number = 10;   // 排行榜每页大小

export function initAllLeaderboard(cb:(err)=>void):void {

    async.waterfall([
        (next) => {
            arenaScoreLB.initAllRank(next);
        },
        (next) => {
            arenaMatchLB.initAllRank(next);
        },
        (next) => {
            bossDamageLB.initAllRank(next);
        }
    ], (err) => {
        cb(err);
    });
}

export function getStartPosByPage(page:number):number {
    return page ? (page - 1) * LEADERBOARD_PAGE_SIZE : 0;
}

export function getPageByRank(rank:number):number {
    return Math.ceil(rank / LEADERBOARD_PAGE_SIZE);
}

export function transformRedisRank(rank:number):number {
    return rank + 1;
}

export function fetchLeaderboardContent(leaderboard:Leaderboard,
                                        avatarType:Universal.AVATAR_TYPE,
                                        page:number,
                                        callback:(err, size:number, content:Universal.LeaderboardItem[])=>void):void {
    var start = getStartPosByPage(page);

    async.series([
        (next) => {
            leaderboard.fetchSize((err, size) => {
                if (size < start) {
                    next(new Error('pageBiggerThanSize'), size);
                } else {
                    next(null, size);
                }
            });
        },
        (next) => {
            leaderboard.fetchRange(start, start + LEADERBOARD_PAGE_SIZE - 1, (err, result) => {
                if (err) {
                    next(err, []);
                    return;

                }
                var i, len:number = Math.floor(result.length / 2);
                var contentMap:{[accountId:number]:any} = {};

                var item:Universal.LeaderboardItem = null;
                for (i = 0; i < len; i += 1) {
                    item = new Universal.LeaderboardItem();
                    item.accountId = parseInt(result[i * 2]);
                    item.score = parseInt(result[i * 2 + 1]);
                    item.rank = transformRedisRank(start + i);
                    contentMap[item.accountId] = item;
                }

                var playerList:string[] = Object.keys(contentMap);

                async.each(
                    playerList,
                    (key, next) => {
                        var item = contentMap[key];
                        PlayerInfoMgr.fetchNormalMode(item.accountId, HeroSuite.SuiteType.boss, (err, normalMode) => {
                            if (err)
                                return next();

                            Util.extend(item, normalMode);
                            next();
                        });
                    },
                    (err) => {
                        var result:Universal.LeaderboardItem[] = [];
                        playerList.forEach((player) => {
                            var t = contentMap[player];
                            result.push({
                                accountId: t.accountId,
                                avatar: {
                                    armorID: t.suite.armor.ID,
                                    armorLevel: t.suite.armor.level,
                                    hairType: t.avatar.hairType,
                                    hairColor: t.avatar.hairColor,
                                    faceType: t.avatar.faceType,
                                    skinColor: t.avatar.skinColor
                                },
                                level: t.basic.level,
                                username: t.basic.name,
                                achievementID: t.basic.achievementID,
                                score: t.score,
                                rank: t.rank
                            });
                        });
                        result.sort((a, b) => {
                            return a.rank - b.rank;
                        });
                        next(null, result);
                    }
                );
            });
        }
    ], (err, res:any) => {
        log.sWarn('LeaderBoard', 'fetchLeaderboardContent result: ' + JSON.stringify(res));
        callback(err, res[0], res[1]);
    });
}
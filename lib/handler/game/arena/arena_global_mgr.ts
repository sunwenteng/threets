// common
import async = require('async');
import pbstream = require('node-protobuf-stream');

// src/util
import Time = require('../../../util/time');
import Log = require('../../../util/log');
import Util = require('../../../util/game_util');
import Enum = require('../../../util/enum');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');

// src/redis
import RedisStruct = require('../../../redis/struct');

// src/database
//import CenterDB = require('../../../database/impl/center_db');
//import WorldDB = require('../../../database/impl/world_db');

// src/centerserver
import ArenaCenterDef = require('../../../service/arena/defines');

// src/gameserver
import RoleStruct = require('../role/role_struct');
//import GameWorld = require('../game_world');
import LeaderboardMgr = require('../leaderboard_mgr');
import Universal = require('../universal');
import HeroDef = require('../hero/defines');
import HeroSuite = require('../hero/hero_suite');
//import CenterClient = require('../center_client');
import Role = require('../role');

// src/handler/api/arena
import ArenaStruct = require('./arena_struct');
import ArenaDef = require('./defines');

import ConfigStruct = require('../../../config/struct/config_struct');

import ServieManager = require('../../../service/service_manager');

// src/share
var cm = require('../../../config').configMgr;

export var arenaTournament:ArenaCenterDef.ArenaTournament = new ArenaCenterDef.ArenaTournament();
export var top3player:RoleStruct.RoleAppearance[] = [];

export var MAX_REVENGE_SIZE:number = 3;
export var MAX_OPPONENT_SIZE:number = 8;

export var LEADERBOARD_PAGE_SIZE:number = 10;   // 排行榜每页大小

var winStreakCoeArray:{streak:number; coe:number;}[] = [];
var winStreakRewardMap:{[winStreak:number]:number} = {};
var milestoneGroups:{[groupId:number]:MilestoneGroup} = {};
var groupArray:ConfigStruct.arena_infoDB[] = [];

class Milestone {
    ID:number = 0;
    groupId:number = 0;
    score:number = 0;
}

class MilestoneGroup {
    groupId:number = 0;
    milestones:Milestone[] = [];

    constructor(groupId) {
        this.groupId = groupId;
        this.milestones = [];
    }

    public pushMilestoneConfig(config:ConfigStruct.arena_milestoneDB):void {
        if (config.gourp_id !== this.groupId) return;

        var milestone = new Milestone();
        milestone.ID = config.ID;
        milestone.groupId = config.gourp_id;
        milestone.score = config.milestone;
        this.milestones.push(milestone);
    }

    public sortMilestone():void {
        this.milestones.sort((a, b) => {
            return a.score - b.score;
        });
    }

    public getCanGainRewardIDs(milestone:number, haveGain:{[ID:number]:boolean}):number[] {
        var reward:number[] = [];
        for (var i = 0; i < this.milestones.length; i += 1) {
            if (this.milestones[i].score > milestone) break;
            if (haveGain[this.milestones[i].ID]) continue;
            reward.push(this.milestones[i].ID);
        }
        return reward;
    }
}

export function reloadConfig():void {

    // winStreak
    winStreakCoeArray = [];
    winStreakRewardMap = {};
    Object.keys(cm.arena_winstreakdb.all()).forEach((ID) => {
        var config = cm.arena_winstreakdb.get(ID);
        winStreakCoeArray.push({
            streak: config.name,    // 连胜次数
            coe: config.addition,   // 系数
        });
        winStreakRewardMap[config.name] = config.ID;
    });
    winStreakCoeArray.sort((a, b) => {
        return a.streak - b.streak;
    });


    // milestone
    milestoneGroups = {};
    Object.keys(cm.arena_milestonedb.all()).forEach((ID) => {
        var config = cm.arena_milestonedb.get(ID);
        if (!milestoneGroups[config.gourp_id]) {
            milestoneGroups[config.gourp_id] = new MilestoneGroup(config.gourp_id);
        }
        milestoneGroups[config.gourp_id].pushMilestoneConfig(config);
    });
    Object.keys(milestoneGroups).forEach((groupId) => {
        milestoneGroups[groupId].sortMilestone();
    });

    // groupArray
    groupArray = [];
    Object.keys(cm.arena_infodb.all()).forEach((ID) => {
        groupArray.push(cm.arena_infodb.get(ID));
    });
    groupArray.sort((a, b) => {
        // 0 在最后
        if (a.max === 0) return 1;
        if (b.max === 0) return -1;
        return a.max - b.max;
    });
    //console.log(groupArray);
}

export function initArenaTournament(callback:(err)=>void):void {
    arenaTournament = new ArenaCenterDef.ArenaTournament();

    pullArenaTournament((err, tournament) => {
        if (err) {
            arenaTournament.tournamentId = 0;
            Log.sError('Arena.Tournament', 'pullArenaTournament Error: ' + err.message);
            return callback(err);
        }

        arenaTournament = tournament;

        updateLastTournamentTop3(callback);
    });
}

function pullArenaTournament(callback:(err, remoteTournament)=>void):void {
    ServieManager.callRemote('arena:pullTournament', {}, (err, res) => {
        if (err) return callback(err, null);
        var remoteTournament = new ArenaCenterDef.ArenaTournament();
        remoteTournament.tournamentId   = res.arenaTournament.tournamentId;
        remoteTournament.startTime      = res.arenaTournament.startTime;
        remoteTournament.endTime        = res.arenaTournament.endTime;
        remoteTournament.progress       = res.arenaTournament.progress;
        Log.sInfo('Arena.Tournament.Pull', JSON.stringify(remoteTournament));
        callback(null, remoteTournament);
    });
}

export function updateArenaTournament(callback:(err)=>void):void {

    pullArenaTournament((err, remoteTournament) => {
        if (err) return callback(err);

        if (remoteTournament.tournamentId !== arenaTournament.tournamentId) {
            // broadcast all player start new arena
            Log.sInfo('Arena.Tournament.New', 'NewTournament, oldId=%d, newId=%d',
                arenaTournament.tournamentId, remoteTournament.tournamentId);
            updateLastTournamentTop3(()=>{});
            broadcastTournamentProgress();

            arenaTournament = remoteTournament;
            return callback(null);
        }

        if (remoteTournament.progress !== arenaTournament.progress) {
            Log.sInfo('Arena.Tournament.Progress', 'ProgressChange, %d => %d',
                arenaTournament.tournamentId, remoteTournament.tournamentId);
            broadcastTournamentProgress();
            arenaTournament = remoteTournament;
        }
        callback(null);
    });
}

export function writeType3RobotToRedis(tournamentId:number):void {
    //CenterDB.fetchTournamentHistoryRangeByRank(tournamentId, 100, 3000, (err, result:{accountId:number}[]) => {
    //    if (err) {
    //        return;
    //    }
    //
    //    var robotList:number[] = [];
    //    async.eachLimit(result, 20, (res, next) => {
    //        var accountId = res.accountId;
    //        if (Universal.isRobot(accountId)) {
    //            next(null);
    //            return ;
    //        }
    //
    //        WorldDB.isNewRole(accountId, (err, isNew) => {
    //            if (err || isNew) {
    //                next(null);
    //                return;
    //            }
    //
    //            CacheMgr.attachRole(accountId, (err, role) => {
    //                if (err) {
    //                    next(null);
    //                    return;
    //                }
    //
    //                // 不在线需要初始化内存数据
    //                if (!CacheMgr.isRoleOnline(role.accountId)) {
    //                    role.checkMemoryData();
    //                }
    //
    //                // write to reids
    //                var robotRO:RedisStruct.RobotRO = new RedisStruct.RobotRO(accountId);
    //                robotRO.accountId = accountId;
    //                robotRO.achievementId = role.getSundryValue(Enum.SUNDRY.ACHIEVEMENT_TITLE);
    //                robotRO.level = role.level;
    //                robotRO.username = role.username;
    //
    //                var hasHero:boolean = false;
    //                try {
    //                    role.arena.fightTeam.heros.forEach((heroUid, index) => {
    //                        var hero = role.heros.getHero(heroUid);
    //                        if (hero) {
    //                            var armorUid = hero.getArmor(HeroSuite.SuiteType.arena);
    //                            var armor = role.equips.getEquip(armorUid);
    //                            if (armor) {
    //                                robotRO['hero' + (index + 1) + 'armorID'] = armor.ID;
    //                                robotRO['hero' + (index + 1) + 'armorLevel'] = armor.level;
    //                                hasHero = true;
    //                            }
    //                        }
    //                    });
    //                } catch (err) {
    //                    Log.sError('Arena', 'get hero info Error: ' + err.stack);
    //                }
    //
    //                CacheMgr.detachRole(accountId, false);
    //
    //                if (hasHero) {
    //                    robotList.push(robotRO.accountId);
    //                    robotRO.hsetall((err, res) => {
    //                        next(null);
    //                    });
    //                } else {
    //                    next(null);
    //                }
    //            });
    //        });
    //    }, (err) => {
    //        if (err) {
    //            return ;
    //        }
    //        GameWorld.routeRequest('common.readRobotFromRole', {
    //            robotList: robotList
    //        }, (err, res) => {});
    //    });
    //});
}

export function canArenaTournamentFight():boolean {
    return arenaTournament ? arenaTournament.progress === ArenaCenterDef.TOURNAMENT_PROGRESS.PVP_START : false;
}

function updateLastTournamentTop3(callback:(err)=>void):void {
    //CenterDB.fetchArenaTopPlayer(3, (err, result) => {
    //    if (err) {
    //        callback(err);
    //        return;
    //    }
    //    result.forEach((res) => {
    //        if (!top3player[res.rank - 1]) {
    //            top3player[res.rank - 1] = new RoleStruct.RoleAppearance();
    //        }
    //        var tmp = top3player[res.rank - 1];
    //        tmp.accountId = res.accountId;
    //        tmp.level = res.level;
    //        tmp.username = res.username;
    //
    //        tmp.avatar.hairType = res.hairType;
    //        tmp.avatar.hairColor = res.hairColor;
    //        tmp.avatar.faceType = res.faceType;
    //        tmp.avatar.skinColor = res.skinColor;
    //        tmp.avatar.armorID = res.arenaArmorID;
    //        tmp.avatar.armorLevel = res.arenaArmorLevel;
    //    });
    //    Log.sInfo('Arena', 'updateLastTournamentTop3, %j', result);
    //    //CenterDB.fetchPlayerROInfo(result, (err, ))
    //    callback(null);
    //});
    callback(null);
}

function broadcastTournamentProgress():void {
    var M = pbstream.get('.Api.arena.updateTournamentInfo.Notify');
    var pck = new M({
        tournamentId: arenaTournament.tournamentId,
        tournamentProgress: arenaTournament.progress
    });
    //GameWorld.sendToWorld(pck);
}

export function randomOpponent(accountId:number, currentOpponents:number[], callback:(err, list:number[])=>void):void {
    var needRandom = 0;
    if (MAX_OPPONENT_SIZE > currentOpponents.length) needRandom = MAX_OPPONENT_SIZE - currentOpponents.length;

    if (needRandom === 0) {
        callback(null, []);
        return;
    }

    var leaderboard = LeaderboardMgr.arenaMatchLB;
    var oppoList:number[] = [];

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
            if (size > 10) {
                var per = rank / size * 100;
                var grade = 0, i, limit = [0, 10, 25, 45, 70, 100];

                if (per > 0) {
                    for (i = 1; i < limit.length; i += 1) {
                        if (limit[i] >= per) {
                            grade = i;
                            break;
                        }
                    }
                } else {
                    grade = limit.length - 1;
                }

                Log.uTrace(accountId, 'RandomOpponentDetail', 'grade=' + grade);

                start = Math.floor(size * limit[grade - 1] / 100);
                end = Math.floor(size * limit[grade] / 100);

                if (end < start + 10) {
                    end = start + 10;
                }
            } else {
                start = 0;
                end = size;
            }

            var tryCount = 0;
            async.until(() => {
                return needRandom <= 0 || tryCount >= 20;
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
                    if (!isNaN(oppoId) && accountId !== oppoId && currentOpponents.indexOf(oppoId) === -1) {
                        oppoList.push(oppoId);
                        --needRandom;
                    }
                    next(null);
                });
            }, (err) => {
                finalCallback(err);
            });
        }]
    }, (err, results) => {
        callback(err, oppoList);
    });
}

export function getWinStreakScoreCoe(winStreak:number):number {
    for (var i = 0; i < winStreakCoeArray.length; i += 1) {
        if (winStreakCoeArray[i].streak > winStreak) {
            return i === 0 ? 0 : winStreakCoeArray[i - 1].coe;
        }
    }
    if (winStreakCoeArray.length === 0) {
        return 0;
    }
    return winStreakCoeArray[winStreakCoeArray.length - 1].coe;
}

export function checkArenaOpen(role:Role):void {
    if (role.level < Universal.GLB_ARENA_OPEN_LEVEL) {
        throw new CustomError.UserError(ERRC.ARENA.LEVEL_NOT_ENOUGH, {
            msg: 'ARENA.LEVEL_NOT_ENOUGH, level=' + role.level + ', need=' + Universal.GLB_ARENA_OPEN_LEVEL
        });
    }
}

export function isArenaOpen(level:number):boolean {
    return level >= Universal.GLB_ARENA_OPEN_LEVEL;
}

// 获得连胜奖励
export function getWinStreakReward(winStreak:number):number {
    return winStreakRewardMap[winStreak];
}

// 获得可得里程碑奖励ID
export function getMilestoneRewardIDs(groupId:number, milestoneScore:number, haveGain:{[ID:number]:boolean}):number[] {
    if (!milestoneGroups[groupId]) return [];
    return milestoneGroups[groupId].getCanGainRewardIDs(milestoneScore, haveGain);
}

export function getGroupIDByRank(rank:number):number {
    if (rank <= 0) {
        return groupArray[groupArray.length - 1].ID;
    }

    for (var i = 0; i < groupArray.length; i += 1) {
        if (groupArray[i].max >= rank || groupArray[i].max === 0) {
            return groupArray[i].ID;
        }
    }
    return 0;
}

export function getGroupReward(groupID:number):Universal.Resource {
    var conf1 = cm.arena_infodb.get(groupID);
    var reward:Universal.Resource = {};
    for (var i = 1; i <= 4; i += 1) {
        if (conf1['item' + i] && conf1['item_num' + i] > 0) {
            reward[conf1['item' + i]] = conf1['item_num' + i];
        }
    }
    return reward;
}

export function stringifyAttackType(attackType:ArenaDef.ATTACK_TYPE):string {
    switch (attackType) {
        case ArenaDef.ATTACK_TYPE.NORMAL_ATTACK:
            return 'normal_attack';
        case ArenaDef.ATTACK_TYPE.POWER_ATTACK:
            return 'power_attack';
        default :
            return 'unknownAttackType';
    }
}

export function stringifyPvPType(pvpType:ArenaDef.PVP_FIGHT_TYPE):string {
    switch (pvpType) {
        case ArenaDef.PVP_FIGHT_TYPE.ARENA:
            return 'arena';
        case ArenaDef.PVP_FIGHT_TYPE.FRIEND:
            return 'friend';
        default :
            return 'unknownPvPType';
    }
}
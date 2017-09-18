// common
import async = require('async');

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
import BossCenterDef = require('../../../service/boss/defines');

// src/gameserver
import RoleStruct = require('../role/role_struct');
//import GameWorld = require('../game_world');
import LeaderboardMgr = require('../leaderboard_mgr');
import Universal = require('../universal');
import HeroDef = require('../hero/defines');
//import CenterClient = require('../center_client');
import Role = require('../role');
import Fight = require('../fight/fight');
import Simulation = require('../fight/simulation');
import FightDef = require('../fight/defines');

import ConfigStruct = require('../../../config/struct/config_struct');

import ServiceManager = require('../../../service/service_manager');

// src/share
var cm = require('../../../config').configMgr;

export var worldBoss:BossCenterDef.WorldBoss = new BossCenterDef.WorldBoss();

var bossLevelInfo:{[bossID:number]:{[level:number]:ConfigStruct.boss_abilityDB}} = {};
var rankGroupArray:ConfigStruct.boss_rankDB[] = [];
var rankRewardMap:{[groupID:number]:{[rankGroup:number]:ConfigStruct.boss_rewardDB}} = {};
var milestoneGroups:{[groupId:number]:MilestoneGroup} = {};

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

    public pushMilestoneConfig(config:ConfigStruct.boss_milestoneDB):void {
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

    public getCanGainRewardID(milestone:number):number {
        for (var i = 0; i < this.milestones.length; i += 1) {
            if (this.milestones[i].score === milestone) return this.milestones[i].ID;
        }
        return 0;
    }
}

export function reloadConfig():void {
    bossLevelInfo = {};
    Object.keys(cm.boss_abilitydb.all()).forEach((ID) => {
        var config = cm.boss_abilitydb.get(ID);
        if (!bossLevelInfo[config.monsterid]) {
            bossLevelInfo[config.monsterid] = {};
        }
        bossLevelInfo[config.monsterid][config.level] = config;
    });

    // rankGroupArray
    rankGroupArray = [];
    Object.keys(cm.boss_rankdb.all()).forEach((ID) => {
        rankGroupArray.push(cm.boss_rankdb.get(ID));
    });
    rankGroupArray.sort((a, b) => {
        // 0 在最后
        if (a.max === 0) return 1;
        if (b.max === 0) return -1;
        return a.max - b.max;
    });

    // boss_reward rankRewardMap
    rankRewardMap = {};
    Object.keys(cm.boss_rewarddb.all()).forEach((ID) => {
        var config = cm.boss_rewarddb.get(ID);

        if (!rankRewardMap[config.groupid]) {
            rankRewardMap[config.groupid] = {};
        }

        rankRewardMap[config.groupid][config.rankgroup] = config;
    });

    // milestone
    milestoneGroups = {};
    Object.keys(cm.boss_milestonedb.all()).forEach((ID) => {
        var config = cm.boss_milestonedb.get(ID);
        if (!milestoneGroups[config.gourp_id]) {
            milestoneGroups[config.gourp_id] = new MilestoneGroup(config.gourp_id);
        }
        milestoneGroups[config.gourp_id].pushMilestoneConfig(config);
    });
    Object.keys(milestoneGroups).forEach((groupId) => {
        milestoneGroups[groupId].sortMilestone();
    });

}

export function initWorldBoss(callback:(err)=>void):void {
    worldBoss = new BossCenterDef.WorldBoss();

    pullWorldBoss((err, remoteBoss) => {
        worldBoss = remoteBoss;
        callback(null);
    });
}

function pullWorldBoss(callback:(err, remoteBoss)=>void):void {

    ServiceManager.callRemote('boss:pullWorldBoss', {}, (err, res) => {
        if (err) return callback(err, null);
        var remoteBoss = new BossCenterDef.WorldBoss();
        remoteBoss.bossID         = res.worldBoss.bossID;
        remoteBoss.startTime      = res.worldBoss.startTime;
        remoteBoss.endTime        = res.worldBoss.endTime;
        remoteBoss.progress       = res.worldBoss.progress;
        Log.sInfo('Boss.WorldBoss.Pull', JSON.stringify(remoteBoss));
        callback(null, remoteBoss);
    });
}

export function updateWorldBoss(callback:(err)=>void):void {

    pullWorldBoss((err, remoteBoss:BossCenterDef.WorldBoss) => {
        if (err) return callback(err);

        if (remoteBoss.bossID !== worldBoss.bossID) {
            Log.sInfo('Boss.WorldBoss.New', 'NewBoss, oldId=%d, newId=%d',
                worldBoss.bossID, remoteBoss.bossID);
            broadcastBossProgressChange(callback);
            worldBoss = remoteBoss;
            return callback(null);
        }

        if (remoteBoss.progress !== worldBoss.progress) {
            Log.sInfo('Boss.WorldBoss.Progress', 'ProgressChange, %d => %d',
                worldBoss.progress, remoteBoss.progress);
            broadcastBossProgressChange(callback);
            worldBoss = remoteBoss;
        }
        callback(null);
    });

}

export function checkBossEnd():void {
    var now = Time.gameNow();
    if (now >= worldBoss.endTime) {
        throw new CustomError.UserError(ERRC.WORLD_BOSS.BOSS_HAS_EXPIRED, {
            msg: 'WORLD_BOSS.BOSS_HAS_EXPIRED, expired_second=' + (now - worldBoss.endTime)
        });
    }
}

function broadcastBossProgressChange(callback:(err)=>void):void {

    //var onlineList:string[] = GameWorld.getPlayerSessionKeyArray();    // 当前在线列表
    //
    //async.eachLimit(onlineList, 20, (key, cbLimit) => {
    //    var session = GameWorld.getPlayerSession(key);
    //    if (session && session['role'] &&
    //        session['role']['level'] >= Universal.GLB_WORLD_BOSS_OPEN_LEVEL) {
    //
    //        var role:Role = session['role'];
    //        async.waterfall([
    //            (next) => {
    //                if (worldBoss.progress === BossCenterDef.PROGRESS.START) {
    //                    // 这步会有耗时，因为CenterDB将收到所有服务器在线用户的boss排行榜查询
    //                    // 每个服务器同一时间20条查询上限
    //                    // 另外，之后较短时间内上线的也会进行CenterDB查询
    //                    // 视情况调整上面eachLimit里面的参数限制:20
    //                    role.boss.checkRefreshBoss(role, (err) => {
    //                        if (err) {
    //                            Log.uError(role.accountId, 'BossProgress', 'role.boss.checkRefreshBoss Error: ' + err.message);
    //                        }
    //                        next(null);
    //                    });
    //                } else {
    //                    next(null);
    //                }
    //            }
    //        ], (err) => {
    //            if (role && role.boss) {
    //                role.sendPacket(role.boss.buildNewBossNetMsg());
    //            }
    //            cbLimit(err);
    //        });
    //
    //    } else {
    //        // 无效session
    //        cbLimit(null);
    //    }
    //}, (err) => {
    //    callback(err);
    //});
}

function startNewBoss():void {

}

export function isBossOpen(level:number):boolean {
    return level >= Universal.GLB_WORLD_BOSS_OPEN_LEVEL;
}

export function getBossLevelInfo(bossID:number, level:number):ConfigStruct.boss_abilityDB {
    if (!bossLevelInfo[bossID]) return null;
    return bossLevelInfo[bossID][level];
}

export function getBossLevelHp(bossID:number, level:number):number {
    if (!bossLevelInfo[bossID] || !bossLevelInfo[bossID][level]) return 0;
    return bossLevelInfo[bossID][level].hp;
}

export function createPlayerByBoss(bossID:number, bossLevel:number, leftHp:number):Simulation.Player {
    var monster = cm.monsterdb.get(bossID);
    var player = Fight.createPlayerByMonster(monster);

    var cfg = getBossLevelInfo(bossID, bossLevel);
    if (!cfg) return null;

    player.playerType = FightDef.PlayerType.BOSS;
    player.level = bossLevel;
    player.currentHp = leftHp;
    player.maxHp = cfg.hp;
    player.attack = cfg.atk;
    player.defence = cfg.def;
    return player;
}

export function getRankGroupIDByRank(rank:number):number {
    if (rank <= 0) {
        return rankGroupArray[rankGroupArray.length - 1].ID;
    }

    for (var i = 0; i < rankGroupArray.length; i += 1) {
        if (rankGroupArray[i].max >= rank || rankGroupArray[i].max === 0) {
            return rankGroupArray[i].ID;
        }
    }
    return 0;
}

export function getRankGroupReward(groupID:number, rankGroup:number):Universal.Resource {
    var reward:Universal.Resource = {};
    if (rankRewardMap[groupID]) {
        var config = rankRewardMap[groupID][rankGroup];
        if (config) {
            for (var i = 1; i <= 4; i += 1) {
                if (config['item' + i] && config['item_num' + i] > 0) {
                    reward[config['item' + i]] = config['item_num' + i];
                }
            }
        }
    }
    return reward;
}

export function getRankRewardID(groupID:number, rankGroup:number):number {
    if (rankRewardMap[groupID]) {
        var config = rankRewardMap[groupID][rankGroup];
        if (config) {
            return config.ID;
        }
    }
    return 0;
}

// 获得可得里程碑奖励ID
export function getMilestoneRewardID(groupId:number, milestoneScore:number):number {
    if (!milestoneGroups[groupId]) return 0;
    return milestoneGroups[groupId].getCanGainRewardID(milestoneScore);
}

export function getMilestoneReward(milestoneID:number):Universal.Resource {
    var config = cm.boss_milestonedb.get(milestoneID);
    var reward:Universal.Resource = {};
    if (config) {
        for (var i = 1; i <= 4; i += 1) {
            if (config['item' + i] && config['item_num' + i] > 0) {
                reward[config['item' + i]] = config['item_num' + i];
            }
        }
    }
    return reward;
}
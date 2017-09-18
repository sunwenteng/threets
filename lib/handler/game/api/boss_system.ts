import async = require('async');
import pb = require('node-protobuf-stream');

// src/util
import log = require('../../../util/log');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Enum = require('../../../util/enum');
import Time = require('../../../util/time');

// src/database
//import WorldDB = require('../../../database/impl/world_db');

// src/gameserver
import Role = require('../role');
//import CenterClient = require('../center_client');
import Universal = require('../universal');
import LeaderboardMgr = require('../leaderboard_mgr');
import Fight = require('../fight/fight');
import Simulation = require('../fight/simulation');

// src/handler/api/**
import RoleStruct = require('../role/role_struct');
import ResourceMgr = require('../resource/resource_mgr');
import BossGlobalMgr = require('./../boss/boss_global_mgr');
import TimeDef = require('../time/defines');
//import BossDef = require('./defines');

var cm = require('../../../config').configMgr;

export function initSystem(callback:(err)=>void):void {
    BossGlobalMgr.initWorldBoss(callback);
}

export function sendOnlinePacket(role:Role):void {
    role.boss.sendOnlinePacket(role);
}

export function initInfo(role:Role, packet:any, done):void {
    role.boss.fetchScoreAndRank(role.accountId, (err, rank, score) => {
        if (err) {
            return done(new CustomError.UserError(ERRC.REDIS.CAN_NOT_FETCH_SCORE_AND_RANK, {
                msg: 'REDIS.CAN_NOT_FETCH_SCORE_AND_RANK'
            }));
        }
        if (score) {
            role.boss.bossData.score = score;
        }

        var pck:any = {};
        pck.score = rank || 0;
        pck.rank = score || 0;

        done(null, pck);
    });
}

export function selectTeam(role:Role, packet:any, done):void {
    var team = packet.team;
    role.boss.selectTeam(role, team);

    done(null, {
        hireFriendList: role.boss.getHireHeroBattleData()
    });
}

export function startFight(role:Role, packet:any, done):void {
    var bossMgr = role.boss;
    BossGlobalMgr.checkBossEnd();

    if (!BossGlobalMgr.isBossOpen(role.level) || !bossMgr.isBossActive(Time.gameNow())) {
        bossMgr.bossData.isActive = false;
        role.sendPacket(role.boss.buildInitNetMsg(role));
        throw new CustomError.UserError(ERRC.WORLD_BOSS.BOSS_NOT_ACTIVE, {
            msg: 'WORLD_BOSS.BOSS_NOT_ACTIVE'
        });
    }

    var totalKight:number = bossMgr.fightTeam.heros.length + bossMgr.fightTeam.hires.length;
    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.BOSS_ENERGY] = cm.boss_energydb.get(totalKight).energy;

    // 扣除资源  资源不足会抛异常
    ResourceMgr.checkHasEnoughResource(role, consume);
    bossMgr.startFight(role);
    ResourceMgr.minusConsume(role, Enum.USE_TYPE.BOSS_START_FIGHT, consume);

    // Boss Energy
    var now = Time.gameNow();
    var current = role.getResCount(Enum.RESOURCE_TYPE.BOSS_ENERGY);
    if (current < Universal.GLB_BOSS_MAX_ENERGY && !role.bossEnergyCounter) {
        role.bossEnergyCounter = new Time.RoundCounter(Enum.BOSS_ENERGY_RECOVERY_INTERVAL);
        role.bossEnergyCounter.setStart(now);
    }

    if (role.boss.fightTeam.hires.length > 0) {
        log.uInfo(role.accountId, 'HireFriend', {
            hireType: 'boss',
            hireList: JSON.stringify(role.boss.fightTeam.hires)
        });
    }

    var pck = {
        randomSeed: bossMgr.currentFight.getRandomSeed(),
        leftSlay: bossMgr.currentFight.getLeftSlay(),
        bossEnergyNextTime: role.bossEnergyCounter ? role.bossEnergyCounter.leftSecondForCount(now, 1) : 0,
        fightLootArray: []
    };

    var optionalLootArray = bossMgr.getOptionalLootArray();
    optionalLootArray.forEach((option) => {
        pck.fightLootArray.push({
            normalLoot: option.normalLoot.buildInitNetMsg(),
            specialLoot: option.specialLoot.buildInitNetMsg()
        });
    });

    role.sendUpdatePacket(true);
    done(null, pck);
}

export function finishFight(role:Role, packet:any, done):void {
    var result = packet.result;
    var totalRound = packet.totalRound;
    var roundContext:Simulation.RoundContext = new Simulation.RoundContext();
    roundContext.useSlayRound = Fight.transformClientRoundToServer(packet.useSlayRound);
    roundContext.restoreRound = Fight.transformClientRoundToServer(packet.restoreRound);
    roundContext.specialRound = Fight.transformClientRoundToServer(packet.specialRound);

    var bossMgr = role.boss,
        bossData = bossMgr.bossData;
    if (bossData.bossID !== BossGlobalMgr.worldBoss.bossID) {
        throw new CustomError.UserError(ERRC.WORLD_BOSS.BOSS_ID_ERROR, {
            msg: 'WORLD_BOSS.BOSS_ID_ERROR, bossID=' + bossData.bossID + ', currentID=' + BossGlobalMgr.worldBoss.bossID
        });
    }

    bossMgr.finishFight(role, roundContext, totalRound, result, (err, scoreResult) => {

        var fightLoot = bossMgr.getFightLoot();
        if (fightLoot) {
            ResourceMgr.applyReward(role, Enum.USE_TYPE.BOSS_FINISH_FIGHT, fightLoot.resource);
            bossMgr.clearFightLoot();
        }

        role.sendUpdatePacket(true);

        role.sendPacket(role.boss.buildInitNetMsg(role));
        done(null, {
            damageDone: scoreResult.damageDone,
            totalDamage: scoreResult.totalDamage,
            damageRank: scoreResult.damageRank,
            killCount: scoreResult.killCount,
            milestoneRewardID: scoreResult.milestoneRewardID
        });
    });
}

export function rankList(role:Role, packet:any, done):void {
    var page = packet.page;

    var leaderboard = LeaderboardMgr.bossDamageLB;

    var pck:any = {};
    async.waterfall([
        (next) => {
            if (page === 0) {
                leaderboard.queryRank(role.accountId, (err, rank) => {
                    if (err) return next(err, null);

                    if (rank === 0) {
                        // when self rank equal 0, return 1st page
                        next(null, 1);
                    } else {
                        next(null, LeaderboardMgr.getPageByRank(rank));
                    }
                });
            } else {
                next(null, page);
            }
        },
        (page, next) => {
            LeaderboardMgr.fetchLeaderboardContent(leaderboard, Universal.AVATAR_TYPE.BOSS, page, (err, size, result) => {
                if (err) {
                    log.sError('Boss', 'rankList error ' + err.stack);
                    pck.error = {
                        code: ERRC.REDIS.FETCH_LEADERBOARD_ERROR
                    };
                    role.sendPacket(pck);
                    next(err);
                    return;
                }
                pck.roles = result;
                pck.currentPage = page;
                pck.totalPage = LeaderboardMgr.getPageByRank(size);
                next(null, pck);
            });
        }
    ], (err, pck) => {
        done(err, pck);
    });
}
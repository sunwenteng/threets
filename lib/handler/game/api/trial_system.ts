import pb = require('node-protobuf-stream');

// src/util
import log = require('../../../util/log');
import Util = require('../../../util/game_util');
import Enum = require('../../../util/enum');
import Time = require('../../../util/time');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');

// src/gameserver
import Role = require('../role');
import DungeonFight = require('../fight/dungeon_fight');
import Universal = require('../universal');
import ResourceMgr = require('../resource/resource_mgr');
import FightDef = require('../fight/defines');
import QuestDef = require('../quest/defines');
import AchievementDef = require('../achievement/defines');
import HeroDef = require('../hero/defines');
import Fight = require('../fight/fight');
import Simulation = require('../fight/simulation');
import BossGlobalMgr = require('../boss/boss_global_mgr');

// config
import Config = require('../../../config');
import HeroSuite = require('../hero/hero_suite');
import TrialFight = require('./../trial/trial_fight');

var cm = Config.configMgr;

export function initList(role:Role, packet:any, done):void {
    var trialMgr = role.trials;

    var leftRefreshSecond = trialMgr.getLeftRefreshSecond();
    if (!leftRefreshSecond) {
        trialMgr.refreshTrials();
    }

    var trialList = Object.keys(trialMgr.trialData).map((key) => {
        return trialMgr.trialData[key].toNetMsg();
    });

    done(null, {
        trialList: trialList,
        leftRefreshSecond: leftRefreshSecond,
        team: trialMgr.fightTeam,
        currentTrialID: trialMgr.currentFight ? trialMgr.currentFight.trialID : 0
    });
}

// 协议方法
export function fightStart(role:Role, packet:any, done):void {
    var trialMgr = role.trials;
    trialMgr.startFight();

    trialMgr.roleLevel = role.level;

    // 设置不能回血
    if (role.healthCounterMap[HeroSuite.SuiteType.trial]) {
        role.healthCounterMap[HeroSuite.SuiteType.trial] = null;
    }

    var pck:any = {
        randomSeed: trialMgr.getRandomSeed(),
        leftSlay: trialMgr.getLeftSlay(),
        fightLootArray: []
    };
    var optionalLootArray = trialMgr.getOptionalLootArray();
    optionalLootArray.forEach((option) => {
        pck.fightLootArray.push({
            normalLoot: option.normalLoot.buildInitNetMsg(),
            specialLoot: option.specialLoot.buildInitNetMsg()
        })
    });

    done(null, pck);
}

// 协议方法
export function fightFinish(role:Role,
                            packet:{result:number; totalRound:number;
                                useSlayRound:number[]; restoreRound:number[]; specialRound:number[]},
                            done):void {
    var result = packet.result;
    var totalRound = packet.totalRound;
    var roundContext:Simulation.RoundContext = new Simulation.RoundContext();
    roundContext.useSlayRound = Fight.transformClientRoundToServer(packet.useSlayRound);
    roundContext.restoreRound = Fight.transformClientRoundToServer(packet.restoreRound);
    roundContext.specialRound = Fight.transformClientRoundToServer(packet.specialRound);

    var trialMgr = role.trials,
        currentWave = trialMgr.currentFight ? trialMgr.currentFight.hasFinishedWave + 1 : 0;

    trialMgr.finishFight(role, result, totalRound, roundContext);

    // 设置英雄当前血量
    // 必须放在给奖励之前，因为可以给经验，导致升级回满血
    // 放在奖励之后会覆盖升级的满血血量
    var leftHealth = trialMgr.getLeftHeroHealth(), i, hero;
    for (i = 0; i < leftHealth.length; i += 1) {
        hero = role.heros.getHero(leftHealth[i].uid);
        if (hero) {
            hero.setHealth(HeroSuite.SuiteType.trial, leftHealth[i].currentHp <= 0 ? 1 : leftHealth[i].currentHp);
        } else {
            log.uError(role.accountId, 'DungeonFightFinish', 'NotExpectError, RoleHeroNotFound, uid=' + i);
        }
    }

    var trialID = trialMgr.currentFight.trialID;
    var fightLoot = trialMgr.getFightLoot();
    log.uInfo(role.accountId, 'TrialFightResult', {
        trialID: trialID,
        currentWave: currentWave,
        totalWave: TrialFight.getTrialWaveCount(trialID),
        result: Fight.stringifyResult(result),
        restoreCount: packet.restoreRound.length,
        paySpecialCount: packet.specialRound.length,
        fightLoot: fightLoot ? fightLoot.toString() : {}
    });

    if (fightLoot) {
        if (result === FightDef.RESULT.VICTORY) {
            ResourceMgr.applyReward(role, Enum.USE_TYPE.TRIAL_FINISH_FIGHT, fightLoot.resource);
        }
        trialMgr.clearFightLoot();
    }

    if (role.level > trialMgr.roleLevel) {    // 中间有升级
        trialMgr.setRightDeathCount(0);
    }

    // 设置可以回血
    var now = Time.gameNow();
    role.healthCounterMap[HeroSuite.SuiteType.trial] = new Time.RoundCounter(Universal.GLB_REVIVE_HEALTH_INTERVAL);
    role.healthCounterMap[HeroSuite.SuiteType.trial].setStart(now);

    role.sendUpdatePacket(true);

    done(null, {
        hasFinishedWave: trialMgr.getHasFinishedWave(),
        rightDeathCount: trialMgr.getRightDeathCount(),
    });
}

// 协议方法
export function startTrial(role:Role, packet:any, done):void {
    var trialID = packet.trialID,
        team = packet.team;

    var trialMgr = role.trials;

    var trial = trialMgr.getTrial(trialID);
    var leftSecond = Time.calcLeftSecond(trial.lastVicTime, Universal.GLB_TRIAL_INTERVAL_PER_VICTORY);
    if (leftSecond > 0) {
        throw new CustomError.UserError(ERRC.TRIAL.IS_IN_COOLDOWN, {
            msg: 'TRIAL.IS_IN_COOLDOWN, leftSecond=' + leftSecond
        });
    }

    if (!team) {
        team = trialMgr.fightTeam;
    }

    trialMgr.startTrial(role, trialID, team);

    if (team.hires.length > 0) {
        //log.uInfo(role.accountId, 'HireFriend', {
        //    hireType: 'dungeon',
        //    hireList: JSON.stringify(team.hires)
        //});
    }

    done(null, {
        trialID: trialID,
        team: trialMgr.fightTeam,
        hasFinishedWave: trialMgr.getHasFinishedWave(),
        rightDeathCount: trialMgr.getRightDeathCount()
    });
}

// 协议方法
export function finishTrial(role:Role, packet:any, done):void {
    var trialMgr = role.trials;
    var trialID = trialMgr.currentFight ? trialMgr.currentFight.trialID : 0;
    trialMgr.finishTrial();

    var config = cm.experimentdb.get(trialID);

    var reward:Universal.Resource = {};
    config.JSON_reward.forEach((res:any) => {
        reward[res.resID] = res.count;
    });
    ResourceMgr.applyReward(role, Enum.USE_TYPE.TRIAL_FINISH_TRIAL, reward);

    role.heros.recoverAllHeroHealth(HeroSuite.SuiteType.trial);

    role.sendUpdatePacket(true);

    var now = Time.gameNow();

    var trial = trialMgr.getTrial(trialID);
    trial.lastVicTime = now;
    trial.victoryCount += 1;

    if (!trialMgr.firstVictoryTime) {
        trialMgr.firstVictoryTime = now;
    }

    done(null, {
        reward: Universal.tranResourceToRewardList(reward),
        updateTrial: trial.toNetMsg(),
        leftRefreshSecond: trialMgr.getLeftRefreshSecond()
    });
}

export function abandonProcess(role:Role, packet:any, done):void {
    role.trials.abandonProcess();
    role.heros.recoverAllHeroHealth(HeroSuite.SuiteType.trial);
    role.heros.sendUpdatePacket(role);

    done();
}

export function useSpecial(role:Role, packet:any, done):void {
    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.DIAMOND] = Universal.GLB_USE_SPECIAL_DIAMOND;
    ResourceMgr.applyConsume(role, Enum.USE_TYPE.TRIAL_USE_SPECIAL, consume);

    role.sendUpdatePacket(true);
    done();
}

export function sendOnlinePacket(role:Role):void {
}

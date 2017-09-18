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
import DungeonMgr = require('./../battle/dungeon_mgr');
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

var cm = Config.configMgr;

export function initSystem():void {
}

// 协议方法
export function fightStart(role:Role, packet:any, done):void {
    var dungeonMgr = role.dungeons;
    dungeonMgr.startFight();

    dungeonMgr.roleLevel = role.level;
    // 设置不能回血
    if (role.healthCounterMap[HeroSuite.SuiteType.dungeon]) {
        role.healthCounterMap[HeroSuite.SuiteType.dungeon] = null;
    }

    var pck = {
        randomSeed: dungeonMgr.getRandomSeed(),
        leftSlay: dungeonMgr.getLeftSlay(),
        fightLootArray: []
    };
    var optionalLootArray = dungeonMgr.getOptionalLootArray();
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

    var dungeonMgr = role.dungeons,
        currentWave = dungeonMgr.currentFight ? dungeonMgr.currentFight.hasFinishedWave + 1 : 0;

    dungeonMgr.finishFight(role, result, totalRound, roundContext);

    // 设置英雄当前血量
    // 必须放在给奖励之前，因为可以给经验，导致升级回满血
    // 放在奖励之后会覆盖升级的满血血量
    var leftHealth = dungeonMgr.getLeftHeroHealth(), i, hero;
    for (i = 0; i < leftHealth.length; i += 1) {
        hero = role.heros.getHero(leftHealth[i].uid);
        if (hero) {
            hero.setHealth(HeroSuite.SuiteType.dungeon, leftHealth[i].currentHp <= 0 ? 1 : leftHealth[i].currentHp);
        } else {
            log.uError(role.accountId, 'DungeonFightFinish', 'NotExpectError, RoleHeroNotFound, uid=' + i);
        }
    }

    var stageID = dungeonMgr.currentFight.stageID;
    var fightLoot = dungeonMgr.getFightLoot();
    log.uInfo(role.accountId, 'DungeonFightResult', {
        stageID: stageID,
        currentWave: currentWave,
        totalWave: DungeonFight.getStageWaveCount(stageID),
        result: Fight.stringifyResult(result),
        restoreCount: packet.restoreRound.length,
        paySpecialCount: packet.specialRound.length,
        fightLoot: fightLoot ? fightLoot.toString() : {}
    });

    if (fightLoot) {
        if (result === FightDef.RESULT.VICTORY) {
            ResourceMgr.applyReward(role, Enum.USE_TYPE.BATTLE_FINISH_FIGHT, fightLoot.resource);
        }
        dungeonMgr.clearFightLoot();
    }

    if (role.level > dungeonMgr.roleLevel) {    // 中间有升级
        dungeonMgr.setRightDeathCount(0);
    }

    // 设置可以回血
    var now = Time.gameNow();
    role.healthCounterMap[HeroSuite.SuiteType.dungeon] = new Time.RoundCounter(Universal.GLB_REVIVE_HEALTH_INTERVAL);
    role.healthCounterMap[HeroSuite.SuiteType.dungeon].setStart(now);

    role.sendUpdatePacket(true);

    var hasBossActive = false;
    if (BossGlobalMgr.worldBoss.bossID > 0 &&
        result === FightDef.RESULT.VICTORY &&
        !dungeonMgr.isAllWaveFinished() &&
        !role.boss.isBossActive(now)) {

        var bossConf = cm.boss_infodb.get(BossGlobalMgr.worldBoss.bossID);
        var chance = Util.randChance();
        if (chance * 100 < bossConf.rate) {
            role.boss.bossData.activeBoss(now);
            role.sendPacket(role.boss.buildInitNetMsg(role));
            hasBossActive = true;
        }
    }

    done(null, {
        hasFinishedWave: dungeonMgr.getHasFinishedWave(),
        monsterGroupID: dungeonMgr.getCurrentMonsterGroupID(),
        rightDeathCount: dungeonMgr.getRightDeathCount(),
        hasBossActive: hasBossActive
    });
}

// 协议方法
export function dungeonStart(role:Role, packet:any, done):void {
    var stageID = packet.stageID,
        team = packet.team;

    var dungeonMgr = role.dungeons;
    if (!team) {
        team = dungeonMgr.fightTeam;
    }

    dungeonMgr.startBattle(role, stageID, team);

    if (team.hires.length > 0) {
        log.uInfo(role.accountId, 'HireFriend', {
            hireType: 'dungeon',
            hireList: JSON.stringify(team.hires)
        });
    }

    done(null, {
        stageID: stageID,
        team: dungeonMgr.fightTeam,
        hasFinishedWave: dungeonMgr.getHasFinishedWave(),
        monsterGroupID: dungeonMgr.getCurrentMonsterGroupID(),
        hireFriendList: dungeonMgr.getHireHeroBattleData(),
        rightDeathCount: dungeonMgr.getRightDeathCount()
    });
}

// 协议方法
export function dungeonFinish(role:Role, packet:any, done):void {
    var dungeonMgr = role.dungeons;
    var stageID = dungeonMgr.currentFight ? dungeonMgr.currentFight.stageID : 0;
    dungeonMgr.finishBattle();

    var config = cm.stagedb.get(stageID);

    role.addExp(config.exp);

    role.quests.updateQuest(role, QuestDef.CriteriaType.UNLOCK_CHAPTER, [dungeonMgr.completeHighestStageID], 1);
    role.quests.updateQuest(role, QuestDef.CriteriaType.STAGE_PASS_N_COUNT, [stageID], 1);

    role.achievements.updateAchievement(role, AchievementDef.TYPE.UNLOCK_N_CHAPTER, dungeonMgr.getCompleteMaxChapter());
    role.achievements.updateAchievement(role, AchievementDef.TYPE.WIN_N_BATTLES, 1);

    role.sendUpdatePacket(false);
    role.equips.sendUpdatePacket(role); // 装备在英雄前面
    role.heros.sendUpdatePacket(role);
    role.quests.sendUpdatePacket(role);
    role.achievements.sendUpdatePacket(role);

    done(null, {
        exp: config.exp,
        completeHighestStageID: dungeonMgr.completeHighestStageID
    });
}

export function abandonProcess(role:Role, packet:any, done):void {
    role.dungeons.abandonProcess();
    done();
}

export function recoverHp(role:Role, packet:any, done):void {
    var heroUid = packet.heroUid,
        useResID = packet.useResID;

    var hero = role.heros.getHero(heroUid);

    switch (useResID) {
        case Enum.RESOURCE_TYPE.HEAL_BOTTLE:
        {
            var itemCount = role.getResCount(Enum.RESOURCE_TYPE.HEAL_BOTTLE);
            if (itemCount < 1) {
                throw new CustomError.UserError(ERRC.RESOURCE.NOT_ENOUGH, {
                    msg: 'RESOURCE.NOT_ENOUGH, resID=6500',
                    param: [Enum.RESOURCE_TYPE.HEAL_BOTTLE]
                });
            }
            role.setResCount(Enum.RESOURCE_TYPE.HEAL_BOTTLE, itemCount - 1);
            log.uInfo(role.accountId, 'UseHealBottle', {
                resId: Enum.RESOURCE_TYPE.HEAL_BOTTLE,
                count: 1
            });
            hero.addHealth(HeroSuite.SuiteType.dungeon, Universal.GLB_RECOVER_HEALTH_COUNT);
            break;
        }
        case Enum.RESOURCE_TYPE.DIAMOND:
        {
            var property = hero.getSuiteProperty(HeroSuite.SuiteType.dungeon);
            var delta = property[HeroDef.PROPERTY.HP] - property[HeroDef.PROPERTY.CURRENT_HP];
            if (!isNaN(delta) && delta > 0) {
                var consume:Universal.Resource = {};
                consume[Enum.RESOURCE_TYPE.DIAMOND] = Universal.GLB_RECOVER_HEALTH_DIAMOND;
                ResourceMgr.applyConsume(role, Enum.USE_TYPE.BATTLE_RECOVER_HEALTH, consume);

                hero.recoverHealth(HeroSuite.SuiteType.dungeon);
            }
            break;
        }
        default :
        {
            break;
        }
    }

    role.sendUpdatePacket(true);

    done();
}

export function restoreHealth(role:Role, packet:any, done):void {
    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.DIAMOND] = Universal.GLB_DUNGEON_RESTORE_HEALTH_DIAMOND;
    ResourceMgr.applyConsume(role, Enum.USE_TYPE.BATTLE_RESTORE_HEALTH, consume);

    role.sendUpdatePacket(true);
    done();
}

export function useSpecial(role:Role, packet:any, done):void {
    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.DIAMOND] = Universal.GLB_USE_SPECIAL_DIAMOND;
    ResourceMgr.applyConsume(role, Enum.USE_TYPE.BATTLE_USE_SPECIAL, consume);

    role.sendUpdatePacket(true);
    done();
}

export function sendOnlinePacket(role:Role):void {
    sendRoleInitDungeon(role);
    sendRoleInitBattle(role);
}

export function sendRoleInitBattle(role:Role):void {
    var pck:any = {};
    if (role.dungeons.isFighting()) {
        pck.isFighting = true;
        pck.fightSeed = role.dungeons.getRandomSeed();
        pck.fightType = FightDef.TYPE.PVE;
    } else if (role.boss.isFighting()) {
        pck.isFighting = true;
        pck.fightSeed = role.boss.getRandomSeed();
        pck.fightType = FightDef.TYPE.PVE_EPIC_BOSS;
    } else if (role.summonBoss.isFighting()) {
        pck.isFighting = true;
        pck.fightSeed = role.summonBoss.getRandomSeed();
        pck.fightType = FightDef.TYPE.PVE_CALL_BOSS;
    } else if (role.trials.isFighting()) {
        pck.isFighting = true;
        pck.fightSeed = role.trials.getRandomSeed();
        pck.fightType = FightDef.TYPE.TRIAL;
    }
    else {
        pck.isFighting = false;
    }
    var M = pb.get('.Api.role.initBattle.Notify');
    role.sendPacket(new M(pck));
}

export function sendRoleInitDungeon(role:Role):void {
    var dungeonMgr = role.dungeons;

    var M = pb.get('.Api.role.initDungeon.Notify');
    var pck = new M({
        completeHighestStageID: dungeonMgr.completeHighestStageID,
        currentStage: dungeonMgr.getCurrentStageID(),
        team: dungeonMgr.fightTeam
    });
    role.sendPacket(pck);
}
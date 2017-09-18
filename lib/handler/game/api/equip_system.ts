
// src/util
import log = require('../../../util/log');
import Util = require('../../../util/game_util');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Enum = require('../../../util/enum');
import Time = require('../../../util/time');

// src/gameserver
import HeroDef = require('../hero/defines');
import Universal = require('../universal');
import QuestDef = require('../quest/defines');
import AchievementDef = require('../achievement/defines');
import ResourceMgr = require('../resource/resource_mgr');
import Role = require('../role');
import Hero = require('../hero/hero');
import HeroSystem = require('./hero_system');
import HeroSuite = require('../hero/hero_suite');

// src/handler/api/equip
import Equip = require('./../equip/equip');

// 配表
var cm = require('../../../config').configMgr;

export function initSystem():void {
}

export function sendOnlinePacket(role:Role) {
    var now = Time.gameNow();
    role.sendPacket(role.equips.buildInitEquipNetMsg());
    role.sendPacket(role.equips.buildInitCraftTaskNetMsg(now));
    role.sendPacket(role.equips.buildInitHandBook());
}

export function doCraftTask(role:Role, packet:any, done) {
    var buildUid = packet.buildUid;
    var craftID = packet.craftID;

    var build = role.builds.getBuild(buildUid);
    if (!build) {
        throw new CustomError.UserError(ERRC.BUILD.UID_NOT_FOUND, {
            msg: 'BUILD.UID_NOT_FOUND, UID=' + buildUid
        });
    }

    if (role.equips.existTaskInBuild(buildUid)) {
        throw new CustomError.UserError(ERRC.EQUIP.HAS_CRAFT_TASK_IN_BUILD, {
            msg: 'EQUIP.HAS_CRAFT_TASK_IN_BUILD, buildUid=' + buildUid
        });
    }

    var craftSkill = cm.craftskilldb.get(craftID);

    // judge material
    var consume:{[resId:number]:number} = {};
    consume[craftSkill.shardID] = craftSkill.shardQu;
    consume[Enum.RESOURCE_TYPE.GOLD] = craftSkill.coinCost;

    ResourceMgr.checkHasEnoughResource(role, consume);

    // all is ok
    var now = Time.gameNow();
    var craftTask = role.equips.createCraftTask(build, craftID, now);
    ResourceMgr.minusConsume(role, Enum.USE_TYPE.EQUIP_CRAFT_EQUIP, consume);

    if (consume[Enum.RESOURCE_TYPE.GOLD] > 0) {
        role.achievements.updateAchievement(role, AchievementDef.TYPE.CONSUME_GOLD_ON_EQUIP, consume[Enum.RESOURCE_TYPE.GOLD]);
    }

    role.sendUpdatePacket(true);
    done(null, {
        craftTask: craftTask.buildInitNetMsg(now)
    });
}

export function finishCraftTask(role:Role, packet:any, done) {
    var buildUid = packet.buildUid;
    var build = role.builds.getBuild(buildUid);
    if (!build) {
        throw new CustomError.UserError(ERRC.BUILD.UID_NOT_FOUND, {
            msg: 'BUILD.UID_NOT_FOUND, UID=' + buildUid
        });
    }

    var craftTask = role.equips.getCraftTask(buildUid);

    var now = Time.gameNow();
    if (!craftTask.isFinished(now)) {
        var leftTime = craftTask.getLeftTime(now);
        throw new CustomError.UserError(ERRC.EQUIP.CRAFT_TASK_NOT_FINISHED, {
            msg: 'EQUIP.CRAFT_TASK_NOT_FINISHED, buildUid=' + buildUid,
            param: [buildUid, leftTime]
        });
    }

    var equipID = craftTask.getEquipID();
    role.equips.deleteCraftTask(buildUid);
    var equip = role.equips.createEquip(equipID);
    var equipConfig = cm.equipdb.get(equip.ID);

    role.quests.updateQuest(role, QuestDef.CriteriaType.CRAFT_N_EQUIP_A, [equipConfig.groupID], 1);

    role.achievements.updateAchievement(role, AchievementDef.TYPE.CRAFT_N_EQUIP, 1);
    role.achievements.updateAchievement(role, AchievementDef.TYPE.CRAFT_N_EQUIP_WITH_M_START, equipConfig.raity, 1);
    role.achievements.updateAchievement(role, AchievementDef.TYPE.CRAFT_N_EQUIP_WITH_ELEMENT, equipConfig.JSON_attribute, 1);
    role.achievements.updateAchievement(role, AchievementDef.TYPE.EARN_N_EQUIP_WITH_M_STAR, equipConfig.raity, 1);

    role.sendUpdatePacket(false);
    role.equips.sendUpdatePacket(role);
    role.quests.sendUpdatePacket(role);
    role.achievements.sendUpdatePacket(role);

    done(null, {
        equipUid: equip.uid,
        buildUid: buildUid
    });
}

export function accelerateCraftTask(role:Role, packet:any, done) {
    var buildUid = packet.buildUid;
    var build = role.builds.getBuild(buildUid);
    if (!build) {
        throw new CustomError.UserError(ERRC.BUILD.UID_NOT_FOUND, {
            msg: 'BUILD.UID_NOT_FOUND, UID=' + buildUid
        });
    }

    var craftTask = role.equips.getCraftTask(buildUid);
    var now = Time.gameNow();
    var consume:{[resId:number]:number} = {};
    consume[Enum.RESOURCE_TYPE.DIAMOND] = craftTask.getAccelerateDiamond(now);

    ResourceMgr.applyConsume(role, Enum.USE_TYPE.EQUIP_ACCELERATE_CRAFT_TASK, consume);   // 资源不足会抛异常
    craftTask.accelerateTask();

    role.sendUpdatePacket(true);

    done(null, {
        buildUid: buildUid
    });
}

export function enhanceEquip(role:Role, packet:any, done) {
    var equipUidArray = packet.equipUidArray, i;
    if (equipUidArray.length < 2) {
        throw new CustomError.UserError(ERRC.EQUIP.ENHANCE_LENGTH_SMALL_THAN_2, {
            msg: 'EQUIP.ENHANCE_LENGTH_SMALL_THAN_2, EquipDB, equipUidArray.length=' + equipUidArray.length
        });
    }

    var equipArray:Equip[] = [], equip:Equip;
    for (i = 0; i < equipUidArray.length; i += 1) {
        equip = role.equips.getEquip(equipUidArray[i]);
        if (!equip) {
            throw new CustomError.UserError(ERRC.EQUIP.UID_NOT_FOUND, {
                msg: 'EQUIP.UID_NOT_FOUND, uid=' + equipUidArray[i]
            });
        }
        equipArray.push(equip);
    }
    var mainEquip:Equip = equipArray[0];

    var equipConfig = cm.equipdb.get(mainEquip.ID);
    var equipexpConfig = cm.equipexpdb.get(mainEquip.level);

    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.GOLD] = equipexpConfig.coinPerSlot * (equipArray.length - 1);
    ResourceMgr.checkHasEnoughResource(role, consume);
    var expSum:number = role.equips.enhanceEquip(equipArray);
    ResourceMgr.minusConsume(role, Enum.USE_TYPE.EQUIP_ENHANCE_EQUIP, consume);

    log.uInfo(role.accountId, 'EnhanceEquip', {
        consume: consume,
        material: equipArray.slice(1),
        expSum: expSum,
        result: mainEquip
    });

    var equipHeroes = role.heros.getSuiteHeroByArmor(mainEquip.uid);
    Object.keys(equipHeroes).forEach((key) => {
        var heroUid = equipHeroes[key];
        var hero = role.heros.getHero(heroUid);
        HeroSystem.calculateHeroProperty(role, hero);
    });

    role.quests.updateQuest(role, QuestDef.CriteriaType.EARN_N_EQUIP_WITH_LEVEL, [equipConfig.groupID, mainEquip.level], 1);

    role.achievements.updateAchievement(role, AchievementDef.TYPE.ENHANCE_EQUIP_N_COUNT, 1);
    if (mainEquip.level >= equipConfig.maxlv) {
        role.achievements.updateAchievement(role, AchievementDef.TYPE.LEVEL_MAX_ON_EQUIP_WITH_STAR_A_OR_B, equipConfig.raity, 1);
    }
    if (consume[Enum.RESOURCE_TYPE.GOLD] > 0) {
        role.achievements.updateAchievement(role, AchievementDef.TYPE.CONSUME_GOLD_ON_EQUIP, consume[Enum.RESOURCE_TYPE.GOLD]);
    }

    role.sendUpdatePacket(true);
    role.equips.sendUpdatePacket(role);
    role.heros.sendUpdatePacket(role);

    done(null, {
        equipUid: equipUidArray[0]
    });
}

export function combineEquip(role:Role, packet:any, done) {
    var equipUidArray = packet.equipUidArray, i;
    if (equipUidArray.length !== 2) {
        throw new CustomError.UserError(ERRC.EQUIP.COMBINE_LENGTH_NOT_EQ_2, {
            msg: 'EQUIP.COMBINE_LENGTH_NOT_EQ_2, EquipDB, equipUidArray.length=' + equipUidArray.length
        });
    }

    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.GOLD] = Universal.GLB_GOLD_COST_IN_EQUIP_COMBINE;
    consume[Enum.RESOURCE_TYPE.FUSE_STONE] = Universal.GLB_STONE_COST_IN_EQUIP_COMBINE;
    ResourceMgr.checkHasEnoughResource(role, consume);

    var equipArray = [], equip, equipGroupIDArray = [];
    for (i = 0; i < equipUidArray.length; i += 1) {
        equip = role.equips.getEquip(equipUidArray[i]);
        if (!equip) {
            throw new CustomError.UserError(ERRC.EQUIP.UID_NOT_FOUND, {
                msg: 'EQUIP.UID_NOT_FOUND, uid=' + equipUidArray[i]
            });
        }
        equipGroupIDArray.push(cm.equipdb.get(equip.ID).groupID);
        equipArray.push(equip);
    }

    var combineEquip = role.equips.combineEquip(equipArray);
    var equipConfig = cm.equipdb.get(combineEquip.ID);

    ResourceMgr.applyConsume(role, Enum.USE_TYPE.EQUIP_COMBINE_EQUIP, consume);

    log.uInfo(role.accountId, 'CombineEquip', {
        consume: consume,
        material: equipArray,
        result: combineEquip
    });

    role.quests.updateQuest(role, QuestDef.CriteriaType.FUSE_EQUIP_A_B_N_COUNT, equipGroupIDArray, 1);

    role.achievements.updateAchievement(role, AchievementDef.TYPE.FUSE_N_COUNT, 1);
    role.achievements.updateAchievement(role, AchievementDef.TYPE.EARN_N_EQUIP_WITH_M_STAR, equipConfig.raity, 1);
    if (consume[Enum.RESOURCE_TYPE.GOLD] > 0) {
        role.achievements.updateAchievement(role, AchievementDef.TYPE.CONSUME_GOLD_ON_EQUIP, consume[Enum.RESOURCE_TYPE.GOLD]);
    }

    role.sendUpdatePacket(true);
    done(null, {
        combineEquipUid: combineEquip.uid
    });
}

export function getEquipProperty(role:Role, hero, suite):{[key:string]:number} {
    var property:{[key:string]:number} = {};
    if (HeroSuite.SuiteList.indexOf(suite) === -1) return property;

    var armor = hero.suiteData[suite].getValue(HeroDef.PROPERTY.ARMOR);
    if (armor) {
        var equip = role.equips.getEquip(armor);
        if (!equip) {
            log.uError(role.accountId, 'Equip', 'EquipNotFound, armor=' + armor);
        } else {
            property = equip.getProperty();
        }
    }
    return property;
}

// src/util
import log = require('../../../util/log');
import Util = require('../../../util/game_util');
import Enum = require('../../../util/enum');
import Time = require('../../../util/time');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');

// src/gameserver
import Role = require('../role');
import Universal = require('../universal');
import QuestDef = require('../quest/defines');
import AchievementDef = require('../achievement/defines');

// src/handler/api/build
import BuildDef = require('./../build/defines');
import BuildGlobalMgr = require('./../build/build_global_mgr');

// config
var cm = require('../../../config').configMgr;

// system
import ResourceMgr = require('../resource/resource_mgr');

export function initSystem():void {
}

export function sendOnlinePacket(role:Role) {
    var pck = role.builds.buildInitNetMsg();
    role.sendPacket(pck);
}

export function openLand(role:Role,
                         packet:{p1:Universal.Point; p2:Universal.Point},
                         done):void {
    var p1 = packet.p1, p2 = packet.p2;
    var buildMgr = role.builds;

    buildMgr.checkCanOpenNewLand(Time.gameNow());

    var cost = role.builds.getOpenAreaCost();
    var consume:Universal.Resource = {};

    consume[Enum.RESOURCE_TYPE.GOLD] = cost.goldCost;

    ResourceMgr.checkHasEnoughResource(role, consume);
    buildMgr.openLand(p1, p2, cost.timeCost);
    ResourceMgr.minusConsume(role, Enum.USE_TYPE.BUILD_OPEN_AREA, consume);

    role.sendUpdatePacket(true);

    done(null, {
        leftTime: cost.timeCost
    });

}

export function updatePosition(role:Role, packet:any, done):void {
    var i, tmp, build;
    for (i = 0; i < packet.builds.length; i += 1) {
        tmp = packet.builds[i];
        build = role.builds.getBuild(tmp.uid);
        if (!build) continue;
        if (tmp.hasOwnProperty('direction')) {           // only use direction
            build.direction = tmp.direction;
        }
        if (tmp.hasOwnProperty('point')) {
            build.point = tmp.point;
        }
    }

    done();
}

export function requestLandLeftTime(role:Role, packet:any, done):void {
    var now = Time.gameNow();
    role.builds.land.checkFinishOpen(now);
    role.achievements.updateAchievement(role, AchievementDef.TYPE.HAVE_N_AREA, role.builds.getHaveOpenAreaCount());
    done(null, {
        leftTime: role.builds.land.getLeftTime(now)
    });
}

// protocol
export function collectGold(role:Role, packet:any, done):void {
    var buildUid = packet.uid;
    var build = role.builds.getBuild(buildUid);
    if (!build) {
        throw new CustomError.UserError(ERRC.BUILD.UID_NOT_FOUND, {
            msg: 'BuildNotFound, uid=' + buildUid
        });
    }

    var gold = build.getCollectGold();
    if (gold > 0) {
        var reward:{[resId:number]:number} = {};
        var consume:{[resId:number]:number} = {};
        reward[Enum.RESOURCE_TYPE.GOLD] = gold;
        ResourceMgr.applyConsumeAndReward(role, Enum.USE_TYPE.BUILD_COLLECT_GOLD, consume, reward);
        build.lastCollectTime = Time.gameNow();
    }

    role.quests.updateQuest(role, QuestDef.CriteriaType.COLLECT_GOLD_IN_BUILD_A, [build.ID], gold);

    role.sendUpdatePacket(true);

    done(null, {
        uid: buildUid,
        gold: gold
    });
}

// protocol
export function sellBuild(role:Role, packet:any, done):void {
    var buildUid = packet.uid;
    var build = role.builds.getBuild(buildUid);
    var buildID = build.ID;

    if (!build) {
        throw new CustomError.UserError(ERRC.BUILD.UID_NOT_FOUND, {
            msg: 'BuildNotFound, uid=' + buildUid
        });
    }

    var upgradeConfig = BuildGlobalMgr.getUpgradeConfig(build.ID, build.level);
    if (!upgradeConfig) {
        throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
            msg: 'COMMON.CONFIG_NOT_FOUND, ' + build.toString()
        });
    }

    var gold = upgradeConfig.price;

    if (build.ID === 7002) {
        var ownCount = role.builds.getBuildCount(build.ID);
        if (ownCount === 1) {
            gold = 0;       // 如果是7002建筑，因为买入的时候是0金币购买，所以出售也是0金币
        }
    }

    if (gold > 0) {
        var reward:{[resId:number]:number} = {};
        reward[Enum.RESOURCE_TYPE.GOLD] = gold;
        ResourceMgr.applyReward(role, Enum.USE_TYPE.BUILD_SELL_BUILD, reward);
    }

    log.uInfo(role.accountId, 'Build', 'SellBuild, ' + build.toString());
    role.builds.deleteBuild(buildUid);
    role.quests.updateQuest(role, QuestDef.CriteriaType.OWN_N_BUILD, [buildID]);

    role.sendUpdatePacket(gold > 0);
    role.quests.sendUpdatePacket(role);

    done(null, {
        uid: buildUid,
        gold: gold
    });
}

export function upgradeBuild(role:Role, packet:any, done):void {
    var buildUid = packet.uid;
    var build = role.builds.getBuild(buildUid);
    if (!build) {
        throw new CustomError.UserError(ERRC.BUILD.UID_NOT_FOUND, {
            msg: 'BuildNotFound, uid=' + buildUid
        });
    }
    var upgradeConfig = BuildGlobalMgr.getUpgradeConfig(build.ID, build.level);
    if (!upgradeConfig) {
        throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
            msg: 'COMMON.CONFIG_NOT_FOUND, ' + build.toString()
        });
    }

    if (build.level >= BuildGlobalMgr.getBuildMaxLevel(build.ID)) {
        throw new CustomError.UserError(ERRC.BUILD.BUILD_LEVEL_MAX, {
            msg: 'BUILD.BUILD_LEVEL_MAX, ' + build.toString()
        });
    }

    var consume:Universal.Resource = {};
    consume[upgradeConfig.upType] = upgradeConfig.upPrice;

    ResourceMgr.applyConsume(role, Enum.USE_TYPE.BUILD_UPGRADE_BUILD, consume);

    ++build.level;  // 升级

    role.quests.updateQuest(role, QuestDef.CriteriaType.OWN_N_BUILD_WITH_LEVEL, [build.ID, build.level]);
    if (consume[Enum.RESOURCE_TYPE.GOLD] > 0) {
        role.achievements.updateAchievement(role, AchievementDef.TYPE.CONSUME_GOLD_ON_BUILD, consume[Enum.RESOURCE_TYPE.GOLD]);
    }

    role.sendUpdatePacket(true);

    done(null, {
        uid: build.uid,
        level: build.level
    });
}

export function requestBuild(role:Role, packet:any, done):void {
    var buildUidArray = packet.buildUidArray;

    role.builds.checkAllFinishBuilding(role, buildUidArray);

    var pck:any = {buildArray: []};
    var i, build;
    for (i = 0; i < buildUidArray.length; i += 1) {
        build = role.builds.getBuild(buildUidArray[i]);
        if (build) {
            pck.buildArray.push(build.buildInitNetMsg());
        } else {
            log.sWarn('Build', 'BuildNotFound, uid=' + buildUidArray[i]);
        }
    }

    role.quests.sendUpdatePacket(role);

    done(null, pck);
}

export function accelerateBuilding(role:Role, packet:{buildType; id:number}, done):void {
    var buildType:any = BuildDef.BuildType[packet.buildType],
        id = packet.id;

    var consume:Universal.Resource = {};
    var entity, leftTime;
    var now = Time.gameNow();

    switch (buildType) {
        case BuildDef.BuildType.AREA:
            entity = role.builds.land;
            leftTime = entity.getLeftTime(now);
            consume[Enum.RESOURCE_TYPE.DIAMOND] = Math.ceil(leftTime / Universal.GLB_ACCELERATE_OPEN_AREA_DIAMOND_COST_SECOND);
            break;
        case BuildDef.BuildType.BUILD:
            entity = role.builds.getBuild(id);
            if (!entity) {
                throw new CustomError.UserError(ERRC.BUILD.UID_NOT_FOUND, {
                    msg: 'BUILD.UID_NOT_FOUND, id=' + id
                });
            }
            leftTime = entity.getLeftTime(now);
            consume[Enum.RESOURCE_TYPE.DIAMOND] = Math.ceil(leftTime / Universal.GLB_ACCELERATE_BUILD_DIAMOND_COST_SECOND);
            break;
    }

    ResourceMgr.checkHasEnoughResource(role, consume);
    entity.accelerate(now);
    ResourceMgr.minusConsume(role, Enum.USE_TYPE.BUILD_ACCELERATE, consume);

    if (buildType === BuildDef.BuildType.BUILD) {
        role.builds.checkAllFinishBuilding(role, [id]);
    } else if (buildType === BuildDef.BuildType.AREA) {
        entity.checkFinishOpen(now);
        role.quests.updateQuest(role, QuestDef.CriteriaType.OWN_N_AREA, null, role.builds.getHaveOpenAreaCount());
        role.achievements.updateAchievement(role, AchievementDef.TYPE.HAVE_N_AREA, role.builds.getHaveOpenAreaCount());
    }

    role.sendUpdatePacket(true);

    done(null, {
        buildType: buildType,
        id: id
    });
}
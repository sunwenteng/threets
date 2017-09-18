import async = require('async');
import pbstream = require('node-protobuf-stream');

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

// src/handler/api/**
import RoleStruct = require('../role/role_struct');
import ResourceMgr = require('../resource/resource_mgr');
import TimeDef = require('../time/defines');
import Loot = require('../loot/loot');
import LootMgr = require('../loot/loot_mgr');
import Activity = require('./../activity/activity');
import ActivityDef = require('./../activity/defines');
import ActivityGlobalMgr = require('./../activity/activity_global_mgr');

export function sendOnlinePacket(role:Role):void {
    role.sendPacket(role.activities.buildExpiredBracketNetMsg());
    role.sendPacket(ActivityGlobalMgr.buildInitActivityNetMsg());
}

export function initSystem(callback:(err)=>void):void {
    ActivityGlobalMgr.loadActivities(callback);
}

export function saveSystem(callback:(err)=>void):void {
    ActivityGlobalMgr.saveActivities(callback);
}

export function onDelActivity(activityId:number):void {
    var Message = pbstream.get('.Api.activity.deleteActivity.Notify');
    var pck = new Message({
        deleteActivitiesId: [activityId]
    });
    // TODO GameWorld.sendToWorld(pck);
}

export function queryInfo(role:Role, packet:any, done):void {
    var activityIdList = packet.activityIdList;
    done(null, {
        activities: ActivityGlobalMgr.getActivityList(Time.gameNow(), activityIdList),
        activityIdList: activityIdList
    });
}

export function initDiamondConsume(role:Role, packet:any, done):void {
    var activityId = packet.activityId;
    var activity:Activity.ConsumeActivity = ActivityGlobalMgr.findActivity(activityId);
    activity.checkType(ActivityDef.ACTIVITY_TYPE.DIAMOND_CONSUME);
    activity.checkTime(Time.gameNow());

    var totalCount = role.activities.getConsumeCount(activityId);
    done(null, {
        totalCount: totalCount,
        consumeList: activity.consumeInfoList
    });
}

export function initShadowChest(role:Role, packet:any, done):void {
    var activityId = packet.activityId;
    var activity:Activity.ShadowChestActivity = ActivityGlobalMgr.findActivity(activityId);
    activity.checkType(ActivityDef.ACTIVITY_TYPE.SHADOW_CHEST);
    activity.checkTime(Time.gameNow());

    done(null, {
        activityId: activityId,
        chestList: activity.buildChestList(),
        showRewardList: activity.showRewardList,
        chanceStar: activity.chanceStars
    });
}

export function openShadowChest(role:Role, packet:any, done):void {
    var activityId = packet.activityId;
    var openCount = packet.openCount;
    var activity:Activity.ShadowChestActivity = ActivityGlobalMgr.findActivity(activityId);
    activity.checkType(ActivityDef.ACTIVITY_TYPE.SHADOW_CHEST);
    activity.checkTime(Time.gameNow());

    var chest = activity.findChest(openCount);

    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.DIAMOND] = chest.price;
    ResourceMgr.checkHasEnoughResource(role, consume);

    var loot:Loot = new Loot();
    loot.addResObj(chest.guaranteeReward);

    for (var i = 0; i < chest.chestCount; i += 1) {
        var oneLoot = LootMgr.rollLoot(activity.getLootID());
        loot.addLoot(oneLoot);
    }

    ResourceMgr.applyConsumeAndReward(role, Enum.USE_TYPE.ACTIVITY_SHADOW_CHEST, consume, loot.getLootResource());

    log.uInfo(role.accountId, 'Activity.OpenShadowChest', {
        activityId: activity.activityId,
        openCount: openCount,
        consume: consume,
        reward: loot.getLootResource()
    });

    role.sendUpdatePacket(true);
    done(null, {
        activityId: activityId,
        reward: Universal.tranResourceToRewardList(loot.getLootResource())
    });
}

export function initFlourishingChest(role:Role, packet:any, done):void {
    var activityId = packet.activityId;
    var activity:Activity.FlourishingChestActivity = ActivityGlobalMgr.findActivity(activityId);
    activity.checkType(ActivityDef.ACTIVITY_TYPE.FLOURISHING_CHEST);
    activity.checkTime(Time.gameNow());

    done(null, {
        activityId: activityId,
        chestList: activity.buildChestList(),
        showRewardList: activity.showRewardList,
        chanceStar: activity.chanceStars,
        haveBoughtCount: role.activities.getFlourishingHasBoughtCount(activityId),
        chanceBonusId: activity.chanceBonusId
    });
}

export function openFlourishingChest(role:Role, packet:any, done):void {
    var activityId = packet.activityId;
    var chestId = packet.chestId;

    var activity:Activity.FlourishingChestActivity = ActivityGlobalMgr.findActivity(activityId);
    activity.checkType(ActivityDef.ACTIVITY_TYPE.FLOURISHING_CHEST);
    activity.checkTime(Time.gameNow());

    var chest:Activity.FlourishingChest = activity.findChest(chestId);

    var maxChestId = role.activities.getFlourishingHasBoughtCount(activityId);
    if (chest.chestId !== 1 && maxChestId + 1 !== chest.chestId) {
        throw new CustomError.UserError(ERRC.ACTIVITY.FLOURISHING_CHEST_ID_ERROR, {
            msg: 'ACTIVITY.FLOURISHING_CHEST_ID_ERROR, haveBoughtId=' + maxChestId + ', openId=' + chestId
        });
    }

    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.DIAMOND] = chest.price;
    ResourceMgr.checkHasEnoughResource(role, consume);

    var loot:Loot = new Loot();
    loot.addLoot(LootMgr.rollLoot(chest.chestLootId));

    var resId:number = LootMgr.rollValue(chest.guaranteeLootId);
    loot.addRes(resId, chest.guaranteeCount);

    ResourceMgr.applyConsumeAndReward(role, Enum.USE_TYPE.ACTIVITY_FLOURISHING_CHEST, consume, loot.resource);

    role.activities.flourishingChestData[activityId] = chest.chestId;

    log.uInfo(role.accountId, 'Activity.OpenFlourishingChest', {
        activityId: activity.activityId,
        chestId: chestId,
        consume: consume,
        reward: loot.getLootResource()
    });

    role.sendUpdatePacket(true);
    done(null, {
        activityId: activityId,
        reward: Universal.tranResourceToRewardList(loot.getLootResource()),
        haveBoughtCount: role.activities.getFlourishingHasBoughtCount(activityId)
    });
}

export function initCraft(role:Role, packet:any, done):void {
    var activityId = packet.activityId;

    var activity:Activity.CraftActivity = ActivityGlobalMgr.findActivity(activityId);
    activity.checkType(ActivityDef.ACTIVITY_TYPE.CRAFT);
    activity.checkTime(Time.gameNow());

    var activityMgr = role.activities;
    done(null, {
        activityId: activity.activityId,
        craftList: activity.buildCraftList(),
        reward: Universal.tranResourceToRewardList(activity.reward),
        redeemStatus: activityMgr.craftData[activity.activityId]
    });
}

export function redeemCraftReward(role:Role, packet:{activityId:number}, done):void {
    var activityId = packet.activityId;

    var activity:Activity.CraftActivity = ActivityGlobalMgr.findActivity(activityId);
    activity.checkType(ActivityDef.ACTIVITY_TYPE.CRAFT);
    activity.checkTime(Time.gameNow());

    role.activities.gainCraftReward(role, activity);

    role.sendUpdatePacket(true);
    done(null, {
        activityId: activity.activityId
    });
}

export function initDiscount(role:Role, packet:{activityId:number}, done):void {
    var activityId = packet.activityId;

    var activity:Activity.DiscountActivity = ActivityGlobalMgr.findActivity(activityId);
    activity.checkType(ActivityDef.ACTIVITY_TYPE.DISCOUNT);
    activity.checkTime(Time.gameNow());

    done(null, {
        activityId: activity.activityId,
        discountType: activity.discountType,
        discount: activity.discount
    });
}

export function initRedirect(role:Role, packet:{activityId:number}, done):void {
    var activityId = packet.activityId;

    var activity:Activity.RedirectActivity = ActivityGlobalMgr.findActivity(activityId);
    activity.checkType(ActivityDef.ACTIVITY_TYPE.COMMON_REDIRECT);
    activity.checkTime(Time.gameNow());

    done(null, {
        activityId: activity.activityId,
        internalRedirect: activity.internalRedirect,
        externalRedirect: activity.externalRedirect
    });
}

export function initFlourishingShop(role:Role, packet:{activityId:number}, done):void {
    var activityId = packet.activityId;

    var activity:Activity.FlourishingShopActivity = ActivityGlobalMgr.findActivity(activityId);
    activity.checkType(ActivityDef.ACTIVITY_TYPE.FLOURISHING_SHOP);
    activity.checkTime(Time.gameNow());

    var floMgr = role.activities.floShopMgr;
    floMgr.initData(activity);

    var netObj:any = {};
    netObj.activityId = activityId;
    netObj.bracketIndex = floMgr.bracketIndex + 1;
    netObj.bracketCount = activity.bracketList.length;
    var currentBracketNet = floMgr.buildBracketNetObj();
    if (currentBracketNet) {
        netObj.currentBracket = currentBracketNet;
    }

    done(null, netObj);
}

//export function buyFlourishingShop(role:Role, packet:any):void {
//    var activityId = packet.activityId,
//        payID = packet.payID;
//
//    var activity:Activity.FlourishingShopActivity = ActivityGlobalMgr.findActivity(activityId);
//    activity.checkType(ActivityDef.ACTIVITY_TYPE.FLOURISHING_SHOP);
//    activity.checkTime(Time.gameNow());
//
//    var floMgr = role.activities.floShopMgr;
//    var oldOrder = floMgr.order;
//    if (oldOrder) {
//        log.uInfo(role.accountId, 'FlourishingShop.RemoveOrder', oldOrder);
//    }
//
//    var order = floMgr.createOrder(payID);
//
//    role.activities.sendFlourishingShopUpdate(role);
//
//    log.uInfo(role.accountId, 'Activity.OpenFlourishingChest', {
//        activityId: activity.activityId,
//        bracketIndex: floMgr.bracketIndex + 1,
//        totalLength: activity.bracketList.length,
//        payID: payID
//    });
//
//    role.sendPacket(new cmd['cmd_sc_activity_buyFlourishingShop']({
//        activityId: activityId
//    }));
//}
//
//export function gainFlourishingBracket(role:Role, packet:{activityId:number}):void {
//    var activityId = packet.activityId;
//
//    var floMgr = role.activities.floShopMgr;
//    var order = floMgr.order;
//    if (!order || order.status !== ActivityDef.FLOURISHING_SHOP_BRACKET_STATUS.CAN_GAIN) {
//        throw new CustomError.UserError(ERRC.ACTIVITY.CAN_NOT_GAIN_FLOURISHING_SHOP, {
//            msg: 'ACTIVITY.CAN_NOT_GAIN_FLOURISHING_SHOP, order.status=' + order.status
//        });
//    }
//
//    var reward = order.bracket.reward;
//    ResourceMgr.applyReward(role, Enum.USE_TYPE.ACTIVITY_FLOURISHING_SHOP, reward);
//    order.status = ActivityDef.FLOURISHING_SHOP_BRACKET_STATUS.HAVE_GAINED;
//
//    floMgr.goNextBracket();
//    floMgr.clearOrder();
//
//    var netObj:any = {};
//    netObj.activityId = activityId;
//    netObj.reward = Universal.tranResourceToRewardList(reward);
//    netObj.bracketIndex = activityId === floMgr.activityId ? floMgr.bracketIndex + 1 : 0;
//    var currentBracketNet = floMgr.buildBracketNetObj();
//    if (currentBracketNet) {
//        netObj.nextBracket = currentBracketNet;
//    }
//
//    role.sendUpdatePacket(true);
//    role.sendPacket(new cmd['cmd_sc_activity_gainFlourishingBracket'](netObj));
//}
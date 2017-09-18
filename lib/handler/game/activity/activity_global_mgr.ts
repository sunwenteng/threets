import async = require('async');
import pb = require('node-protobuf-stream');

import log = require('../../../util/log');
import Time = require('../../../util/time');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');
//import WorldDB = require('../../../database/impl/world_db');
//import GameWorld = require('../game_world');

import ActivityDef = require('./defines');
import Activity = require('./activity');

var activityMap:{[activityId:number]:Activity.Activity} = {};
var activityByType:{[activityType:number]:Activity.Activity[]} = {};
var updateActivitiesId:{[activityId:number]:boolean} = {};

export function addActivity(activity:Activity.Activity):void {
    if (activityMap[activity.activityId]) return ;

    activityMap[activity.activityId] = activity;

    if (!activityByType[activity.activityType]) {
        activityByType[activity.activityType] = [activity];
    } else {
        activityByType[activity.activityType].push(activity);
    }

    updateActivitiesId[activity.activityId] = true;
}

export function delActivity(activityId:number):boolean {
    var activity = activityMap[activityId];
    if (!activity) return false;

    delete activityMap[activityId];

    var array:Activity.Activity[] = activityByType[activity.activityType];
    if (array && array.length > 0) {
        for (var i = 0; i < array.length; i += 1) {
            if (array[i].activityId === activityId) {
                array.splice(i, 1);
                break ;
            }
        }
    }
    return true;
}

export function cancelActivity(activityId:number, callback:(err)=>void):void {
    if (delActivity(activityId)) {
        //WorldDB.deleteActivity(activityId, (err, result) => {
        //    callback(err);
        //});
    } else {
        callback(null);
    }
}

export function loadTestActivities():void {

    var loginGiftAct:Activity.LoginGiftActivity = new Activity.LoginGiftActivity(1, 0, 0);
    loginGiftAct.addRewardContent(6100, 100);
    addActivity(loginGiftAct);

    var consumeAct:Activity.ConsumeActivity = new Activity.ConsumeActivity(2, 0, 0);
    consumeAct.addConsumeInfo(50, 1001, 2);
    consumeAct.addConsumeInfo(1500, 1002, 2);
    consumeAct.addConsumeInfo(5000, 1003, 2);
    consumeAct.sortConsumeInfo();
    addActivity(consumeAct);

    var shadowChestAct:Activity.ShadowChestActivity = new Activity.ShadowChestActivity(3, 0, 0);
    shadowChestAct.setLootID(1001);

    var ci1:Activity.ShadowChest = new Activity.ShadowChest(1, 30);
    shadowChestAct.addChest(ci1);

    var ci11:Activity.ShadowChest = new Activity.ShadowChest(11, 300);
    ci11.addReward(1001, 2);
    shadowChestAct.addChest(ci11);

    var ci40:Activity.ShadowChest = new Activity.ShadowChest(40, 999);
    ci40.addReward(1001, 8);
    ci40.addReward(1002, 1);
    shadowChestAct.addChest(ci40);

    addActivity(shadowChestAct);

    //var flourishingChestAct:Activity.FlourishingChestActivity = new Activity.FlourishingChestActivity(4, 0, 0);
    //for (var i = 1; i <= 5; i += 1) {
    //    flourishingChestAct.addChest(new Activity.FlourishingChest(i, i, 'icon'+i, 1000+i, i*2, i*3));
    //}
    //addActivity(flourishingChestAct);

    var craftActivity:Activity.CraftActivity = new Activity.CraftActivity(5, 0, 0);
    craftActivity.addReward(1001, 1);
    craftActivity.addReward(1002, 3);
    for (var i = 0; i < 4; i += 1) {
        craftActivity.addCraftTask(new Activity.CraftTask(1000+i, 1));
    }
    addActivity(craftActivity);
}

export function loadActivities(callback:(err)=>void) {
    var now = Time.gameNow();
    callback(null);
    //WorldDB.fetchEffectActivities(now, (err, result:Activity.ActivityDBData[]) => {
    //    result.forEach((content:Activity.ActivityDBData) => {
    //        var activity:Activity.Activity = null;
    //        switch (content.activityType) {
    //            case ActivityDef.ACTIVITY_TYPE.NULL:
    //                break;
    //            case ActivityDef.ACTIVITY_TYPE.LOGIN_GIFT:
    //                activity = new Activity.LoginGiftActivity(content.activityId, content.startTime, content.endTime);
    //                break;
    //            case ActivityDef.ACTIVITY_TYPE.DIAMOND_CONSUME:
    //                activity = new Activity.ConsumeActivity(content.activityId, content.startTime, content.endTime);
    //                break;
    //            case ActivityDef.ACTIVITY_TYPE.SHADOW_CHEST:
    //                activity = new Activity.ShadowChestActivity(content.activityId, content.startTime, content.endTime);
    //                break;
    //            case ActivityDef.ACTIVITY_TYPE.FLOURISHING_CHEST:
    //                activity = new Activity.FlourishingChestActivity(content.activityId, content.startTime, content.endTime);
    //                break;
    //            case ActivityDef.ACTIVITY_TYPE.CRAFT:
    //                activity = new Activity.CraftActivity(content.activityId, content.startTime, content.endTime);
    //                break;
    //            case ActivityDef.ACTIVITY_TYPE.LIMIT_QUEST:
    //                break;
    //            case ActivityDef.ACTIVITY_TYPE.DISCOUNT:
    //                activity = new Activity.DiscountActivity(content.activityId, content.startTime, content.endTime);
    //                break;
    //            case ActivityDef.ACTIVITY_TYPE.COMMON_REDIRECT:
    //                activity = new Activity.RedirectActivity(content.activityId, content.startTime, content.endTime);
    //                break;
    //            case ActivityDef.ACTIVITY_TYPE.FLOURISHING_SHOP:
    //                activity = new Activity.FlourishingShopActivity(content.activityId, content.startTime, content.endTime);
    //                break;
    //            default :
    //                break;
    //        }
    //
    //        if (activity) {
    //            activity.lastUpdateTime = now;
    //            try {
    //                activity.loadParams(content.params);
    //            } catch (err) {
    //                log.sError('Activity', 'Activity.loadParams Error: ' + err.message);
    //                return ;
    //            }
    //            addActivity(activity);
    //        } else {
    //            log.sError('Activity', 'unknown activityType, type=' + content.activityType + ', and not load it');
    //        }
    //    });
    //    updateActivitiesId = {};
    //    callback(null);
    //});
}

export function saveActivities(callback:(err)=>void):void {
    var activityKeys = Object.keys(activityMap);
    async.each(activityKeys, (key, cb) => {
        var activity = activityMap[key];
        if (!activity) {
            cb(null);
            return ;
        }
        var content = activity.buildDBData();
        //WorldDB.insertOrUpdateActivity(content, (err, result) => {
        //    if (err) {
        //        log.sError('Activity', 'WorldDB.insertOrUpdateActivity content: ' + JSON.stringify(content));
        //        log.sError('Activity', 'WorldDB.insertOrUpdateActivity Error: ' + err.stack);
        //    }
        //    cb(null);
        //});
    }, (err) => {
        callback(err);
    });
}

export function saveActivity(activity:Activity.Activity, callback:(err)=>void):void {
    var content = activity.buildDBData();
    //WorldDB.insertOrUpdateActivity(content, (err, result) => {
    //    if (err) {
    //        log.sError('Activity', 'WorldDB.insertOrUpdateActivity content: ' + JSON.stringify(content));
    //        log.sError('Activity', 'WorldDB.insertOrUpdateActivity Error: ' + err.stack);
    //        return callback(err);
    //    }
    //    callback(null);
    //});
}

export function getActivity(activityId:number):any {
    return activityMap[activityId];
}

export function findActivity(activityId:number):any {
    var activity = activityMap[activityId];
    if (!activity) {
        throw new CustomError.UserError(ERRC.ACTIVITY.NOT_FOUND, {
            msg: 'ACTIVITY.NOT_FOUND, activityId=' + activityId,
            param: [activityId]
        });
    }
    return activity;
}

export function getActivityByType(activityType:ActivityDef.ACTIVITY_TYPE):Activity.Activity[] {
    return activityByType[activityType] || [];
}

export function getDiscountActivity(discountType:Activity.DiscountType):Activity.DiscountActivity {
    var now = Time.gameNow();

    var activityList:any[] = getActivityByType(ActivityDef.ACTIVITY_TYPE.DISCOUNT).filter((element:Activity.DiscountActivity) => {
        return element.discountType === discountType && (element.startTime <= now && now < element.endTime);
    });

    return activityList.length > 0 ? activityList[0] : null;
}

export function updateActivities():boolean {
    var now = Time.gameNow();
    Object.keys(activityMap).forEach((id) => {
        var activity = activityMap[id];
        if (now >= activity.endTime) {
            delActivity(activity.activityId);
        } else {    // not end
            if (activity.lastUpdateTime < activity.startTime && activity.startTime <= now) {
                activity.lastUpdateTime = now;
                updateActivitiesId[activity.activityId] = true;
            }
        }
    });

    var pck = buildUpdateActivityNetMsg();
    if (pck) {
        //GameWorld.sendToWorld(pck);
        return true;
    }
    return false;
}

export function getActivityList(now:number, list?:number[]):Activity.Activity[] {
    var result:Activity.Activity[] = [];
    var activityKeyList:any[] = list ? list : Object.keys(activityMap);
    activityKeyList.forEach((activityId) => {
        var activity:Activity.Activity = activityMap[activityId];
        if (activity && activity.startTime <= now && now < activity.endTime) {
            result.push(activity.buildNetMsg(now));
        }
    });
    return result;
}

export function buildInitActivityNetMsg():any {
    var now = Time.gameNow();
    var M = pb.get('.Api.activity.initInfo.Notify');
    return new M({
        activities: getActivityList(now)
    });
}

export function buildUpdateActivityNetMsg():any {
    var now = Time.gameNow(),
        update = false;
    var pck:any = {};
    Object.keys(updateActivitiesId).forEach((activityId) => {
        var activity:Activity.Activity = activityMap[activityId];
        if (activity && activity.startTime <= now && now < activity.endTime) {
            pck.updateActivities.push(activity.buildNetMsg(now));
            update = true;
        }
    });
    updateActivitiesId = {};
    if (!update) return null;
    var M = pb.get('.Api.activity.updateActivity.Notify');
    return new M(pck);
}
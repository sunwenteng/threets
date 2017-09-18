// common
import async        = require('async');
import pb           = require('node-protobuf-stream');

import Time         = require('../../../util/time');
import log          = require('../../../util/log');
import Enum         = require('../../../util/enum');
import CustomError  = require('../../../util/errors');
import ERRC         = require('../../../util/error_code');
//import CenterDB     = require('../../../database/impl/center_db');
import Universal    = require('../universal');

import ConfigStruct = require('../../../config/struct/config_struct');

import Activity         = require('./activity');
import ActivityDef      = require('./defines');
import ActivityGlobalMgr= require('./activity_global_mgr');
import FloShopMgr       = require('./flourishing_shop');

import QuestDef         = require('../quest/defines');
import QuestGlobalMgr   = require('../quest/quest_global_mgr');

import Loot         = require('../loot/loot');
import LootMgr      = require('../loot/loot_mgr');
import ResourceMgr  = require('../resource/resource_mgr');
import Role         = require('../role');

class ActivityMgr {

    // ActivityDef.ACTIVITY_TYPE.LOGIN_GIFT
    loginGiftData:{[activityId:number]:ActivityDef.LOGIN_GIFT_STATUS} = {};

    // ActivityDef.ACTIVITY_TYPE.DIAMOND_CONSUME
    consumeData:{[activityId:number]:number} = {};

    // ActivityDef.ACTIVITY_TYPE.FLOURISHING_CHEST
    flourishingChestData:{[activityId:number]:number /* maxChestId */} = {};

    // TODO 打造活动记录
    craftData:{[activityId:number]:ActivityDef.CRAFT_REWARD_STATUS} = {};

    // ActivityDef.ActivityDef.FLOURISHING_SHOP
    floShopMgr:FloShopMgr = new FloShopMgr();

    public getFlourishingHasBoughtCount(activityId:number):number {
        return this.flourishingChestData[activityId] || 0;
    }

    public onLogin(role:Role):void {
        var now = Time.gameNow();
        var activities:Activity.Activity[] = ActivityGlobalMgr.getActivityByType(ActivityDef.ACTIVITY_TYPE.LOGIN_GIFT);
        var giftList:{activityId:number; reward:Universal.Reward[]}[] = [];
        activities.forEach((activity:Activity.LoginGiftActivity) => {
            if (activity.getStatus(now) !== ActivityDef.STATUS.START) return;

            if (!this.loginGiftData[activity.activityId]) {
                var reward = activity.getReward();
                ResourceMgr.applyReward(role, Enum.USE_TYPE.ACTIVITY_LOGIN_GIFT, reward);
                this.loginGiftData[activity.activityId] = ActivityDef.LOGIN_GIFT_STATUS.HAS_EARN;

                var loginGift:{activityId:number; reward:Universal.Reward[]} = {activityId: 0, reward: []};
                loginGift.activityId = activity.activityId;
                Object.keys(reward).forEach((id) => {
                    loginGift.reward.push({
                        id   : parseInt(id),
                        count: reward[id]
                    });
                });
                giftList.push(loginGift);
            }
        });
        if (giftList.length > 0) {
            role.sendUpdatePacket(true);
            var M = pb.get('.Api.activity.loginGift.Notify');
            role.sendPacket(new M({
                giftList: giftList
            }));
        }
    }

    public getConsumeCount(activityId:number):number {
        return this.consumeData[activityId] || 0;
    }

    public onConsume(role:Role, count:number):void {
        if (count <= 0) return;
        var now = Time.gameNow();

        var pck:any = { rewardList: []};
        var activities:Activity.Activity[] = ActivityGlobalMgr.getActivityByType(ActivityDef.ACTIVITY_TYPE.DIAMOND_CONSUME);
        activities.forEach((activity:Activity.ConsumeActivity) => {
            if (activity.getStatus(now) !== ActivityDef.STATUS.START) return;

            if (!this.consumeData[activity.activityId]) {
                this.consumeData[activity.activityId] = 0;
            }

            var origin = this.consumeData[activity.activityId];
            var reward:Universal.Resource = {}, hasReward = false;
            activity.consumeInfoList.forEach((ci) => {
                if (origin < ci.requireCount && ci.requireCount <= origin + count) {
                    Universal.addResource(reward, ci.resID, ci.resCount);
                    pck.rewardList.push(ci);
                    hasReward = true;
                }
            });

            this.consumeData[activity.activityId] = origin + count; // 超过上限依然会累计
            if (hasReward) {
                ResourceMgr.applyReward(role, Enum.USE_TYPE.ACTIVITY_CONSUME, reward);
            }
        });
        role.sendUpdatePacket(true);
        if (pck.rewardList.length > 0) {
            var M = pb.get('.Api.activity.diamondConsumeReward.Notify');
            role.sendPacket(new M(pck));
        }
    }

    public gainCraftReward(role:Role, activity:Activity.CraftActivity):void {
        if (this.craftData[activity.activityId]) {
            throw new CustomError.UserError(ERRC.ACTIVITY.CRAFT_REWARD_HAS_GAIN, {
                msg: 'ACTIVITY.CRAFT_REWARD_HAS_GAIN, activityId=' + activity.activityId
            });
        }

        for (var i = 0; i < activity.craftTask.length; i += 1) {
            var task    = activity.craftTask[i],
                current = role.equips.getEquipCount(task.armorID);
            if (current < task.requireCount) {
                throw new CustomError.UserError(ERRC.ACTIVITY.CRAFT_EQUIP_NOT_SATISFY, {
                    msg: 'ACTIVITY.CRAFT_EQUIP_NOT_SATISFY, armorID=' + task.armorID + ', current=' + current +
                    ', require=' + task.requireCount
                });
            }
        }

        ResourceMgr.applyReward(role, Enum.USE_TYPE.ACTIVITY_CRAFT, activity.reward);

        this.craftData[activity.activityId] = ActivityDef.CRAFT_REWARD_STATUS.HAS_EARN;

        log.uInfo(role.accountId, 'Activity.RedeemCraftReward', {
            activityId: activity.activityId,
            reward    : activity.reward
        });

    }

    public checkFlourishingShop():void {
        // TODO 检查是否有可以领取但是活动已经消失的奖励
    }

    public sendFlourishingShopUpdate(role:Role):void {
        var floMgr = this.floShopMgr;
        var netObj:any = {};
        netObj.activityId = floMgr.activityId;
        var currentBracketNet = floMgr.buildBracketNetObj();
        if (currentBracketNet) {
            netObj.currentBracket = currentBracketNet;
        }
        var M = pb.get('.Api.activity.currentFlourishingShopBracket.Notify');
        role.sendPacket(new M(netObj));

    }

    public gainFlourishingBracket(role:Role,
                                  floShopOrder:{isHandled:boolean;activityId:number;bracketIndex:number;reward:Universal.Resource}):void {
        var floMgr = this.floShopMgr;
        if (floShopOrder.bracketIndex >= this.floShopMgr.bracketIndex) {
            floMgr.goNextBracket();
        }

        var activityId = floShopOrder.activityId;
        var netObj:any = {};

        netObj.activityId = activityId;
        netObj.reward = Universal.tranResourceToRewardList(floShopOrder.reward);
        netObj.bracketIndex = activityId === floMgr.activityId ? floMgr.bracketIndex + 1 : 0;
        var currentBracketNet = floMgr.buildBracketNetObj();
        if (currentBracketNet) {
            netObj.nextBracket = currentBracketNet;
        }

        var M = pb.get('.Api.activity.gainFlourishingBracket.Notify');
        role.sendPacket(new M(netObj));
    }

    public buildExpiredBracketNetMsg():any {
        if (this.floShopMgr.order) {
            var o = this.floShopMgr.order;
            if (!ActivityGlobalMgr.getActivity(o.activityId)) {
                // 已经过期的活动，但是有效的订单
                var netObj:any = {};
                netObj.expiredActivityId = this.floShopMgr.activityId;
                var currentBracketNet = this.floShopMgr.buildBracketNetObj();
                if (currentBracketNet) {
                    netObj.expiredBracket = currentBracketNet;
                }
                var M = pb.get('.Api.activity.currentFlourishingShopBracket.Notify');
                return new M(netObj);
            }
        }
        return null;
    }

    public buildDBMsg():any {
        var Activities = pb.get('.DB.activities');
        var pck = new Activities();
        Object.keys(this.loginGiftData).forEach((key) => {
            pck.loginGiftData.push({
                key  : parseInt(key),
                value: this.loginGiftData[key]
            });
        });
        Object.keys(this.consumeData).forEach((key) => {
            pck.consumeData.push({
                key  : parseInt(key),
                value: this.consumeData[key]
            });
        });
        Object.keys(this.flourishingChestData).forEach((key) => {
            pck.flourishingChestData.push({
                key  : parseInt(key),
                value: this.flourishingChestData[key]
            });
        });
        Object.keys(this.craftData).forEach((key) => {
            pck.craftData.push({
                key  : parseInt(key),
                value: this.craftData[key]
            });
        });

        pck.floShopData = this.floShopMgr.buildDBMsg();

        return pck;
    }

    public loadDBMsg(msg:any):void {
        if (msg.loginGiftData) {
            msg.loginGiftData.forEach((pair) => {
                this.loginGiftData[pair.key] = pair.value;
            });
        }
        if (msg.consumeData) {
            msg.consumeData.forEach((pair) => {
                this.consumeData[pair.key] = pair.value;
            });
        }
        if (msg.flourishingChestData) {
            msg.flourishingChestData.forEach((pair) => {
                this.flourishingChestData[pair.key] = pair.value;
            });
        }
        if (msg.craftData) {
            msg.craftData.forEach((pair) => {
                this.craftData[pair.key] = pair.value;
            });
        }
        if (msg.floShopData) {
            this.floShopMgr.loadDBMsg(msg.floShopData);
        }
    }
}

export = ActivityMgr;
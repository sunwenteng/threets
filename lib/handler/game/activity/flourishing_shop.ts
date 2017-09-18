import Time         = require('../../../util/time');
import log          = require('../../../util/log');
import Enum         = require('../../../util/enum');
import Universal    = require('../universal');
import CustomError  = require('../../../util/errors');
import ERRC         = require('../../../util/error_code');
import GameUtil     = require('../../../util/game_util');

import ActivityDef      = require('./defines');
import Activity         = require('./activity');
import ActivityGlobalMgr= require('./activity_global_mgr');

var cm = require('../../../config').configMgr;

class ShopOrder {
    payID:number = 0;
    status:ActivityDef.FLOURISHING_SHOP_BRACKET_STATUS = ActivityDef.FLOURISHING_SHOP_BRACKET_STATUS.NULL;
    activityId:number = 0;
    bracketIndex:number = 0;
    bracket:Activity.FlourishingShopBracket = null;
}

function getShopBracket(activity:Activity.FlourishingShopActivity, now:number, start:number):number {
    var index = start;
    while (index < activity.bracketList.length) {
        var bracket = activity.bracketList[index];
        if (activity.startTime + bracket.relativeTimeDiff > now) {
            break;
        }
        index += 1;
    }
    return index;
}

class FlourishingShopMgr {

    // database
    activityId:number = 0;
    bracketIndex:number = 0;    // 下标从0开始

    order:ShopOrder = null;     // not used

    // memory
    currentBracket:Activity.FlourishingShopBracket = null;

    public initData(activity:Activity.FlourishingShopActivity):void {
        if (this.order) {
            return ;
        }

        if (activity.activityId !== this.activityId) {
            this.initNewActivity(activity);
        } else {
            var now = Time.gameNow();
            this.bracketIndex = getShopBracket(activity, now, this.bracketIndex);

            if (this.bracketIndex >= activity.bracketList.length) {
                this.currentBracket = null;
            } else {
                this.currentBracket = activity.bracketList[this.bracketIndex];
            }
        }
    }

    public initNewActivity(activity:Activity.FlourishingShopActivity):void {
        var now = Time.gameNow();
        this.activityId = activity.activityId;
        this.order = null;
        this.bracketIndex = getShopBracket(activity, now, 0);
        this.currentBracket = this.bracketIndex < activity.bracketList.length ?
            activity.bracketList[this.bracketIndex] : null;
    }

    public goNextBracket():void {
        var activity:Activity.FlourishingShopActivity = ActivityGlobalMgr.getActivity(this.activityId),
            now = Time.gameNow();

        if (!activity) {
            this.activityId = 0;
            this.bracketIndex = 0;
            this.currentBracket = null;
            return;
        }

        activity.checkType(ActivityDef.ACTIVITY_TYPE.FLOURISHING_SHOP);

        this.bracketIndex = getShopBracket(activity, now, this.bracketIndex + 1);
        this.currentBracket = this.bracketIndex < activity.bracketList.length ?
            activity.bracketList[this.bracketIndex] : null;
    }

    public createOrder(payID:number):ShopOrder {
        var config = cm.paydb.get(payID);
        if (config.productID !== this.currentBracket.productID) {
            throw new CustomError.UserError(ERRC.COMMON.UNKNOWN, {
                msg: 'COMMON.UNKNOWN'
            });
        }

        var o = this.order = new ShopOrder();
        o.activityId = this.activityId;
        o.bracketIndex = this.bracketIndex;
        o.payID = payID;
        o.status = ActivityDef.FLOURISHING_SHOP_BRACKET_STATUS.HANDLING_ORDER;
        o.bracket = GameUtil.copyObject(this.currentBracket);
        return o;
    }

    public setOrderHandled():void {
        this.order.status = ActivityDef.FLOURISHING_SHOP_BRACKET_STATUS.CAN_GAIN;
    }

    public clearOrder():void {
        this.order = null;
    }

    public buildBracketNetObj():any {
        var b, activity:Activity.FlourishingShopActivity,
            now = Time.gameNow();

        if (this.order) {
            b = this.order.bracket;
        } else {
            if (!this.activityId || !this.currentBracket) return null;

            activity = ActivityGlobalMgr.findActivity(this.activityId);
            activity.checkType(ActivityDef.ACTIVITY_TYPE.FLOURISHING_SHOP);
            b = this.currentBracket;
        }

        var leftTime = 0;
        if (activity) {
            leftTime = activity.startTime + b.relativeTimeDiff > now ? activity.startTime + b.relativeTimeDiff - now : 0;
        }

        return {
            title: b.title,
            productID: b.productID,
            leftTime: leftTime,
            reward: Universal.tranResourceToRewardList(b.reward),
            status: this.order ? this.order.status : ActivityDef.FLOURISHING_SHOP_BRACKET_STATUS.NULL
        };
    }

    public buildDBMsg():any {
        var msg:any = {
            activityId: this.activityId,
            bracketIndex: this.bracketIndex
        };

        if (this.order) {
            msg.order = GameUtil.copyObject(this.order);
            msg.order.bracket.reward = Universal.tranResourceToRewardList(this.order.bracket.reward);
        }

        return msg;
    }

    public loadDBMsg(msg:any):void {
        this.activityId = msg.activityId;
        this.bracketIndex = msg.bracketIndex;

        if (msg.order) {
            this.order = GameUtil.copyObject(msg.order);
            if (msg.order.bracket) {
                this.order.bracket.reward = {};
                if (msg.order.bracket.reward && msg.order.bracket.reward.length > 0) {
                    msg.order.bracket.reward.forEach((reward:Universal.Reward) => {
                        Universal.addResource(this.order.bracket.reward, reward.id, reward.count);
                    });
                }
            }
        }
    }

}

export = FlourishingShopMgr;
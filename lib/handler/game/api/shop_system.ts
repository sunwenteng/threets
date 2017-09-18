import pb = require('node-protobuf-stream');
import async = require('async');

import Log = require('../../../util/log');
import ResourceMgr = require('../resource/resource_mgr');
import ERRC = require('../../../util/error_code');
import Enum = require('../../../util/enum');
import CustomError = require('../../../util/errors');
import Role = require('../role');
import AchievementDef = require('../achievement/defines');
import Time = require('../../../util/time');
import GameUtil = require('../../../util/game_util');
import Universal = require('../universal');
//import LoginDB = require('../../../database/impl/login_db');
import ConfigStc = require('../../../config/struct/config_struct');

import Activity = require('../activity/activity');
import ActivityDef = require('../activity/defines');
import ActivityGlobalMgr = require('../activity/activity_global_mgr');

var cm = require('../../../config').configMgr;

var mapChargeIndex:{[platformId:number]:any[]} = {};
var specialShopItemId:{[shopItemId:number]:{[ownCount:number]:number}} = {};

export function initSystem(cb:(err)=>void) {
    // init platformId - [payConfigId] index
    mapChargeIndex = {};
    var allPayConfig = cm.paydb.all();
    Object.keys(allPayConfig).forEach((key) => {
        var payConfig:ConfigStc.payDB = allPayConfig[key];
        GameUtil.pushArrayInMap(mapChargeIndex, payConfig.payplatformID, payConfig.ID);
    });

    // specialShopItemId
    Object.keys(cm.shop_specialpricedb.all()).forEach((ID) => {
        var config = cm.shop_specialpricedb.get(ID);
        if (!specialShopItemId[config.refID]) {
            specialShopItemId[config.refID] = {};
        }
        specialShopItemId[config.refID][config.ownCount] = config.ID;
    });

    cb(null);
    // 向平台初始化充值校验表内容
    //LoginDB.initGoodsInfo(1, allPayConfig, cb);
}

function getSpecialShopItemID(shopItemID:number, ownCount:number):number {
    return specialShopItemId[shopItemID] ? specialShopItemId[shopItemID][ownCount] : 0;
}

export function init(role:Role, packet:any, done):void {
    role.achievements.updateAchievement(role, AchievementDef.TYPE.ENTER_BUILD_N_COUNT, 1);
    done();
}

export function buy(role:Role, packet:any, done):void {
    var id = packet.id;

    var shopItem = cm.shop_itemdb.get(id);

    var activityDiscount:number = 1, activity:Activity.DiscountActivity = null;
    switch (shopItem.tab) {
        case 10:
            activity = ActivityGlobalMgr.getDiscountActivity(Activity.DiscountType.BOSS_ENERGY);
            break;
        case 11:
            activity = ActivityGlobalMgr.getDiscountActivity(Activity.DiscountType.ARENA_ENERGY);
            break;
    }
    if (activity) {
        activityDiscount = activity.discount / 100;
        Log.uDebug(role.accountId, 'ShopBuy', 'discount activity effective, activityId=' + activity.activityId +
            ', discount=' + activity.discount);
    }

    var consume:Universal.Resource = {}, reward:Universal.Resource = {};
    consume[shopItem.resID] = Math.ceil(shopItem.originPrice * shopItem.salePercent * activityDiscount / 100);
    reward[shopItem.itemID] = shopItem.count;

    ResourceMgr.applyConsumeAndReward(role, Enum.USE_TYPE.SHOP_BUY, consume, reward);

    role.sendUpdatePacket(true);
    done(null, {
        reward        : [{id: shopItem.itemID, count: shopItem.count}],
        propertyModify: [],
        id            : id
    });

    role.onBuy(shopItem.itemID);
}

export function buyBuild(role:Role, packet:any, done):void {
    var id        = packet.id,
        point     = packet.point,
        direction = packet.direction;

    var shopItem = cm.shop_itemdb.get(id);
    var buildBasic = cm.build_basicdb.get(shopItem.itemID);

    var ownCount = role.builds.getBuildCount(buildBasic.ID);
    if (buildBasic.maxCount > 0 && ownCount >= buildBasic.maxCount) {
        throw new CustomError.UserError(ERRC.BUILD.BUILD_OWN_MAX_COUNT, {
            msg: 'BUILD.BUILD_OWN_MAX_COUNT, buildID=' + buildBasic.ID + ', ownCount=' + ownCount
        });
    }

    var consume:Universal.Resource = {};

    var specialID = getSpecialShopItemID(shopItem.ID, ownCount);
    if (specialID) {
        var specialShopItem = cm.shop_specialpricedb.get(specialID);
        consume[specialShopItem.type] = Math.ceil(specialShopItem.price * shopItem.salePercent / 100);
    } else {
        consume[shopItem.resID] = Math.ceil(shopItem.originPrice * shopItem.salePercent / 100);
    }

    ResourceMgr.checkHasEnoughResource(role, consume);

    // after check consume and area data
    var newBuild = role.builds.createBuild(shopItem.itemID);
    newBuild.direction = direction;
    newBuild.point = point;

    ResourceMgr.minusConsume(role, Enum.USE_TYPE.SHOP_BUY, consume);

    if (consume[Enum.RESOURCE_TYPE.GOLD] > 0) {
        role.achievements.updateAchievement(role, AchievementDef.TYPE.CONSUME_GOLD_ON_BUILD, consume[Enum.RESOURCE_TYPE.GOLD]);
    }

    role.builds.checkAllFinishBuilding(role, [newBuild.uid]);

    role.sendUpdatePacket(true);
    done(null, {
        build: newBuild.buildInitNetMsg()
    });
}

var CHARGE_INFO_UPDATE_PERIOD_SEC = 5;

export function checkChargeInfo(role:Role) {
    var now = Time.realNow();
    if (now - role.lastUpdateChargeInfo > CHARGE_INFO_UPDATE_PERIOD_SEC) {
        role.lastUpdateChargeInfo = now;
        if (role.checkAsyncFlag(Enum.ROLE_ASYNC_FLAG.CHECK_CHARGE)) {
            return;
        }
        role.setAsyncFlag(Enum.ROLE_ASYNC_FLAG.CHECK_CHARGE);

        //LoginDB.getUnhandledCharge(role.accountId, (err, ret:Universal.ChargeInfo[]) => {
        //    if (err) {
        //        Log.uError(role.accountId, 'ChargeDetail', 'getUnhandledCharge Error: ' + err.message);
        //        role.rmAsyncFlag(Enum.ROLE_ASYNC_FLAG.CHECK_CHARGE);
        //        return;
        //    }
        //
        //    if (ret.length === 0) {
        //        role.rmAsyncFlag(Enum.ROLE_ASYNC_FLAG.CHECK_CHARGE);
        //        return;
        //    }
        //
        //    async.eachLimit(ret, 10, (chargeInfo:Universal.ChargeInfo, cb) => {
        //        if (chargeInfo.role_id !== role.accountId) {
        //            return cb(null);
        //        }
        //
        //        var rwdCharge:Universal.Resource = {},
        //            rwdGift:Universal.Resource   = {},
        //            payConfig:ConfigStc.payDB    = null;
        //
        //        var productId, money = 0;
        //
        //        var floShopOrder = {
        //            isHandled   : false,
        //            activityId  : 0,
        //            bracketIndex: 0,
        //            reward      : null
        //        };
        //
        //        var bFlourShopOrderHandled = false;
        //
        //        // 玩家购买分档
        //        if (chargeInfo.goods_id) {
        //            payConfig = cm.paydb.get(chargeInfo.goods_id);
        //
        //            if (chargeInfo.addition1) {
        //                // 额外参数 以 '-' 分割
        //                var extparams = chargeInfo.addition1.split('-');
        //                switch (extparams[0]) {
        //                    case "1":   // 活动：阶梯商店购买
        //                        var activityId   = parseInt(extparams[1]),
        //                            bracketIndex = parseInt(extparams[2]);
        //
        //                        // search from memory
        //                        try {
        //                            var activity:Activity.FlourishingShopActivity = ActivityGlobalMgr.findActivity(activityId);
        //                            activity.checkType(ActivityDef.ACTIVITY_TYPE.FLOURISHING_SHOP);
        //
        //                            var bracket = activity.bracketList[bracketIndex - 1];   // start with 1, transform to 0
        //                            if (bracket) {
        //                                rwdCharge = GameUtil.copyObject(bracket.reward);
        //                                floShopOrder.isHandled = true;
        //                                floShopOrder.activityId = activityId;
        //                                floShopOrder.bracketIndex = bracketIndex - 1;
        //                                floShopOrder.reward = bracket.reward;
        //                            } else {
        //                                Log.sError('Charge', 'Error: Can not find bracket, auto_id=%d, extparams=%s',
        //                                    chargeInfo.auto_id, extparams);
        //                            }
        //                        } catch (err) {
        //                            // TODO  search from database
        //                            Log.sError('Charge', 'Error: Can not find activity %d, auto_id=%d, extparams=%s',
        //                                activityId, chargeInfo.auto_id, extparams);
        //                        }
        //                        break;
        //                    default:
        //                        break;
        //                }
        //            }
        //            else {
        //                rwdCharge = GameUtil.copyObject(payConfig.JSON_Item);
        //                if (typeof payConfig.JSON_giftItem === 'object') {
        //                    rwdGift = GameUtil.copyObject(payConfig.JSON_giftItem);
        //                }
        //            }
        //        }
        //        // 玩家直接充值
        //        else {
        //            if (mapChargeIndex.hasOwnProperty(chargeInfo.addition2)) {
        //                var payConfigId = 0;
        //
        //                var platformPayConfig = mapChargeIndex[chargeInfo.addition2];
        //                for (var i = 0; i < platformPayConfig.length; ++i) {
        //                    var obj = platformPayConfig[i];
        //                    payConfig = cm.paydb.get(obj);
        //                    if (chargeInfo.goods_quantity >= payConfig.Price) {
        //                        break;
        //                    }
        //                }
        //
        //                // 低于最低档，使用最低比例
        //                if (payConfigId === 0) {
        //                    payConfig = cm.paydb.get(obj);
        //                }
        //
        //                var delta = chargeInfo.goods_quantity / payConfig.Price;
        //                rwdCharge = GameUtil.copyObject(payConfig.JSON_Item);
        //                if (typeof payConfig.JSON_giftItem === 'object') {
        //                    rwdGift = GameUtil.copyObject(payConfig.JSON_giftItem);
        //                }
        //
        //                // 按照倍率对数量进行变化
        //                Object.keys(rwdCharge).forEach((key) => {
        //                    rwdCharge[key] = Math.round(rwdCharge[key] * delta);
        //                });
        //                Object.keys(rwdGift).forEach((key) => {
        //                    rwdGift[key] = Math.round(rwdGift[key] * delta);
        //                });
        //            }
        //        }
        //
        //        if (!payConfig) {
        //            Log.sError('Charge', 'Can not find payConfig, chargeInfo=' + JSON.stringify(chargeInfo));
        //            return cb(null);
        //        }
        //
        //        productId = payConfig.productID;
        //        money = payConfig.Price;            // 实际价格
        //        var currencyID = payConfig.type;  // 货币类型
        //
        //        // 未充值的时候，更新充值等级，用以判断用户是否有过充值
        //        var bHasCharged = true;
        //        if (!role.getSundryValue(Enum.SUNDRY.FIRST_CHARGE_STATUS)) {
        //            role.setSundryValue(Enum.SUNDRY.FIRST_CHARGE_STATUS, Enum.FIRST_CHARGE_STATUS.CHARGED);
        //
        //            var UpdateProperty = pb.getMessageType('.Api.role.updaetProperty.Notify');
        //            role.sendPacket(new UpdateProperty({
        //                sundry: role.sundryValue.buildInitArray()
        //            }));
        //            bHasCharged = false;
        //        }
        //
        //        // 仅计算充值给予的总钻石 以及实际钻石
        //        var diamondPaid = rwdCharge[Enum.RESOURCE_TYPE.DIAMOND_CHARGE] || 0;
        //
        //        // 合并奖励
        //        Object.keys(rwdGift).forEach((key) => {
        //            GameUtil.plusValueInMap(rwdCharge, key, rwdGift[key]);
        //        });
        //
        //        var diamondTotal = rwdCharge[Enum.RESOURCE_TYPE.DIAMOND] || 0;
        //
        //        ResourceMgr.applyReward(role, Enum.USE_TYPE.CHARGE, rwdCharge);
        //
        //        if (floShopOrder.isHandled) {
        //            role.activities.gainFlourishingBracket(role, floShopOrder);
        //        }
        //
        //        if (diamondPaid > 0) {
        //            role.achievements.updateAchievement(role, AchievementDef.TYPE.PURCHASE_DIAMOND_ONCE, 1);
        //        }
        //
        //        role.sendUpdatePacket(true);
        //
        //        // 充值成功信息
        //        var recharge:any = {};
        //        recharge.productID = productId;
        //        recharge.reward = Universal.tranResourceToRewardList(rwdCharge);
        //        recharge.currency = {
        //            currencyID: currencyID,
        //            count     : money
        //        };
        //
        //        Log.uInfo(role.accountId, 'ChargeDetail', 'bHasCharged=%d, bIsGM=%d, bIsTest=%d, ' +
        //            'auto_id=%d, goods_id=%d, platform=%d, productId=%d, curDiamond=%d, type=%d, reward=%j',
        //            bHasCharged, role.gmAuth > 0, true,
        //            chargeInfo.auto_id, chargeInfo.goods_id, chargeInfo.platform, productId, role.diamond, 0, rwdCharge);
        //
        //        // 立刻触发存储数据库
        //        //CacheMgr.flush(role.accountId);
        //
        //        var character = role.session.getBindingData();
        //        // 修改订单记录
        //        LoginDB.chargeHandled(chargeInfo.auto_id, diamondTotal, diamondPaid, role.session.address.address, character.device.OS, character.device.type, character.device.uid, (err)=> {
        //            if (err) {
        //                Log.uError(role.accountId, 'ChargeDetail', 'update charge info error, auto_id=' + chargeInfo.auto_id + ', error: ' + err.stack);
        //            }
        //            if (role) {
        //                var M = pb.getMessageType('.Api.shop.chargeInfo.Notify');
        //                role.sendPacket(new M(recharge));
        //            }
        //            cb(null);
        //        });
        //    }, (err) => {
        //        role.rmAsyncFlag(Enum.ROLE_ASYNC_FLAG.CHECK_CHARGE);
        //    });
        //});
    }
}
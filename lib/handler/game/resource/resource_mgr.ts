import Enum = require('../../../util/enum');
import log = require('../../../util/log');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');
import Universal = require('../universal');
import Role = require('../role');
import QuestDef = require('../quest/defines');
import Time = require('../../../util/time');

import AchievementDef = require('../achievement/defines');

var cm = require('../../../config').configMgr;

export function hasEnoughResource(role:Role, need:Universal.Resource):boolean {
    var key, keyId;
    for (key in need) {
        if (!need.hasOwnProperty(key)) {
            continue;
        }
        keyId = parseInt(key);
        if (!isNaN(keyId) && need[key] > 0) {
            if (role.getResCount(keyId) < need[key]) {
                return false;
            }
        }
    }
    return true;
}

export function getNotEnoughResource(role:Role, need:Universal.Resource):{[resId:number]:{current:number; need:number}} {
    var key, keyId, notEnough:{[resId:number]:{current:number; need:number}} = {}, enough = true;
    for (key in need) {
        if (!need.hasOwnProperty(key)) {
            continue;
        }
        keyId = parseInt(key);
        if (!isNaN(keyId) && need[key] > 0) {
            var current = role.getResCount(keyId);
            if (current < need[key]) {
                notEnough[key] = {
                    current: current,
                    need: need[key]
                };
                enough = false;
            }
        }
    }

    return enough ? null : notEnough;
}

export function doAddResource(role:Role, useType:number, resource:Universal.Resource):void {
    var resId, resType, i, originCount, addValue;
    var currentModify:{[resId:number]:{current?:number; delta:number}} = {};

    Object.keys(resource).forEach((resKey) => {
        resId = parseInt(resKey);
        if (!isNaN(resId)) {
            resType = Universal.getResIDType(resId);
            switch (resType) {

                case Enum.RES_ID_TYPE.ITEM:
                case Enum.RES_ID_TYPE.NUMERIC: {

                    addValue = resource[resKey];

                    if (resId === Enum.RESOURCE_TYPE.DIAMOND_CHARGE && addValue < 0) {
                        // 付费钻石不参与扣除
                        return ;
                    }

                    switch (resId) {
                        case Enum.RESOURCE_TYPE.ROLE_LEVEL: // 不直接加等级
                            break;
                        case Enum.RESOURCE_TYPE.ROLE_EXP:
                            role.addExp(addValue);
                            break;
                        default :
                        {
                            originCount = role.getResCount(resId);

                            if (addValue > 0) {
                                if (Number.MAX_VALUE - originCount < addValue) {        // overflow
                                    log.uError(role.accountId, 'ResourceDetail', 'value overflow and not add, useType=%d, current=%d, add=%d', useType,
                                        originCount, addValue);
                                } else {
                                    role.addResCount(resId, addValue);

                                    if (resId == Enum.RESOURCE_TYPE.DIAMOND_CHARGE) {
                                        // 如果是付费钻石，DIAMOND也要加等量数值
                                        role.addResCount(Enum.RESOURCE_TYPE.DIAMOND, addValue);
                                    }

                                    role.equips.openCraftSkillByItemGain(resId);
                                }
                            } else if (addValue < 0) {
                                var value = originCount + addValue;
                                if (value < 0) {                    // minus to zero
                                    log.uError(role.accountId, 'ResourceDetail', 'try to minus value which bigger than current value, useType=%d, current=%d, add=%d',
                                        useType, originCount, addValue);
                                    role.setResCount(resId, 0);
                                } else {
                                    role.setResCount(resId, value);
                                }

                                if (resId === Enum.RESOURCE_TYPE.DIAMOND) {
                                    // 扣除付费钻石
                                    var diamondCharge = role.getResCount(Enum.RESOURCE_TYPE.DIAMOND_CHARGE);
                                    if (diamondCharge > 0) {
                                        role.addResCount(Enum.RESOURCE_TYPE.DIAMOND_CHARGE, addValue);
                                        var currentCharge = role.getResCount(Enum.RESOURCE_TYPE.DIAMOND_CHARGE);
                                        currentModify[Enum.RESOURCE_TYPE.DIAMOND_CHARGE] = {
                                            delta: currentCharge - diamondCharge,
                                            current: currentCharge
                                        }
                                    }
                                }
                            }

                            var currentCount = role.getResCount(resId);
                            if (originCount !== currentCount) {
                                currentModify[resKey] = {
                                    delta: currentCount - originCount,
                                    current: currentCount
                                };
                            }
                            break;
                        }   // default

                    }   // switch (resId)
                    break;
                } // case Enum.RES_ID_TYPE.NUMERIC
                  // case Enum.RES_ID_TYPE.ITEM

                case Enum.RES_ID_TYPE.ARMOR: {
                    var equip;
                    addValue = resource[resKey];
                    for (i = 0; i < addValue; i += 1) {
                        equip = role.equips.createEquip(resId);
                    }
                    currentModify[resKey] = {
                        delta: addValue,
                    };
                    role.equips.openCraftSkillByEquipLevel(resId, 1);
                    break;
                } // case Enum.RES_ID_TYPE.ARMOR

                case Enum.RES_ID_TYPE.CAPE: {
                    originCount = role.getResCount(resId);
                    addValue = resource[resKey] + originCount;
                    addValue = addValue >= 1 ? 1 : 0; // cape is unique
                    if (addValue > 0) {
                        currentModify[resKey] = {
                            delta: addValue,
                        };
                    }
                    role.setResCount(resId, addValue);
                    break;
                } // Enum.RES_ID_TYPE.CAPE

                case Enum.RES_ID_TYPE.BUILD: {
                    //role.builds.createBuild(resId);     // only add one by one
                    break;
                } // Enum.RES_ID_TYPE.BUILD

                default :
                    break;
            }   // switch (resType)

        }
    });

    //***********  all compute operation must complete  **************
    // add log here
    Object.keys(currentModify).forEach((resKey) => {
        resId = parseInt(resKey);       // this must not be NaN
        resType = Universal.getResIDType(resId);
        var delta = currentModify[resKey].delta;

        var detail:any = { useType: useType };
        detail.resId = resId;
        detail.count = delta;
        if (currentModify[resKey].hasOwnProperty('current')) {
            detail.current = currentModify[resKey].current;
        }

        switch (resId) {
            case Enum.RESOURCE_TYPE.DIAMOND:
            case Enum.RESOURCE_TYPE.DIAMOND_CHARGE:
            default:
                switch (resType) {
                    case Enum.RES_ID_TYPE.ARMOR:
                        if (delta > 0) {
                            var equipConfig = cm.equipdb.get(resId);
                            role.achievements.updateAchievement(role, AchievementDef.TYPE.EARN_N_EQUIP_WITH_M_STAR, equipConfig.raity, delta);
                        }
                        log.uInfo(role.accountId, 'Resource', detail);
                        break;
                    case Enum.RES_ID_TYPE.CAPE:
                        log.uInfo(role.accountId, 'Resource', detail);
                        break;
                    default :
                        log.uInfo(role.accountId, 'Resource', detail);
                        break;
                }
                break;
        }

        if (delta < 0) {
            role.achievements.updateAchievement(role, AchievementDef.TYPE.SPECIFY_RESOURCE_ALL_CONSUME, resId, -delta);

            if (resId === Enum.RESOURCE_TYPE.DIAMOND) {
                role.activities.onConsume(role, -delta);
            }

        } else if (delta > 0) {
            role.quests.updateQuest(role, QuestDef.CriteriaType.EARN_N_RES_ID, [resId], delta);
            role.achievements.updateAchievement(role, AchievementDef.TYPE.EARN_N_ITEM, resId, delta);
        }
    });

    // 记录钻石消费记录
    if(currentModify[Enum.RESOURCE_TYPE.DIAMOND] && currentModify[Enum.RESOURCE_TYPE.DIAMOND].delta < 0) {
        var diamondUse:Universal.DiamondUse = {};
        diamondUse.time = Time.realNow();
        diamondUse.goodsId = useType;
        diamondUse.goodsQuantity = 1;
        diamondUse.value = Math.abs(currentModify[Enum.RESOURCE_TYPE.DIAMOND].delta);
        diamondUse.diamondPaidUse = currentModify[Enum.RESOURCE_TYPE.DIAMOND_CHARGE] ? Math.abs(currentModify[Enum.RESOURCE_TYPE.DIAMOND_CHARGE].delta) : 0;
        role.diamondUseArr.push(diamondUse);
    }
}

// 判断 + throw + 扣资源 + 加资源
export function applyConsumeAndReward(role:Role, useType:number, consume:Universal.Resource, reward:Universal.Resource):void {
    checkHasEnoughResource(role, consume);
    minusConsume(role, useType, consume);

    applyReward(role, useType, reward);
}

// 判断 + throw + 扣资源
// 得保证之后的代码不会出错，否则会出现扣了资源但是没有获得相应奖励
export function applyConsume(role:Role, useType:number, consume:Universal.Resource):void {
    checkHasEnoughResource(role, consume);
    minusConsume(role, useType, consume);
}

// 判断 + throw
export function checkHasEnoughResource(role:Role, resource:Universal.Resource):void {
    var notEnough = getNotEnoughResource(role, resource);
    if (notEnough) {
        var notEnoughResID = parseInt(Object.keys(notEnough)[0]);
        throw new CustomError.UserError(ERRC.RESOURCE.NOT_ENOUGH, {
            msg: 'RESOURCE.NOT_ENOUGH, ' + JSON.stringify(notEnough),
            param: [notEnoughResID]
        });
    }
}

// 直接扣资源
export function minusConsume(role:Role, useType:number, consume:Universal.Resource):void {
    var resource:Universal.Resource = {};
    Object.keys(consume).forEach((key) => {
        resource[key] = -consume[key];
    });
    log.sDebug('ResouceDetail', '%j', resource);
    doAddResource(role, useType, resource);
}

// 加资源
export function applyReward(role:Role, useType:number, reward:Universal.Resource):void {
    log.sDebug('ResouceDetail', '%j', reward);
    doAddResource(role, useType, reward);
}
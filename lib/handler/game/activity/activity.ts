// src/handler/api/activity
import ActivityDef  = require('./defines');
import Universal    = require('../universal');
import LootMgr      = require('../loot/loot_mgr');
import ERRC         = require('../../../util/error_code');
import CustomError  = require('../../../util/errors');

export interface ActivityDBData {
    activityId:number;
    activityType:number;
    startTime:number;
    endTime:number;
    params:string;
}

function checkLootId(lootId:number):void {
    if (!LootMgr.hasGroup(lootId)) {
        throw new Error('loot id not found, lootId=' + lootId);
    }
}

function checkParamLength(length:number, require:number):void {
    if (length < require) {
        throw new Error('param count small than ' + require);
    }
}

var COMMON_PARAM_COUNT = 3;

export class Activity {
    activityId:number = 0;
    activityType:ActivityDef.ACTIVITY_TYPE = ActivityDef.ACTIVITY_TYPE.NULL;
    startTime:number = 0;
    endTime:number = 0;
    params:string = '';

    // parse from params
    title:string = '';
    resourceVersion:number = 0;
    picture:string = '';

    // memory
    lastUpdateTime:number = 0;

    constructor(activityId:number,
                activityType:ActivityDef.ACTIVITY_TYPE,
                start:number,
                end:number) {
        this.activityId = activityId;
        this.activityType = activityType;
        this.startTime = start;
        this.endTime = end;
    }

    public loadCommonParams(params:string[]):void {
        this.resourceVersion = parseInt(params[0]);
        this.title = params[1];
        this.picture = params[2];
    }

    public loadParams(param:string):void {
        throw new Error("You should not loadParams on Origin Activity Class");
    }

    public buildDBData():ActivityDBData {
        return {
            activityId: this.activityId,
            activityType: this.activityType,
            startTime: this.startTime,
            endTime: this.endTime,
            params: this.params
        };
    }

    public buildNetMsg(now:number):any {
        return {
            activityId: this.activityId,
            activityType: this.activityType,
            leftTime: this.getLeftTime(now),
            lastUpdateTime: 0,
            resourceVersion: this.resourceVersion,
            title: this.title,
            endTime: this.endTime,
            picture: this.picture
        };
    }

    public checkType(activityType:ActivityDef.ACTIVITY_TYPE):void {
        if (this.activityType !== activityType) {
            throw new CustomError.UserError(ERRC.ACTIVITY.TYPE_ERROR, {
                msg: 'ACTIVITY.TYPE_ERROR, activityType=' + activityType + ', this.activityType=' + this.activityType
            });
        }
    }

    public checkTime(now:number):void {
        if (now < this.startTime) {
            throw new CustomError.UserError(ERRC.ACTIVITY.NOT_START, {
                msg: 'ACTIVITY.NOT_START'
            });
        }

        if (now >= this.endTime) {
            throw new CustomError.UserError(ERRC.ACTIVITY.HAS_FINISHED, {
                msg: 'ACTIVITY.HAS_FINISHED'
            });
        }
    }

    public getStatus(now:number):ActivityDef.STATUS {
        return now < this.startTime ? ActivityDef.STATUS.NOT_START :
            ( (now < this.endTime) ? ActivityDef.STATUS.START : ActivityDef.STATUS.END );
    }

    /**
     * @param now           - current time
     * @returns {number}    - left seconds;
     */
    public getLeftTime(now:number):number {
        return this.endTime > now ? this.endTime - now : 0;
    }

}

export class LoginGiftActivity extends Activity {

    reward:Universal.Resource = {};

    constructor(activityId:number, start:number, end:number) {
        super(activityId, ActivityDef.ACTIVITY_TYPE.LOGIN_GIFT, start, end);
    }

    public loadParams(params:string):void {
        var paramArr = params.split('|');

        checkParamLength(paramArr.length, 4);

        super.loadCommonParams(paramArr);

        var giftList = paramArr[COMMON_PARAM_COUNT].split(/\s*;\s*/);              // COMMON_PARAM_COUNT+0

        // rewardList
        var resId = 0, resCount = 0,
            success = 0;
        for (var i = 0; i < giftList.length; i += 1) {
            var gift = giftList[i].match(/\d+/g);
            if (gift) {
                for (var j = 0; j < gift.length; j += 2) {
                    resId = parseInt(gift[j]);
                    resCount = parseInt(gift[j + 1]);
                    if (resId > 0 && resCount > 0) {
                        Universal.checkResourceIdValid(resId);
                        success += 1;
                        this.addRewardContent(resId, resCount);
                    }
                }
            }
        }

        if (success === 0) {
            throw new Error('no valid reward, activityId=' + this.activityId);   // 没有有效奖励
        }

        this.params = params;
    }

    public getReward():Universal.Resource {
        return this.reward;
    }

    // for initial below
    public addRewardContent(resID:number, count:number):void {
        if (!this.reward[resID]) this.reward[resID] = count;
        else this.reward[resID] += count;
    }
}

export class ConsumeInfo {
    requireCount:number = 0;    // 消耗需求数量
    resID:number = 0;           // 资源ID
    resCount:number = 0;           // 资源数量

    constructor(requireCount:number, resID:number, count:number) {
        this.requireCount = requireCount;
        this.resID = resID;
        this.resCount = count;
    }
}

export class ConsumeActivity extends Activity {

    consumeInfoList:ConsumeInfo[] = [];

    constructor(activityId:number, start:number, end:number) {
        super(activityId, ActivityDef.ACTIVITY_TYPE.DIAMOND_CONSUME, start, end);
    }

    public loadParams(params:string):void {
        var paramArr = params.split('|');

        checkParamLength(paramArr.length, 3);

        super.loadCommonParams(paramArr);

        var cla = paramArr[COMMON_PARAM_COUNT].split(/\s*;\s*/);
        // rewardList
        var param,
            resId = 0, resCount = 0, requireCount = 0,
            success = 0;

        for (var i = 0; i < cla.length; i += 1) {      // COMMON_PARAM_COUNT to last
            param = cla[i].match(/\d+/g);
            if (!param) {
                throw new Error('content error: content=' + paramArr[i]);
            }
            if (param.length !== 3) {
                if (i + 1 === cla.length) break;
                throw new Error('ConsumeActivity bracket error, length = ' + param.length + ', not equal 3, content=' +
                    param + ', activityId=' + this.activityId);
            }

            requireCount = parseInt(param[0]);
            resId = parseInt(param[1]);
            resCount = parseInt(param[2]);
            if (requireCount > 0 && resId > 0 && resCount > 0) {
                Universal.checkResourceIdValid(resId);
                success += 1;
                this.consumeInfoList.push(new ConsumeInfo(requireCount, resId, resCount));
            }
        }

        if (success === 0) {
            throw new Error('no valid bracket, activityId=' + this.activityId);   // 没有有效分档
        }

        this.sortConsumeInfo();
        this.params = params;
    }

    // for initial below
    public addConsumeInfo(requireCount:number, resID:number, count:number):void {
        this.consumeInfoList.push(new ConsumeInfo(requireCount, resID, count));
    }

    public sortConsumeInfo():void {
        this.consumeInfoList.sort((a, b) => {
            return a.requireCount - b.requireCount;
        });
    }

}

export class ShadowChest {
    chestCount:number = 0;
    price:number = 0;
    guaranteeReward:Universal.Resource = {};

    constructor(chestCount:number, price:number) {
        this.chestCount = chestCount;
        this.price = price;
    }

    public addReward(resID:number, count:number):void {
        Universal.addResource(this.guaranteeReward, resID, count);
    }

    public buildNetObj():any {
        return {
            chestCount: this.chestCount,
            price: this.price,
            reward: Universal.tranResourceToRewardList(this.guaranteeReward)
        };
    }
}

export class ShadowChestActivity extends Activity {

    chestMap:{[chestCount:number]:ShadowChest} = {};
    chestLootID:number = 0;
    chanceStars:string = '';
    showRewardList:number[] = [];

    constructor(activityId:number, start:number, end:number) {
        super(activityId, ActivityDef.ACTIVITY_TYPE.SHADOW_CHEST, start, end);
    }

    public loadParams(params:string):void {
        var paramArr = params.split('|'),
            param;

        checkParamLength(paramArr.length, COMMON_PARAM_COUNT + 4);

        super.loadCommonParams(paramArr);

        // start COMMON_PARAM_COUNT
        var index = COMMON_PARAM_COUNT;
        this.setLootID(parseInt(paramArr[index++]));
        this.chanceStars = paramArr[index++];
        var showReward = paramArr[index++].match(/\d+/g);
        var chestList:string[] = paramArr[index++].split(/\s*;\s*/);

        checkLootId(this.chestLootID);

        this.showRewardList = [];
        if (showReward) {
            showReward.forEach((content) => {
                var rewardId = parseInt(content);
                if (!isNaN(rewardId) && rewardId > 0) {
                    this.showRewardList.push(rewardId);
                }
            });
        }

        // chestMap
        var chestCount = 0, price = 0, chest:ShadowChest = null, resId = 0, resCount = 0,
            success = 0;

        for (var i = 0; i < chestList.length; i += 1) {
            param = chestList[i].match(/\d+/g);
            if (!param) {
                throw new Error('chest content error: content=' + chestList[i]);
            }
            if (param.length > 0 && param.length < 2) {
                throw new Error('ShadowChestActivity bracket error, length = ' + param.length + ', not bigger than 2, content=' + param);
            }

            chestCount = parseInt(param[0]);
            price = parseInt(param[1]);
            if (chestCount > 0 && price > 0) {
                chest = new ShadowChest(chestCount, price);
                var rewardLength = param.length - param.length % 2;
                for (var j = 2; j < rewardLength; j += 2) {
                    resId = parseInt(param[j]);
                    resCount = parseInt(param[j + 1]);
                    if (resId > 0 && resCount > 0) {
                        Universal.checkResourceIdValid(resId);
                        chest.addReward(resId, resCount);
                    }
                }
                this.addChest(chest);
                success += 1;
            }
        }

        if (success === 0) {
            throw new Error('no valid chest, activityId=' + this.activityId);   // 没有有效分档
        }

        this.params = params;
    }

    public getLootID():number {
        return this.chestLootID;
    }

    public getChest(chestCount:number):ShadowChest {
        return this.chestMap[chestCount];
    }

    public findChest(chestId:number):ShadowChest {
        if (!this.chestMap[chestId]) {
            throw new CustomError.UserError(ERRC.ACTIVITY.CHEST_NOT_FOUND, {
                msg: 'ACTIVITY.CHEST_NOT_FOUND, chestId=' + chestId
            });
        }
        return this.chestMap[chestId];
    }

    public buildChestList():any[] {
        var chestList = [];
        Object.keys(this.chestMap).forEach((key) => {
            var chest = this.chestMap[key];
            chestList.push(chest.buildNetObj());
        });
        return chestList;
    }

    // for initial below
    public setLootID(lootID:number):void {
        this.chestLootID = lootID;
    }

    public addChest(chest:ShadowChest):void {
        this.chestMap[chest.chestCount] = chest;
    }

}

export class FlourishingChest {
    chestId:number = 0;
    chance:number = 0;
    icon:string = '';
    chestLootId:number = 0;
    guaranteeLootId:number = 0;
    guaranteeCount:number = 0;
    price:number = 0;

    constructor(chestId:number, chance:number, icon:string, chestLootId:number,
                guaranteeLootId:number, guaranteeCount:number, price:number) {
        this.chestId = chestId;
        this.chance = chance;
        this.icon = icon;
        this.chestLootId = chestLootId;
        this.guaranteeLootId = guaranteeLootId;
        this.guaranteeCount = guaranteeCount;
        this.price = price;
    }

    public buildNetObj():any {
        return {
            chestId: this.chestId,
            chance: this.chance,
            icon: this.icon,
            lootCount: this.guaranteeCount,
            price: this.price
        };
    }

}

export class FlourishingChestActivity extends Activity {

    chestMap:{[chestId:number]:FlourishingChest} = {};
    chanceStars:string = '';
    showRewardList:number[] = [];
    chanceBonusId:number = 0;

    constructor(activityId:number, start:number, end:number) {
        super(activityId, ActivityDef.ACTIVITY_TYPE.FLOURISHING_CHEST, start, end);
    }

    public loadParams(params:string):void {
        var paramArr = params.split('|');

        checkParamLength(paramArr.length, COMMON_PARAM_COUNT + 4);

        super.loadCommonParams(paramArr);

        var index = COMMON_PARAM_COUNT;
        this.chanceStars = paramArr[index++];                         // 2
        var showReward = paramArr[index++].match(/\d+/g);             // 3
        var chestList:string[] = paramArr[index++].split(/\s*;\s*/);  // 4
        this.chanceBonusId = parseInt(paramArr[index++]);

        // showReward
        this.showRewardList = [];
        if (showReward) {
            showReward.forEach((content) => {
                var rewardId = parseInt(content);
                if (!isNaN(rewardId) && rewardId > 0) {
                    this.showRewardList.push(rewardId);
                }
            });
        }

        // chestList
        var success = 0;
        for (var i = 0; i < chestList.length; i += 1) {
            var param = chestList[i].split(/\s*-\s*/);
            if (param.length > 1 && param.length < 6) {
                throw new Error('Chest Param Count not Enough, need 6, have=' + param.length + ', content=' + param);
            } else if (param.length <= 1) {
                continue;
            }
            var chance = parseInt(param[0]),
                icon = param[1],
                guaranteeCount = parseInt(param[2]),
                price = parseInt(param[3]),
                chestLootId = parseInt(param[4]),
                guaranteeLootId = parseInt(param[5]);

            if (chance > 0 && guaranteeCount > 0 && price > 0 && chestLootId > 0 && guaranteeLootId > 0) {
                checkLootId(chestLootId);
                checkLootId(guaranteeLootId);
                success += 1;
                this.addChest(new FlourishingChest(i+1, chance, icon, chestLootId, guaranteeLootId, guaranteeCount, price));
            } else {
                throw new Error('Chest Param Error: number value not bigger than 0, content=' + param);
            }
        }

        Universal.checkResourceIdValid(this.chanceBonusId);

        if (success === 0) {
            throw new Error('no valid chest, activityId=' + this.activityId);   // 没有有效分档
        }

        this.params = params;
    }

    public buildChestList():any[] {
        var chestList = [];
        Object.keys(this.chestMap).forEach((key) => {
            var chest = this.chestMap[key];
            chestList.push(chest.buildNetObj());
        });
        return chestList;
    }

    public getChest(chestId:number):FlourishingChest {
        return this.chestMap[chestId];
    }

    public findChest(chestId:number):FlourishingChest {
        if (!this.chestMap[chestId]) {
            throw new CustomError.UserError(ERRC.ACTIVITY.CHEST_NOT_FOUND, {
                msg: 'ACTIVITY.CHEST_NOT_FOUND, chestId=' + chestId
            });
        }
        return this.chestMap[chestId];
    }

    // for initial below
    public addChest(chest:FlourishingChest):void {
        this.chestMap[chest.chestId] = chest;
    }
}

export class CraftTask {
    armorID:number = 0;
    requireCount:number = 0;

    constructor(armorID:number, count:number) {
        this.armorID = armorID;
        this.requireCount = count;
    }

    public buildNetObj():any {
        return {
            armorID: this.armorID,
            requireCount: this.requireCount
        };
    }
}

export class CraftActivity extends Activity {

    reward:Universal.Resource = {};
    craftTask:CraftTask[] = [];

    constructor(activityId:number, start:number, end:number) {
        super(activityId, ActivityDef.ACTIVITY_TYPE.CRAFT, start, end);
    }

    public loadParams(params:string):void {
        var paramArr = params.split('|');

        checkParamLength(paramArr.length, COMMON_PARAM_COUNT + 2);

        super.loadCommonParams(paramArr);

        var index = COMMON_PARAM_COUNT;
        var reward = paramArr[index++].match(/\d+/g);
        var task = paramArr[index++].split(/\s*;\s*/);

        // reward
        var rewardCount = 0;
        if (reward) {
            var length = Math.floor(reward.length / 2);
            for (var i = 0; i < length; i += 1) {
                var resId = parseInt(reward[i * 2]);
                var resCount = parseInt(reward[i * 2 + 1]);
                if (resId > 0 && resCount > 0) {
                    Universal.checkResourceIdValid(resId);
                    this.addReward(resId, resCount);
                    rewardCount += 1;
                }
            }
        }
        if (rewardCount === 0) {
            throw new Error('no reward');
        }

        // task
        var success = 0;
        for (var i = 0; i < task.length; i += 1) {
            var param = task[i].match(/\d+/g);
            if (param) {
                var armorID = parseInt(param[0]),
                    requireCount = parseInt(param[1]);
                if (armorID > 0 && requireCount > 0) {
                    this.addCraftTask(new CraftTask(armorID, requireCount));
                    success += 1;
                }
            }
        }

        if (success === 0) {
            throw new Error('no valid craft task, activityId=' + this.activityId);   // 没有有效分档
        }

        this.params = params;
    }

    public buildCraftList():any[] {
        var craftList = [];
        this.craftTask.forEach((task:CraftTask) => {
            craftList.push(task.buildNetObj());
        });
        return craftList;
    }

    public addReward(resID:number, count:number):void {
        Universal.addResource(this.reward, resID, count);
    }

    public addCraftTask(task:CraftTask):void {
        this.craftTask.push(task);
    }

}

export enum DiscountType {
    NULL = 0,
    ARENA_ENERGY = 1,
    BOSS_ENERGY = 2,
    MAX = 3
}

// 折扣活动
export class DiscountActivity extends Activity {
    discount:number = 100;
    discountType:DiscountType = 0;

    constructor(activityId:number, start:number, end:number) {
        super(activityId, ActivityDef.ACTIVITY_TYPE.DISCOUNT, start, end);
    }

    public loadParams(params:string):void {
        var paramArr = params.split('|');

        checkParamLength(paramArr.length, COMMON_PARAM_COUNT + 2);

        super.loadCommonParams(paramArr);
        var index = COMMON_PARAM_COUNT;
        this.discountType = parseInt(paramArr[index++]);          // 3
        this.discount = parseInt(paramArr[index++]);              // 4

        if (this.discountType <= DiscountType.NULL || this.discountType >= DiscountType.MAX) {
            throw new Error('discountType error, activityId=' + this.activityId + ', discountType=' + this.discountType +
                ', need between 1 and ' + (DiscountType.MAX - 1));
        }

        if (this.discount <= 0 || this.discount >= 100) {
            throw new Error('discount error, activityId=' + this.activityId + ', discount=' + this.discount);
        }

        this.params = params;
    }

}

export class RedirectActivity extends Activity {
    internalRedirect:string = '';   // 内部跳转
    externalRedirect:string = '';   // 外部跳转

    constructor(activityId:number, start:number, end:number) {
        super(activityId, ActivityDef.ACTIVITY_TYPE.COMMON_REDIRECT, start, end);
    }

    public loadParams(params:string):void {
        var paramArr = params.split('|');

        checkParamLength(paramArr.length, COMMON_PARAM_COUNT + 2);

        super.loadCommonParams(paramArr);
        var index = COMMON_PARAM_COUNT;
        this.internalRedirect = paramArr[index++];          // 3
        this.externalRedirect = paramArr[index++];          // 4

        this.params = params;
    }
}

function tranTimeDiffString(diff:string):number {
    var c = {d: 86400, h: 3600, m: 60, s: 1};
    var list = diff.split(/([dhms])/);
    var result = 0;
    for (var i = 0; i < Math.floor(list.length / 2); i += 1) {
        var value = parseInt(list[i * 2]),
            key = list[i * 2 + 1];

        if (value > 0) {
            result += c[key] * value;
        }
    }
    return result;
}

export class FlourishingShopBracket {
    title:string = '';
    reward:Universal.Resource = {};
    relativeTimeDiff:number = 0;
    productID:number = 0;           // Ref: pay.productID
}

export class FlourishingShopActivity extends Activity {
    bracketList:FlourishingShopBracket[] = [];

    constructor(activityId:number, start:number, end:number) {
        super(activityId, ActivityDef.ACTIVITY_TYPE.FLOURISHING_SHOP, start, end);
    }

    public loadParams(params:string):void {
        var paramArr = params.split('|');

        checkParamLength(paramArr.length, COMMON_PARAM_COUNT + 1);

        super.loadCommonParams(paramArr);
        var index = COMMON_PARAM_COUNT;
        var bracketInfo = paramArr[index++],
            brackets:any[];

        try {
            brackets = JSON.parse(bracketInfo);
        } catch (err) {
            throw new Error('JSON.parse brackets Error: ' + err.message);
        }

        if (!Array.isArray(brackets)) {
            throw new Error('bracket is not Array');
        }

        if (brackets.length === 0) {
            throw new Error('no valid bracket, length == 0');
        }

        var missingField:{[key:string]:boolean} = {};
        this.bracketList = [];
        for (var i = 0; i < brackets.length; i += 1) {
            var bi = brackets[i];
            var bracket = new FlourishingShopBracket();

            Object.keys(bracket).forEach((key) => {
                if (!bi.hasOwnProperty(key)) {
                    missingField[key]= true;
                }
            });

            if (Object.keys(missingField).length > 0) {
                throw new Error('Missing Field: ' + JSON.stringify(missingField));
            }

            //Universal.checkResourceIdValid();

            bracket.title = bi.title;
            bracket.productID = bi.productID;
            bracket.relativeTimeDiff = tranTimeDiffString(bi.relativeTimeDiff);
            bracket.reward = bi.reward;

            this.bracketList.push(bracket);
        }

        this.params = params;
    }
}
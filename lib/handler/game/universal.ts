// 游戏服通用结构和方法

import Enum = require('../../util/enum');
import HeroDefine = require('./hero/defines');
import HeroDef = require('./hero/defines');
import Util = require('../../util/game_util');
import Robot = require('../../service/robot/robot');
import CustomError = require('../../util/errors');
import ERRC = require('../../util/error_code');
import ErrorMsg = require('../../util/error_msg');
import Config = require('../../config');

var StringChecker;
try {
    StringChecker = require('../../../build/Release/StringChecker.node');
} catch (e) {
    StringChecker = require('../../../../../build/Release/StringChecker.node');
}

var RES_ID_INTERVAL = 1000;

// 自然回复1点HP所需要的秒数


//1	    25000		装备融合时，金币(6200)的消耗数量
export var GLB_GOLD_COST_IN_EQUIP_COMBINE:number = 25000;

//2	    1		装备融合时，融合石(6400)的消耗数量
export var GLB_STONE_COST_IN_EQUIP_COMBINE:number = 1;

//3	    10		boss体力最大值
export var GLB_BOSS_MAX_ENERGY:number = 10;

//4	    2		已完成任务列表more增加个数
// ...

//5	    100		血瓶回复血量
export var GLB_RECOVER_HEALTH_COUNT:number = 100;  // 血瓶回复血量

//6	    3		回复满血量需要钻石
export var GLB_RECOVER_HEALTH_DIAMOND:number = 3;  // 回复满血量需要钻石

//7	    10		竞技场开启等级
export var GLB_ARENA_OPEN_LEVEL:number = 10; // 竞技场开启等级

//8	    10		好友协助次数上线
export var GLB_FRIEND_HIRE_MAX_COUNT:number = 10;

//9	    86400	好友时间回复
export var GLB_FRIEND_REFRESH_HIRE_COUNT_INTERVAL:number = 86400;

//10	1500	竞技场体力回复CD
export var GLB_ARENA_RECOVER_ENERGY_INTERVAL:number = 1500;

//11	10		竞技场体力上限
export var GLB_ARENA_ENERGY_MAX_COUNT:number = 10;

//12	1800	加速购买土地时，每1800秒消耗1钻石。(钻石数向上取整)
export var GLB_ACCELERATE_OPEN_AREA_DIAMOND_COST_SECOND:number = 1800;

//13	3600	加速购买建筑时，每3600秒消耗1钻石。(钻石数向上取整)
export var GLB_ACCELERATE_BUILD_DIAMOND_COST_SECOND:number = 3600;

//14	300		每次好友邀请获得金币
export var GLB_INVITE_FRIEND_GOLD_REWARD:number = 300;

//15	600		连胜计时
export var GLB_WINSTREAK_COOLDOWN:number = 600;    // 连胜计时

//16	8		复活钻石
export var GLB_DUNGEON_RESTORE_HEALTH_DIAMOND:number = 8;
//17	1001	默认竞技场装备剪影
//18	arenamap	竞技场默认场景
//19	arenamap	BOSS默认场景
//20	arenamap	召唤BOSS默认场景
//21	20		自然回复1点HP所需要的秒数
export var GLB_REVIVE_HEALTH_INTERVAL:number = 20;
//22	50		大于等于多少级不弹出打造提示
//23	1000	创建角色初始金币
var GLB_NEW_ROLE_INITIAL_GOLD:number = 1000;
//24	2		创建角色初始钻石
var GLB_NEW_ROLE_INITIAL_DIAMOND:number = 2;
//25	1003	创建角色背包装备id1
var GLB_NEW_ROLE_INITIAL_EQUIP1:number = 1003;
//26	1005	创建角色背包装备id2
var GLB_NEW_ROLE_INITIAL_EQUIP2:number = 1005;
//27	2		创建角色背包装备数量（id1与id2共用该数量）
var GLB_NEW_ROLE_INITIAL_EQUIP_COUNT:number = 2;

export var newRoleInitalReward:Resource = {};
//28	0		新手战斗我方初始化怒气
//29	0		新手战斗敌方初始化怒气

//39	7200	BOSS出现后的持续时间
export var GLB_BOSS_DURATION:number = 7200;         // boss持续时间
//40	10		世界boss开启等级
export var GLB_WORLD_BOSS_OPEN_LEVEL:number = 10;
//41	9999	新手战斗掉落loot组
export var GLB_NEW_ROLE_GUIDE_BATTLE_LOOT_ID:number = 9999;    // 新手引导战斗掉落ID
//42	10		召唤BOSS开启等级
export var GLB_SUMMON_BOSS_OPEN_LEVEL:number = 10;
//43	1		付费大招扣钻石
export var GLB_USE_SPECIAL_DIAMOND:number = 1;      // 大招消耗钻石
//44-47
//48-57
export var GLB_FIRST_CHARGE_REWARD:Resource = {};   // 首冲奖励
//58	15		世界聊天发送CD(秒)
export var GLB_WORLD_CHAT_COOLDOWN:number = 60;
//59	100		聊天屏蔽列表的人数上限
export var GLB_CHAT_SHIELD_LIMIT:number = 100;
//60
//61
export var GLB_FACEBOOK_NEWS_DIAMOND:number = 10;
//62	150		聊天单句字符限制
export var GLB_CHAT_MESSAGE_LIMIT:number = 150;
//63	6100	每日分享奖励的ID
//64	2		每日分享奖励的数量
export var GLB_FACEBOOK_SHARE_REWARD:Resource = {};

export var GLB_RETURN_REWARD_LIMIT_DAYS:number = 0;

//77
export var GLB_TRIAL_INTERVAL_PER_VICTORY:number = 600;
//78
//79
export var GLB_VICTORY_COUNT_PER_TRIAL:number = 3;
//80
export var GLB_TRIAL_REFRESH_INTERVAL:number = 24 * 3600;

export var GLB_JOIN_GUILD_CD:number = 86400;

var fixedReward:{[ID:number]:Resource} = {};
var monthSignReward:{[month:number]:{[day:number]:Resource}} = {};

export function reloadConfig():void {
    var cm = Config.configMgr;
    GLB_GOLD_COST_IN_EQUIP_COMBINE = cm.globaldb.get(1).value;
    GLB_STONE_COST_IN_EQUIP_COMBINE = cm.globaldb.get(2).value;
    GLB_BOSS_MAX_ENERGY = cm.globaldb.get(3).value;
    // 4
    GLB_RECOVER_HEALTH_COUNT = cm.globaldb.get(5).value;
    GLB_RECOVER_HEALTH_DIAMOND = cm.globaldb.get(6).value;
    GLB_ARENA_OPEN_LEVEL = cm.globaldb.get(7).value;
    GLB_FRIEND_HIRE_MAX_COUNT = cm.globaldb.get(8).value;
    GLB_FRIEND_REFRESH_HIRE_COUNT_INTERVAL = cm.globaldb.get(9).value;
    GLB_ARENA_RECOVER_ENERGY_INTERVAL = cm.globaldb.get(10).value;
    GLB_ARENA_ENERGY_MAX_COUNT = cm.globaldb.get(11).value;
    GLB_ACCELERATE_OPEN_AREA_DIAMOND_COST_SECOND = cm.globaldb.get(12).value;
    GLB_ACCELERATE_BUILD_DIAMOND_COST_SECOND = cm.globaldb.get(13).value;
    GLB_INVITE_FRIEND_GOLD_REWARD = cm.globaldb.get(14).value;
    GLB_WINSTREAK_COOLDOWN = cm.globaldb.get(15).value;
    GLB_DUNGEON_RESTORE_HEALTH_DIAMOND = cm.globaldb.get(16).value;
    // 17
    // 18
    // 19
    // 20
    GLB_REVIVE_HEALTH_INTERVAL = cm.globaldb.get(21).value;
    // 22
    var initialRewardStr = cm.globaldb.get(23).value;
    //GLB_NEW_ROLE_INITIAL_DIAMOND = cm.globaldb.get(24).value;
    //GLB_NEW_ROLE_INITIAL_EQUIP1 = cm.globaldb.get(25).value;
    //GLB_NEW_ROLE_INITIAL_EQUIP2 = cm.globaldb.get(26).value;
    //GLB_NEW_ROLE_INITIAL_EQUIP_COUNT = cm.globaldb.get(27).value;

    initialRewardStr.split('-').forEach((str) => {
        var tmp = str.split(':');
        newRoleInitalReward[tmp[0]] = parseInt(tmp[1]);
    });

    GLB_BOSS_DURATION = cm.globaldb.get(39).value;
    GLB_WORLD_BOSS_OPEN_LEVEL = cm.globaldb.get(40).value;
    GLB_NEW_ROLE_GUIDE_BATTLE_LOOT_ID = cm.globaldb.get(41).value;
    GLB_SUMMON_BOSS_OPEN_LEVEL = cm.globaldb.get(42).value;
    GLB_USE_SPECIAL_DIAMOND = cm.globaldb.get(43).value;

    //48-57
    for (var i = 0; i < 5; i += 1) {
        var resID = cm.globaldb.get(48 + i * 2).value,
            resCount = cm.globaldb.get(49 + i * 2).value;
        if (resID > 0 && resCount > 0) {
            checkResourceIdValid(resID);
            GLB_FIRST_CHARGE_REWARD[resID] = resCount;
        }
    }

    //58
    GLB_WORLD_CHAT_COOLDOWN = cm.globaldb.get(58).value;
    // 59
    GLB_CHAT_SHIELD_LIMIT = cm.globaldb.get(59).value;
    //60
    //61
    GLB_FACEBOOK_NEWS_DIAMOND = cm.globaldb.get(61).value;
    //62
    GLB_CHAT_MESSAGE_LIMIT = cm.globaldb.get(62).value;
    //63,64
    GLB_FACEBOOK_SHARE_REWARD[cm.globaldb.get(63).value] = cm.globaldb.get(64).value;

    //74
    GLB_RETURN_REWARD_LIMIT_DAYS = cm.globaldb.get(74).value;

    GLB_TRIAL_INTERVAL_PER_VICTORY = cm.globaldb.get(77).value;
    GLB_VICTORY_COUNT_PER_TRIAL = cm.globaldb.get(79).value;
    GLB_TRIAL_REFRESH_INTERVAL = cm.globaldb.get(80).value;

    GLB_JOIN_GUILD_CD = cm.globaldb.get(95).value;

    initStringChecker();

    // load fixed reward
    fixedReward = {};
    Object.keys(cm.fixedrewarddb.all()).forEach((key) => {
        var config = cm.fixedrewarddb.get(parseInt(key));
        if (config.JSON_reward && config.JSON_reward.length) {
            var reward = fixedReward[config.ID] = {};
            config.JSON_reward.forEach((data:any) => {
                Util.plusValueInMap(reward, data.resID, data.count);
            });
        }
    });

    // load signin_month
    Object.keys(cm.signin_monthdb.all()).forEach((key) => {
        var config = cm.signin_monthdb.get(parseInt(key));

        if (!monthSignReward[config.Month]) monthSignReward[config.Month] = {};

        var reward:Resource = {};
        reward[config.Reward] = config.Count;
        monthSignReward[config.Month][config.Day] = reward;
    });
}

export function getFixedReward(ID:number):Resource {
    var reward = fixedReward[ID];
    return reward ? reward : {};
}

export function getMonthSignReward(month:number, day:number):Resource {
    var tmp = monthSignReward[month];
    if (!tmp) return null;
    var reward = tmp[day];
    return reward ? reward : null;
}

//******************** string checker ****************//
var stringChecker = new StringChecker.StringChecker();

export function initStringChecker():void {
    var cm = Config.configMgr;
    Object.keys(cm.forbiddendb.all()).forEach((key:any) => {
        var config = cm.forbiddendb.get(key);
        stringChecker.add(config.forbiddenWord);
    });
    var result = stringChecker.build();
    console.log('initStringChecker ' + result);
}

export function replaceForbiddenWorld(text:string):string {
    return stringChecker.replace(text);
}

//******************** structure *********************//
export interface Reward {
    id:number;
    count:number;
}

export interface Point {
    x:number; y:number;
}

export interface Resource {
    [resId:number]:number;
}

// 角色头像
export class Avatar {
    armorID:number = 0;
    armorLevel:number = 0;
    hairType:number = 0;
    hairColor:number = 0;
    faceType:number = 0;
    skinColor:number = 0;
}

export enum AVATAR_TYPE {
    NULL = 0,
    ARENA = 1,
    BOSS = 2,
    DUNGEON = 3
}

// 排行榜条目
export class LeaderboardItem {
    accountId:number = 0;
    avatar:Avatar = new Avatar();
    level:number = 0;
    username:string = '';
    achievementID:number = 0;

    score:number = 0;
    rank:number = 0;
}

export class FightTeam {
    heros:number[] = [];
    hires:number[] = [];
}

export enum REWARD_PROGRESS {
    NOT_GAIN = 0,
    HAS_GAIN = 1,
    HAS_READ = 2
}


export interface ChargeInfo {
    auto_id:number;
    role_id:number;
    goods_id:number;
    goods_quantity:number;
    addition1:string;
    addition2:string;
    platform:number;
    platform_payment_type:number;
}

export interface DiamondUse {
    time?:number;
    value?:number;
    goodsId?:number;
    goodsQuantity?:number;
    diamondPaidUse?:number;
}
//****************** function ************************//
export function getResIDType(resId:any):number {
    var id = resId;
    if (typeof resId === 'string') {
        id = parseInt(resId);
    }
    if (isNaN(id)) {
        return Enum.RES_ID_TYPE.NULL;
    }
    return Math.floor(id / RES_ID_INTERVAL);
}

export function calculateCollectGold(perHour:number, max:number, last:number, now:number):number {
    var diff = now > last ? now - last : 0;
    var calc = Math.floor(perHour / 3600 * diff);
    return calc > max ? max : calc;
}

// 计算离线恢复的血量
export function getOfflineReviveHealth(lastLogout:number, thisLogin:number) {
    return lastLogout < thisLogin ? Math.floor((thisLogin - lastLogout) / GLB_REVIVE_HEALTH_INTERVAL) : 0;
}

export function calcEquipProperty(armorID:number, armorLevel:number):{[heroProperty:string]:number} {
    var config = Config.configMgr.equipdb.get(armorID);
    if (!config) {
        return {};
    }

    var property:{[heroProperty:string]:number} = {};
    property[HeroDefine.PROPERTY.ATTACK] = config.atkbasic + config.atkgrow * armorLevel;
    property[HeroDefine.PROPERTY.DEFENCE] = config.defbasic + config.defgrow * armorLevel;

    return property;
}

export function calcHeroLevelProperty(uid:number, level:number):{[heroProperty:string]:number} {
    var property:{[heroProperty:string]:number} = {};
    var config = Config.configMgr.knightexpdb.get(level);

    switch (uid) {
        case 0: {   // 主角英雄
            property[HeroDef.PROPERTY.HP] = config.DOMHP;
            property[HeroDef.PROPERTY.ATTACK] = config.DOATK;
            property[HeroDef.PROPERTY.DEFENCE] = config.DODEF;
            property[HeroDef.PROPERTY.CRITICAL] = config.DOCRI;
            property[HeroDef.PROPERTY.HIT] = config.DOACC;
            property[HeroDef.PROPERTY.DODGE] = config.DODOD;
            break;
        }
        default : {
            property[HeroDef.PROPERTY.HP] = config.FELHP;
            property[HeroDef.PROPERTY.ATTACK] = config.FELATK;
            property[HeroDef.PROPERTY.DEFENCE] = config.FELDEF;
            property[HeroDef.PROPERTY.CRITICAL] = config.FELCRI;
            property[HeroDef.PROPERTY.HIT] = config.FELACC;
            property[HeroDef.PROPERTY.DODGE] = config.FELDOD;
            break;
        }
    }
    return property;
}

export function calcHeroRuneProperty(rune) {
    var property:{[heroProperty:string]:number} = {};
    Object.keys(rune).forEach((key) => {
        var runeType = HeroDef.RuneType[key];
        var config = Config.configMgr.Runedb.get(rune[key]);

        switch (runeType) {
            case HeroDef.RuneType.ATTACK:
                property[HeroDef.PROPERTY.ATTACK] = config.Attack_add;
                break;
            case HeroDef.RuneType.DEFENCE:
                property[HeroDef.PROPERTY.DEFENCE] = config.Defence_add;
                break;
            case HeroDef.RuneType.HEALTH:
                property[HeroDef.PROPERTY.HP] = config.Hp_add;
                break;
        }

    });
    return property;
}

export function calcHeroAllProperty(uid:number, level:number, armorID:number, armorLevel:number):{[heroProperty:string]:number} {
    var property:{[heroProperty:string]:number} = {};
    var levelProperty = calcHeroLevelProperty(uid, level);
    var equipProperty = calcEquipProperty(armorID, armorLevel);
    Util.addObject(property, levelProperty);
    Util.addObject(property, equipProperty);
    return property;
}

// TODO RobotMgr.hasRobot ?
export function isRobot(accountId:number):boolean {
    return accountId <= Enum.VALID_ROLE_ID;
}

export function calcEloRatingByRobot(robot:Robot):number {
    if (!robot) return 0;
    return 1500 + robot.level * 2;  // TODO calcEloRatingByRobot
}

export function calcEloRating(rank:number):number {
    if (rank === 0) return 1200;

    var ranks:number[] = [1000, 3000, 6000, 10000, 30000, 60000, 0];
    var score:number[] = [1800, 1700, 1600, 1500, 1400, 1300, 1200];
    for (var i = 0; i < ranks.length; i += 1) {
        if (rank <= ranks[i]) return score[i];
    }
    return score[score.length - 1];
}

export function addResource(resource:Resource, resID:number, count:number):void {
    if (resID > 0) {
        if (resource[resID]) {
            resource[resID] += count;
        } else {
            resource[resID] = count;
        }
    }
}

export function tranResourceToRewardList(resource:Resource):Reward[] {
    var result:Reward[] = [];
    Object.keys(resource).forEach((id) => {
        result.push({
            id: parseInt(id),
            count: resource[id]
        });
    });
    return result;
}

function checkTableRef(id:number, table:string):void {
    var cm = Config.configMgr;
    if (!cm[table + 'db']) {
        throw new Error('Table ' + table + ' Not Exist');
    }

    if (id === undefined || id === null) {
        throw new Error('ID Not Valid, ID=' + id);
    }

    var value = cm[table + 'db'][table + 'DBConfig'][id];
    if (value !== 0 && !value) {
        throw new Error('Not found ID in table ' + table + ', ID=' + id);
    }
}


export function checkResourceIdValid(resId:number):void {
    var resType = getResIDType(resId);
    switch (resType) {
        case Enum.RES_ID_TYPE.ITEM:
            break;
        case Enum.RES_ID_TYPE.NUMERIC: {
            switch (resId) {
                case Enum.RESOURCE_TYPE.BOSS_ENERGY:
                case Enum.RESOURCE_TYPE.ARENA_ENERGY:
                //case Enum.RESOURCE_TYPE.ARENA_REPUTATION:
                case Enum.RESOURCE_TYPE.ROLE_EXP:
                case Enum.RESOURCE_TYPE.ROLE_LEVEL:
                case Enum.RESOURCE_TYPE.DIAMOND:
                case Enum.RESOURCE_TYPE.DIAMOND_CHARGE:
                case Enum.RESOURCE_TYPE.GOLD:
                case Enum.RESOURCE_TYPE.CASH:
                case Enum.RESOURCE_TYPE.FUSE_STONE:
                case Enum.RESOURCE_TYPE.HEAL_BOTTLE:
                    break;
                default :
                    throw new Error('invalid resouce ID, ID=' + resId);
            }   // switch (resId)
            break;
        }

        case Enum.RES_ID_TYPE.ARMOR: {
            checkTableRef(resId, 'equip');
            break;
        }

        case Enum.RES_ID_TYPE.CAPE: {
            checkTableRef(resId, 'fashion');
            break;
        }

        case Enum.RES_ID_TYPE.BUILD: {
            checkTableRef(resId, 'build_basic');
            break;
        }

        default :
            throw new Error('invalid resouce ID, ID=' + resId);
    }
}

export function getErrorCode(err:Error):number {
    if (err && err.message) {
        switch (err.message) {
            case ErrorMsg.CENTER_RPC_SOCKET_NOT_READY:
                return ERRC.COMMON.CENTER_RPC_SOCKET_NOT_READY;
            default :
                return ERRC.COMMON.UNKNOWN;
        }
    }
    return ERRC.COMMON.UNKNOWN;
}
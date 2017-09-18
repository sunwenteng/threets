export enum LISTEN_PORT {
    RPC = 6102,
    API = 6103
}

export enum DependenceType {
    NULL  = 0,
    MYSQL = 1,
    REDIS = 2,
    RPC   = 3
}

export enum BindStatus {
    NOT_BIND   = 0,
    IS_BINDING = 1,
    HAS_BOUND  = 2,
    UNBOUND    = 3
}

export enum ROLE_ST {
    NORMAL    = 0,
    FORBID    = 1,
    BAN_SPEAK = 2,
    COUNT
}

export enum ROLE_ASYNC_FLAG {
    CHECK_CHARGE  = 1,   // 充值检查
    GET_GIFT_CODE = 2,  // 礼品code领取
}

export enum SERVER_TYPE {
    LOGIN_SERVER  = 1,
    CENTER_SERVER = 2,
    GAME_SERVER   = 3
}

export enum SERVER_STATE {
    NORMAL   = 0,
    NEW      = 1,
    HOT      = 2,
    MAINTAIN = 3,
    COUNT
}

export enum ROLE_PROGRESS {
    NEW     = 0,
    INITIAL = 1,
}

export enum GAME_SESSION_STATUS{
    OFFLINE    = 0,
    LOGGING_ON = 1,
    ONLINE     = 2
}

export enum LOGIN_SESSION_STATUS {
    NOT_AUTH = 0,
    AUTH     = 1
}

// 全局常量
export enum GLOBAL{
    SIGN_IN_ROLL_DAYS           = 5,           // 签到滚动奖励循环天数
    DIAMOND_INTERVAL_CRAFT_TASK = 1800,         // 30 * 60 second
    NEXT                        = 0
}

export enum TEST1{
    a = 1,
    b = 2
}

export enum LOOT_MODE{
    UNIQUE   = 1,
    MULTIPLE = 2
}

export enum RESOURCE_TYPE{
    BOSS_ENERGY      = 6001,
    ARENA_ENERGY     = 6002,
    ARENA_REPUTATION = 6003,    // not used
    ROLE_EXP         = 6004,    // 角色经验
    ROLE_LEVEL       = 6005,    // 角色等级
    DIAMOND          = 6100,
    DIAMOND_CHARGE   = 6101,
    GOLD             = 6200,
    CASH             = 6300,
    FUSE_STONE       = 6400,
    HEAL_BOTTLE      = 6500
}

export enum RES_ID_TYPE{
    NULL    = 0,
    BEGIN   = 0,        // 开始
    ARMOR   = 1,        // 装备
    AMULET  = 2,        // 护身符
    RING    = 3,        // 戒指
    ITEM    = 4,        // 道具
    CAPE    = 5,        // 斗篷
    NUMERIC = 6,        // 数值类型
    BUILD   = 7,        // 建筑
    END     = 8         // 结束
}

export enum HERO_UID{
    NULL = 1000
}

export enum USE_TYPE{
    UNDEFINED                   = 0,            // 未定义前使用这个枚举值，到时候反向搜索一起定义即可
    SYSTEM_GM                   = 1,            // 系统GM指令添加
    ROLE_GM                     = 2,            // 角色GM指令添加
    CHARGE                      = 3,            // 充值
    GIFT_CODE                   = 4,            // 礼品码
    NEW_ROLE                    = 5,            // 创建角色物品

    // 竞技场
    ARENA_MILESTONE             = 10,
    ARENA_WINSTREAK             = 11,
    ARENA_RANK_REWARD           = 12,
    ARENA_START_FIGHT           = 13,

    // 副本战斗
    BATTLE_FINISH_FIGHT         = 20,
    BATTLE_RECOVER_HEALTH       = 21,
    BATTLE_RESTORE_HEALTH       = 22,
    BATTLE_USE_SPECIAL          = 23,

    // boss战斗和召唤boss
    BOSS_RANK_REWARD            = 30,
    BOSS_FINISH_FIGHT           = 31,
    BOSS_MILESTONE              = 32,
    BOSS_START_FIGHT            = 33,
    SUMMON_BOSS                 = 34,
    SUMMON_BOSS_FINISH_FIGHT    = 35,

    // 建筑
    BUILD_ACCELERATE            = 40,
    BUILD_COLLECT_GOLD          = 41,
    BUILD_OPEN_AREA             = 42,
    BUILD_SELL_BUILD            = 43,
    BUILD_UPGRADE_BUILD         = 44,

    // 装备
    EQUIP_ACCELERATE_CRAFT_TASK = 50,
    EQUIP_COMBINE_EQUIP         = 51,
    EQUIP_CRAFT_EQUIP           = 52,
    EQUIP_ENHANCE_EQUIP         = 53,

    // 活动
    ACTIVITY_CONSUME            = 60,
    ACTIVITY_SHADOW_CHEST       = 61,
    ACTIVITY_FLOURISHING_CHEST  = 62,
    ACTIVITY_LOGIN_GIFT         = 63,
    ACTIVITY_CRAFT              = 64,
    ACTIVITY_FLOURISHING_SHOP   = 65,

    // 副本战斗
    TRIAL_FINISH_FIGHT          = 70,
    TRIAL_FINISH_TRIAL          = 71,
    TRIAL_USE_SPECIAL           = 73,

    // 杂项
    SIGN_IN                     = 101,  // 签到
    FRIEND_GAIN_REWARD          = 102,
    CHEST_OPEN_CHEST            = 103,
    QUEST_COMPLETE_QUEST        = 104,
    GUIDE_FINISH_BATTLE         = 105,
    SHOP_BUY                    = 106,
    LEVEL_UP                    = 107,
    MAIL_ATTACHMENT             = 108,  // 邮件附件
    FIRST_CHARGE_REWARD         = 109,  // 首冲奖励
    SHARE_GAME                  = 110,  // 分享
    PURCHASE_HIRE_COUNT         = 111,  // 购买好友雇佣次数
    GAIN_NEWS_FACEBOOK          = 112,  // 领取news的facebook奖励
    MONTH_SIGN                  = 113,
    RETURN_REWARD               = 114,
}

export enum FIGHT_TYPE{
    UN_DEFINE   = 0,
    WORlD_BOSS  = 1,
    SUMMON_BOSS = 2,
    ARENA_FIGHT = 3
}

export enum FIRST_CHARGE_STATUS {
    UNCHARGE = 0,
    CHARGED  = 1,
    GAINED   = 2
}

export enum GENERAL_REWARD_STATUS {
    NULL   = 0,
    GAINED = 1
}

export enum SHARE_GAME_STATUS {
    NULL   = 0,
    SHARED = 1,
    GAINED = 2
}

export enum SUNDRY {
    ACHIEVEMENT_TITLE   = 1,    // 成就称号
    FIRST_CHARGE_STATUS = 2,    // 第一次充值状态
    NEW_ROLE_GUIDE      = 3,    // 新手引导
    NEWS_FACEBOOK       = 4,    // news里面的facebook奖励
    SHARE_GAME_STATUS   = 5,    // 分享状态
    MONTH_SIGN_IN       = 6,    // 月签
}

export enum CHARGE_STATE {
    E_CHARGE_STATE_UNPAY       = 0, // 未支付
    E_CHARGE_STATE_PAIED       = 1, // 已经支付
    E_CHARGE_STATE_DISTRIBUTED = 2
}

export var VALID_ROLE_ID = 10000;  // 游戏服角色id begin
export var BOSS_ENERGY_RECOVERY_INTERVAL = 25 * 60;  // boss energy recover interval
export var MAX_KEY_CHANCE_BATCH_TIMES = 10;  // max bacth times
export var MAX_CHANCE_BATCH_TIMES = 10;  // max bacth times
export var ARENA_BASE_RATING_SCORE = 1500;  //base ratingScore
export var MAIL_EXPIRED_SECOND = 30 * 24 * 60 * 60;  // 邮件过期期限
export var MAIL_COUNT_IN_ONE_PAGE = 10;










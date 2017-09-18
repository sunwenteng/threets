export var PROGRESS = {
    SET: 1,
    ACCUMULATE: 2,
    HIGHEST: 3
};

export var TYPE = {
    //                                  // value1           value2      description
    // 达到N级
    ROLE_LEVEL: 1,                      // level                        角色等级
    // 累计消耗N个某道具
    SPECIFY_RESOURCE_ALL_CONSUME: 2,    // resID            count       指定资源所有消耗
    // 连续N天登陆游戏
    LOGIN_IN_SERIES_N_DAYS: 3,          //                  days
    // 完成N个任务
    COMPLETE_N_QUEST: 4,                //                  count
    // 战胜N个好友
    DEFEAT_N_FRIEND: 5,                 //
    // 解锁N个章节
    UNLOCK_N_CHAPTER: 6,                //
    // 赢得N场战斗
    WIN_N_BATTLES: 7,                   //
    // 拥有N块土地
    HAVE_N_AREA: 8,                     //
    // 获得N个某道具
    EARN_N_ITEM: 9,                     //
    // 获得N个好友
    EARN_N_FRIEND: 10,                  //
    // 赢得N场竞技场战斗
    WIN_N_ARENA_BATTLES: 11,            //
    // 获得N点竞技场点数
    EARN_N_ARENA_POINT: 12,             //
    // 获得竞技场N连胜
    EARN_N_STREAK: 13,                  //
    // 雇佣好友进行N次战斗
    HIRE_FRIEND_FOR_N_BATTLE: 14,
    // 打开某宝箱N次
    OPEN_CHANCE_CHEST_N_COUNT: 15,
    // 击杀怪物ID共N次
    KILL_MONSTER_N_COUNT: 16,
    // 将A星级或B星级装备升至满级
    LEVEL_MAX_ON_EQUIP_WITH_STAR_A_OR_B: 17,
    // 累计进入建筑N次
    ENTER_BUILD_N_COUNT: 18,
    // 打造N件装备
    CRAFT_N_EQUIP: 19,
    // 通过融合获得N个装备
    FUSE_N_COUNT: 20,
    // 累计游戏时间N小时
    GAME_FOR_N_HOUR: 21,
    // 在装备上累计花费多少金币
    CONSUME_GOLD_ON_EQUIP: 22,
    // 在建筑和建筑升级上累计花费多少金币
    CONSUME_GOLD_ON_BUILD: 23,
    // 购买任意数量钻石
    PURCHASE_DIAMOND_ONCE: 24,
    // 获得N个某星级装备
    EARN_N_EQUIP_WITH_M_STAR: 25,
    // 打造N个某星级的装备
    CRAFT_N_EQUIP_WITH_M_START: 26,
    // 升级装备N次
    ENHANCE_EQUIP_N_COUNT: 27,
    // 打造N个含有某元素的装备
    CRAFT_N_EQUIP_WITH_ELEMENT: 28,
    // 对单个敌人造成多少点以上伤害
    DAMAGE_ON_ONE_ENEMY: 29,

    TYPE_COUNT: 30      // this must be biggest, those which bigger than this will ignored
};

export var PROGRESS_STATUS = {
    DOING: 0,
    NOT_READ: 1,
    FINISHED: 2
};

export enum COMPLETE_STATUS {
    NOT_READ = 0,
    HAS_READ = 1
}
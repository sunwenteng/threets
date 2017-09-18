export enum PROGRESS {
    SET = 1,
    ACCUMULATE = 2,
    HIGHEST = 3
}

export enum CriteriaType {
    NULL = 0,                                       //
    // 雇佣好友进行N次战斗
    HIRE_FRIEND_N_FIGHT = 1,
    // 参加N场竞技场战斗
    TAKE_PART_IN_N_ARENA_FIGHT = 2,
    // 参加N场好友PVP战斗
    TAKE_PART_IN_N_FRIEND_PVP_FIGHT = 3,
    // 赢得N场竞技场战斗
    WIN_N_ARENA_FIGHT = 4,
    // 赢N场好友PVP战斗
    WIN_N_FRIEND_PVP_FIGHT = 5,
    // 获得N点竞技场点数
    EARN_N_ARENA_POINT = 6,
    // 获取N个资源
    EARN_N_RES_ID = 7,
    // 打造N个装备A
    CRAFT_N_EQUIP_A = 8,
    // 完成N次地图A的某难度
    STAGE_PASS_N_COUNT = 9,
    // 击败某章节ID的怪物A共N 次
    KILL_MONSTER_TYPE_A_IN_CHAPTER_B_N_COUNT = 10,
    // 打开某ID宝箱N次
    OPEN_CHANCE_CHEST_ID_N_COUNT = 11,
    // 熔炼N次道具
    FUSE_EQUIP_N_COUNT = 12,
    // 在建筑中搜集N个金币
    COLLECT_GOLD_IN_BUILD = 13,
    // 升级建筑N次
    UPGRADE_BUILD_N_COUNT = 14,
    // 打造某星级的装备多少件
    CRAFT_A_STAR_N_COUNT = 15,
    // 升级N次公会科技
    UPGRADE_TECH_N_COUNT = 16,
    // 用大招杀死N个怪物
    KILL_MONSTER_BY_SLAY = 17,
    // 用大招杀死N个骑士
    KILL_KNIGHT_BY_SLAY = 18,
    // 公会捐献N个金币
    CONTRIBUTE_N_GOLD = 19,
    MAX = 20
}
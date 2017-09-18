export enum STATUS {
    NEW = 0,
    READ = 1,
    CAN_COMPLETE = 2,
    COMPLETE = 3
}

export enum TYPE {
    NULL = 0,
    NORMAL = 1,
    LIMIT_TIME = 2
}

export enum PROGRESS {
    SET = 1,
    ACCUMULATE = 2,
    HIGHEST = 3
}

export enum CriteriaType {
    NULL = 0,                                       //
    // 拥有N个建筑A
    OWN_N_BUILD = 1,                              // buildID
    // 拥有N个等级至少为Lv的建筑A
    OWN_N_BUILD_WITH_LEVEL = 2,                   // buildID, level
    // 获得N个等级至少为Lv的装备A
    EARN_N_EQUIP_WITH_LEVEL = 3,                   // equipID, level
    // ​解锁地图A
    UNLOCK_CHAPTER = 4,                             // stageID(前一章节最后关卡ID)
    // 完成N次地图A的某难度
    STAGE_PASS_N_COUNT = 5,                         // stageID
    // 击败某章节ID的怪物A共N 次
    KILL_MONSTER_TYPE_A_IN_CHAPTER_B_N_COUNT = 6,
    // 在建筑A中搜集N个金币
    COLLECT_GOLD_IN_BUILD_A = 7,
    // 获取N个资源
    EARN_N_RES_ID = 8,
    // 打造N个装备A
    CRAFT_N_EQUIP_A = 9,
    // 熔炼N次道具A和道具B
    FUSE_EQUIP_A_B_N_COUNT = 10,
    // 打开某ID宝箱N次
    OPEN_CHANCE_CHEST_ID_N_COUNT = 11,
    // 拥有N块土地
    OWN_N_AREA = 12,
    // 获得N个好友
    EARN_N_FRIEND = 13,
    // 雇佣好友进行N次战斗
    HIRE_FRIEND_N_FIGHT = 14,
    // 参加N场竞技场战斗
    TAKE_PART_IN_N_ARENA_FIGHT = 15,
    // 参加N场好友PVP战斗
    TAKE_PART_IN_N_FRIEND_PVP_FIGHT = 16,
    // 赢得N场竞技场战斗
    WIN_N_ARENA_FIGHT = 17,
    // 赢N场好友PVP战斗
    WIN_N_FRIEND_PVP_FIGHT = 18,
    // 获得N点竞技场点数
    EARN_N_ARENA_POINT = 19,
    // 得到 N个 Friend Referal Bonus using the friend screen
    EARN_N_FRIEND_REFER_BONUS = 20,
    // 参加N场竞技场复仇战斗
    TAKE_PART_IN_N_ARENA_FIGHT_WITH_REVENGE = 21,
    // 赢得N场竞技场复仇战斗
    WIN_N_ARENA_FIGHT_WITH_REVENGE = 22,
    // 赢得N连胜
    EARN_N_ARENA_WIN_STREAK = 23,
    // 赢得N场PVP，且队伍中没有X元素
    WIN_N_ARENA_FIGHT_WITHOUT_X_ELEMENT = 24,
    // 赢得N场PVP，且队伍中有X元素
    WIN_N_ARENA_FIGHT_WITH_X_ELEMENT = 25,
    // 击败N个排行榜位置更高的对手
    DEFEAT_N_OPPONENT_WITH_HIGHER_RANK = 26,
    // 赢得N场战斗，且以大招解决最后一个对手
    WIN_N_ARENA_FIGHT_WITH_SLAY = 27,
    // 赢得N场战斗，且队伍无人死亡
    WIN_N_ARENA_FIGHT_WITH_NO_DEAD = 28,
    MAX = 29
}
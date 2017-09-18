
// 攻击标志位
export enum ATTACK_FLAG {
    NORMAL=     0x0001,
    SLAY=       0x0002,
    CRITICAL=   0x0004,
    DODGE=      0x0008
}

export enum TYPE {
    PVE = 0,            // 普通副本
    PVP = 1,            // pvp战斗
    PVE_EPIC_BOSS = 2,  // 史诗boss
    PVE_CALL_BOSS = 3,  // 召唤boss
    PVP_FRIEND = 4,
    TRIAL = 5,
    NEXT = 6
}

export enum SIDE {
    LEFT= 1,
    RIGHT= 2
}

// 右方结果
export enum RESULT {
    LOSS    = 0,
    VICTORY = 1,
    FLEE    = 2
}

export enum PlayerType {
    KNIGHT = 1,
    MONSTER = 2,
    BOSS = 3
}

export interface HealthCacheItem {
    uid:number;
    currentHp:number;
}

export enum DeathType {
    NULL = 0,
    NORMAL = 1,     // 普通伤害死亡
    SLAY = 2        // 怒气技能死亡
}

export enum ACTIVITY_TYPE {
    NULL                = 0,
    LOGIN_GIFT          = 1,
    DIAMOND_CONSUME     = 2,
    SHADOW_CHEST        = 3,
    FLOURISHING_CHEST   = 4,
    CRAFT               = 5,
    LIMIT_QUEST         = 6,
    DISCOUNT            = 7,
    COMMON_REDIRECT     = 8,
    FLOURISHING_SHOP    = 9
}

export enum STATUS {
    NOT_START = 0,
    START = 1,
    END = 2
}

export enum LOGIN_GIFT_STATUS {
    NOT_EARN = 0,
    HAS_EARN = 1,
    HAS_NOTIFY = 2
}

export enum CRAFT_REWARD_STATUS {
    NOT_EARN = 0,
    HAS_EARN = 1,
}

export enum FLOURISHING_SHOP_BRACKET_STATUS {
    NULL = 0,
    HANDLING_ORDER = 1,
    CAN_GAIN = 2,
    HAVE_GAINED = 3,
}
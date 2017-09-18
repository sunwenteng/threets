
export var TYPE = {
    ARENA: 1,           // 竞技场
    CHANCE_CHEST: 2,    // 宝箱
    FUSE_MASTER: 3,     // 铸造屋
    ARMOR_SMITH: 4,     // 铁匠铺
    GOLD: 5
};

export enum Status {
    NULL = 0,
    BUILDING = 1,
    FINISHED = 2
}

export enum BuildType {
    AREA = 1,
    BUILD = 2
}

export enum LandColor {
    NULL = 0,
    NOT_OPEN = 1,
    OPENING = 2,
    OPEN = 3,
}
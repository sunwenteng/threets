import Util = require('../../../util/game_util');

class LootItem {
    id:number = 0;
    itemId:number = 0;            // int
    chance:number = 0;            // int
    mincount:number = 0;
    maxcount:number = 0;
    groupId:number = 0;

    constructor() {
        this.id = 0;
        this.itemId = 0;            // int
        this.chance = 0;            // int
        this.mincount = 0;
        this.maxcount = 0;
        this.groupId = 0;
    }

    public roll():number {
        return Util.randInt(this.mincount, this.maxcount + 1);
    }
}

export = LootItem;
import Util = require('../../../util/game_util');
import Enum = require('../../../util/enum');
import LootItem = require('./loot_item');
import Loot = require('./loot');

class LootGroup {
    groupId:number = 0;
    count:number = 0;
    mode:Enum.LOOT_MODE = Enum.LOOT_MODE.MULTIPLE;
    lootItemList:LootItem[] = [];
    lootChanceList:any[] = [];

    constructor(groupID?:number) {
        this.groupId = groupID || 0;
        this.count = 1;
        this.mode = Enum.LOOT_MODE.MULTIPLE;
        this.lootItemList = [];
        this.lootChanceList = [];
    }

    public addItemEntry(entry:LootItem):void {
        if (entry.groupId === this.groupId) {
            this.lootItemList.push(entry);
            this.lootChanceList.push(entry.chance);
        }
    }

    public process(loot:Loot):void {
        var lootItemList = this.roll(), i;
        for (i = 0; i < lootItemList.length; i += 1) {
            if (lootItemList[i].itemId) {
                loot.addRes(lootItemList[i].itemId, lootItemList[i].roll());
            }
        }
    }

    public singleValue():number {
        var lootItemList = this.roll(1);
        return lootItemList.length === 0 ? null : lootItemList[0].itemId;
    }

    public roll(maxCount?:number):LootItem[] {
        var count = this.count,
            result:LootItem[] = [], i, value;

        if (maxCount && count > maxCount) count = maxCount;

        switch (this.mode) {
            case Enum.LOOT_MODE.UNIQUE:
                var chanceArray = this.lootChanceList.concat();
                var randResult = Util.randByWeight(chanceArray, count);
                for (i = 0; i < randResult.length; i += 1) {
                    result.push(this.lootItemList[randResult[i]]);
                }
                break;
            case Enum.LOOT_MODE.MULTIPLE:
                for (i = 0; i < count; i += 1) {
                    value = Util.randInt(0, this.lootItemList.length);
                    result.push(this.lootItemList[value]);
                }
                break;
        }

        return result;
    }
}

export = LootGroup;
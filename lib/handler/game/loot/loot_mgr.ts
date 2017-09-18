import Loot         = require('./loot');
import LootGroup    = require('./loot_group');
import LootItem     = require('./loot_item');
import Enum         = require('../../../util/enum');
import Universal    = require('../universal');

var cm = require('../../../config').configMgr;

var lootGroups:{[groupId:number]:LootGroup} = {};

function getGroup(groupId:number):LootGroup {
    if (!lootGroups[groupId]) {
        lootGroups[groupId] = new LootGroup(groupId);
    }
    return lootGroups[groupId];
}

export function hasGroup(groupId:number):boolean {
    return !!lootGroups[groupId];
}

export function reloadConfig():void {
    lootGroups = {};
    var config = cm.itemlootdb.all(), group, lootEntry, lootItem;

    Object.keys(config).forEach((key) => {
        lootEntry = cm.itemlootdb.get(parseInt(key));
        group = getGroup(lootEntry.lootGroup);
        group.count = Math.abs(lootEntry.amount);
        group.mode = lootEntry.amount > 0 ? Enum.LOOT_MODE.UNIQUE : Enum.LOOT_MODE.MULTIPLE;

        lootItem = new LootItem();
        lootItem.id = lootEntry.ID;
        lootItem.groupId = lootEntry.lootGroup;
        lootItem.itemId = lootEntry.itemid;
        lootItem.chance = lootEntry.rate;
        lootItem.mincount = lootEntry.min;
        lootItem.maxcount = lootEntry.max;
        group.addItemEntry(lootItem);
    });
}

export function createLoot(resource?:Universal.Resource):Loot {
    var loot = new Loot();
    if (resource) loot.resource = resource;
    return loot;
}

export function rollLoot(groupId:number):Loot {
    var loot = new Loot();
    if (!lootGroups[groupId]) {
        return loot;
    }

    var lootGroup = lootGroups[groupId];
    lootGroup.process(loot);
    return loot;
}

export function rollValue(groupId:number):number {
    if (!lootGroups[groupId]) {
        return null;
    }

    var lootGroup = lootGroups[groupId];
    return lootGroup.singleValue();
}
var cm = require('../../../config').configMgr;

var itemOpenMap = {};
var equipOpenMap = {};
var roleLevelOpenMap = {};
var bossLevelOpenMap = {};

export function reloadConfig() {
    itemOpenMap = {};
    equipOpenMap = {};
    roleLevelOpenMap = {};

    var config = cm.craftskilldb.all(), craftSkill;

    Object.keys(config).forEach((key) => {
        craftSkill = cm.craftskilldb.get(key);

        _addToItemOpenMap(craftSkill.item1ID, craftSkill.ID);
        _addToItemOpenMap(craftSkill.item2ID, craftSkill.ID);

        _addToEquipOpenMap(craftSkill.DesItemID, craftSkill.DesItemLV, craftSkill.ID);

        _addToRoleLevelOpenMap(craftSkill.ChaLV, craftSkill.ID);

        _addToBossLevelOpenMap(craftSkill.bossID, craftSkill.bossLV, craftSkill.ID);
    });
}

export function getCraftIDByItemID(itemID:number) {
    return itemOpenMap[itemID] || [];
}

export function getCraftIDByEquipLevel(equipID:number, level1:number, level2?:number) {
    var lv1 = level1, lv2 = level2 || level1;
    var result = [], i, j;
    var equipOpen = equipOpenMap[equipID];
    if (!equipOpen) {
        return result;
    }

    for (i = lv1; i <= lv2; i += 1) {
        if (equipOpen[i]) {
            for (j = 0; j < equipOpen[i].length; j += 1) {
                result.push(equipOpen[i][j]);
            }
        }
    }
    return result;
}

export function getCraftIDByBossLevel(bossID:number, bossLevel:number):any[] {
    if (!bossLevelOpenMap[bossID]) {
        return [];
    }

    return bossLevelOpenMap[bossID][bossLevel] || [];
}

export function getCraftIDByRoleLevel(level1:number, level2?:number) {
    var lv1 = level1, lv2 = level2 || level1;
    var roleLevelOpen = roleLevelOpenMap;
    var result = [], i, j;
    for (i = lv1; i <= lv2; i += 1) {
        if (roleLevelOpen[i]) {
            for (j = 0; j < roleLevelOpen[i].length; j += 1) {
                result.push(roleLevelOpen[i][j]);
            }
        }
    }
    return result;
}

function _addToItemOpenMap(itemID:number, ID:number) {
    if (!itemOpenMap[itemID]) {
        itemOpenMap[itemID] = [ID];
    } else {
        itemOpenMap[itemID].push(ID);
    }
}

function _addToEquipOpenMap(equipID:number, level:number, ID:number) {
    if (!equipOpenMap[equipID]) {
        equipOpenMap[equipID] = {};
        equipOpenMap[equipID][level] = [ID];
    } else if (!equipOpenMap[equipID][level]) {
        equipOpenMap[equipID][level] = [ID];
    } else {
        equipOpenMap[equipID][level].push(ID);
    }
}

function _addToRoleLevelOpenMap(level:number, ID:number) {
    if (!roleLevelOpenMap[level]) {
        roleLevelOpenMap[level] = [ID];
    } else {
        roleLevelOpenMap[level].push(ID);
    }
}

function _addToBossLevelOpenMap(bossID:number, level:number, ID:number) {
    if (!bossLevelOpenMap[bossID]) {
        bossLevelOpenMap[bossID] = {};
    }

    if (!bossLevelOpenMap[bossID][level]) {
        bossLevelOpenMap[bossID][level] = [ID];
    } else {
        bossLevelOpenMap[bossID][level].push(ID);
    }
}
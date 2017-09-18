import ConfigStruct = require('../../../config/struct/config_struct');

var cm = require('../../../config').configMgr;

var nextQuestList:{[ID:number]:number[]} = {};
var questListByLevel:{[level:number]:{ID:number; preID:number}[]} = {};
var questListByActivityID:{[activitID:number]:ConfigStruct.questDB[]} = {};

export function reloadConfig():void {
    nextQuestList = {};
    questListByLevel = {};
    questListByActivityID = {};

    Object.keys(cm.questdb.all()).forEach((ID) => {
        var config = cm.questdb.get(parseInt(ID));

        // nextQuestList
        if (config.preQuestID) {
            if (!nextQuestList[config.preQuestID]) {
                nextQuestList[config.preQuestID] = [config.ID];
            } else {
                nextQuestList[config.preQuestID].push(config.ID);
            }
        }

        // questListByLevel
        if (!questListByLevel[config.unlockLV]) {
            questListByLevel[config.unlockLV] = [];
        }
        questListByLevel[config.unlockLV].push({
            ID: config.ID,
            preID: config.preQuestID
        });

        // questListByActivityID
        if (!questListByActivityID[config.arenaTourID]) {
            questListByActivityID[config.arenaTourID] = [config];
        } else {
            questListByActivityID[config.arenaTourID].push(config);
        }
    });

}

export function getNextQuestList(questID:number):number[] {
    return nextQuestList[questID] || [];
}

export function getQuestListByLevelRegion(level1:number, level2:number):{ID:number; preID:number}[] {
    var result:{ID:number; preID:number}[] = [];
    for (var i = level1; i <= level2; ++i) {
        if (questListByLevel[i]) {
            questListByLevel[i].forEach((item) => {
                result.push(item);
            });
        }
    }
    return result;
}

export function getQuestListByActivityID(activityID:number):ConfigStruct.questDB[] {
    return questListByActivityID[activityID] || [];
}
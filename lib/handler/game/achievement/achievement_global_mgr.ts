import Config = require('../../../config');

var cm = Config.configMgr;

export class AchievementEntry {
    ID:number;
    requiredType:number;
    param:number;
    count:number;
}

var achievementArrayByType:{[requiredType:number]:Array<AchievementEntry>} = {};
var achievementTable:{[ID:number]:AchievementEntry} = {};

export function getAchievementArrayByType(requiredType:number):Array<AchievementEntry> {
    return achievementArrayByType[requiredType] || [];
}

export function getAchievementEntry(ID:number):AchievementEntry {
    return achievementTable[ID];
}

export function reloadConfig():void {
    var ID, entry, config;
    var allConfig = cm.achievementdb.all();
    Object.keys(allConfig).forEach((key) => {
        ID = parseInt(key);
        if (!isNaN(ID)) {
            config = cm.achievementdb.get(ID);
            if (config.requiredType === 0) {
                return ;
            }
            entry = new AchievementEntry();
            entry.ID = config.ID;
            entry.requiredType = config.requiredType;
            entry.param = config.param;
            entry.count = config.count;

            _addEntry(entry);
        }
    });
}

function _addEntry(entry:AchievementEntry):void {
    achievementTable[entry.ID] = entry;
    if (!achievementArrayByType[entry.requiredType]) {
        achievementArrayByType[entry.requiredType] = [entry];
    } else {
        achievementArrayByType[entry.requiredType].push(entry);
    }
}
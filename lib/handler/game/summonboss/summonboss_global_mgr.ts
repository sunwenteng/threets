import Config = require('../../../config');

var cm = Config.configMgr;

var killBossIdForSummon:{[ID:number]:number} = {};

export function reloadConfig() {
    //killBossIdForSummon = {};
    //var configMap = cm.boss_summondb.all();
    //Object.keys(configMap).forEach((key) => {
    //    var config = cm.boss_summondb.get(parseInt(key));
    //    killBossIdForSummon[config.showboss] = config.ID;
    //});
}

export function transformBossID(killMonsterID:number):number {
    return cm.monsterdb.get(killMonsterID).summonid;
}
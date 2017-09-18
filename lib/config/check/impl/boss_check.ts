import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkBossAbilityDB();
    checkBossEnergyDB();
    checkBossInfoDB();
    checkBossMilestoneDB();
    checkBossRewardDB();
}

function checkBossInfoDB():void {
    VerifyMgr.setTableName('boss_info');
    Object.keys(VerifyMgr.cm.boss_infodb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.boss_infodb.get(ID);

        VerifyMgr.checkTableExistValue('milestoneid', config.milestoneid, 'boss_milestone', 'gourp_id');
        VerifyMgr.checkTableExistValue('rankid', config.rankid, 'boss_reward', 'groupid');
    });
}

function checkBossAbilityDB():void {
    VerifyMgr.setTableName('boss_ability');
    Object.keys(VerifyMgr.cm.boss_abilitydb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.boss_abilitydb.get(ID);

        VerifyMgr.checkTableRef('monsterid', config.monsterid, 'monster');
    });
}

function checkBossEnergyDB():void {
    // not need
}

function checkBossMilestoneDB():void {
    VerifyMgr.setTableName('boss_milestone');
    Object.keys(VerifyMgr.cm.boss_milestonedb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.boss_milestonedb.get(ID);

        for (var i = 1; i <= 4; i += 1) {
            var column = 'item' + i;
            if (config[column] > 0) {
                VerifyMgr.checkResourceIdValid(column, config[column]);
            }
        }
    });
}

function checkBossRewardDB():void {
    VerifyMgr.setTableName('boss_reward');
    Object.keys(VerifyMgr.cm.boss_rewarddb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.boss_rewarddb.get(ID);

        for (var i = 1; i <= 4; i += 1) {
            if (config['item' + i] > 0) {
                VerifyMgr.checkResourceIdValid('item' + i, config['item' + i]);
            }
        }
    });
}
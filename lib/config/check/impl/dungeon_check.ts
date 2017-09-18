import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkStageBattleDB();
    checkStageDB();
    checkStageMonsterGroupDB();
}

function checkStageDB():void {
    VerifyMgr.setTableName('stage');
    Object.keys(VerifyMgr.cm.stagedb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.stagedb.get(ID);

        VerifyMgr.checkTableRef('chapter', config.chapter, 'chapter');

        if (config.battlenum !== config.JSON_battleid.length) {
            VerifyMgr.addErrorData('stage', ID, 'battlenum', 'JSON_battleid.length !== battlenum');
        }

        for (var i = 0; i < config.JSON_battleid.length; i += 1) {
            VerifyMgr.checkTableRef('JSON_battleid[' + i + ']', config.JSON_battleid[i], 'stage_battle');
        }

        if (config.nextStageID) {
            VerifyMgr.checkTableRef('nextStageID', config.nextStageID, 'stage');
        }

    });
}

function checkStageBattleDB():void {
    VerifyMgr.setTableName('stage_battle');
    Object.keys(VerifyMgr.cm.stage_battledb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.stage_battledb.get(ID);

        for (var i = 0; i < config.JSON_MonsterGroupid.length; i += 1) {
            VerifyMgr.checkTableRef('JSON_MonsterGroupid[' + i + ']', config.JSON_MonsterGroupid[i], 'stage_monstergroup');
        }
    });
}

function checkStageMonsterGroupDB():void {
    VerifyMgr.setTableName('stage_monstergroup');
    Object.keys(VerifyMgr.cm.stage_monstergroupdb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.stage_monstergroupdb.get(ID);

        for (var i = 0; i < config.JSON_monster.length; i += 1) {
            VerifyMgr.checkTableRef('JSON_monster[' + i + ']', config.JSON_monster[i], 'monster');
        }
    });
}
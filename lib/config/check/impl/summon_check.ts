import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkBossSummonDB();
}

function checkBossSummonDB():void {
    VerifyMgr.setTableName('boss_summondb');
    Object.keys(VerifyMgr.cm.boss_summondb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.boss_summondb.get(ID);
    });
}
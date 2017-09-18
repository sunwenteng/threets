import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkChanceChestDB();
}

function checkChanceChestDB():void {
    VerifyMgr.setTableName('chance_chest');
    Object.keys(VerifyMgr.cm.chance_chestdb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.chance_chestdb.get(ID);

        VerifyMgr.checkTableRef('key', config.key, 'item');
        VerifyMgr.checkTableExistValue('keyLoot', config.keyLoot, 'itemloot', 'lootGroup');
        VerifyMgr.checkTableExistValue('gemLoot', config.gemLoot, 'itemloot', 'lootGroup');

        for (var i = 0; i < config.JSON_EXP.length; i += 1) {
            VerifyMgr.checkResourceIdValid('JSON_EXP', config.JSON_EXP[i]);
        }
    });
}
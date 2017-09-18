import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkKnightDB();
    checkKnithExpDB();
}

function checkKnightDB():void {
    VerifyMgr.setTableName('knight');
    Object.keys(VerifyMgr.cm.knightdb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.knightdb.get(ID);

        VerifyMgr.checkTableRef('iniequip', config.iniequip, 'equip');
    });
}

function checkKnithExpDB():void {
    VerifyMgr.setTableName('knightexp');
    Object.keys(VerifyMgr.cm.knightexpdb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.knightexpdb.get(ID);

        for (var i = 1; i <= 3; i += 1) {
            var column = 'itemID' + i;
            VerifyMgr.checkResourceIdValid(column, config[column]);
        }
    });
}
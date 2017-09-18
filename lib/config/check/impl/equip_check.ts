import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkEquipDB();
}

function checkEquipDB():void {
    VerifyMgr.setTableName('equip');
    Object.keys(VerifyMgr.cm.equipdb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.equipdb.get(ID);

        VerifyMgr.checkTableRef('skillid', config.skillid, 'skill');
        VerifyMgr.checkTableExistColumn('maxlv', 'LV' + config.maxlv + 'Exp', 'equipexp');
        for (var i = 1; i <= 3; i += 1) {
            var column = 'Looks' + i + 'ID';
            if (config[column] > 0) {
                VerifyMgr.checkTableRef(column, config[column], 'modeldisplay');
            }
        }
    });
}
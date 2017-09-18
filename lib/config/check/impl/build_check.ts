import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkBuildBasicDB();
    checkBuildLocalDB();
    checkBuildUpgradeDB();
}

function checkBuildBasicDB():void {
    // not need
}

function checkBuildLocalDB():void {
    // not need
}

function checkBuildUpgradeDB():void {
    VerifyMgr.setTableName('build_upgrade');
    Object.keys(VerifyMgr.cm.build_upgradedb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.build_upgradedb.get(ID);

        VerifyMgr.checkTableRef('build_ID', config.build_ID, 'build_basic');
    });
}
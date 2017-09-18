import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkSignInDB();
}

function checkSignInDB():void {
    VerifyMgr.setTableName('sign_in_reward');
    Object.keys(VerifyMgr.cm.sign_in_rewarddb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.sign_in_rewarddb.get(ID);

        for (var i = 1; i <= 2; i += 1) {
            var type = config['reward' + i + 'Type'];
            switch (type) {
                case 1:
                    VerifyMgr.checkResourceIdValid('reward' + i + 'Item', config['reward' + i + 'Item']);
                    break;
                case 2:
                    VerifyMgr.checkTableRef('reward' + i + 'Item', config['reward' + i + 'Item'], 'itemloot');
                    break;
            }
        }

        VerifyMgr.checkTableRef('key', config.key, 'item');
    });
}
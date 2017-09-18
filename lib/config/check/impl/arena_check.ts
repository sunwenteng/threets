import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkArenaInfoDB();
    checkArenaTournamentDB();
    checkArenaMilestoneDB();
    checkArenaRankRewardDB();
    checkArenaWinStreakDB();
}

function checkArenaInfoDB():void {
    VerifyMgr.setTableName('arena_info');
    Object.keys(VerifyMgr.cm.arena_infodb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.arena_infodb.get(ID);

        //if (config.rankreward) {
        //    VerifyMgr.checkTableRef('rankreward', config.rankreward, 'arena_rankreward');
        //}
    });
}

function checkArenaTournamentDB():void {
    VerifyMgr.setTableName('arena_tournament');
    Object.keys(VerifyMgr.cm.arena_tournamentdb.all()).forEach((key) => {
        var ID = parseInt(key);
        var config = VerifyMgr.cm.arena_tournamentdb.get(ID);

        VerifyMgr.checkTableExistValue('milestoneid', config.milestoneid, 'arena_milestone', 'gourp_id');
        VerifyMgr.checkTableRef('rankequip', config.rankequip, 'equip'); // 客户端显示用
    });
}

function checkArenaMilestoneDB():void {
    VerifyMgr.setTableName('arena_milestone');
    Object.keys(VerifyMgr.cm.arena_milestonedb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.arena_milestonedb.get(ID);

        for (var i = 1; i <= 4; i += 1) {
            var value = config['item' + i];
            if (value) {
                VerifyMgr.checkResourceIdValid('item' + i, value);
            }
        }
    });
}


function checkArenaRankRewardDB():void {
    //VerifyMgr.setTableName('arena_rankreward');
    //Object.keys(VerifyMgr.cm.arena_rankrewarddb.all()).forEach((key) => {
    //    var ID = parseInt(key);
    //    VerifyMgr.setID(ID);
    //    var config = VerifyMgr.cm.arena_rankrewarddb.get(ID);
    //
    //    for (var i = 1; i <= 4; i += 1) {
    //        var value = config['item' + i];
    //        if (value) {
    //            VerifyMgr.checkResourceIdValid('item' + i, value);
    //        }
    //    }
    //});
}

function checkArenaWinStreakDB():void {
    VerifyMgr.setTableName('arena_winstreak');
    Object.keys(VerifyMgr.cm.arena_winstreakdb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.arena_winstreakdb.get(ID);

        VerifyMgr.checkTableExistValue('lootid', config.lootid, 'itemloot', 'lootGroup');
    });
}
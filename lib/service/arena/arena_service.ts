import async = require('async');
import Service = require('../service');
import DB = require('../../database/database_manager');

import PlayerInfoMgr = require('../../cluster/player_info_mgr');
import ArenaCenterMgr = require('./arena_center_mgr');
import RobotCenterMgr = require('./robot_center_mgr');

class ArenaService extends Service {

    constructor() {
        super('arena');
    }

    public startupService(param:any):void {
        this.running = true;
        this.on('close', () => {
            this.running = false;
        });

        PlayerInfoMgr.initMgr();

        async.waterfall([
            (next) => {
                DB.Arena.initTables(next);
            },
            (next) => {
                //BossServiceMgr.initWorldBoss(next);
                ArenaCenterMgr.initArenaTournament(next);
            //},
            //(next) => {
            //    RobotCenterMgr.initRobot(next);
            }
        ], (err) => {
            this.emit('ready');
        });
    }
    public shutdownService():void {
        super.shutdownService();
    }

    public pullTournament(request:any, done):void {
        done(null, {
            arenaTournament: ArenaCenterMgr.getTournament()
        });
    }
}

export = ArenaService;
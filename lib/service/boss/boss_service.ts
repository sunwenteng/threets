import async = require('async');

import Service = require('../service');
import DB = require('../../database/database_manager');
import Redis = require('../../redis/redis_manager');

import BossServiceMgr = require('./boss_service_mgr');

class BossService extends Service {

    constructor() {
        super('boss');
    }

    public startupService(param:any):void {
        this.running = true;
        this.on('close', () => {
            this.running = false;
        });
        async.waterfall([
            (next) => {
                DB.Boss.initTables(next);
            },
            (next) => {
                BossServiceMgr.initWorldBoss(next);
            }
        ], (err) => {
            this.emit('ready');
        });
    }
    public shutdownService():void {
        super.shutdownService();
    }

    pullWorldBoss(request:any, done) {
        done(null, {
            worldBoss: BossServiceMgr.getBoss()
        });
    }

    finishFight(request:any, done) {

    }
}

export = BossService;
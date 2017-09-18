import pb       = require('node-protobuf-stream');
import util     = require('util');
import async    = require('async');

import DB = require('../../database/database_manager');

// src/util
import Log      = require('../../util/log');
import Time     = require('../../util/time');
import Enum     = require('../../util/enum');
import DynObject= require('../../util/dynamicobject/dyn_object');
import Util     = require('../../util/game_util');
import Tcp      = require('../../net/tcp');
import Common   = require('../../server_share/common');

import Role     = require('./role');

//// src/gameserver
//import CacheMgr     = require('../api/cache_mgr');
//import Universal    = require('../api/universal');
//import HeroDef      = require('../api/hero/defines');
//import TimeDef      = require('../api/time/defines');
//import BuildDef     = require('../api/build/defines');
//import HeroSuite    = require('../api/hero/hero_suite');
//import Hero         = require('../api/hero/hero');
//

class GameCharacter implements Tcp.BindingData{
    session:Tcp.SyncSession = null;

    passport:Common.Passport = new Common.Passport();
    dhClient:Common.DHClient = new Common.DHClient();
    device:Common.Device = new Common.Device();

    role:Role = null;
    accountId:number = 0;

    public onSessionClosed(done):void {
        if (this.role) {
            Log.sInfo('SessionClose', 'detach role %d', this.role.accountId);
            return this.role.offline(done);
        }
        done();
    }

}

export = GameCharacter;
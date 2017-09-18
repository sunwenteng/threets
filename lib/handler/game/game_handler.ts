import path = require('path');
import async = require('async');
import uuid = require('uuid');
import pb = require('node-protobuf-stream');

import Handler = require('./../handler');
import Tcp = require('../../net/tcp');
import Log = require('../../util/log');
import DB = require('../../database/database_manager');
import ApiRouter = require('../util/api_router');
import R = require('../../redis/redis_manager');
import NetManager = require('../../server/net_manager');
import ServiceManager = require('../../service/service_manager');
import PlayerInfoMgr = require('../../cluster/player_info_mgr');

import Universal = require('./universal');

import GameCharacter = require('./game_character');

import AchievementGlobalMgr = require('./achievement/achievement_global_mgr');
import BuildGlobalMgr = require('./build/build_global_mgr');
import CraftSkillGlobalMgr = require('./equip/craft_skill_global_mgr');
import LootGlobalMgr = require('./loot/loot_mgr');
import CombineGlobalMgr = require('./equip/combine_global_mgr');
import EquipGlobalMgr = require('./equip/equip_global_mgr');
import QuestGlobalMgr = require('./quest/quest_global_mgr');
import SummonBossGlobalMgr = require('./summonboss/summonboss_global_mgr');
import ArenaGlobalMgr = require('./arena/arena_global_mgr');
import FriendGlobalMgr = require('./friend/friend_global_mgr');
import BossGlobalMgr = require('./boss/boss_global_mgr');
import RobotGlobalMgr = require('./robot/robot_global_mgr');

import Controller = require('./controller');
import RoleManager = require('./role_manager');

import GmSystem = require('./api/gm_system');
import EquipSystem = require('./api/equip_system');
import BuildSystem = require('./api/build_system');
import BattleSystem = require('./api/battle_system');
import ArenaSystem = require('./api/arena_system');
import BossSystem = require('./api/boss_system');
import ShopSystem = require('./api/shop_system');
import ActivitySystem = require('./api/activity_system');

class GameHandler extends Handler {

    private apiRouter:ApiRouter = new ApiRouter();

    constructor() {
        super('game');
    }

    public startupHandler():void {
        this.running = true;
        this.on('shutdown', () => {
            this.running = false;
        });
        var Api = pb.get('.Api');
        Object.keys(Api).slice(6)/*.concat('session')*/.forEach((system) => {
            if (system === 'login') return ;
            try {
                this.apiRouter.addSystem(system, require(path.join(__dirname, 'api/', system + '_system')));
            } catch (e) {}
        });

        async.waterfall([
            (next) => {
                this.initSystem(next);
            },
            (next) => {
                R.sub.onMessage((channel, fqn, message) => {
                    console.log(fqn);
                    console.log(JSON.stringify(message.toRaw()));
                    var method = fqn.split('.')[3];
                    if (Controller[method]) {
                        try {
                            Controller[method](message);
                        } catch (e) {}
                    }
                });

                R.sub.subscribe('world');
                next();
            },
            (next) => {
                ServiceManager.callRemote(
                    'coordinate:register',
                    {uuid: uuid.v1()},
                    () => {
                        next();
                    }
                );
            }
        ], (err) => {
            if (err) return this.emit('error', err, true);
            try {
                NetManager.startApiListening('0.0.0.0', 6103);
            } catch (e) {
                this.emit('error', e, true);
                return ;
            }
            this.emit('ready');
        });
    }
    public shutdownHandler():void {
        this.running = false;
        async.waterfall([
            (next) => {
                NetManager.stopTcpListening('0.0.0.0', 6103, next);
            },
            (next) => {
                this.saveSystem(next);
            }
        ], (err) => {
            this.emit('shutdown');
        });
    }

    private initSystem(done):void {
        this.reloadConfig();
        RoleManager.initManager();
        PlayerInfoMgr.initMgr();

        GmSystem.initSystem();

        async.waterfall([
            (next) => {
                RobotGlobalMgr.initRobot(next);
            },
            (next) => {
                ArenaSystem.initSystem(next);
            },
            (next) => {
                BossSystem.initSystem(next);
            },
            (next) => {
                ShopSystem.initSystem(next);
            },
            (next) => {
                ActivitySystem.initSystem(next);
            }
        ], (err) => {
            done(err);
        });
    }

    private reloadConfig():void {
        Universal.reloadConfig();
        AchievementGlobalMgr.reloadConfig();
        BuildGlobalMgr.reloadConfig();
        CraftSkillGlobalMgr.reloadConfig();
        LootGlobalMgr.reloadConfig();
        CombineGlobalMgr.reloadConfig();
        EquipGlobalMgr.reloadConfig();
        QuestGlobalMgr.reloadConfig();
        SummonBossGlobalMgr.reloadConfig();
        ArenaGlobalMgr.reloadConfig();
        FriendGlobalMgr.reloadConfig();
        BossGlobalMgr.reloadConfig();
    }

    private saveSystem(done):void {
        RoleManager.saveManager(done);
    }

    public update():void {
        RoleManager.update();
    }

    public handlerMessage(session:Tcp.SyncSession, fqnArr:string[], message:any, done):void {
        var Handler = null;

        var character:GameCharacter = session.getBindingData();
        if (character instanceof GameCharacter) {
            Handler = this.apiRouter.getHandler(fqnArr[1], fqnArr[2]);
            if (!Handler) return done(this.handlerError(session, fqnArr, message, new Error('E_NO_HANDLER')));
            try {
                Handler(character.role, message, (err, res) => {
                    RoleManager.saveRole(character.role, false, () => {
                        if (err) return done(this.handlerError(session, fqnArr, message, err));
                        done(res);
                    });
                });
            } catch (e) {
                return done(this.handlerError(session, fqnArr, message, e));
            }
            return ;
        } else {
            Handler = this.apiRouter.getHandler(fqnArr[1], fqnArr[2]);
            if (!Handler) return done(this.handlerError(session, fqnArr, message, new Error('E_NO_HANDLER')));
            try {
                Handler(session, message, (err, res) => {
                    if (err) return done(this.handlerError(session, fqnArr, message, err));
                    done(res);
                });
            } catch (e) {
                return done(this.handlerError(session, fqnArr, message, e));
            }
            return ;
        }

        //Log.sError('Session', 'Session Status Error');
        //session.closeSocket();
    }
}

export = GameHandler;
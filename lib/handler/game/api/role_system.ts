import async = require('async');
import pb = require('node-protobuf-stream');

import Log = require('../../../util/log');
//import CenterDB = require('../../../database/impl/center_db');
import Enum = require('../../../util/enum');
import Time = require('../../../util/time');
import Tcp = require('../../../net/tcp');
import ERRC = require('../../../util/error_code');
//import PlayerSession = require('../client_session');
//import GameWorld = require('../game_world');
import GmStruct = require('../gm/gm_struct');
import GameCharacter = require('../game_character');
import Role = require('../role');
import RoleStruct = require('./../role/role_struct');
import Util = require('../../../util/game_util');
import ResourceMgr = require('../resource/resource_mgr');
import CustomError = require('../../../util/errors');
import Universal = require('../universal');
import LootMgr = require('../loot/loot_mgr');
import TimeDef = require('../time/defines');
import RoleManager = require('../role_manager');
import ServiceManager = require('../../../service/service_manager');


import DB = require('../../../database/database_manager');

var GiftCode;
try {
    GiftCode = require('../../../../build/Release/GiftCode.node');
} catch (e) {
    GiftCode = require('../../../../../../build/Release/GiftCode.node');
}

var cm = require('../../../config').configMgr;

export function initSystem():boolean {
    return GiftCode.JSInit('DH');
}

export function reconnect(session:Tcp.SyncSession, packet:{clientVersion:string;resVersion:string}, done):void {
    //if (session.sessionStatus !== Enum.GAME_SESSION_STATUS.OFFLINE) {
    //    Log.sError('Role', 'session is not offline');
    //    return done({
    //        error: {code: ERRC.COMMON.RECONNECT_ERROR}
    //    });
    //}

    var clientVersion = packet.clientVersion;
    var resVersion = packet.resVersion;

    // TODO check if need update client or resource

    done();
}

export function online(session:Tcp.SyncSession, packet:any, done):void {
    var passport = packet.passport;
    var deviceUid = packet.deviceUid;
    var deviceType = packet.deviceType;
    var token = packet.deviceToken;
    var deviceOS = packet.deviceOS;
    var platform = packet.platformId;
    var accountIdForGMLogin = packet.accountIdForGMLogin;

    var character = new GameCharacter();

    character.dhClient.platformId = platform;
    character.device.OS = deviceOS;
    character.device.type = deviceType;
    character.device.uid = deviceUid;
    character.passport.passport = passport;

    var accountId = 0;
    var accountGM = 0;
    var onlineLock = '';

    async.waterfall(
        [
            // 帐号验证
            (next) => {
                DB.Login.validateAuth(passport, platform, (err, passportId, lastLoginServerId, gmAuth) => {
                    if (err) return next(err);

                    if (passportId === 0) {
                        Log.sError('Role', 'socketUid=' + session.sessionUid + ', passport not exist, passport=' + passport);
                        return next(new Error('passport not exist, passport=' + passport));
                    }

                    character.passport.passportId = passportId;
                    accountGM = gmAuth;
                    next(null, passportId);
                });
            },
            // 获取角色编号
            (passportId, next) => {
                DB.Login.getRoleIdByPassportIdAndServerId(passportId, 1, (err, roleId) => {
                    if (err) return next(err);
                    // 角色编号不存在则插入一个
                    if (!roleId) {
                        DB.Login.insertRepassportPlayer(passportId, 1, (err, roleId) => {
                            if (err) return next(err);
                            accountId = roleId;
                            next();
                        });
                    }
                    else {
                        accountId = roleId;
                        next();
                    }
                });
            },
            (next) => {
                ServiceManager.callRemote(
                    'coordinate:acquireOnlineLock',
                    { accountId: accountId },
                    (err, res) => {
                        if (err) return next(err);
                        onlineLock = res.uuid;
                        next();
                    }
                );
            },
            // 对方已经在线 则踢下线
            (next) => {
                RoleManager.exist(accountId, (err, exist) => {
                    if (err) return next(err);
                    if (exist) {
                        RoleManager.isOnline(accountId, (err, online) => {
                            if (err) return next(err);

                            if (online) RoleManager.kickOff(accountId, session, (err) => { next(err); });
                            else next();
                        });
                    } else {
                        RoleManager.create(accountId, passport, '', 1, (err) => { next(err); });
                    }
                });
            },
            // 内存加载
            (next) => {
                RoleManager.attach(accountId, (err, role) => {
                    if (err) return next(err);

                    if (role.roleSt === Enum.ROLE_ST.FORBID) {
                        return next(new Error('role forbid, roleId=' + accountId));
                    }

                    if (role.progress === Enum.ROLE_PROGRESS.NEW) {   // === 0
                        // role create data init TODO
                        role.initNew();
                        role.progress = Enum.ROLE_PROGRESS.INITIAL;

                        //if (GameWorld.bIsTest) {
                            role.setResCount(Enum.RESOURCE_TYPE.GOLD, 1000000);
                            role.setResCount(Enum.RESOURCE_TYPE.DIAMOND, 100000);
                            role.setResCount(Enum.RESOURCE_TYPE.FUSE_STONE, 100);
                        //}
                    }

                    role.bInited = true;
                    role.passportGmAuth = accountGM;
                    role.bindSession(session);

                    session.setBindingData(character);

                    role.online(() => {
                        role.cacheLastSaveTime = Date.now();
                        character.role = role;

                        RoleManager.saveRole(role, true, (err) => {
                            ServiceManager.callRemote(
                                'role:onlineOperation',
                                { accountId: accountId },
                                (err, res) => {
                                    next(err);
                                }
                            );
                        });
                    });
                });
            }
        ],
        (err) => {
            if (onlineLock) {
                ServiceManager.callRemote(
                    'coordinate:releaseOnlineLock',
                    { accountId: accountId, uuid: onlineLock },
                    (err, res) => {
                    }
                );
            }

            if (err) {
                Log.uError(accountId, 'RoleLifeCycle', 'online failed, err=' + err);
                return done(err);
            }
            Log.uInfo(accountId, 'RoleLifeCycle', 'finish online, roleId=' + character.role.accountId + ', socketUid=' + session.sessionUid);
            done(null, {
                serverNow: Time.gameNow()
            });
        }
    );

}

export function sendServerSundryData(role:Role):void {
    var M = pb.get('.Api.role.sundryInfo.Notify');
    role.sendPacket(new M({
        isTest: true
    }));
}

export function heartBeat(session:Tcp.SyncSession, packet:any, done):void {
    done();
}

export function signInfo(role:Role, packet:any, done) {
    done(null, {
        signInfo: role.signIn.buildNetObj()
    });
}

export function randomName():string {
    var all = cm.random_namedb.all();
    var keys = Object.keys(all);
    return all[keys[Util.randInt(0, keys.length)]].Text_male;
}

export function fetchRoleProfile(accountId:number, done:(err, profile?:RoleStruct.Profile)=>void):void {
    //CacheMgr.attachRole(accountId, (err, role) => {
    //    if (err) {
    //        cb(err, null);
    //        return;
    //    }
    //
    //    // 不在线需要初始化内存数据
    //    if (!CacheMgr.isRoleOnline(role.accountId)) {
    //        role.checkMemoryData();
    //    }
    //
    //    var profile = new RoleStruct.Profile();
    //    profile.loadFromRole(role);
    //    CacheMgr.detachRole(accountId, false);
    //    cb(null, profile);
    //});

    RoleManager.read(accountId, (err, role) => {
        if (err) return done(err);
        var profile = new RoleStruct.Profile();
        profile.loadFromRole(role);
        done(null, profile);
    });
}

export function fetchRoleFightTeam(accountId:number, raidFight:boolean, done:(err, team?:RoleStruct.FightTeam)=>void):void {
    //CacheMgr.attachRole(accountId, (err, role) => {
    //    if (err) {
    //        cb(err, null);
    //        return;
    //    }
    //
    //    // 不在线需要初始化内存数据
    //    if (!CacheMgr.isRoleOnline(role.accountId)) {
    //        role.checkMemoryData();
    //    }
    //
    //    var fightTeam = new RoleStruct.FightTeam();
    //    fightTeam.loadFromRole(role);
    //    CacheMgr.detachRole(accountId, false);
    //    cb(null, fightTeam);
    //});

    RoleManager.read(accountId, (err, role) => {
        if (err) return done(err);
        var fightTeam = new RoleStruct.FightTeam();
        fightTeam.loadFromRole(role, raidFight);
        done(null, fightTeam);
    });
}

export function updateGuide(role:Role, packet:any, done):void {
    var progress = packet.progress;

    role.setSundryValue(Enum.SUNDRY.NEW_ROLE_GUIDE, progress);
    role.progress = progress;

    role.sendUpdatePacket(false);
    done();
}

export function finishGuideBattle(role:Role, packet:any, done):void {

    var progress = role.getSundryValue(Enum.SUNDRY.NEW_ROLE_GUIDE),
        loot;

    if (progress < 300) {
        loot = LootMgr.rollLoot(Universal.GLB_NEW_ROLE_GUIDE_BATTLE_LOOT_ID);
        ResourceMgr.applyReward(role, Enum.USE_TYPE.GUIDE_FINISH_BATTLE, loot.resource);
        role.sendUpdatePacket(true);
    } else {
        loot = LootMgr.createLoot(); // 新手引导300之后不再给战斗奖励（为了防止客户端被篡改，无限领取该奖励）
    }

    done(null, {
        reward: loot.buildInitNetMsg()
    });
}

export function gainFirstCharge(role:Role, packet:any, done):void {
    var status = role.getSundryValue(Enum.SUNDRY.FIRST_CHARGE_STATUS);
    switch (status) {
        case Enum.FIRST_CHARGE_STATUS.UNCHARGE:
            throw new CustomError.UserError(ERRC.FIRST_CHARGE.NOT_CHARGE, {
                msg: 'FIRST_CHARGE.NOT_CHARGE'
            });
        case Enum.FIRST_CHARGE_STATUS.CHARGED:
            break;
        case Enum.FIRST_CHARGE_STATUS.GAINED:
            throw new CustomError.UserError(ERRC.FIRST_CHARGE.HAVE_GAINED_REWARD, {
                msg: 'FIRST_CHARGE.HAVE_GAINED_REWARD'
            });
    }

    // can gain first charge reward
    ResourceMgr.applyReward(role, Enum.USE_TYPE.FIRST_CHARGE_REWARD, Universal.GLB_FIRST_CHARGE_REWARD);

    role.setSundryValue(Enum.SUNDRY.FIRST_CHARGE_STATUS, Enum.FIRST_CHARGE_STATUS.GAINED);
    role.sendUpdatePacket(true);

    done();
}

export function gainNewsFacebook(role:Role, packet:any, done):void {
    var status = role.getSundryValue(Enum.SUNDRY.NEWS_FACEBOOK);

    if (status === Enum.GENERAL_REWARD_STATUS.GAINED) {
        throw new CustomError.UserError(ERRC.FIRST_CHARGE.HAVE_GAINED_REWARD, {
            msg: 'FIRST_CHARGE.HAVE_GAINED_REWARD'
        });
    }

    var reward:Universal.Resource = {};
    reward[Enum.RESOURCE_TYPE.DIAMOND] = Universal.GLB_FACEBOOK_NEWS_DIAMOND;

    ResourceMgr.applyReward(role, Enum.USE_TYPE.GAIN_NEWS_FACEBOOK, reward);
    role.setSundryValue(Enum.SUNDRY.NEWS_FACEBOOK, Enum.GENERAL_REWARD_STATUS.GAINED);
    role.sendUpdatePacket(true);

    done(null, {
        reward: Universal.tranResourceToRewardList(reward)
    });
}

export function shareGame(role:Role, packet:any, done):void {
    var lastShareTime = role.time_control.getTime(TimeDef.TIME_STAMP.LAST_SHARE_GAME);
    if (!Time.isToday(lastShareTime)) {
        role.time_control.setTime(TimeDef.TIME_STAMP.LAST_SHARE_GAME, Time.gameNow());
        role.setSundryValue(Enum.SUNDRY.SHARE_GAME_STATUS, Enum.SHARE_GAME_STATUS.SHARED);
    }

    role.sendUpdatePacket(true);
    done();
}

export function gainShareReward(role:Role, packet:any, done):void {

    var lastShareTime = role.time_control.getTime(TimeDef.TIME_STAMP.LAST_SHARE_GAME);
    var lastGainReward = role.time_control.getTime(TimeDef.TIME_STAMP.LAST_GAIN_SHARE_REWARD);

    if (!Time.isToday(lastShareTime)) {
        var status = role.getSundryValue(Enum.SUNDRY.SHARE_GAME_STATUS);
        if (status !== Enum.SHARE_GAME_STATUS.NULL) {
            role.setSundryValue(Enum.SUNDRY.SHARE_GAME_STATUS, Enum.SHARE_GAME_STATUS.NULL);
            role.sendUpdatePacket(false);
        }
        throw new CustomError.UserError(ERRC.SHARE_GAME.NOT_SHARE_TODAY, {
            msg: 'SHARE_GAME.NOT_SHARE_TODAY, last share time is ' + (new Date(lastShareTime)).toISOString()
        });
    }

    if (lastGainReward >= lastShareTime) {
        throw new CustomError.UserError(ERRC.SHARE_GAME.HAVE_GAINED_REWARD, {
            msg: 'SHARE_GAME.HAVE_GAINED_REWARD, last gain time is ' + (new Date(lastGainReward)).toISOString()
        });
    }

    // apply reward
    var reward = Universal.getFixedReward(1);
    ResourceMgr.applyReward(role, Enum.USE_TYPE.SHARE_GAME, reward);

    role.time_control.setTime(TimeDef.TIME_STAMP.LAST_GAIN_SHARE_REWARD, Time.gameNow());
    role.setSundryValue(Enum.SUNDRY.SHARE_GAME_STATUS, Enum.SHARE_GAME_STATUS.GAINED);

    role.sendUpdatePacket(true);

    done(null, {
        reward: reward ? Universal.tranResourceToRewardList(reward) : []
    });
}

//export function getGift(role:Role, args, done) {
//    var code:string = args.code;
//
//    var pckRewardList:Universal.Reward[] = [];
//    async.waterfall(
//        [
//            (next) => {
//                if (role.checkAsyncFlag(Enum.ROLE_ASYNC_FLAG.GET_GIFT_CODE)) {
//                    return next(new CustomError.UserError(ERRC.GIFT_CODE.LAST_VERIFICATION_NOT_FINISHED, {
//                        msg: 'GIFT_CODE.LAST_VERIFICATION_NOT_FINISHED, code=' + code
//                    }));
//                }
//                role.setAsyncFlag(Enum.ROLE_ASYNC_FLAG.GET_GIFT_CODE);
//                next();
//            },
//            (next) => {
//                GiftCode.JSFilterGiftCodeFormat(code, (valid, id, idx)=> {
//                    if (!valid) {
//                        next(new CustomError.UserError(ERRC.GIFT_CODE.CODE_INVALID, {
//                            msg: 'GIFT_CODE.CODE_INVALID, code=' + code
//                        }));
//                    }
//                    else {
//                        next(null, id, idx);
//                    }
//                });
//            },
//            (id, idx, next) => {
//                DB.Login.getGiftCodeInfo(id, (err,
//                                             param1:number,
//                                             param2:number,
//                                             param3:number,
//                                             reward:string,
//                                             server:string,
//                                             platform:string,
//                                             dead_time:number,
//                                             use_max:number) => {
//                    if (err) {
//                        return next(new CustomError.UserError(ERRC.GIFT_CODE.NOT_FOUND, {
//                            msg: 'GIFT_CODE.NOT_FOUND, code=' + code
//                        }));
//                    }
//
//                    var strRight:string = GiftCode.JSCalcGiftCode(id, idx, param1, param2, param3);
//                    strRight = strRight.replace(/-/g, '');
//                    var strCode = code.replace(/-/g, '');
//
//                    if (strRight !== strCode) {
//                        return next(new CustomError.UserError(ERRC.GIFT_CODE.FORMAT_ERROR, {
//                            msg: 'GIFT_CODE.FORMAT_ERROR, strCode=' + strCode + ', strRight=' + strRight
//                        }));
//                    }
//
//                    var now = Time.gameNow();
//                    if (now >= dead_time) {
//                        return next(new CustomError.UserError(ERRC.GIFT_CODE.CODE_EXPIRED, {
//                            msg: 'GIFT_CODE.CODE_EXPIRED, code=' + code + ', id=' + id + ', idx=' + idx +
//                            ', dead_time=' + dead_time + ', now=' + now
//                        }));
//                    }
//
//                    DB.Login.verifyGiftCodeIsUsed(id, idx, (err, isUsed:boolean)=> {
//                        if (err) {
//                            return next(new CustomError.UserError(ERRC.GIFT_CODE.VERIFY_FAILED, {
//                                msg: 'GIFT_CODE.VERIFY_FAILED'
//                            }))
//                        }
//
//                        if (isUsed) {
//                            return next(new CustomError.UserError(ERRC.GIFT_CODE.IS_USED, {
//                                msg: 'GIFT_CODE.IS_USED, code=' + code + ', id=' + id + ', idx=' + idx
//                            }));
//                        }
//
//                        if (server !== '0' && server.split('-').indexOf(GameWorld.serverId.toString()) === -1) {
//                            return next(new CustomError.UserError(ERRC.GIFT_CODE.REQUIRE_SERVER_ID_ERROR, {
//                                msg: 'code server invalid, code=' + code +
//                                ', this_server=' + GameWorld.serverId + ', requireServers=' + server
//                            }));
//                        }
//
//                        if (platform !== '0' && platform.split('-').indexOf(role.session.dhClient.platformId.toString()) === -1) {
//                            return next(new CustomError.UserError(ERRC.GIFT_CODE.REQUIRE_PLATFORM_ID_ERROR, {
//                                msg: 'GIFT_CODE.REQUIRE_PLATFORM_ID_ERROR, code=' + code
//                                + ', role_platformId=' + role.session.dhClient.platformId + ', requirePlatforms=' + platform
//                            }));
//                        }
//
//                        DB.Login.getGiftCodeUsedCount(role.accountId, id, (err, usedCount:number)=> {
//                            if (err) {
//                                return next(new CustomError.UserError(ERRC.GIFT_CODE.VERIFY_FAILED, {
//                                    msg: 'GIFT_CODE.VERIFY_FAILED'
//                                }));
//                            }
//
//                            if (usedCount >= use_max) {
//                                return next(new CustomError.UserError(ERRC.GIFT_CODE.USED_MAX, {
//                                    msg: 'GIFT_CODE.USED_MAX, code=' + code + ', id=' + id + ', use_max=' + use_max + ', usedCount=' + usedCount
//                                }));
//                            }
//
//                            var addReward:Universal.Resource = {};
//                            var resList = reward.match(/\d+/g);
//                            if (resList) {
//                                var length = Math.floor(resList.length / 2);
//                                for (var i = 0; i < length; i += 1) {
//                                    var resId = parseInt(resList[i * 2]);
//                                    var resCount = parseInt(resList[i * 2 + 1]);
//                                    if (resId > 0 && resCount > 0) {
//                                        try {
//                                            Universal.checkResourceIdValid(resId);
//                                            addReward[resId] = resCount;
//                                        } catch (err) {
//                                        }
//                                    }
//                                }
//                            }
//
//                            ResourceMgr.applyReward(role, Enum.USE_TYPE.GIFT_CODE, addReward);
//                            pckRewardList = Universal.tranResourceToRewardList(addReward);
//                            role.sendUpdatePacket(true);
//                            DB.Login.insertGiftCodeUse(role.accountId, id, idx, next);
//                        });
//                    });
//                });
//            }
//        ], (err) => {
//            role.rmAsyncFlag(Enum.ROLE_ASYNC_FLAG.GET_GIFT_CODE);   // must do this even error occurs
//
//            if (err) return done(err);
//
//            done(null, {
//                reward: pckRewardList
//            });
//        }
//    );
//}

export function monthSign(role:Role, packet:any, done) {
    if (role.signIn.hasSignMonth()) {
        throw new CustomError.UserError(ERRC.MONTH_SIGN.HAS_SIGN_TODAY, {
            msg: 'MONTH_SIGN.HAS_SIGN_TODAY'
        });
    }

    var reward = role.signIn.getNextMonthReward() || {};
    ResourceMgr.applyReward(role, Enum.USE_TYPE.MONTH_SIGN, reward);

    role.signIn.signMonth();

    role.sendUpdatePacket(true);
    done(null, {
        hasSignDays: role.signIn.monthSign.hasSignDays,
        reward: Universal.tranResourceToRewardList(reward)
    });
}
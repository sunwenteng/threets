import async = require('async');

import Log = require('../../../util/log');
import Enum = require('../../../util/enum');
import Time = require('../../../util/time');
import ERRC = require('../../../util/error_code');

import Tcp = require('../../../net/tcp');
import App = require('../../../server/app');
import DB = require('../../../database/database_manager');
import RoleManager = require('../role_manager');
import ServiceManager = require('../../../service/service_manager');

import GameCharacter = require('../game_character');

export function roleOnline(session:Tcp.SyncSession, packet, done):void {
    //if (session.getBindStatus() > Enum.BindStatus.IS_BINDING) {
    //    Log.sError('Role', 'session is logging on');
    //    return done({
    //        error: {code: ERRC.COMMON.UNKNOWN}
    //    });
    //}

    var passport = packet.passport;
    var deviceUid = packet.deviceUid;
    var deviceType = packet.deviceType;
    var token = packet.deviceToken;
    var deviceOS = packet.deviceOS;
    var platform = packet.platformId;
    var accountIdForGMLogin = packet.accountIdForGMLogin;


    var character:GameCharacter = new GameCharacter();

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
                    if (err) {
                        next(err);
                        return;
                    }

                    if (passportId === 0) {
                        Log.sError('Role', 'socketUid=' + session.sessionUid + ', passport not exist, passport=' + passport);
                        next(new Error('passport not exist, passport=' + passport));
                        return;
                    }

                    character.passport.passportId = passportId;
                    accountGM = gmAuth;
                    next(null, passportId, lastLoginServerId);
                });
            },
            // 获取角色编号
            (passportId, lastLoginServerId, next) => {
                DB.Login.getRoleIdByPassportIdAndServerId(passportId, lastLoginServerId, (err, roleId) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    // 角色编号不存在则插入一个
                    var thisServerId = 1;
                    if (!roleId) {
                        DB.Login.insertRepassportPlayer(passportId, thisServerId, (err, roleId) => {
                            if (err) {
                                next(err);
                                return;
                            }
                            accountId = roleId;
                            next(null);
                        });
                    }
                    else {
                        accountId = roleId;
                        next(null);
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
            (next) => {
                RoleManager.exist(accountId, (err, exist) => {
                    if (err) return next(err);

                    if (exist) {
                        RoleManager.isOnline(accountId, (err, online) => {
                            if (err) return next(err);

                            if (online) RoleManager.kickOff(accountId, session, next);
                            else next();
                        });
                    } else {
                        RoleManager.create(accountId, passport, '', 1, next);
                    }
                });
            },

            (next) => {
                // TODO get online lock

                // TODO check if already online

                RoleManager.attach(accountId, (err, role) => {
                    if (err) return done(err);

                    role.online(() => {
                        //character.role = role;
                        next();
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
            session.setBindingData(character);
            session.setBindStatus(Enum.BindStatus.HAS_BOUND);
            done(null, {
                serverNow: Time.gameNow()
            });
        }
    );
}
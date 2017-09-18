import ip = require('ip');
import semver = require('semver');

import Log = require('../../../util/log');
import Tcp = require('../../../net/tcp');
import Enum = require('../../../util/enum');
import DB = require('../../../database/database_manager');

import GameDiscovery = require('../game_discovery');
import LoginCharacter = require('../login_character');

export function auth(session:Tcp.SyncSession, packet:any, done) {
    var passport      = packet.passport,
        platformId    = packet.platformId,
        deviceUid     = packet.deviceUid,
        device        = packet.device,
        deviceType    = packet.deviceType,
        deviceToken   = packet.deviceToken,
        clientVersion = packet.clientVersion;

    DB.Login.validateAuthFast(passport, platformId, deviceUid,
        deviceToken, device, deviceType, session.address.address,
        (err, passportId, gmAuth, lastLoginServerId) => {
            if (err) {
                Log.sError('Login', 'validateAuthFast failed, args=%j', packet);
                return;
            }

            var loginCharacter:LoginCharacter = new LoginCharacter();

            loginCharacter.passport.passportId = passportId;
            loginCharacter.passport.privilegeLevel = gmAuth;
            loginCharacter.dhClient.platformId = platformId;
            loginCharacter.dhClient.clientVersion = clientVersion;

            session.setBindingData(loginCharacter);
            session.setBindStatus(Enum.BindStatus.HAS_BOUND);

            // TODO
            // var loginServerId = 0;
            //if (!lastLoginServerId) {
            //    var recommendServer:{serverId:number; playerCount:number} = {serverId: 0, playerCount: 0};
            //
            //    Object.keys(LoginWorld.serverMap).forEach((key) => {
            //        var server = LoginWorld.serverMap[key];
            //        if (!server.can_login || !server.alive) {
            //            return;
            //        }
            //        if (!isServerAccess(server.login_strategy_id, session)) {
            //            return;
            //        }
            //
            //        var playerCount = LoginWorld.serverPlayerCountMap[server.server_id] || 0;
            //        if (recommendServer.serverId === 0 || playerCount < recommendServer.playerCount) {
            //            recommendServer.serverId = server.server_id;
            //            recommendServer.playerCount = playerCount;
            //        }
            //
            //    });
            //
            //    if (recommendServer.serverId) {
            //        loginServerId = recommendServer.serverId;
            //        Log.sInfo('Login', 'new passport, allocate server[' + loginServerId + '], passport=' + passport +
            //            ', passportId=' + passportId);
            //        LoginDB.updateLastLoginServerId(passportId, loginServerId, ()=> {
            //        });
            //    }
            //} else {    // already has role
            //    Log.sInfo('Login', 'old passport, allocate server[' + lastLoginServerId + ']');
            //    loginServerId = lastLoginServerId;
            //    //var server = LoginWorld.serverMap[lastLoginServerId];
            //    //if (server && server.can_login && server.alive && isServerAccess(server.login_strategy_id, session)) {
            //    //    loginServerId = lastLoginServerId;
            //    //}
            //}

            done(null, {serverId: 1, gmAuth: gmAuth});
        }
    );
}

export function getServerList(character:LoginCharacter, packet, done) {
    var pck = {serverList: [{
                    id      : 1,
                    name    : 'alpha',
                    canLogin: true
    }]};
    //var server;
    //for (var obj in LoginWorld.serverMap) {
    //    server = LoginWorld.serverMap[obj];
    //    if (isServerAccess(server.login_strategy_id, session)) {
    //        pck.serverList.push({
    //            id      : server.server_id,
    //            name    : server.server_name,
    //            canLogin: !!server.can_login
    //        });
    //    }
    //}
    done(null, pck);
}

export function chooseServer(character:LoginCharacter, packet, done) {
    var serverId = packet.serverId;
    //var server = LoginWorld.serverMap[serverId];
    //if (server) {
    //    LoginDB.updateLastLoginServerId(session.passport.passportId, serverId, (err) => {
    //        if (!err) {
    //
    //            var canUpadteStr = LoginWorld.getNoticeStr(LoginDB.NoticeUseType.CAN_UPDATE, LoginDB.NoticeConditionType.SERVER_ID, serverId);
    //            var funcStr = LoginWorld.getNoticeStr(LoginDB.NoticeUseType.FORBID_FUNCTION, LoginDB.NoticeConditionType.SERVER_ID, serverId);
    //
    //            var pck = {
    //                ip            : server.ip,
    //                port          : (server.port + ''),
    //                version       : server.version,
    //                resVersion    : server.res_version,
    //                resServerAddr : server.res_server_ip,
    //                canUpdate     : canUpadteStr === '',
    //                isMaintain    : !server.can_login,
    //                forbidFuncList: []
    //            };
    //
    //            var forbidList:RegExpMatchArray = funcStr.match(/\d+/g);
    //            if (forbidList) {
    //                forbidList.forEach((funcId) => {
    //                    pck.forbidFuncList.push(parseInt(funcId));
    //                });
    //            }
    //
    //            done(null, pck);
    //        }
    //    });
    //    return ;
    //}

    var frontend = GameDiscovery.getAvailableFrontEnd();
    var pck = {
        ip            : frontend.address,
        port          : frontend.port.toString(),
        version       : '',
        resVersion    : '',
        resServerAddr : '',
        canUpdate     : false,
        isMaintain    : false,
        forbidFuncList: []
    };

    done(null, pck);
}

export function getInfo(character:LoginCharacter, packet, done) {
    var platformId    = packet.platformId,
        clientVersion = packet.clientVersion,
        notice        = '',
        reqVersion    = '',
        updateAddr    = '';

    //character.dhClient.platformId = platformId;
    //character.dhClient.clientVersion = clientVersion;
    done(null, {
        notice    : '',
        version   : reqVersion,
        updateAddr: updateAddr
    });


    //reqVersion = LoginWorld.getNoticeStr(LoginDB.NoticeUseType.PLATFORM_CLIENT_VERSION, LoginDB.NoticeConditionType.PLATFORM, platformId);
    //
    //if (reqVersion !== '' && reqVersion !== clientVersion) {
    //    updateAddr = LoginWorld.getNoticeStr(LoginDB.NoticeUseType.UPDATE_ADDR, LoginDB.NoticeConditionType.PLATFORM, platformId);
    //    return done(null, {
    //        notice    : '',
    //        version   : reqVersion,
    //        updateAddr: updateAddr
    //    });
    //} else {
    //    notice = LoginWorld.getNoticeStr(LoginDB.NoticeUseType.LOGIN, LoginDB.NoticeConditionType.PLATFORM, platformId);
    //    return done(null, {
    //        notice    : notice,
    //        version   : reqVersion,
    //        updateAddr: ''
    //    });
    //}
}

//function isServerAccess(strategyId:number, session:ClientSession):boolean {
//    if (!strategyId) {
//        return true;
//    }
//
//    var condArr = LoginWorld.loginStrategyMap[strategyId];
//    if (!condArr) {
//        return false;
//    }
//
//    // 所有条件都需要符合
//    var tmp = [];
//    for (var i = 0; i < condArr.length; i++) {
//        var condition = condArr[i];
//        try {
//            switch (condition.type) {
//                case LoginDB.LoginStrategyType.PLATFORM:
//                    tmp = condition.value.split(/\s*,\s*/);
//                    if (tmp.indexOf(session.dhClient.platformId.toString()) === -1) return false;
//                    break;
//                case LoginDB.LoginStrategyType.IP:
//                    tmp = condition.value.split(/\s*,\s*/);
//                    for (var j = 0; j < tmp.length; j++) {
//                        var patten = tmp[j];
//                        if (!ip.isEqual(session.address.address, patten)) return false;
//                    }
//                    break;
//                case LoginDB.LoginStrategyType.AUTH:
//                    var minAuth = parseInt(condition.value);
//                    if (isNaN(minAuth) || session.passport.privilegeLevel < minAuth) return false;
//                    break;
//                case LoginDB.LoginStrategyType.VERSION:
//                    if (!semver.satisfies(session.dhClient.clientVersion, condition.value)) return false;
//                    break;
//                case LoginDB.LoginStrategyType.DEVICE:
//                    break;
//            }
//        } catch (err) {
//            return false;
//        }
//
//    }
//
//    return true;
//}
import async = require('async');
import pb = require('node-protobuf-stream');
// src/util
import log = require('../../../util/log');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import ErrorMsg = require('../../../util/error_msg');
import Time = require('../../../util/time');
import Enum = require('../../../util/enum');

// src/database
// src/gameserver
import Role = require('../role');
//import CenterClient = require('../center_client');
import FriendDef = require('../../../service/friend/defines');
import RoleStruct = require('../role/role_struct');
import FightDef = require('../fight/defines');
import Fight = require('../fight/fight');
import Simulation = require('../fight/simulation');
import Universal = require('../universal');
import QuestDef = require('../quest/defines');
import ResourceMgr = require('../resource/resource_mgr');
import FriendGlobalMgr = require('./../friend/friend_global_mgr');
import ServiceManager = require('../../../service/service_manager');
import RoleSystem = require('./role_system');
import RoleManager = require('../role_manager');

var cm = require('../../../config').configMgr;

export function sendRoleOnlinePacket(role:Role) {
    var initHireInfo = pb.get('.Api.friend.initHireInfo.Response');  // TODO change to Notify
    role.sendPacket(new initHireInfo({
        haveHiredCount: role.friends.hireMgr.hiredCount,
        coolDown: role.friends.hireMgr.calCoolDown(Universal.GLB_FRIEND_REFRESH_HIRE_COUNT_INTERVAL),
        allHiredFriendList: role.friends.hireMgr.getAllHiredList()
    }));

    var initInfo = pb.get('.Api.friend.initInfo.Notify');
    role.sendPacket(new initInfo({
        referFriendCount: role.friends.referFriendCount,
        gainedIDList: role.friends.getGainedRewardList()
    }));
}

export function initHireInfo(role:Role, packet:any, done):void {
    var firstHireTime = role.friends.hireMgr.firstHireTime;
    if (firstHireTime > Time.gameNow() || firstHireTime + 86400 <= Time.gameNow()) {
        role.friends.hireMgr.resetHire();
    }

    var hireMgr = role.friends.hireMgr;

    done(null, {
        haveHiredCount: hireMgr.hiredCount,
        coolDown: hireMgr.calCoolDown(Universal.GLB_FRIEND_REFRESH_HIRE_COUNT_INTERVAL),
        allHiredFriendList: hireMgr.getAllHiredList(),
        purchaseCount: hireMgr.purchaseCount
    });
}

export function initFriend(role:Role, packet:any, done):void {
    var accountId = role.accountId,
        isBackground = packet.isBackground;

    ServiceManager.callRemote('friend:fetchFriendList', {accountId: accountId}, (err, response) => {
        if (err) {
            log.sError('Friend', 'friend:fetchFriendList callback Error, message=' + err.message);
            return done(isBackground ? err : null);
        }

        role.friends.initData();

        async.eachSeries(
            response.friendList,
            (entry:any, next) => {
                RoleManager.read(entry.accountId, (err, friend) => {
                    if (err) {
                        return next();
                    }
                    role.friends.addFriend(entry, friend);
                    next();
                });
            }, (err) => {
                if (err)
                    return done(err);

                role.friends.sort();
                role.quests.updateQuest(role, QuestDef.CriteriaType.EARN_N_FRIEND, null, role.friends.getFriendCount());
                role.quests.sendUpdatePacket(role);

                done(null, {
                    friendCount: role.friends.getFriendCount(),
                    applicationCount: role.friends.getApplicationCount(),
                    friendList: role.friends.buildInitFriendEntryNetList(),
                    isBackground: isBackground ? true: false
                });
            }
        );

    });
}

export function fetchPartFriend(role:Role, packet:any, done):void {
    var startIndex = packet.startIndex,
        size = packet.size;
    done(null, {
        friendList: role.friends.buildPartFriendEntryNetList(startIndex, startIndex + size)
    });
}

export function applyForFriend(role:Role, packet:any, done):void {
    var accountId = role.accountId, username = role.username,
        friendCode = packet.friendCode;

    if (friendCode === accountId.toString()) {
        throw new CustomError.UserError(ERRC.FRIEND.CAN_NOT_APPLY_SELF, {
            msg: 'apply friend with self, accountId=' + accountId
        });
    }

    var req = {
        accountId: accountId,
        friendCode: friendCode,
        username: username
    };
    ServiceManager.callRemote('friend:applyForFriend', req, (err, res) => {
        done(err || res.error);
    });

}

export function handleApplication(role:Role, packet:any, done):void {
    var accountId = role.accountId,
        friendId = packet.friendId, handleType = FriendDef.HANDLE_APPLICATION_TYPE[packet.type];

    var req = {
        accountId: accountId,
        friendId: friendId,
        handleType: handleType
    };
    ServiceManager.callRemote('friend:handleApplication', req, (err, res) => {
        if (err) return done(err);
        if (res.error) return done(res.error);

        if (role) {
            role.friends.acceptApplication(friendId);
            role.quests.updateQuest(role, QuestDef.CriteriaType.EARN_N_FRIEND, null, role.friends.getFriendCount());
            role.quests.sendUpdatePacket(role);
        }

        done();
    });

}


export function seeProfile(role:Role, packet:any, done):void {
    var friendId = packet.friendId;

    RoleSystem.fetchRoleProfile(friendId, (err, profile) => {
        if (err) return done(err);

        done(null, {
            profile: profile
        });
    });
}

export function startFight(role:Role, packet:any, done):void {
    var friendId = packet.friendId;

    if (!role.friends.isFriend(friendId)) {
        throw new CustomError.UserError(ERRC.FRIEND.IS_NOT_FRIEND, {
            msg: 'FRIEND.IS_NOT_FRIEND, friendId=' + friendId
        });
    }

    RoleSystem.fetchRoleFightTeam(friendId, false, (err, res) => {
        if (err) return done(err);

        var pck:any = {heros: []};

        if (res.fightPlayers && res.fightPlayers.length > 0) {

            try {
                role.friends.startFight(role, friendId, res);
                pck.randomSeed = role.friends.getRandomSeed();

                res.fightPlayers.forEach((player:RoleStruct.FightPlayer) => {
                    var fightPlayerNet = new RoleStruct.FightPlayerNet();
                    fightPlayerNet.loadFromCenterFightPlayer(player);
                    pck.heros.push(fightPlayerNet.buildNetMsg());
                });
            } catch (err) {
                return done(err);
            }

        } else {
            return done({ code: ERRC.FIGHT.OTHER_SIDE_TEAM_ERROR });
        }

        done(null, pck);
    });

}

export function finishFight(role:Role, packet:any, done):void {
    var result = packet.result;
    var totalRound = packet.totalRound;
    var roundContext:Simulation.RoundContext = new Simulation.RoundContext();
    roundContext.useSlayRound = Fight.transformClientRoundToServer(packet.useSlayRound);

    role.friends.finishFight(role, roundContext, totalRound, result, (err, scoreResult) => {
        role.achievements.sendUpdatePacket(role);
        role.quests.sendUpdatePacket(role);
        var pack:any = {
            earned: scoreResult.earned,
            winTimesScore: scoreResult.winStreakScore,
            revengeScore: scoreResult.revengeScore,
            totalScore: scoreResult.totalScore,
        };
        if (scoreResult.mileStoneRewardID) pack.scoreRewardGet = scoreResult.mileStoneRewardID;
        if (scoreResult.winStreakRewardID) pack.winTimesRewardGet = scoreResult.winStreakRewardID;
        done(null, pack);
    });
}

export function delFriend(role:Role, packet:any, done):void {
    var accountId = role.accountId,
        friendId = packet.friendId;
    var req = {
        accountId: accountId,
        friendId: friendId
    };
    ServiceManager.callRemote('friend:delFriend', req, (err, res) => {
        done(err || res.error);
    });
}

export function gainReward(role:Role, packet:any, done):void {
    var ID = packet.ID;

    var config = cm.friend_referdb.get(ID);
    if (role.friends.referFriendCount < config.refer_num) {
        throw new CustomError.UserError(ERRC.FRIEND.REFER_FRIEND_COUNT_NOT_ENOUGH, {
            msg: 'FRIEND.REFER_FRIEND_COUNT_NOT_ENOUGH, own=' + role.friends.referFriendCount + ', need=' + config.refer_num + ', ID=' + ID
        });
    }

    if (role.friends.gainReferRewardRecord[ID]) {
        throw new CustomError.UserError(ERRC.FRIEND.REWARD_HAVE_GAINED, {
            msg: 'FRIEND.REWARD_HAVE_GAINED'
        });
    }

    var reward:Universal.Resource = {};
    reward[config.item] = config.itemnum;
    ResourceMgr.applyReward(role, Enum.USE_TYPE.FRIEND_GAIN_REWARD, reward);

    role.friends.gainReferRewardRecord[ID] = true;

    role.quests.updateQuest(role, QuestDef.CriteriaType.EARN_N_FRIEND_REFER_BONUS, null, role.friends.getHaveGainReferRewardCount());

    role.sendUpdatePacket(true);

    done(null, {
        ID: ID
    });
}

export function purchaseHireCount(role:Role, packet:any, done):void {
    var hireMgr = role.friends.hireMgr;

    var config = cm.friendhirecostdb.friendhirecostDBConfig[hireMgr.purchaseCount + 1];
    if (!config) {
        throw new CustomError.UserError(ERRC.FRIEND.PURCHASE_HIRE_COUNT_NOT_ENOUGH, {
            msg: 'FRIEND.PURCHASE_HIRE_COUNT_NOT_ENOUGH, purchaseCount=' + (hireMgr.purchaseCount + 1)
        });
    }

    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.DIAMOND] = config.hireCost;

    ResourceMgr.checkHasEnoughResource(role, consume);
    hireMgr.purchaseCount += 1;
    ResourceMgr.minusConsume(role, Enum.USE_TYPE.PURCHASE_HIRE_COUNT, consume);

    done(null, {
        purchaseCount: hireMgr.purchaseCount
    });
}

interface FriendApplication {
    friendId:number;
    username:string;
    applyTime:number;
}

export function roleHasNewApplication(packet:any):void {
    var accountId = packet.accountId,
        applicationCount = packet.applicationCount;
}

export function roleHasNewFriend(packet:any):void {
    var accountId = packet.accountId,
        friendInfo:FriendApplication = packet.friendInfo;

    //if (CacheMgr.isRoleOnline(accountId)) {
    //    CacheMgr.attachRole(accountId, (err, role) => {
    //        if (err) {
    //            return;
    //        }
    //        var M = pb.getMessageType('.Api.friend.newFriend.Notify');
    //        role.sendPacket(new M({
    //            friendInfo: friendInfo
    //        }));
    //        CacheMgr.detachRole(accountId, false);
    //    });
    //}
}
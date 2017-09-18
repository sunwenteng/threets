import pb = require('node-protobuf-stream');

import Util = require('../../../util/game_util');
import Role = require('../role');
import FightStc = require('../fight/fight_struct');
import QuestDef = require('../quest/defines');
import AchievementDef = require('../achievement/defines');
import FriendStruct = require('./friend_struct');
import RoleStruct = require('../role/role_struct');
import Enum = require('../../../util/enum');
import ERRC = require('../../../util/error_code');
import HeroDef = require('../hero/defines');
import FriendGlobalMgr = require('./friend_global_mgr');
import CustomError = require('../../../util/errors');
import Universal = require('../universal');

var cm = require('../../../config').configMgr;

export function reloadConfig():void {
}

export function checkHireFriend(role:Role, hires:number[]):void {
    if (hires.length === 0) return ;

    var hireId = 0, hireMgr = role.friends.hireMgr;
    // check hire count
    if (hireMgr.hiredCount + hires.length > Universal.GLB_FRIEND_HIRE_MAX_COUNT + hireMgr.purchaseCount) {
        throw new CustomError.UserError(ERRC.FRIEND.HIRE_FRIEND_COUNT_NOT_ENOUGH, {
            msg: 'DUNGEON.HIRE_FRIEND_COUNT_NOT_ENOUGH, hiredCount=' + hireMgr.hiredCount + ', hireLength=' +
                hires.length + ', purchaseCount=' + hireMgr.purchaseCount
        });
    }
    // check hire friendId
    for (var i = 0; i < hires.length; ++i) {
        hireId = hires[i];

        if (!role.friends.isFriend(hireId)) {
            throw new CustomError.UserError(ERRC.FRIEND.IS_NOT_FRIEND, {
                msg: 'FRIEND.IS_NOT_FRIEND, hireId=' + hireId
            })
        }
        if (hireMgr.hasHired(hireId)) {
            throw new CustomError.UserError(ERRC.FRIEND.HIRE_FRIEND_IN_CD, {
                msg: 'DUNGEON.HIRE_FRIEND_IN_CD, hireId=' + hireId
            });
        }
    }
}

export function recordHireFriend(role:Role, hires:number[], hireFriends:{[friendId:number]:FriendStruct.FriendEntry}):void {
    var hireId = 0, friend, friendNew;
    // do hire
    for (var i = 0; i < hires.length; ++i) {
        hireId = hires[i];
        friendNew = new FriendStruct.FriendEntry();
        friend = role.friends.getFriendEntry(hireId);

        Object.keys(friend).forEach((key) => {
            friendNew[key] = friend[key];
        });
        hireFriends[hireId] = friendNew;
    }
}

export function doHireForFight(role:Role, hires:number[], hireFriends:{[friendId:number]:FriendStruct.FriendEntry}):void {
    // do hire
    recordHireFriend(role, hires, hireFriends);

    if (hires.length > 0) {
        for (var i = 0; i < hires.length; ++i) {
            var hireId = hires[i];
            role.friends.hireMgr.hireFriend(hireId);
        }

        var M = pb.get('.Api.friend.updateHireInfo.Notify');
        role.sendPacket(new M({
            haveHiredCount: role.friends.hireMgr.hiredCount,
            coolDown: role.friends.hireMgr.calCoolDown(Universal.GLB_FRIEND_REFRESH_HIRE_COUNT_INTERVAL),
            newHiredFriendList: hires
        }));

        role.quests.updateQuest(role, QuestDef.CriteriaType.HIRE_FRIEND_N_FIGHT, null, 1);
        role.achievements.updateAchievement(role, AchievementDef.TYPE.HIRE_FRIEND_FOR_N_BATTLE, 1);
    }
}
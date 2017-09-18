import pb = require('node-protobuf-stream');

// ../../
import ERRC = require('../../util/error_code');
import Log = require('../../util/log');
import Universal = require('../../handler/game/universal');

import DB = require('../../database/database_manager');

import RedisManager = require('../../redis/redis_manager');
import RoleManager = require('../../handler/game/role_manager');
// ../

// ./
import FriendDef = require('./defines');
import PlayerSocial = require('./player_social');

var socialMap:{[accountId:number]:PlayerSocial} = {};
var loadQueue:{[accountId:number]:Array<(err:any, playerSocial:PlayerSocial) => void>} = {};

function createPlayerSocial(accountId:number,
                            cb:(err, playerSocial?:PlayerSocial) => void):void {
    DB.Login.fetchServerIdByRoleId(accountId, (err, serverId) => {
        if (err) return cb(err, null);

        if (serverId === 0) {
            cb(new Error('role not exist, role_id=' + accountId), null);
            return;
        }

        DB.Friend.fetchFriendship(accountId, (err, result) => {
            if (err)
                return cb(err, null);

            var playerSocial = new PlayerSocial(accountId);
            result.forEach((friendship) => {
                playerSocial.addEntry(friendship);
            });

            RoleManager.read(accountId, (err, role) => {
                if (err) return cb(err);
                playerSocial.level = role.level;
                cb(null, playerSocial);
            });
        });
    });
}

function attachPlayerSocial(accountId:number,
                            cb:(err, playerSocial:PlayerSocial) => void):void {
    var playerSocial = socialMap[accountId];
    if (!playerSocial) {
        if (!loadQueue[accountId]) {
            loadQueue[accountId] = [cb];
            createPlayerSocial(accountId, (err, pc:PlayerSocial) => {
                if (err) {
                    for (var i = 0; i < loadQueue[accountId].length; ++i) {
                        loadQueue[accountId][i](err, null);
                    }
                } else {
                    socialMap[accountId] = pc;
                    for (var i = 0; i < loadQueue[accountId].length; ++i) {
                        loadQueue[accountId][i](null, pc);
                    }
                }
                delete loadQueue[accountId];
            });
        } else {
            loadQueue[accountId].push(cb);
        }
    } else {
        cb(null, playerSocial);
    }
}

function attachTwoPlayerSocial(selfId:number, otherId:number,
                               cb:(err, self:PlayerSocial, other:PlayerSocial) => void):void {
    attachPlayerSocial(selfId, (err, self) => {
        if (err) {
            cb(err, null, null);
            return;
        }

        attachPlayerSocial(otherId, (err, other) => {
            if (err) {
                cb(err, self, null);
                return;
            }
            cb(null, self, other);
        });
    });
}
// cb: {result:CenterPlayerInfo[]}
export function fetchFriendList(accountId:number, cb:(obj) => void):void {
    attachPlayerSocial(accountId, (err, playerSocial) => {
        if (err)
            return cb({friendList: []});

        cb({friendList: playerSocial.friendList});
    });
}

export function fetchFriendCount(request:any, cb:(result) => void):void {
    var accountId = request.accountId;

    attachPlayerSocial(accountId, (err, playerSocial) => {
        var FriendCount = pb.get('.DB.FriendCount');
        var response = new FriendCount();
        if (err) {
            Log.sError('Friend', err.stack);
            response.error = ERRC.COMMON.UNKNOWN;
            cb(response.toBuffer());
            return;
        }
        response.applicationCount = playerSocial.getApplicationIdList().length;
        response.friendCount = playerSocial.getFriendIdList().length;
        cb(response.toBuffer());
    });

}

export function applyForFriend(accountId:number, friendCode:string, username:string, cb:(result) => void):void {

    var friendAccountId = getAccountIdByFriendCode(friendCode);

    if (Universal.isRobot(friendAccountId)) {
        cb({});
        return;
    }

    attachTwoPlayerSocial(accountId, friendAccountId, (err, self, other) => {
        var response = {};
        if (err) {
            response['error'] = {code: ERRC.FRIEND.FRIEND_INFO_NOT_FOUND};
        } else {
            if (self.isMaxFriendCount()) {
                response['error'] = {code: ERRC.FRIEND.MAX_FRIEND_COUNT};
            } else if (other.hasApplicant(accountId)) {
                response['error'] = {code: ERRC.FRIEND.DUPLICATE_APPLICATION};
            } else if (other.hasFriend(accountId)) {
                response['error'] = {code: ERRC.FRIEND.ALREADY_IS_FRIEND};
            }

            if (!response['error']) {
                other.addApplicant(accountId);
                var entry = other.getEntry(accountId);
                DB.Friend.insertFriendEntry(other.accountId, entry.friendId, entry.updateTime, entry.status, (err) => {
                });
            }
        }
        cb(response);

        if (!response['error']) {
            var Type = pb.get('.Rpc.controller.roleHasNewApplication');
            RedisManager.pub.publishWorld(new Type({
                accountId       : friendAccountId,
                applicationCount: other.getApplicationIdList().length
            }));
        }
    });

}

export function handleApplicant(request:any, cb:(result) => void):void {
    var selfId         = request.accountId,
        friendId       = request.friendId,
        handleType:any = request.handleType;

    attachTwoPlayerSocial(selfId, friendId, (err, self, other) => {
        var response = {};
        if (err) {
            response['error'] = ERRC.FRIEND.FRIEND_INFO_NOT_FOUND;
        } else {
            switch (handleType) {
                case FriendDef.HANDLE_APPLICATION_TYPE.ACCEPT: {
                    if (self.isMaxFriendCount()) {
                        response['error'] = ERRC.FRIEND.MAX_FRIEND_COUNT;
                    } else if (self.hasFriend(friendId)) {
                        response['error'] = ERRC.FRIEND.ALREADY_IS_FRIEND;
                    }

                    if (!response['error']) {
                        self.acceptApplicant(friendId);
                        other.addFriend(selfId);

                        // 更新自己的
                        var update = self.getEntry(friendId);
                        DB.Friend.updateFriendEntry(self.accountId, update.friendId, update.updateTime, update.status, (err) => {
                        });

                        // 插入他人的
                        var insert = other.getEntry(selfId);
                        DB.Friend.insertFriendEntry(other.accountId, insert.friendId, insert.updateTime, insert.status, (err) => {
                        });
                    }
                    break;
                }
                case FriendDef.HANDLE_APPLICATION_TYPE.REJECT: {
                    if (self.hasFriend(friendId)) {
                        response['error'] = ERRC.FRIEND.ALREADY_IS_FRIEND;
                        break;
                    }
                    self.rejectApplicant(friendId);
                    DB.Friend.deleteFriendEntry(selfId, friendId, (err) => {
                    });
                    break;
                }
            }
        }
        cb(response);
    });
}

export function deleteFriend(request:any, cb:(result) => void):void {
    var selfId   = request.accountId,
        friendId = request.friendId;

    attachTwoPlayerSocial(selfId, friendId, (err, self, other) => {
        var response = {};
        if (err) {
            response['error'] = {code: ERRC.FRIEND.FRIEND_INFO_NOT_FOUND};
        } else {
            self.delFriend(friendId);
            other.delFriend(selfId);

            DB.Friend.deleteFriendEntry(selfId, friendId, (err) => {
            });
            DB.Friend.deleteFriendEntry(friendId, selfId, (err) => {
            });
        }

        cb(response);

        //if (!response['error']) {
        //    var pck = new cmd['cmd_center_sc_delNewFriend']({
        //        accountId     : friendId,
        //        deleteFriendId: selfId
        //    });
        //    CenterWorld.sendPacketToRoleInServer(friendId, pck, (err) => {
        //    });
        //}
    });
}

function getAccountIdByFriendCode(friendCode:string):number {
    return parseInt(friendCode);
}

export function getFriendNum(accountId:number) {
    if (socialMap.hasOwnProperty(accountId.toString())) {
        return Object.keys(socialMap[accountId].friendList).length;
    }

    return 0;
}

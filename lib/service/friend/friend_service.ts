import async = require('async');
import DB = require('../../database/database_manager');
import Redis = require('../../redis/redis_manager');
import Log = require('../../util/log');

// ../
import Service = require('../service');
import SocialMgr = require('../friend/social_mgr');
import FriendDef = require('./defines');

// ./

class FriendService extends Service {
    constructor() {
        super('friend');
    }

    public startupService(param:any):void {
        this.running = true;
        this.on('close', () => {
            this.running = false;
        });

        async.waterfall([
            (next) => {
                DB.Friend.initTables(next);
            }
        ], (err) => {
            if (err) return this.emit('error', err, true);
            this.emit('ready');
        });
    }
    public shutdownService():void {
        this.running = false;
        this.emit('shutdown');
    }

    public fetchFriendList(request:any, done):void {
        var accountId = request.accountId;
        SocialMgr.fetchFriendList(accountId, (response) => {
            Log.sDebug('RpcRequest', 'response: ' + JSON.stringify(response));
            var friendList = Object.keys(response.friendList).map(x => {
                var entry = response.friendList[x];
                return {
                    accountId: entry.friendId,
                    entryType: entry.status === FriendDef.STATUS.ACCEPTED ? 'FRIEND' : 'APPLICATION'
                };
            });
            done(null, {friendList: friendList});
        });
    }

    public applyForFriend(request:any, done):void {
        var accountId = request.accountId,
            friendCode = request.friendCode,
            username = request.username;

        SocialMgr.applyForFriend(accountId, friendCode, username, (response) => {
            Log.sDebug('RpcRequest', 'response: ' + JSON.stringify(response));
            done(null, response);
        });
    }

    public handleApplication(request:any, done):void {
        var selfId = request.accountId,
            friendId = request.friendId,
            handleType = request.handleType;
        SocialMgr.handleApplicant(request, (response) => {
            if (response.error) {
                done({code: response.error}, null);
            } else {
                done(null, {});
            }
        });
    }

    public delFriend(request:any, done):void {
        SocialMgr.deleteFriend(request, (res) => {
            done(null, res);
        });
    }
}
export = FriendService;
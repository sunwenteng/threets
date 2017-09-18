// ../../
import Time = require('../../util/time');
//import CenterDB = require('../../database/impl/center_db');
import Log = require('../../util/log');
import Config = require('../../config');

// ./
import FriendDef = require('./defines');

class FriendEntry {
    friendId:number;
    updateTime:number;
    status:number;

    constructor(friendId?:number, applyTime?:number, status?:number) {
        this.friendId = friendId || 0;
        this.updateTime = applyTime || 0;
        this.status = status || 0;
    }
}

class PlayerSocial {
    accountId:number = 0;
    friendCode:string = '';
    friendList:{[accountId:number]:FriendEntry} = {};
    level:number = 1;

    // memory
    changeMask:{[accountId:number]:boolean} = {};

    constructor(accountId:number) {
        this.accountId = accountId;
        this.friendList = {};
    }

    public getFriendIdList():number[] {
        var friendList:number[] = [];
        Object.keys(this.friendList).forEach((key) => {
            if (this.friendList[key].status === FriendDef.STATUS.ACCEPTED) {
                friendList.push(parseInt(key));
            }
        });
        return friendList;
    }

    public getApplicationIdList():number[] {
        var list:number[] = [];
        Object.keys(this.friendList).forEach((key) => {
            if (this.friendList[key].status === FriendDef.STATUS.APPLYING) {
                list.push(parseInt(key));
            }
        });
        return list;
    }

    public getAllIdList():string[] {
        return Object.keys(this.friendList);
    }

    public addEntry(entry:any/*CenterDB.Friendship*/) {
        this.friendList[entry.friendId] = new FriendEntry(entry.friendId, entry.updateTime, entry.status);
    }

    public getEntry(accountId:number):FriendEntry {
        return this.friendList[accountId];
    }

    public hasApplicant(accountId:number):boolean {
        var entry = this.friendList[accountId];
        if (!entry) {
            return false;
        }
        return entry.status === FriendDef.STATUS.APPLYING;
    }

    public hasFriend(accountId:number):boolean {
        var entry = this.friendList[accountId];
        if (!entry) {
            return false;
        }
        return entry.status === FriendDef.STATUS.ACCEPTED;
    }

    public isMaxFriendCount():boolean {
        try {
            var config = Config.configMgr.knightexpdb.get(this.level);
            Log.sDebug('isMaxFriendCount', 'maxFriend=%d', config ? config.maxFriend : -1);
            return Object.keys(this.friendList).length >= config.maxFriend;
        } catch (err) {
        }
        return true;
    }

    public addApplicant(accountId:number) {
        this.friendList[accountId] = new FriendEntry(accountId, Time.realNow(), FriendDef.STATUS.APPLYING);
    }

    public acceptApplicant(accountId:number) {
        var entry = this.friendList[accountId];
        if (entry && entry.status === FriendDef.STATUS.APPLYING) {
            entry.status = FriendDef.STATUS.ACCEPTED;
            entry.updateTime = Time.realNow();
        }
    }

    public rejectApplicant(accountId:number) {
        delete this.friendList[accountId];
    }

    public addFriend(accountId:number) {
        this.friendList[accountId] = new FriendEntry(accountId, Time.realNow(), FriendDef.STATUS.ACCEPTED);
    }

    public delFriend(accountId:number) {
        delete this.friendList[accountId];
    }

}

export = PlayerSocial;
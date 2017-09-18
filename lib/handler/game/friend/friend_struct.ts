import FriendDef = require('./defines');
import Time = require('../../../util/time');

export class FriendEntry {
    accountId:number = 0;
    username:string = '';
    level:number = 1;

    hairType:number;      // 发型
    hairColor:number;     // 发色
    faceType:number;      // 脸型
    skinColor:number;     // 肤色
    cape:number;

    dungeonArmorID:number;
    dungeonArmorLevel:number;
    arenaArmorID:number;
    arenaArmorLevel:number;
    bossArmorID:number;
    bossArmorLevel:number;

    equipAchievementID:number;

    win:number = 0;
    loss:number = 0;
    infoType:FriendDef.FRIEND_INFO_TYPE = FriendDef.FRIEND_INFO_TYPE.NULL;

    public buildDBMsg():any {
        return {
            accountId: this.accountId,
            username: this.username,
            level: this.level,

            hairType: this.hairType,      // 发型
            hairColor: this.hairColor,     // 发色
            faceType: this.faceType,      // 脸型
            skinColor: this.skinColor,     // 肤色
            cape: this.cape,

            dungeonArmorID: this.dungeonArmorID,
            dungeonArmorLevel: this.dungeonArmorLevel,
            arenaArmorID: this.arenaArmorID,
            arenaArmorLevel: this.arenaArmorLevel,
            bossArmorID: this.bossArmorID,
            bossArmorLevel: this.bossArmorLevel,

            equipAchievementID: this.equipAchievementID,

            win: this.win,
            loss: this.loss,
            infoType: this.infoType

        };
    }

    public loadDBMsg(msg:any) {
        this.accountId = msg.accountId;
        this.username = msg.username;
        this.level = msg.level;

        this.hairType = msg.hairType;      // 发型
        this.hairColor = msg.hairColor;     // 发色
        this.faceType = msg.faceType;      // 脸型
        this.skinColor = msg.skinColor;     // 肤色
        this.cape = msg.cape;

        this.dungeonArmorID = msg.dungeonArmorID;
        this.dungeonArmorLevel = msg.dungeonArmorLevel;
        this.arenaArmorID = msg.arenaArmorID;
        this.arenaArmorLevel = msg.arenaArmorLevel;
        this.bossArmorID = msg.bossArmorID;
        this.bossArmorLevel = msg.bossArmorLevel;

        this.equipAchievementID = msg.equipAchievementID;

        this.win = msg.win;
        this.loss = msg.loss;
        this.infoType = msg.infoType;
    }
}

export class FightHistory {
    win:number = 0;
    loss:number = 0;
}

export class HireMgr {
    hiredCount:number = 0;
    firstHireTime:number = 0;
    hiredList:{[accountId:number]:number} = {};
    purchaseCount:number = 0;               // 购买次数

    public hireFriend(friendId:number) {
        if (this.hiredCount === 0) {
            this.firstHireTime = Time.gameNow();
        }
        this.hiredCount += 1;
        this.hiredList[friendId] = Time.gameNow();
    }

    public resetHire():void {
        this.hiredCount = 0;
        this.firstHireTime = 0;
        this.hiredList = {};
        this.purchaseCount = 0;
    }

    public hasHired(friendId:number):boolean {
        return !!this.hiredList[friendId];
    }

    public calCoolDown(cd:number):number {
        if (this.firstHireTime === 0) return 0;
        var now = Time.gameNow();
        return this.firstHireTime + cd > now ? this.firstHireTime + cd - now : 0;
    }

    public getAllHiredList():number[] {
        var hireList:number[] = [];
        Object.keys(this.hiredList).forEach((key) => {
            hireList.push(parseInt(key));
        });
        return hireList;
    }

    public buildDBMsg():any {
        var pck = {
            hiredCount: this.hiredCount,
            firstHireTime: this.firstHireTime,
            purchaseCount: this.purchaseCount,
            hiredList: []
        };
        Object.keys(this.hiredList).forEach((key) => {
            pck.hiredList.push({
                key: parseInt(key),
                value: this.hiredList[key]
            });
        });
        return pck;
    }
    public loadDBMsg(msg:any) {
        this.hiredCount = msg.hiredCount;
        this.firstHireTime = msg.firstHireTime;
        this.purchaseCount = msg.purchaseCount || 0;
        this.hiredList = {};
        msg.hiredList.forEach((item:{key:number; value:number}) => {
            this.hiredList[item.key] = item.value;
        });
    }
}
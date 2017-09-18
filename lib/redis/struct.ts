import RHash = require('./builtin/hash');
//import CenterDB = require('../database/impl/center_db');

// 重要！（必须）
// 所有继承自RBase,RHash,RSortedSet的类的类名都要写入到Project目录下的uglify-reserved.json文件中
// 否则将被uglify为a,b等类名，导致redis的key不正确

export class PlayerRO extends RHash {
    accountId:number = 0;
    username:string = '';
    armorID:number = 0;
    level:number = 0;
    hairType:number = 0;
    hairColor:number = 0;
    faceType:number = 0;
    skinColor:number = 0;
    cape:number = 0;
    dungeonArmorID:number = 0;
    dungeonArmorLevel:number = 0;
    bossArmorID:number = 0;
    bossArmorLevel:number = 0;
    arenaArmorID:number = 0;
    arenaArmorLevel:number = 0;
    achievementId:number = 0;

    constructor(key:number) {
        super(key.toString());
        this.accountId = key;
    }

    public attach(callback:(err)=>void):void {
        this.attachRO(true, callback);
    }

    public loadAllData(callback:(err, result)=>void):void {
        //CenterDB.fetchPlayerROInfo([this.accountId.toString()], (err, result) => {
        //    if (err) {
        //        callback(err, null);
        //        return;
        //    }
        //    if (result.length === 0) {
        //        callback(new Error('NotFoundPlayer, accountId=' + this.accountId), null);
        //        return;
        //    }
        //
        //    callback(err, result);
        //});
    }

    public saveAllData(callback:(err, result)=>void):void {
        //CenterDB.updateRoleInfo(this.accountId, this, (err) => {
        //    callback(err, null);
        //});
    }
}

//export class ArenaTournament extends RHash {
//
//    tournamentId:number = 0;
//    startTime:number = 0;
//    endTime:number = 0;
//    progress:number = 0;
//
//    constructor() {
//        super('current');
//    }
//
//    public attach(callback:(err)=>void):void {
//        this.attachRO(false, callback);
//    }
//
//    public setHash(res:any):void {
//        this.tournamentId = parseInt(res.tournamentId);
//        this.startTime = parseInt(res.startTime);
//        this.endTime = parseInt(res.endTime);
//        this.progress = parseInt(res.progress);
//    }
//}

export class RobotRO extends RHash {
    accountId:number = 0;
    username:string = '';
    level:number = 0;
    achievementId:number = 0;
    hero1armorID:number = 0;
    hero1armorLevel:number = 0;
    hero2armorID:number = 0;
    hero2armorLevel:number = 0;
    hero3armorID:number = 0;
    hero3armorLevel:number = 0;

    constructor(accountId:number) {
        super(accountId.toString());
    }

    public attach(callback:(err)=>void):void {
        this.attachRO(false, callback);
    }

    public setHash(res:any):void {
        this.accountId = parseInt(res.accountId);
        this.username = res.username;
        this.level = parseInt(res.level);
        this.achievementId = parseInt(res.achievementId);
        this.hero1armorID = parseInt(res.hero1armorID);
        this.hero1armorLevel = parseInt(res.hero1armorLevel);
        this.hero2armorID = parseInt(res.hero2armorID);
        this.hero2armorLevel = parseInt(res.hero2armorLevel);
        this.hero3armorID = parseInt(res.hero3armorID);
        this.hero3armorLevel = parseInt(res.hero3armorLevel);
    }
}

export class CenterRoleRO extends RHash {

    accountId:number = 0;
    status:number = 0;
    serverId:number = 0;

    constructor(accountId:number) {
        super(accountId.toString());
    }

    public attach(callback:(err, exist:boolean)=>void):void {
        this.attachRO(false, callback);
    }

    public setHash(res:any):void {
        this.accountId = parseInt(res.accountId);
        this.status = parseInt(res.status);
        this.serverId = parseInt(res.serverId);
    }
}

//export class WorldBoss extends RHash {
//
//    bossID:number = 0;
//    startTime:number = 0;
//    endTime:number = 0;
//    progress:number = 0;
//
//    constructor() {
//        super('current');
//    }
//
//    public attach(callback:(err)=>void):void {
//        this.attachRO(false, callback);
//    }
//
//    public setHash(res:any):void {
//        this.bossID = parseInt(res.bossID);
//        this.startTime = parseInt(res.startTime);
//        this.endTime = parseInt(res.endTime);
//        this.progress = parseInt(res.progress);
//    }
//}

import BuildGlobalMgr = require('./build_global_mgr');
import Universal = require('../universal');
import Time = require('../../../util/time');
import BuildDef = require('./defines');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');

var cm = require('../../../config').configMgr;

class Build {
    uid:number = 0;
    ID:number = 0;
    level:number = 0;
    direction:number = 0;
    point:Universal.Point = null;
    lastCollectTime:number = 0;
    openTime:number = 0;
    status:BuildDef.Status = BuildDef.Status.NULL;

    public toString():string {
        return '{type:Build' +
            ', uid:' + this.uid +
            ', ID:' + this.ID +
            ', level:' + this.level +
            ', direction:' + this.direction +
            ', point=' + JSON.stringify(this.point) +
            ', lastCollectTime:' + this.lastCollectTime +
            ', openTime:' + this.openTime +
            ', status:' + this.status +
            '}';
    }

    public assignUid(uid:number) {
        this.uid = uid;
    }

    public initObject(ID:number) {
        this.ID = ID;
        this.level = 1;
        this.direction = 0;
        this.lastCollectTime = Time.gameNow();  // set last collect time begin at build finish
        this.openTime = 0;
        this.point = {x:0, y:0};
    }

    public getLeftTime(now:number):number {
        return this.openTime > now ? this.openTime - now : 0;
    }

    public accelerate(now:number):void {
        this.openTime = now;
    }

    public isType(type:number):boolean {
        var config = cm.build_basicdb.get(this.ID);
        return type === config.type;
    }

    public isBuilt():boolean {
        return this.status == BuildDef.Status.FINISHED;
    }

    public isFuseMaster():boolean {
        return this.isType(BuildDef.TYPE.FUSE_MASTER);
    }

    public isArmorSmith():boolean {
        return this.isType(BuildDef.TYPE.ARMOR_SMITH);
    }

    public buildInitNetMsg():any {
        var pck;
        pck = {
            uid: this.uid,
            ID: this.ID,
            level: this.level,
            direction: this.direction,
            point: this.point,
            collectGold: this.getCollectGold(),
            leftTime: this.getLeftTime(Time.gameNow()),
            status: this.status
        };
        return pck;
    }

    public buildDBMsg():any {
        var pck;
        pck = {
            uid: this.uid,
            ID: this.ID,
            level: this.level,
            direction: this.direction,
            point: this.point,
            lastCollectTime: this.lastCollectTime,
            openTime: this.openTime,
            status: this.status
        };
        return pck;
    }

    public loadDBMsg(msg:any):void {
        this.uid = msg.uid;
        this.ID = msg.ID;
        this.level = msg.level;
        this.direction = msg.direction;
        this.lastCollectTime = msg.lastCollectTime;
        this.openTime = msg.openTime;
        this.status = msg.status;
        if (msg.point) this.point = msg.point;
    }

    public getCollectGold():number {
        var config = BuildGlobalMgr.getUpgradeConfig(this.ID, this.level);
        if (!config) {
            return 0;
        }
        if (this.status !== BuildDef.Status.FINISHED) {
            return 0;
        }
        var now = Time.gameNow();
        return Universal.calculateCollectGold(config.coinPerHour, config.coinMax, this.lastCollectTime, now);
    }
}

export = Build;
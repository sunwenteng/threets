// 通用
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Enum = require('../../../util/enum');

// 配表
var cm = require('../../../config').configMgr;

class CraftTask {
    buildUid:number = 0;
    craftSkillID:number = 0;
    startTime:number = 0;
    timeLength:number = 0;

    // 打造任务是否完成
    public isFinished(now:number):boolean {
        return this.startTime ? now >= this.startTime + this.timeLength : false;
    }

    // 获取打造的装备ID
    public getEquipID():number {
        var craftSkill = cm.craftskilldb.get(this.craftSkillID);
        return craftSkill.craftID;
    }

    public getLeftTime(now:number):number {
        return this.startTime + this.timeLength >= now ? (this.startTime + this.timeLength - now) : 0;
    }

    public getAccelerateDiamond(now:number):number {
        var leftTime = this.getLeftTime(now);
        return Math.ceil(leftTime / Enum.GLOBAL.DIAMOND_INTERVAL_CRAFT_TASK);
    }

    public accelerateTask() {
        this.timeLength = 0;
    }

    public buildInitNetMsg(now:number):any {
        var pck:any = {}
        pck.buildUid = this.buildUid;
        pck.craftSkillID = this.craftSkillID;
        pck.leftTime = this.getLeftTime(now);
        return pck;
    }

    public buildDBMsg():any {
        return {
            buildUid: this.buildUid,
            craftSkillID: this.craftSkillID,
            startTime: this.startTime,
            timeLength: this.timeLength
        };
    }

    public loadDBMsg(msg:any) {
        this.buildUid = msg.buildUid;
        this.craftSkillID = msg.craftSkillID;
        this.startTime = msg.startTime;
        this.timeLength = msg.timeLength;
    }
}

export = CraftTask;
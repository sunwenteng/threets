import QuestDef = require('./defines');
import Role = require('../role');
import ConfigStruct = require('../../../config/struct/config_struct');
import Time = require('../../../util/time');
import log = require('../../../util/log');

var cm = require('../../../config').configMgr;

export class QuestProgress {
    refQuestID:number = 0;      // 引用任务ID
    ID:number = 0;              // 子任务ID
    questType:number = 0;       // 任务类型
    questParam:number[] = null; // 任务参数
    requireCount:number = 0;    // 任务要求数量
    counter:number = 0;         // 已进行进度
    updateTime:number = 0;      // 更新时间
    changed:boolean = false;

    constructor(questID:number, ID:number, questType:number, questParam:any, questCount:number) {
        this.refQuestID = questID;
        this.ID = ID;
        this.questType = questType;
        this.questParam = questParam;
        this.requireCount = questCount;
        this.counter = 0;
        this.updateTime = 0;
        this.changed = true;
    }

    public isComplete():boolean {
        return this.counter >= this.requireCount;
    }

    public isChanged():boolean {
        return this.changed;
    }

    public meets(role:Role, param:any):boolean {
        switch (this.questType) {
            case QuestDef.CriteriaType.OWN_N_BUILD:
            case QuestDef.CriteriaType.STAGE_PASS_N_COUNT:
            case QuestDef.CriteriaType.KILL_MONSTER_TYPE_A_IN_CHAPTER_B_N_COUNT:
            case QuestDef.CriteriaType.COLLECT_GOLD_IN_BUILD_A:
            case QuestDef.CriteriaType.EARN_N_RES_ID:
            case QuestDef.CriteriaType.CRAFT_N_EQUIP_A:
            case QuestDef.CriteriaType.OPEN_CHANCE_CHEST_ID_N_COUNT:
                if (this.questParam.length === param.length) {
                    for (var i = 0; i < param.length; ++i) {
                        if (this.questParam[i] !== param[i]) {
                            return false;
                        }
                    }
                    return true;
                }
                break;
            case QuestDef.CriteriaType.OWN_N_BUILD_WITH_LEVEL:
            case QuestDef.CriteriaType.EARN_N_EQUIP_WITH_LEVEL:
                return param.length >= 2 && param[0] === this.questParam[0] && param[1] >= this.questParam[1];
            case QuestDef.CriteriaType.UNLOCK_CHAPTER:
                return param[0] >= this.questParam[0];      // stageID
            case QuestDef.CriteriaType.FUSE_EQUIP_A_B_N_COUNT:
                return (param[0] === this.questParam[0] && param[1] === this.questParam[1]) ||
                    (param[0] === this.questParam[1] && param[1] === this.questParam[0]);
            case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITHOUT_X_ELEMENT:
                return !param[this.questParam[0]];
            case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_X_ELEMENT:
                return !!param[this.questParam[0]];
            case QuestDef.CriteriaType.OWN_N_AREA:
            case QuestDef.CriteriaType.EARN_N_FRIEND:
            case QuestDef.CriteriaType.HIRE_FRIEND_N_FIGHT:
            case QuestDef.CriteriaType.TAKE_PART_IN_N_ARENA_FIGHT:
            case QuestDef.CriteriaType.TAKE_PART_IN_N_FRIEND_PVP_FIGHT:
            case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT:
            case QuestDef.CriteriaType.WIN_N_FRIEND_PVP_FIGHT:
            case QuestDef.CriteriaType.EARN_N_ARENA_POINT:
            case QuestDef.CriteriaType.EARN_N_FRIEND_REFER_BONUS:
            case QuestDef.CriteriaType.TAKE_PART_IN_N_ARENA_FIGHT_WITH_REVENGE:
            case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_REVENGE:
            case QuestDef.CriteriaType.DEFEAT_N_OPPONENT_WITH_HIGHER_RANK:
            case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_SLAY:
            case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_NO_DEAD:
            case QuestDef.CriteriaType.EARN_N_ARENA_WIN_STREAK:
                return true;
        }
        return false;
    }
}

export class CompleteQuest {
    ID:number = 0;
    completeTime:number = 0;
    constructor(ID:number, completeTime:number) {
        this.ID = ID;
        this.completeTime = completeTime;
    }
}

export class Quest {
    ID:number = 0;
    questType:QuestDef.TYPE = QuestDef.TYPE.NULL;
    questStatus:QuestDef.STATUS = QuestDef.STATUS.NEW;
    questProgress:{[ID:number]:QuestProgress} = {};
    updateTime:number = 0;
    arenaTournamentID:number = 0;

    public initQuest(ID:number, questType:QuestDef.TYPE, arenaTournamentID?:number) {
        this.ID = ID;
        this.questType = questType;
        this.arenaTournamentID = arenaTournamentID || 0;
        this.questStatus = QuestDef.STATUS.NEW;
        this.questProgress = [];
        this.updateTime = Time.gameNow();
    }

    public canComplete():boolean {
        if (this.questStatus === QuestDef.STATUS.COMPLETE) {
            return false;
        }
        var keys = Object.keys(this.questProgress);
        for (var i = 0; i < keys.length; i += 1) {
            if (!this.questProgress[keys[i]].isComplete()) {
                return false;
            }
        }
        return true;
    }

    public hasRead():boolean {
        return this.questStatus >= QuestDef.STATUS.READ;
    }

    public resetProgress():void {
        this.questStatus = QuestDef.STATUS.NEW;
        this.updateTime = Time.gameNow();
        Object.keys(this.questProgress).forEach((key) => {
            var progress:QuestProgress = this.questProgress[key];
            progress.counter = 0;
            progress.updateTime = Time.gameNow();
            progress.changed = true;
        });
    }

    public autoCompleteProgress():void {
        this.questStatus = QuestDef.STATUS.CAN_COMPLETE;
        this.updateTime = Time.gameNow();
        Object.keys(this.questProgress).forEach((key) => {
            var progress:QuestProgress = this.questProgress[key];
            progress.counter = progress.requireCount;
            progress.updateTime = Time.gameNow();
            progress.changed = true;
        });
    }

    public addQuestProgress(subQuest:ConfigStruct.subtaskDB):void {
        if (this.ID) {     // uid 不为0
            this.questProgress[subQuest.ID] = new QuestProgress(this.ID, subQuest.ID, subQuest.type, subQuest.JSON_param, subQuest.count);
        }
    }

    public getQuestProgress(ID:any):QuestProgress {
        return this.questProgress[ID];
    }

    public buildInitNetMsg():any {
        var pck;
        pck = {
            ID: this.ID,
            questType: this.questType,
            questStatus: this.questStatus,
            updateTime: this.updateTime,
            questProgress: []
        };
        if (this.questStatus !== QuestDef.STATUS.COMPLETE) {
            Object.keys(this.questProgress).forEach((key) => {
                var subQuest:QuestProgress = this.questProgress[key];
                pck.questProgress.push({
                    ID: subQuest.ID,
                    counter: subQuest.counter
                });
            });
        }

        return pck;
    }

    public buildUpdateNetMsg():any {
        var pck;
        pck = {
            ID: this.ID,
            questType: this.questType,
            questStatus: this.questStatus,
            updateTime: this.updateTime,
            questProgress: []
        };
        if (this.questStatus !== QuestDef.STATUS.COMPLETE) {
            Object.keys(this.questProgress).forEach((key) => {
                var subQuest:QuestProgress = this.questProgress[key];
                if (subQuest.isChanged()) {
                    pck.questProgress.push({
                        ID: subQuest.ID,
                        counter: subQuest.counter
                    });
                }
            });
        }
        return pck;
    }

    public buildDBMsg():any {
        var pck = {
            ID: this.ID,
            questType: this.questType,
            questStatus: this.questStatus,
            updateTime: this.updateTime,
            arenaTournamentID: this.arenaTournamentID,
            questProgress: []
        };
        Object.keys(this.questProgress).forEach((key) => {
            var subQuest:QuestProgress = this.questProgress[key];
            pck.questProgress.push({
                ID: subQuest.ID,
                counter: subQuest.counter
            });
        });
        return pck;
    }

    public loadDBMsg(msg:any):void {
        this.ID = msg.ID;
        this.questType = msg.questType;
        this.questStatus = msg.questStatus;
        this.updateTime = msg.updateTime || 0;
        this.arenaTournamentID = msg.arenaTournamentID || 0;
        this.questProgress = {};
        if (msg.questProgress) {
            msg.questProgress.forEach((item:{ID:number; counter:number}) => {
                try {
                    var config = cm.subtaskdb.get(item.ID);
                    var subQuest = new QuestProgress(this.ID, config.ID, config.type, config.JSON_param, config.count);
                    subQuest.counter = item.counter;
                    this.questProgress[item.ID] = subQuest;
                } catch (err) {
                    log.sError('Quest', 'QuestNotFound, ID=' + item.ID);
                }
            });
        }
    }
}
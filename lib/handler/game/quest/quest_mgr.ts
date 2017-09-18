import pb = require('node-protobuf-stream');

import QuestStruct = require('./quest_struct');
import QuestDef = require('./defines');
import QuestGlobalMgr = require('./quest_global_mgr');

import AchievementDef = require('../achievement/defines');

import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Time = require('../../../util/time');
//import Role = require('../role');
import log = require('../../../util/log');

import ArenaGlobalMgr = require('../arena/arena_global_mgr');

var cm = require('../../../config').configMgr;

class QuestMgr {

    // store data
    quests:{[ID:number]:QuestStruct.Quest} = {};
    //completeQuests:{[ID:number]:QuestStruct.CompleteQuest} = {};

    // memory data
    maxuid:number = 0;
    questProgressByType:{[questType:number]:Array<QuestStruct.QuestProgress>} = {};
    changeMask:{[uid:number]:boolean} = {};

    public readQuest(role, ID:number):void {
        var quest = this.getQuest(ID);
        quest.questStatus = QuestDef.STATUS.READ;
        quest.updateTime = Time.gameNow();
        this.changeMask[quest.ID] = true;

        this.checkQuestComplete(role, quest);
    }

    // 只做单纯的完成任务流程，奖励在上次调用接口处理
    public completeQuest(role, ID:number):void {
        var quest = this.getQuest(ID);
        if (quest.canComplete()) {
            quest.questStatus = QuestDef.STATUS.COMPLETE;
            quest.updateTime = Time.gameNow();
            this.changeMask[quest.ID] = true;

            role.achievements.updateAchievement(role, AchievementDef.TYPE.COMPLETE_N_QUEST, 1);

            // 加新任务
            var nextQuestList = this.getNextQuestList(role.level, quest.ID);
            nextQuestList.forEach((ID) => {
                var newQuest = this.addQuest(ID);
                this.checkQuestComplete(role, newQuest);
            });
        }
    }

    public getCompleteQuestCount():number {
        var sum = 0;
        Object.keys(this.quests).forEach((key) => {
            var quest = this.quests[key];
            if (quest.questStatus === QuestDef.STATUS.COMPLETE) sum += 1;
        });
        return sum;
    }

    public deleteQuest(ID:number):void {
        var quest = this.getQuest(ID);
        if (quest && quest.questType === QuestDef.TYPE.LIMIT_TIME) { // 只有限时任务才可以删除
            Object.keys(quest.questProgress).forEach((key) => {
                var element = quest.getQuestProgress(key);
                if (this.questProgressByType[element.questType]) {
                    var tmp = this.questProgressByType[element.questType].filter((value:QuestStruct.QuestProgress) => {
                        return value.refQuestID !== ID;
                    });
                    if (tmp.length > 0) {
                        this.questProgressByType[element.questType] = tmp;
                    } else {
                        delete this.questProgressByType[element.questType];
                    }
                }
            });
        }
    }

    // 上线检查判断是否完成任务
    public checkAllQuests(role) {
        for (var i = 0; i < QuestDef.CriteriaType.MAX; ++i) {
            this.checkQuestByType(role, i);
        }
    }

    private checkQuestComplete(role, quest:QuestStruct.Quest):void {
        Object.keys(quest.questProgress).forEach((ID) => {
            var progress:QuestStruct.QuestProgress = quest.getQuestProgress(ID);
            this.checkQuestByType(role, progress.questType);
        });
    }

    private checkQuestByType(role, questType:QuestDef.CriteriaType):void {
        switch (questType) {
            case QuestDef.CriteriaType.OWN_N_BUILD:
            case QuestDef.CriteriaType.OWN_N_BUILD_WITH_LEVEL:
                this.checkQuestByQuestProgress(questType, (progress) => {
                    this.updateQuest(role, questType, progress.questParam);
                });
                break;
            default :
                this.updateQuest(role, questType, null);
                break;
        }
    }

    private checkQuestByQuestProgress(questType:QuestDef.CriteriaType, callback:(progress:QuestStruct.QuestProgress)=>void):void {
        var progressList = this.questProgressByType[questType];
        if (progressList) {
            progressList.forEach((progress) => {
                callback(progress);
            });
        }
    }

    public updateQuest(role, questType:QuestDef.CriteriaType, param:any, value?:number):void {
        var progressList = this.questProgressByType[questType];
        if (!progressList) {
            return ;
        }
        progressList.forEach((progress:QuestStruct.QuestProgress):void => {
            if (progress.isComplete()) {
                return;
            }

            if (param && !progress.meets(role, param)) {
                return ;
            }

            var quest = this.getQuest(progress.refQuestID);
            if (!quest.hasRead()) return ;

            if (quest.questType === QuestDef.TYPE.LIMIT_TIME) {
                if (quest.arenaTournamentID !== ArenaGlobalMgr.arenaTournament.tournamentId ||
                    Time.gameNow() >= ArenaGlobalMgr.arenaTournament.endTime) {
                    return ;
                }
            }

            switch (progress.questType) {
                case QuestDef.CriteriaType.NULL:
                    if (!value) return ;
                    break;
                case QuestDef.CriteriaType.EARN_N_ARENA_WIN_STREAK:
                    if (!value) return ;
                    this.setProgress(progress, value, QuestDef.PROGRESS.SET);
                    break;
                case QuestDef.CriteriaType.FUSE_EQUIP_A_B_N_COUNT:
                case QuestDef.CriteriaType.CRAFT_N_EQUIP_A:
                case QuestDef.CriteriaType.EARN_N_RES_ID:
                case QuestDef.CriteriaType.COLLECT_GOLD_IN_BUILD_A:
                case QuestDef.CriteriaType.KILL_MONSTER_TYPE_A_IN_CHAPTER_B_N_COUNT:
                case QuestDef.CriteriaType.STAGE_PASS_N_COUNT:
                case QuestDef.CriteriaType.OPEN_CHANCE_CHEST_ID_N_COUNT:
                case QuestDef.CriteriaType.HIRE_FRIEND_N_FIGHT:
                case QuestDef.CriteriaType.TAKE_PART_IN_N_ARENA_FIGHT:
                case QuestDef.CriteriaType.TAKE_PART_IN_N_FRIEND_PVP_FIGHT:
                case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT:
                case QuestDef.CriteriaType.WIN_N_FRIEND_PVP_FIGHT:
                case QuestDef.CriteriaType.EARN_N_ARENA_POINT:
                case QuestDef.CriteriaType.TAKE_PART_IN_N_ARENA_FIGHT_WITH_REVENGE:
                case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_REVENGE:
                case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITHOUT_X_ELEMENT:
                case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_X_ELEMENT:
                case QuestDef.CriteriaType.DEFEAT_N_OPPONENT_WITH_HIGHER_RANK:
                case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_SLAY:
                case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_NO_DEAD:
                case QuestDef.CriteriaType.EARN_N_EQUIP_WITH_LEVEL:
                    if (!value) return ;
                    this.setProgress(progress, value, QuestDef.PROGRESS.ACCUMULATE);
                    break;
                case QuestDef.CriteriaType.OWN_N_AREA:
                case QuestDef.CriteriaType.EARN_N_FRIEND:
                case QuestDef.CriteriaType.EARN_N_FRIEND_REFER_BONUS:
                    if (!value) return ;
                    this.setProgress(progress, value, QuestDef.PROGRESS.HIGHEST);
                    break;
                case QuestDef.CriteriaType.UNLOCK_CHAPTER:
                    this.setProgress(progress, role.dungeons.completeHighestStageID, QuestDef.PROGRESS.SET);
                    break;
                case QuestDef.CriteriaType.OWN_N_BUILD:
                    var buildID = progress.questParam[0];
                    if (buildID) this.setProgress(progress, role.builds.getHasBuiltCount(buildID), QuestDef.PROGRESS.SET);
                    break;
                case QuestDef.CriteriaType.OWN_N_BUILD_WITH_LEVEL:
                    var buildID = progress.questParam[0],
                        level = progress.questParam[1];
                    if (buildID && level >= 0) {
                        this.setProgress(progress, role.builds.getBuildCountOverLevel(buildID, level), QuestDef.PROGRESS.SET);
                    }
                    break;
            }

            if (progress.isChanged()) {
                this.changeMask[progress.refQuestID] = true;
            }
        });

        Object.keys(this.changeMask).forEach((key) => {
            try {
                var questID = parseInt(key);
                var quest = this.getQuest(questID);
                if (quest.canComplete()) {

                    switch (quest.questType) {
                        case QuestDef.TYPE.NORMAL: {
                        }
                    }

                    // 设置可完成
                    if (quest.questStatus < QuestDef.STATUS.CAN_COMPLETE) {
                        quest.questStatus = QuestDef.STATUS.CAN_COMPLETE;
                        quest.updateTime = Time.gameNow();
                    }
                }
            } catch (err) {
                if (err instanceof CustomError.UserError) {
                    log.uError(role.accountId, 'Quest', 'error_code=%d,content=%s', err.errorId, err.message || 'NoMsg');
                } else {
                    log.sError('Quest', 'caught nonCustomError: ' + err.stack);
                }
            }
        });
    }

    public addQuest(ID:number):QuestStruct.Quest {
        var config = cm.questdb.get(ID);
        var quest = new QuestStruct.Quest(),
            questType = config.questType === 0 ? QuestDef.TYPE.NORMAL : QuestDef.TYPE.LIMIT_TIME;
        if (questType === QuestDef.TYPE.LIMIT_TIME &&
            ArenaGlobalMgr.arenaTournament.tournamentId !== config.arenaTourID) {
            return null;
        }

        quest.initQuest(ID, questType, config.arenaTourID);

        var i, subQuest;
        for (i = 0; i < config.JSON_achiParam.length; i += 1) {
            subQuest = cm.subtaskdb.get(config.JSON_achiParam[i]);
            quest.addQuestProgress(subQuest);
        }

        this.quests[quest.ID] = quest;
        this.changeMask[quest.ID] = true;

        this.classifyQuest(quest);
        return quest;
    }

    public hasQuest(ID:number):boolean {
        return !!this.quests[ID];
    }

    public getQuest(ID:any):QuestStruct.Quest {
        var quest = this.quests[ID];
        if (!quest) {
            throw new CustomError.UserError(ERRC.QUEST.ID_NOT_FOUND, {
                msg: 'QUEST.ID_NOT_FOUND, ID=' + ID
            });
        }
        return quest;
    }

    //public deleteQuest(uid:number) {
    //    delete this.quests[uid];
    //}

    // 分类子任务
    public classifyQuest(quest:QuestStruct.Quest):void {
        Object.keys(quest.questProgress).forEach((key) => {
            var element = quest.getQuestProgress(key);
            if (!this.questProgressByType[element.questType]) {
                this.questProgressByType[element.questType] = [element];
            } else {
                this.questProgressByType[element.questType].push(element);
            }
        });
    }

    public buildInitNetMsg():any {
        var pck = {quest: []};
        Object.keys(this.quests).forEach((key) => {
            var progress = this.quests[key];
            pck.quest.push(progress.buildInitNetMsg());
        });
        this.changeMask = {};
        var M = pb.get('.Api.quest.initQuest.Notify');
        return new M(pck);
    }

    public buildUpdateNetMsg():any {
        var pck = {questUpdate: []},
            needUpdate = false;
        var that = this;
        Object.keys(this.changeMask).forEach((key) => {
            var progress = that.quests[key];
            if (progress) {
                needUpdate = true;
                pck.questUpdate.push(progress.buildUpdateNetMsg());
            }
        });
        this.changeMask = {};
        if (needUpdate) {
            var M = pb.get('.Api.quest.updateQuest.Notify');
            return new M(pck);
        }
        return null;
    }

    public sendUpdatePacket(role):void {
        role.sendPacket(this.buildUpdateNetMsg());
    }

    public checkQuestByLevel(beforeLevel:number, afterLevel:number):void {
        var nextList:{ID:number; preID:number}[] = QuestGlobalMgr.getQuestListByLevelRegion(beforeLevel, afterLevel);
        nextList.forEach((item) => {
            if (!this.quests[item.ID]) {
                if (item.preID) {
                    var quest = this.quests[item.preID];
                    if (!quest || quest.questStatus !== QuestDef.STATUS.COMPLETE) {  // 前置任务未完成
                        return ;
                    }
                }
                this.addQuest(item.ID);
            }
        });
    }

    private setProgress(progress:QuestStruct.QuestProgress, value:number, progressType:QuestDef.PROGRESS) {
        var newValue = 0;
        switch (progressType) {
            case QuestDef.PROGRESS.SET:
                newValue = value;
                break;
            case QuestDef.PROGRESS.ACCUMULATE:
                newValue = Number.MAX_VALUE - progress.counter > value ? progress.counter + value : Number.MAX_VALUE;
                break;
            case QuestDef.PROGRESS.HIGHEST:
                newValue = progress.counter > value ? progress.counter : value;
                break;
            default:
                return;
        }

        if (newValue === progress.counter) {
            return;
        }

        progress.counter = newValue;
        progress.changed = true;
        progress.updateTime = Time.gameNow();
    }

    private getNextQuestList(level:number, completeQuestID:number):number[] {
        var result:number[] = [];
        var nextList:number[] = QuestGlobalMgr.getNextQuestList(completeQuestID);
        nextList.forEach((next) => {
            var config = cm.questdb.get(next);
            if (level >= config.unlockLV) {
                result.push(config.ID);
            }
        });
        return result;
    }

    public resetQuest(ID:number):void {
        var quest = this.getQuest(ID);
        if (quest) {
            quest.resetProgress();
            this.changeMask[ID] = true;
        }
    }

    public autoCompleteQuest(ID:number):void {
        var quest = this.getQuest(ID);
        if (quest) {
            quest.autoCompleteProgress();
            this.changeMask[ID] = true;
        }
    }

    public buildDBMsg():any {
        var quests = pb.get('.DB.quests');
        var pck = new quests();
        Object.keys(this.quests).forEach((ID) => {
            var quest = this.getQuest(ID);
            pck.quests.push(quest.buildDBMsg());
        });
        return pck;
    }

    public loadDBMsg(msg:any):void {
        var i, quest;
        for (i = 0; i < msg.quests.length; ++i) {
            quest = new QuestStruct.Quest();
            quest.loadDBMsg(msg.quests[i]);

            if (quest.questType === QuestDef.TYPE.LIMIT_TIME &&
                (ArenaGlobalMgr.arenaTournament.tournamentId !== quest.arenaTournamentID)) {
                continue;
            }
            this.quests[quest.ID] = quest;

            if (quest.questStatus !== QuestDef.STATUS.COMPLETE) {
                this.classifyQuest(quest);
            }
        }
    }
}

export = QuestMgr;
import pb = require('node-protobuf-stream');

// src/util
import Time = require('../../../util/time');
import Util = require('../../../util/game_util');

// src/gameserver
import Role = require('../role');

// src/handler/api/achievement
import achGlobalMgr = require('./achievement_global_mgr');
import AchievementDef = require('./defines');

class AchievementProgress {
    ID:number = 0;
    counter:number = 0;
    updateTime:number = 0;
    changed:boolean = false;

    constructor(ID:number) {
        this.ID = ID;
    }
}

class CompleteAchievement {
    ID:number = 0;
    completeTime:number = 0;
    status:number = 0;
}

class AchievementMgr {

    mapProgress:{[ID:number]:AchievementProgress} = {};      // AchievementProgress: { ID, counter, updateTime, changed }
    mapCompleteAchievements:{[ID:number]:CompleteAchievement} = {};  // CompleteAchievement: {  ID, completeTime, gainReward  }

    updateMask:{[ID:number]:boolean} = {};

    public initMgr():void {
        this.mapProgress = {};
        this.mapCompleteAchievements = {};
    }

    public buildInitNetMsg():any {
        var key, progress, pck = { achProgress: [] };
        for (key in this.mapProgress) {
            progress = this.mapProgress[key];
            pck.achProgress.push({
                ID: progress.ID,
                counter: progress.counter,
                updateTime: progress.updateTime,
                status: this.getProgressStatus(progress.ID)
            });
            progress.changed = false;
        }
        this.updateMask = {};
        var Message = pb.get('.Api.achievement.initAchievement.Notify');
        return new Message(pck);
    }

    public buildUpdateNetMsg():any {
        var progress, pck = {achProgress: []}, needUpdate = false;

        Object.keys(this.updateMask).forEach((key) => {
            progress = this.mapProgress[key];
            if (progress.changed) {
                pck.achProgress.push({
                    ID: progress.ID,
                    counter: progress.counter,
                    updateTime: progress.updateTime,
                    status: this.getProgressStatus(progress.ID)
                });
                progress.changed = false;
                needUpdate = true;
            }
        });
        if (needUpdate) {
            var Message = pb.get('.Api.achievement.updateAchievement.Notify');
            return new Message(pck);
        }
        this.updateMask = {};
        return null;
    }

    public sendUpdatePacket(role:Role):void {
        role.sendPacket(this.buildUpdateNetMsg());
    }

    public buildDBMsg():any {
        var Achievements = pb.get('.DB.achievements');
        var key, pck = new Achievements();
        for (key in this.mapProgress) {
            pck.achProgress.push(this.mapProgress[key]);
        }

        for (key in this.mapCompleteAchievements) {
            pck.completeAch.push(this.mapCompleteAchievements[key]);
        }

        return pck;
    }

    public loadDBMsg(msg:any):void {
        var i, progress, achievement;
        this.initMgr();
        for (i = 0; i < msg.achProgress.length; i += 1) {
            progress = msg.achProgress[i];
            if (progress.ID) {
                this.mapProgress[progress.ID] = progress;
            }
        }
        for (i = 0; i < msg.completeAch.length; i += 1)
        {
            achievement = msg.completeAch[i];
            if (achievement.ID) {
                this.mapCompleteAchievements[achievement.ID] = achievement;
            }
        }
    }

    public getProgressStatus(progressID:number):number {
        var complete = this.mapCompleteAchievements[progressID];
        return !complete ? AchievementDef.PROGRESS_STATUS.DOING :
            (complete.status === AchievementDef.COMPLETE_STATUS.NOT_READ ? AchievementDef.PROGRESS_STATUS.NOT_READ :
                AchievementDef.PROGRESS_STATUS.FINISHED);
    }

    public resetAchievement(role:Role):void {
        this.mapCompleteAchievements = null;
        this.mapProgress = null;
        this.checkAllAchievement(role);
    }

    public readAchievement(achievementID:number) {
        var progress = this.mapProgress[achievementID];
        if (progress) {
            progress.changed = true;
            var complete = this.mapCompleteAchievements[achievementID];
            if (complete) {
                complete.status = AchievementDef.COMPLETE_STATUS.HAS_READ;
            }
            this.updateMask[progress.ID] = true;
        }
    }

    public isCompleteAchievement(achievementID:number) {
        return !!this.mapCompleteAchievements[achievementID];
    }

    public checkAllAchievement(role:Role):void {
        Object.keys(this.mapProgress).forEach((ID) => {
            var progress = this.mapProgress[ID];
            if (progress.counter < 0) {
                progress.counter = 0;
            }
        });
        for (var i = 0; i < AchievementDef.TYPE.TYPE_COUNT; i += 1) {
            this.updateAchievement(role, i);
        }
    }

    public updateAchievement(role:Role, achievementType:number, value1?:number, value2?:number):void {
        var achievementEntryList = achGlobalMgr.getAchievementArrayByType(achievementType), i,
            achievementEntry;
        for (i = 0; i < achievementEntryList.length; i += 1) {
            achievementEntry = achievementEntryList[i];
            if (!this._canUpdateAchievement(achievementEntry)) {
                continue;
            }

            switch (achievementType) {
                case AchievementDef.TYPE.ROLE_LEVEL:
                {
                    if (!value1) {
                        value1 = role.level;
                    }
                    this._setProgress(achievementEntry, value1, AchievementDef.PROGRESS.SET);
                    break;
                }
                    // 无限定条件，累计
                case AchievementDef.TYPE.COMPLETE_N_QUEST:
                case AchievementDef.TYPE.DEFEAT_N_FRIEND:
                case AchievementDef.TYPE.ENTER_BUILD_N_COUNT:
                case AchievementDef.TYPE.CRAFT_N_EQUIP:
                case AchievementDef.TYPE.FUSE_N_COUNT:
                case AchievementDef.TYPE.GAME_FOR_N_HOUR:
                case AchievementDef.TYPE.CONSUME_GOLD_ON_EQUIP:
                case AchievementDef.TYPE.CONSUME_GOLD_ON_BUILD:
                case AchievementDef.TYPE.ENHANCE_EQUIP_N_COUNT:
                case AchievementDef.TYPE.WIN_N_ARENA_BATTLES:
                case AchievementDef.TYPE.EARN_N_ARENA_POINT:
                case AchievementDef.TYPE.HIRE_FRIEND_FOR_N_BATTLE:
                case AchievementDef.TYPE.WIN_N_BATTLES:
                case AchievementDef.TYPE.PURCHASE_DIAMOND_ONCE:
                {
                    if (!value1) {
                        continue;
                    }
                    this._setProgress(achievementEntry, value1, AchievementDef.PROGRESS.ACCUMULATE);
                    break;
                }
                case AchievementDef.TYPE.SPECIFY_RESOURCE_ALL_CONSUME:
                case AchievementDef.TYPE.EARN_N_ITEM:
                case AchievementDef.TYPE.OPEN_CHANCE_CHEST_N_COUNT:
                case AchievementDef.TYPE.KILL_MONSTER_N_COUNT:
                case AchievementDef.TYPE.CRAFT_N_EQUIP_WITH_M_START:
                case AchievementDef.TYPE.EARN_N_EQUIP_WITH_M_STAR:
                {
                    // value1: id , value2: count
                    if (!value1) {
                        continue;
                    }
                    if (value1 === achievementEntry.param) {
                        this._setProgress(achievementEntry, value2, AchievementDef.PROGRESS.ACCUMULATE);
                    }
                    break;
                }
                case AchievementDef.TYPE.LEVEL_MAX_ON_EQUIP_WITH_STAR_A_OR_B:
                {
                    if (!value1) {
                        continue;
                    }
                    if (value1 === achievementEntry.param % 100 || value1 === Math.floor(achievementEntry.param / 100)) {
                        this._setProgress(achievementEntry, value2, AchievementDef.PROGRESS.ACCUMULATE);
                    }
                    break;
                }
                case AchievementDef.TYPE.LOGIN_IN_SERIES_N_DAYS:
                case AchievementDef.TYPE.DAMAGE_ON_ONE_ENEMY:
                case AchievementDef.TYPE.EARN_N_STREAK:
                {
                    if (!value1) {
                        continue;
                    }
                    this._setProgress(achievementEntry, value1, AchievementDef.PROGRESS.HIGHEST);
                    break;
                }
                case AchievementDef.TYPE.UNLOCK_N_CHAPTER:
                {
                    if (!value1) {
                        value1 = role.dungeons.getCompleteMaxChapter();
                    }
                    this._setProgress(achievementEntry, value1, AchievementDef.PROGRESS.HIGHEST);
                    break;
                }
                case AchievementDef.TYPE.HAVE_N_AREA:
                {
                    if (!value1) {
                        value1 = role.builds.getHaveOpenAreaCount();
                    }
                    this._setProgress(achievementEntry, value1, AchievementDef.PROGRESS.HIGHEST);
                    break;
                }
                case AchievementDef.TYPE.CRAFT_N_EQUIP_WITH_ELEMENT:
                {
                    if (!value1) {
                        continue;
                    }
                    if (value1[0] === achievementEntry.param || value1[1] === achievementEntry.param) {
                        this._setProgress(achievementEntry, value2, AchievementDef.PROGRESS.ACCUMULATE);
                    }
                    break;
                }
            }

            if (this._isCompleteAchievement(achievementEntry)) {
                this._CompleteAchievement(achievementEntry);
            }
        }
    }

    public hasAchieved(achievementID:number):boolean {
        return !this.mapCompleteAchievements[achievementID];
    }

    private _getProgress(entry:achGlobalMgr.AchievementEntry):AchievementProgress {
        var ID = entry.ID;
        if (this.mapProgress.hasOwnProperty(ID.toString())) {
            return this.mapProgress[ID];
        } else {
            return null;
        }
    }

    private _createProgress(ID:number):AchievementProgress {
        if (!this.mapProgress[ID]) {
            this.mapProgress[ID] = new AchievementProgress(ID);
        }
        return this.mapProgress[ID];
    }

    public _setProgress(entry:achGlobalMgr.AchievementEntry, value:number, progressType:number):void {
        var progress = this._getProgress(entry);
        if (!progress) {
            progress = this._createProgress(entry.ID);
            progress.counter = value;
        } else {
            var newValue = 0;
            switch (progressType) {
                case AchievementDef.PROGRESS.SET:
                    newValue = value;
                    break;
                case AchievementDef.PROGRESS.ACCUMULATE:
                    newValue = Number.MAX_VALUE - progress.counter > value ? progress.counter + value : Number.MAX_VALUE;
                    break;
                case AchievementDef.PROGRESS.HIGHEST:
                    newValue = progress.counter > value ? progress.counter : value;
                    break;
                default:
                    return;
            }
            if (newValue === progress.counter) {
                return;
            }
            progress.counter = newValue;
        }

        progress.changed = true;
        progress.updateTime = Time.gameNow();

        this.updateMask[progress.ID] = true;
    }

    public _removeProgress(entry:achGlobalMgr.AchievementEntry):void {
        delete this.mapProgress[entry.ID];
    }

    public _CompleteAchievement(entry:achGlobalMgr.AchievementEntry):void {
        this.mapCompleteAchievements[entry.ID] = {
            ID: entry.ID,
            completeTime: Time.gameNow(),
            status: AchievementDef.COMPLETE_STATUS.NOT_READ
        };
    }

    public _isCompleteAchievement(entry:achGlobalMgr.AchievementEntry):boolean {
        var progress = this._getProgress(entry);
        if (!progress) {
            return false;
        }

        switch (entry.requiredType) {
            default:
                return progress.counter >= entry.count;
        }
    }

    public _canUpdateAchievement(entry:achGlobalMgr.AchievementEntry):boolean {
        return !this._isCompleteAchievement(entry);
    }
}


export = AchievementMgr;
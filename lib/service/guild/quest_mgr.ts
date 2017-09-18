import pb = require('node-protobuf-stream');

import CE = require('../../util/errors');
import ERRC = require('../../util/error_code');
import Time = require('../../util/time');
import log = require('../../util/log');
import DB = require('../../database/database_manager');
import ConfigStruct = require("../../config/struct/config_struct");

import Guild = require('./guild');
import QuestDef = require('./defines');
import GuildMgr = require('./guild_service_mgr');

var cm = require('../../config').configMgr;

class GuildQuestMgr {

    // store data
    quests:{[ID:number]:Guild.GuildQuest} = {};
    questProgressByType:{[questType:number]:Guild.GuildQuest[]} = {};
    completeQuestIDList:number[] = [];

    public initGuildQuest(guild:Guild.Guild) {
        this.addGuildQuest(0,guild);
    }

    public addGuildQuest(completeQuestID:number, guild:Guild.Guild):void {
        Object.keys(cm.guild_taskdb.all()).forEach((ID) => {
            var config = cm.guild_taskdb.get(parseInt(ID));

            if (this.completeQuestIDList.indexOf(config.ID) < 0 && !this.quests[config.ID]) {
                if ((completeQuestID === config.preQuestID || config.preQuestID === 0) && guild.level >= config.unlockLv) {
                    if(config.JSON_param)
                        this.quests[config.ID] = new Guild.GuildQuest(config.ID, config.type, config.JSON_param, config.count, config.guildEXP);
                    else
                        this.quests[config.ID] = new Guild.GuildQuest(config.ID, config.type, [], config.count, config.guildEXP);

                    if (this.questProgressByType[config.type]) {
                        this.questProgressByType[config.type].push(this.quests[config.ID]);
                    }
                    else {
                        this.questProgressByType[config.type] = [];
                        this.questProgressByType[config.type].push(this.quests[config.ID]);
                    }
                }
            }
        });
    }

    public deleteGuildQuest(completeQuestID:number):void {
        if (!this.quests[completeQuestID]) {
            throw  new CE.UserError(ERRC.GUILD.QUEST_NOT_EXISIT, {
                msg: 'CE.UserError(ERRC.GUILD.QUEST_NOT_EXISIT, questID=' + completeQuestID
            });
        }
        if (!this.questProgressByType[this.quests[completeQuestID].questType]) {
            throw  new CE.UserError(ERRC.GUILD.QUEST_TYPE_NOT_EXISIT, {
                msg: 'CE.UserError(ERRC.GUILD.QUEST_TYPE_NOT_EXISIT, questType=' + this.quests[completeQuestID].questType
            });
        }

        var num = this.questProgressByType[this.quests[completeQuestID].questType].indexOf(this.quests[completeQuestID]);
        if (num>=0){
            this.questProgressByType[this.quests[completeQuestID].questType].splice(num,1);
        }
        delete this.quests[completeQuestID];
    }

    public completeGuildQuest(completeQuestID:number, guild:Guild.Guild):void {
        if (!this.quests[completeQuestID].isComplete()) {
            throw new CE.UserError(ERRC.GUILD.GUILD_QUEST_NOT_FINISH, {
                msg: 'ERRC.GUILD.GUILD_QUEST_NOT_FINISH, questID=' + completeQuestID
                + ', progress=' + this.quests[completeQuestID].counter + ', requireCount='
                + this.quests[completeQuestID].requireCount
            });
        }

        GuildMgr.addExperience(guild, this.quests[completeQuestID].addExp);

        this.completeQuestIDList.push(completeQuestID);

        // set current quest complete
        this.deleteGuildQuest(completeQuestID);
        // add new quest
        this.addGuildQuest(completeQuestID, guild);
    }

    public updateGuildQuestProgress(questID:number, value:number, guild:Guild.Guild, progressType:QuestDef.PROGRESS) {
        if (!this.quests[questID]) {
            throw  new CE.UserError(ERRC.GUILD.QUEST_NOT_EXISIT, {
                msg: 'CE.UserError(ERRC.GUILD.QUEST_NOT_EXISIT, questID=' + questID
            });
        }

        this.quests[questID].updateProgress(value, progressType);
        if (this.quests[questID].isComplete()) {
            this.completeGuildQuest(questID, guild);
        }
    }

    public getQuestByType(type:QuestDef.CriteriaType):Guild.GuildQuest[] {
        return this.questProgressByType[type];
    }

    public updateGuildQuest(type:QuestDef.CriteriaType, param:any, value:number, guild:Guild.Guild):void {
        var questList = this.getQuestByType(type);

        switch(type) {
            case QuestDef.CriteriaType.HIRE_FRIEND_N_FIGHT:
            case QuestDef.CriteriaType.TAKE_PART_IN_N_ARENA_FIGHT:
            case QuestDef.CriteriaType.TAKE_PART_IN_N_FRIEND_PVP_FIGHT:
            case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT:
            case QuestDef.CriteriaType.WIN_N_FRIEND_PVP_FIGHT:
            case QuestDef.CriteriaType.EARN_N_ARENA_POINT:
            case QuestDef.CriteriaType.FUSE_EQUIP_N_COUNT:
            case QuestDef.CriteriaType.COLLECT_GOLD_IN_BUILD:
            case QuestDef.CriteriaType.UPGRADE_BUILD_N_COUNT:
            case QuestDef.CriteriaType.UPGRADE_TECH_N_COUNT:
            case QuestDef.CriteriaType.KILL_MONSTER_BY_SLAY:
            case QuestDef.CriteriaType.KILL_KNIGHT_BY_SLAY:
            case QuestDef.CriteriaType.CONTRIBUTE_N_GOLD:
                if (questList) {
                    questList.forEach((quest:Guild.GuildQuest):void => {
                        this.updateGuildQuestProgress(quest.questID, value, guild, QuestDef.PROGRESS.ACCUMULATE);
                    });
                }
                break;
            case QuestDef.CriteriaType.EARN_N_RES_ID:
            case QuestDef.CriteriaType.CRAFT_A_STAR_N_COUNT:
            case QuestDef.CriteriaType.CRAFT_N_EQUIP_A:
            case QuestDef.CriteriaType.STAGE_PASS_N_COUNT:
            case QuestDef.CriteriaType.KILL_MONSTER_TYPE_A_IN_CHAPTER_B_N_COUNT:
            case QuestDef.CriteriaType.OPEN_CHANCE_CHEST_ID_N_COUNT:
                if (questList) {
                    questList.forEach((quest):void => {
                        var canUpdate = true;
                        if (quest.questParam.length === param.length) {
                            for (var i = 0; i < param.length; ++i) {
                                if (quest.questParam[i] !== param[i]) {
                                    canUpdate = false;
                                }
                            }
                        }
                        if (canUpdate) {
                            this.updateGuildQuestProgress(quest.questID, value, guild, QuestDef.PROGRESS.ACCUMULATE);
                        }
                    });
                }
                break;
            default:
                throw new CE.UserError(ERRC.GUILD.QUEST_TYPE_NOT_EXISIT, {
                    msg: 'ERRC.GUILD.QUEST_TYPE_NOT_EXISIT, questType=' + type
                });
        }
    }

    public updateGuildQuestDB(guild:Guild.Guild, done):void {
        var result = [];
        Object.keys(guild.guildQuest.quests).forEach((key:any) => {
            result.push({
                questID: parseInt(key),
                questType: guild.guildQuest.quests[parseInt(key)].questType,
                questParam: guild.guildQuest.quests[parseInt(key)].questParam,
                requireCount: guild.guildQuest.quests[parseInt(key)].requireCount,
                counter: guild.guildQuest.quests[parseInt(key)].counter,
                updateTime: guild.guildQuest.quests[parseInt(key)].updateTime,
                addExp: guild.guildQuest.quests[parseInt(key)].addExp
            });
        });

        var Type = pb.get('.DB.guildQuest');
        var proto = Type({
            questList: result
        });

        var questList = proto.encode().toBuffer();

        DB.Guild.updateGuild(
            guild.guildId,
            {quest: questList},
            done
        );
    }

    public gmGuildQuestMgr(guild:Guild.Guild, cmd:string, questID:number):void {
        switch (cmd) {
            case 'r':
            case 'reset':
                this.gmResetQuest(questID);
                break;
            case 'c':
            case 'complete':
                this.gmCompleteQuest(guild, questID);
                break;
            case 'a':
            case 'add':
                this.gmAddQuest(questID);
                break;
            case 'd':
            case 'del':
                this.gmDelQuest(questID);
                break;
        }
    }

    public gmResetQuest(questID:number):void {
        if (this.quests[questID]) {
            this.quests[questID].counter = 0;
            this.quests[questID].updateTime = Time.gameNow();
        }
    }

    public gmCompleteQuest(guild:Guild.Guild, questID:number):void {
        if (this.quests[questID]) {
            GuildMgr.addExperience(guild, this.quests[questID].addExp);
            this.completeQuestIDList.push(questID);

            // set current quest complete
            this.deleteGuildQuest(questID);
            // add new quest
            this.addGuildQuest(questID, guild);
        }
    }

    public gmAddQuest(questID:number):void {
        Object.keys(cm.guild_taskdb.all()).forEach((ID) => {
            var config = cm.guild_taskdb.get(parseInt(ID));

            if (!this.quests[config.ID] && questID === config.ID) {
                if(config.JSON_param)
                    this.quests[config.ID] = new Guild.GuildQuest(config.ID, config.type, config.JSON_param, config.count, config.guildEXP);
                else
                    this.quests[config.ID] = new Guild.GuildQuest(config.ID, config.type, [], config.count, config.guildEXP);

                if (this.questProgressByType[config.type]) {
                    this.questProgressByType[config.type].push(this.quests[config.ID]);
                }
                else {
                    this.questProgressByType[config.type] = [];
                    this.questProgressByType[config.type].push(this.quests[config.ID]);
                }
            }
        });
    }

    public gmDelQuest(questID:number):void {
        if (this.quests[questID]) {
            this.deleteGuildQuest(questID);
        }
    }
}

export = GuildQuestMgr;
import async = require('async');

import Time = require('../../util/time');
import CE = require('../../util/errors');
import ERRC = require('../../util/error_code');
import Util = require('../../util/game_util');

import Config = require('../../config');

import QuestDef = require('./defines');
import MemberMgr = require('./member_mgr');
import GuildQuestMgr = require('./quest_mgr');


/**
 * 公会成员级别
 * （重要）别忘记同步 Guild.Hierarchy [file cmd.proto]
 */
export enum Hierarchy {
    GUILD_MASTER = 1,
    OFFICER      = 2,
    MEMBER       = 3,
}

export enum NotifyType {
    NULL        = 0,
    KICKED      = 1,
    JOINED      = 2,
    APPOINTED   = 3,
    TECH_LEVEL  = 4,
    NEW_INVITE  = 5,
    NEW_PETITION = 6,
}

// 申请
export class Petition {
    accountId:number = 0;
    guildId:number = 0;
}

// 邀请
export class Invitation {
    accountId:number = 0;
    guildId:number = 0;
}


export class Member {
    accountId:number = 0;
    guildId:number = 0;
    hierarchy:Hierarchy = 0;  // 阶层
    contributeLevel:number = 1;
    contributeProgress:number = 0;
    totalContribute:number = 0;
    lastLeaveGuildTime:number = 0;

    public invitations:{[guildId:number]:Invitation} = {};
    public petitions:{[guildId:number]:Petition} = {};

    constructor(accountId:number) {
        this.accountId = accountId;
    }

    public addPetition(petition:Petition):void {
        this.petitions[petition.guildId] = petition;
    }

    public addInvitation(invite:Invitation) {
        this.invitations[invite.guildId] = invite;
    }

    public toNetMsg():any {
        return {
            accountId: this.accountId,
            hierarchy: this.hierarchy
        };
    }
}

export enum JoinType {
    CLOSED        = 0,
    OPEN          = 1,
    NEED_APPROVAL = 2,
}

export class Settings {
    announce:string = '';
    joinType:JoinType = JoinType.CLOSED;
    requireLevel:number = 0;

    public initCreate():void {
        this.joinType = JoinType.OPEN;
        this.requireLevel = 6;
    }

}

export class QuestProgress {
    questID:number = 0;      // 任务ID
    questType:number = 0;       // 任务类型
    questParam:number[] = null; // 任务参数
    requireCount:number = 0;    // 任务要求数量
    counter:number = 0;         // 已进行进度
    updateTime:number = 0;      // 更新时间

    constructor(questID:number, questType:number, questParam:any, questCount:number) {
        this.questID = questID;
        this.questType = questType;
        this.questParam = questParam;
        this.requireCount = questCount;
        this.counter = 0;
        this.updateTime = 0;
    }

    public isComplete():boolean {
        return this.counter >= this.requireCount;
    }

    public updateProgress(questID:number):void {
        if (this.isComplete()) return;
        this.counter++;
        this.updateTime = Time.gameNow();
    }
}

export class GuildQuest {
    questID:number = 0;      // 任务ID
    questType:number = 0;       // 任务类型
    questParam:number[] = []; // 任务参数
    requireCount:number = 0;    // 任务要求数量
    counter:number = 0;         // 已进行进度
    updateTime:number = 0;      // 更新时间
    addExp:number = 0;          // 增加经验值


    constructor(questID:number, questType:number, questParam:any, questCount:number, addExp:number) {
        this.questID = questID;
        this.questType = questType;
        this.questParam = questParam;
        this.requireCount = questCount;
        this.counter = 0;
        this.updateTime = 0;
        this.addExp = addExp;
    }

    public isComplete():boolean {
        return this.counter >= this.requireCount;
    }

    public updateProgress(value:number, progressType:QuestDef.PROGRESS):void {
        if (this.isComplete()) return;

        var newValue = 0;
        switch (progressType) {
            case QuestDef.PROGRESS.SET:
                newValue = value;
                break;
            case QuestDef.PROGRESS.ACCUMULATE:
                newValue = this.requireCount - this.counter > value ? this.counter + value : this.requireCount;
                break;
            case QuestDef.PROGRESS.HIGHEST:
                newValue = this.counter > value ? this.counter : value;
                break;
            default:
                return;
        }

        if (newValue === this.counter) {
            return;
        }

        this.counter = newValue;
        this.updateTime = Time.gameNow();
    }
}

class Badge {
    bottomIcon:number = 0;
    topIcon:number = 0;
    toString():string {
        return this.bottomIcon + ':' + this.topIcon;
    }
    loadString(str) {
        var icons = str.split(':');
        this.bottomIcon = parseInt(icons[0]);
        this.topIcon = parseInt(icons[1]);
    }
}

export class Guild {

    public guildId:number = 0;
    public leaderId:number = 0;
    public name:string = '';
    public bankMoney:number = 0;
    public createDate:number = 0;
    public level:number = 1;
    public exp:number = 0;
    public badge:Badge = new Badge();

    public settings:Settings = new Settings();

    public members:{[accountId:number]:Member} = {};
    public petitions:{[accountId:number]:Petition} = {};

    public technology:{[elementId:number]:number} = {};

    // memory
    public eventMaxId:number = 0;

    public guildQuest:GuildQuestMgr = new GuildQuestMgr();

    constructor() {
    }

    // 创建
    public create(guildId:number, name:string, badge:Badge):void {
        this.guildId = guildId;
        this.name = name;
        this.badge.bottomIcon = badge.bottomIcon;
        this.badge.topIcon = badge.topIcon;
        this.members = {};
        this.createDate = Time.gameNow();
        this.settings.initCreate();
        this.initTechnology();
        this.guildQuest.initGuildQuest(this);
    }

    //init technology function
    public initTechnology():void {
        Object.keys(Config.configMgr.guild_elementdb.all()).forEach((key:any) => {
            var config = Config.configMgr.guild_elementdb.get(key);
            this.technology[config.ID] = 1;
        });
    }

    //upgrade technology function
    public upgradeTechnology(elementId:number):void {
        this.technology[elementId] = this.technology[elementId] + 1;
    }


    // 解散公会
    protected disband():void {

    }

    public findMember(accountId:number):Member {
        return this.members[accountId];
    }

    public eachMember(handler:(member:Member, next)=>void, done) {
        async.each(
            Object.keys(this.members),
            (key, next) => {
                handler(this.members[key], next);
            },
            (err) => {
                done(err);
            }
        );
    }

    /**
     * 添加成员
     * @param member
     * @param hierarchy
     */
    public addMember(member:Member, hierarchy:number):void {
        member.guildId = this.guildId;
        member.hierarchy = hierarchy;
        this.members[member.accountId] = member;
    }

    public loadMember(member:Member):void {
        if (member.guildId !== this.guildId) return ;

        if (member.hierarchy === Hierarchy.GUILD_MASTER) {
            if (member.accountId !== this.leaderId) return ;
        }

        this.members[member.accountId] = member;
    }

    public deleteMember(accountId:number):void {
        delete this.members[accountId];
    }

    public setLeader(leader:Member):void {
        this.leaderId = leader.accountId;
        this.addMember(leader, Hierarchy.GUILD_MASTER);
    }

    public listMember():Member[] {
        var result:Member[] = [];
        Object.keys(this.members).forEach((key) => {
            result.push(this.members[key].toNetMsg());
        });
        return result;
    }

    public memberCount():number {
        return Object.keys(this.members).length;
    }

    // officer count
    public officerCount():number {
        var count:number = 0;
        Object.keys(this.members).forEach((key:any) => {
            if (this.members[key].hierarchy === Hierarchy.OFFICER)
                count++;
        });
        return count;
    }

    public addPetition(member:Member):void {
        var petition = new Petition();
        petition.accountId = member.accountId;
        petition.guildId = this.guildId;
        this.petitions[petition.accountId] = petition;
        member.addPetition(petition);
    }

    public hasMember(accountId:number):boolean {
        return !!this.members[accountId];
    }

    public hasPetition(accountId:number):boolean {
        return !!this.petitions[accountId];
    }

    public deletePetition(accountId:number):void {
        delete this.petitions[accountId];
    }

    public deleteAllPetition():void {
        this.petitions = {};
    }

    public findPetition(accountId:number):Petition {
        return this.petitions[accountId];
    }

    public listPetition():Petition[] {
        var result:Petition[] = [];
        Object.keys(this.petitions).forEach((key) => {
            result.push(this.petitions[key]);
        });
        return result;
    }

    public briefInfo():any {
        return {
            guildId     : this.guildId,
            name        : this.name,
            memberCount : this.memberCount(),
            joinType    : this.settings.joinType,
            requireLevel: this.settings.requireLevel,
            level       : this.level,
            badge       : this.badge
        };
    }

    public detailInfo():any {
        return {
            briefInfo: this.briefInfo(),
            memberList: this.listMember(),
            announce: this.settings.announce
        };
    }

    public buildDBObj():any {
        return Util.extend({
            guildId: this.guildId,
            name: this.name,
            leaderId: this.leaderId,
            createDate: this.createDate,
            bankMoney: this.bankMoney,
            level: this.level,
            badge: this.badge.toString()
        }, this.settings);
    }

    public saveAllMembers(done):void {
        var self = this;
        async.eachSeries(
            Object.keys(self.members),
            (key, next) => {
                var member:Member = self.members[key];
                MemberMgr.updateMember(member, next);
            },
            done
        );
    }
}
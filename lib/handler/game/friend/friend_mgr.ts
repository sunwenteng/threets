import pb = require('node-protobuf-stream');

import Enum = require('../../../util/enum');
import FriendDef = require('./defines');
import FriendStruct = require('./friend_struct');
//import CenterDB = require('../../../database/impl/center_db');
import Fight = require('../fight/fight');
import PvPFight = require('../fight/pvp_fight');
import Role = require('../role');
import RoleStruct = require('../role/role_struct');
import HeroDef = require('../hero/defines');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');
import FightDef = require('../fight/defines');
import Simulation = require('../fight/simulation');
import Time = require('../../../util/time');
import log = require('../../../util/log');
import ArenaDef = require('../arena/defines');
import AchievementDef = require('../achievement/defines');
import QuestDef = require('../quest/defines');
import HeroSuite = require('../hero/hero_suite');

class FriendMgr {

    // database
    fightHistory:{[friendId:number]:FriendStruct.FightHistory} = {};
    cacheHistory:FriendStruct.FightHistory[] = [];

    lastBattleTime:{[friendId:number]:number} = {};

    hireMgr:FriendStruct.HireMgr = null;

    referFriendCount:number = 0;
    gainReferRewardRecord:{[ID:number]:boolean} = {};

    // memory
    friendEntryList:FriendStruct.FriendEntry[] = [];
    friendIdIndex:{[friendId:number]:number} = {};
    friendIdMap:{[accountId:number]:boolean} = {};
    applicationIdMap:{[accountId:number]:boolean} = {};
    friendCount:number = 0;
    applicationCount:number = 0;

    pvpFight:PvPFight = null;

    constructor() {
        this.hireMgr = new FriendStruct.HireMgr();
    }

    public initData() {
        this.friendIdMap = {};
        this.applicationIdMap = {};
        this.friendEntryList = [];
        this.friendCount = this.applicationCount = 0;
    }

    public addFriend(entry, role:Role) {
        var data = new FriendStruct.FriendEntry();

        switch (entry.entryType) {
            case 'APPLICATION':
                this.applicationCount++;
                this.applicationIdMap[entry.accountId] = true;
                data.infoType = FriendDef.FRIEND_INFO_TYPE.APPLICATION;
                break;
            case 'FRIEND':
                this.friendCount++;
                this.friendIdMap[entry.accountId] = true;
                data.infoType = FriendDef.FRIEND_INFO_TYPE.FRIEND;
                break;
            default:
                return ;
        }

        data.accountId = role.accountId;
        data.level = role.level;
        data.username = role.username;

        var hero = role.heros.getHero(0);
        data.hairType = hero.hairType;
        data.hairColor = hero.hairColor;
        data.faceType = hero.faceType;
        data.skinColor = hero.skinColor;
        data.cape = hero.cape;

        var armorId = hero.getArmor(HeroSuite.SuiteType.dungeon);
        var armor = role.equips.getEquip(armorId);
        data.dungeonArmorID = armor.ID;
        data.dungeonArmorLevel = armor.level;

        armorId = hero.getArmor(HeroSuite.SuiteType.dungeon);
        armor = role.equips.getEquip(armorId);
        data.arenaArmorID = armor.ID;
        data.arenaArmorLevel = armor.level;

        armorId = hero.getArmor(HeroSuite.SuiteType.boss);
        armor = role.equips.getEquip(armorId);
        data.bossArmorID = armor.ID;
        data.bossArmorLevel = armor.level;

        data.equipAchievementID = role.getSundryValue(Enum.SUNDRY.ACHIEVEMENT_TITLE);

        var history = this.fightHistory[data.accountId];
        if (!history) {
            data.win = 0;
            data.loss = 0;
        } else {
            data.win = history.win;
            data.loss = history.loss;
        }

        this.friendEntryList.push(data);

    }

    public sort() {
        this.friendEntryList.sort((a:FriendStruct.FriendEntry, b:FriendStruct.FriendEntry):number => {
            if (a.infoType === b.infoType) {
                if (a.level === b.level) {
                    return a.username < b.username ? -1 : 1;
                }
                return a.level < b.level ? -1 : 1;
            }
            return a.infoType < b.infoType ? -1 : 1;
        });

        this.friendIdIndex = {};
        this.friendEntryList.forEach((entry, index) => {
            this.friendIdIndex[entry.accountId] = index;
        });
    }

    public loadFromCenterData(friendIdList, applicationIdList, playerInfoList:any[]) {
        this.friendIdMap = {};
        this.applicationIdMap = {};
        this.friendEntryList = [];

        this.friendCount = friendIdList.length;
        this.applicationCount = applicationIdList.length;

        friendIdList.forEach((friendId) => {
            this.friendIdMap[friendId] = true;
        });
        applicationIdList.forEach((applicationId) => {
            this.applicationIdMap[applicationId] = true;
        });

        playerInfoList.forEach((info:any) => {
            var entry = new FriendStruct.FriendEntry();
            if (this.friendIdMap[info.accountId]) {
                entry.infoType = FriendDef.FRIEND_INFO_TYPE.FRIEND;
            } else if (this.applicationIdMap[info.accountId]) {
                entry.infoType = FriendDef.FRIEND_INFO_TYPE.APPLICATION;
            }

            if (entry.infoType !== FriendDef.FRIEND_INFO_TYPE.NULL) {
                entry.accountId = info.accountId;
                entry.level = info.level;
                entry.username = info.username;
                entry.hairType = info.hairType;
                entry.hairColor = info.hairColor;
                entry.faceType = info.faceType;
                entry.skinColor = info.skinColor;
                entry.cape = info.cape;

                entry.dungeonArmorID = info.dungeonArmorID;
                entry.dungeonArmorLevel = info.dungeonArmorLevel;
                entry.arenaArmorID = info.arenaArmorID;
                entry.arenaArmorLevel = info.arenaArmorLevel;
                entry.bossArmorID = info.bossArmorID;
                entry.bossArmorLevel = info.bossArmorLevel;
                entry.equipAchievementID = info.achievementId;

                var history = this.fightHistory[info.accountId];
                if (!history) {
                    entry.win = 0;
                    entry.loss = 0;
                } else {
                    entry.win = history.win;
                    entry.loss = history.loss;
                }

                this.friendEntryList.push(entry);
            }
        });

        this.friendEntryList.sort((a:FriendStruct.FriendEntry, b:FriendStruct.FriendEntry):number => {
            if (a.infoType === b.infoType) {
                if (a.level === b.level) {
                    return a.username < b.username ? -1 : 1;
                }
                return a.level < b.level ? -1 : 1;
            }
            return a.infoType < b.infoType ? -1 : 1;
        });

        this.friendIdIndex = {};
        this.friendEntryList.forEach((entry, index) => {
            this.friendIdIndex[entry.accountId] = index;
        });
    }

    public getFriendCount():number {
        return this.friendCount;
    }

    public getHaveGainReferRewardCount():number {
        return Object.keys(this.gainReferRewardRecord).length;
    }

    public getApplicationCount():number {
        return this.applicationCount;
    }

    public buildFriendInfoNetMsg(entry:FriendStruct.FriendEntry):any {
        var pck:any = {
            accountId: entry.accountId,
            win: entry.win,
            loss: entry.loss,
            infoType: entry.infoType,
            equipAchievementID: entry.equipAchievementID,
            battleLeftCoolDown: this.getBattleCoolDown(entry.accountId)
        };

        var heroInfo = new RoleStruct.HeroInfo();
        heroInfo.loadFromFriendEntry(entry);
        pck.heroInfo = heroInfo;

        return pck;
    }

    public buildInitFriendEntryNetList():any[] {
        var msg:any[] = [];
        for (var i = 0; i < 10 && i < this.friendEntryList.length; ++i) {
            var one = this.buildFriendInfoNetMsg(this.friendEntryList[i]);
            if (one) {
                msg.push(one);
            }
        }
        return msg;
    }

    public buildPartFriendEntryNetList(start:number, end:number):any[] {
        var msg:any[] = [];
        if (start >= end) return msg;

        for (var i = start; i < end && i < this.friendEntryList.length; ++i) {
            var one = this.buildFriendInfoNetMsg(this.friendEntryList[i]);
            if (one) {
                msg.push(one);
            }
        }
        return msg;
    }

    public isFriend(accountId:number):boolean {
        return !!this.friendIdMap[accountId];
    }

    public acceptApplication(accountId:number):void {
        var index = this.friendIdIndex[accountId];
        if (index >= 0) {
            var entry = this.friendEntryList[index];
            if (entry && entry.accountId === accountId) {
                entry.infoType = FriendDef.FRIEND_INFO_TYPE.FRIEND;
                this.friendIdMap[accountId] = true;
                this.friendCount += 1;

                if (this.applicationIdMap[accountId]) {
                    this.applicationCount -= 1;
                }
                delete this.applicationIdMap[accountId];
            }
        }
    }

    public startFight(role:Role, friendId:number, fightTeam:RoleStruct.FightTeam):void {
        var cooldown = this.getBattleCoolDown(friendId);
        if (cooldown > 0) {
            throw new CustomError.UserError(ERRC.FRIEND.BATTLE_IN_CD, {
                msg: 'FRIEND.BATTLE_IN_CD, cooldown=' + cooldown
            });
        }

        this.pvpFight = new PvPFight(ArenaDef.PVP_FIGHT_TYPE.FRIEND);
        this.pvpFight.initFight(friendId, fightTeam, ArenaDef.ATTACK_TYPE.NORMAL_ATTACK);
        this.pvpFight.startFight();

        this.lastBattleTime[friendId] = Time.gameNow();

        role.quests.updateQuest(role, QuestDef.CriteriaType.TAKE_PART_IN_N_FRIEND_PVP_FIGHT, null, 1);
    }

    public finishFight(role:Role,
                       roundContext:Simulation.RoundContext,
                       totalRound:number,
                       result:number,
                       callback:(err, scoreResult)=>void):void {
        if (!this.pvpFight) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'FIGHT.FIGHT_NOT_EXIST'
            });
        }

        var team = role.arena.fightTeam, i, hero;
        var heroArray:Simulation.Player[] = [];
        for (i = 0; i < team.heros.length; i += 1) {
            hero = role.heros.getHero(team.heros[i]);
            if (!hero) {
                throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                    msg: 'HERO.UID_NOT_FOUND, uid=' + team.heros[i]
                });
            }
            heroArray.push(Fight.createPlayerByHero(role, hero, HeroSuite.SuiteType.arena));
        }

        this.pvpFight.finishFight(role.accountId, roundContext, heroArray, totalRound);
        this.pvpFight.checkFightResult(result);

        if (result === FightDef.RESULT.VICTORY) {
            role.quests.updateQuest(role, QuestDef.CriteriaType.WIN_N_FRIEND_PVP_FIGHT, null, 1);
            role.achievements.updateAchievement(role, AchievementDef.TYPE.DEFEAT_N_FRIEND, 1);
        }

        this.addFriendBattleHistory(this.pvpFight.opponentId, result);

        role.arena.handleFightResult(role, false, this.pvpFight, (err, scoreResult) => {
            callback(err, scoreResult);
        });
    }

    public getRandomSeed():string {
        return this.pvpFight ? this.pvpFight.getRandomSeed() : '';
    }

    public getPvPResult():FightDef.RESULT {
        return this.pvpFight.getResult();
    }

    public addFriendBattleHistory(friendId:number, result:FightDef.RESULT):void {
        if (!this.fightHistory[friendId]) this.fightHistory[friendId] = new FriendStruct.FightHistory();
        switch (result) {
            case FightDef.RESULT.FLEE:
            case FightDef.RESULT.LOSS:
                this.fightHistory[friendId].loss += 1;
                break;
            case FightDef.RESULT.VICTORY:
                this.fightHistory[friendId].win += 1;
                break;
            default:
                log.sError('FriendFight', 'unknown FightDef.RESULT, result=' + result);
                break;
        }
    }

    public getBattleCoolDown(friendId:number):number {
        var last = this.lastBattleTime[friendId];
        var now = Time.gameNow();
        return (!last || last + 86400 <= now) ? 0 : last + 86400 - now;
    }

    public getFriendEntry(friendId:number):FriendStruct.FriendEntry {
        var index = this.friendIdIndex[friendId];
        if (index >= 0 && index < this.friendEntryList.length) {
            return this.friendEntryList[index];
        }
        return null;
    }

    public getGainedRewardList():number[] {
        var list:number[] = [];
        Object.keys(this.gainReferRewardRecord).forEach((key) => {
            list.push(parseInt(key));
        });
        return list;
    }

    public buildDBMsg():any {
        var friends = pb.get('.DB.friends');
        var pck = new friends();
        Object.keys(this.lastBattleTime).forEach((key) => {
            var accountId = parseInt(key);
            if (!isNaN(accountId)) {
                pck.battleHistory.push({
                    friendId: accountId,
                    lastBattleTime: this.lastBattleTime[key]
                });
            }
        });

        Object.keys(this.fightHistory).forEach((key) => {
            var accountId = parseInt(key);
            if (!isNaN(accountId)) {
                pck.currentFriendFightHistory.push({
                    friendId: accountId,
                    win: this.fightHistory[key].win,
                    loss: this.fightHistory[key].loss
                });
            }
        });

        Object.keys(this.cacheHistory).forEach((key) => {
            var accountId = parseInt(key);
            if (!isNaN(accountId)) {
                pck.deleteFriendFightHistory.push({
                    friendId: accountId,
                    win: this.cacheHistory[key].win,
                    loss: this.cacheHistory[key].loss
                });
            }
        });

        pck.hireMgr = this.hireMgr.buildDBMsg();
        return pck;
    }

    public loadDBMsg(msg:any) {
        this.lastBattleTime = {};
        //msg.battleHistory.forEach((history) => {
        //    this.lastBattleTime[history.friendId] = history.lastBattleTime;
        //});
        //
        //msg.currentFriendFightHistory.forEach((history) => {
        //    var entry = this.fightHistory[history.friendId] = new FriendStruct.FightHistory();
        //    entry.win = history.win;
        //    entry.loss = history.loss;
        //});
        //
        //msg.deleteFriendFightHistory.forEach((history) => {
        //    var entry = this.cacheHistory[history.friendId] = new FriendStruct.FightHistory();
        //    entry.win = history.win;
        //    entry.loss = history.loss;
        //});

        if (msg.hireMgr) {
            this.hireMgr.loadDBMsg(msg.hireMgr);
        }

    }
}

export = FriendMgr;
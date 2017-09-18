import pb = require('node-protobuf-stream');

import Fight = require('../fight/fight');
import DungeonFight = require('../fight/dungeon_fight');
import Time = require('../../../util/time');
import Enum = require('../../../util/enum');
import ERRC = require('../../../util/error_code');
import HeroDef = require('../hero/defines');
import CustomError = require('../../../util/errors');
import FightDef = require('../fight/defines');
import Loot = require('../loot/loot');
import LootMgr = require('../loot/loot_mgr');
import log = require('../../../util/log');
import Simulation = require('../fight/simulation');
import Role = require('../role');
import QuestDef = require('../quest/defines');
import AchievementDef = require('../achievement/defines');
import FriendStruct = require('../friend/friend_struct');
import RoleStruct = require('../role/role_struct');
import SummonBossGlobalMgr = require('../summonboss/summonboss_global_mgr');
import FriendGlobalMgr = require('../friend/friend_global_mgr');
import FightStc = require('../fight/fight_struct');
import HeroSuite = require('../hero/hero_suite');

// 配表
import Config = require('../../../config');

var cm = Config.configMgr;

class DungeonMgr {
    // 推图信息
    completeHighestStageID:number = 0;    // 已完成最高普通关卡 (1到5星)
    headStageID:number = 0;       // 最前的关卡ID，由completeHighestStageID得到，全部完成时为0, 通过调用updateHeadStageID()更新

    // 战斗信息
    //currentFight:Fight.PvEFight = null;   // 副本当前战斗
    currentFight:DungeonFight = null;
    fightTeam:FightStc.FightTeam = new FightStc.FightTeam();      // 战斗队伍配置，hero.uid
    hireFriends:{[friendId:number]:FriendStruct.FriendEntry} = {};

    roleLevel:number = 0;

    constructor() {
        this.updateHeadStageID();
    }

    public restoreHeroes(role:Role):void {
        this.fightTeam.heros.forEach((uid) => {
            var hero = role.heros.getHero(uid);
            hero.recoverHealth(HeroSuite.SuiteType.dungeon);
        });
    }

    public startBattle(role:Role, stageID:number, team:FightStc.FightTeam):void {
        var stage = cm.stagedb.get(stageID);

        if (this.currentFight !== null && this.currentFight.stageID !== stageID) {
            throw new CustomError.UserError(ERRC.DUNGEON.HAS_ANOTHER_PROCESS, {
                msg: 'DUNGEON.HAS_ANOTHER_PROCESS, stageID=' + this.currentFight.stageID
            });
        }

        // 正常校验stageID，如果是6星关卡，需要另外的判断      ps:6星暂未开放
        if (!this.canBattleStage(stageID)) {
            throw new CustomError.UserError(ERRC.DUNGEON.STAGE_ID_CAN_NOT_BATTLE, {
                msg: 'DUNGEON.STAGE_ID_CAN_NOT_BATTLE, stageID=' + stageID
            });
        }

        var hero, i;

        if (this.currentFight === null) { // 需要创建新战斗
            // check team length
            Fight.checkFightTeamLength(team, 2);

            for (i = 0; i < team.heros.length; i += 1) {
                hero = role.heros.getHero(team.heros[i]);
                if (!hero) {
                    throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                        msg: 'HERO.UID_NOT_FOUND, uid=' + team.heros[i]
                    });
                }
            }

            FriendGlobalMgr.checkHireFriend(role, team.hires);

            this.currentFight = new DungeonFight();
            this.currentFight.initFight(stageID);
            this.fightTeam = team;

            FriendGlobalMgr.doHireForFight(role, team.hires, this.hireFriends);

        } else { // 继续上次的战斗
        }
    }

    // 结束战斗关卡
    // 外部接口设置为副本战斗结束
    public finishBattle():void {
        if (!this.currentFight) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'DUNGEON.FIGHT_NOT_EXIST, Dungeon'
            });
        }

        if (!this.currentFight.isFinished()) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_FINISHED, {
                msg: 'DUNGEON.FIGHT_NOT_FINISHED, Dungeon, finished=' + this.currentFight.hasFinishedWave
            });
        }

        if (DungeonMgr.isNormalStage(this.currentFight.stageID)) {
            if (this.currentFight.stageID > this.completeHighestStageID) {    // 进度大于已完成进度
                this.completeHighestStageID = this.currentFight.stageID;
                this.updateHeadStageID();
            }
        }
        this.currentFight = null;
        this.fightTeam.hires = [];
    }

    // 开始当前战斗波次
    public startFight():void {

        if (!this.currentFight) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'DUNGEON.FIGHT_NOT_EXIST'
            });
        }

        this.currentFight.startFight();
    }

    // 结束当前战斗波次
    // 外部接口进行额外结束操作：如世界boss开启随机
    public finishFight(role:Role,
                       result:FightDef.RESULT, totalRound:number, roundContext:Simulation.RoundContext):void {
        if (!this.currentFight) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'FIGHT.FIGHT_NOT_EXIST'
            });
        }

        // judge health
        // hero
        var team = this.fightTeam, i, hero;
        var heroArray:Simulation.Player[] = [];
        for (i = 0; i < team.heros.length; i += 1) {
            hero = role.heros.getHero(team.heros[i]);
            if (!hero) {
                throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                    msg: 'HERO.UID_NOT_FOUND, uid=' + team.heros[i]
                });
            }
            heroArray.push(Fight.createPlayerByHero(role, hero, HeroSuite.SuiteType.dungeon));
        }

        var friend:FriendStruct.FriendEntry;
        for (i = 0; i < team.hires.length; ++i) {
            friend = this.hireFriends[team.hires[i]];
            if (!friend) {
                throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                    msg: 'HERO.UID_NOT_FOUND, hireUid=' + team.hires[i]
                });
            }
            heroArray.push(Fight.createPlayerByFriendEntry(friend, HeroSuite.SuiteType.dungeon));
        }

        // monster
        var monsterArray:Simulation.Player[] = [];
        var monsterGroupID = this.currentFight.monsterGroupID;
        var stageMonster = cm.stage_monstergroupdb.get(monsterGroupID);
        var monsterID, monster, stage;
        for (i = 0; i < stageMonster.JSON_monster.length; i += 1) {
            monsterID = stageMonster.JSON_monster[i];
            monster = cm.monsterdb.get(monsterID);
            monsterArray.push(Fight.createPlayerByMonster(monster));
        }

        this.currentFight.finishFight(role.accountId, roundContext, heroArray, monsterArray, totalRound);
        this.currentFight.checkFightResult(result);

        if (result === FightDef.RESULT.VICTORY) {
            for (i = 0; i < stageMonster.JSON_monster.length; i += 1) {
                monsterID = stageMonster.JSON_monster[i];
                monster = cm.monsterdb.get(monsterID);

                role.summonBoss.addBoss(SummonBossGlobalMgr.transformBossID(monsterID));
                role.summonBoss.sendUpdatePacket(role);

                stage = cm.stagedb.get(this.currentFight.stageID);
                role.quests.updateQuest(role, QuestDef.CriteriaType.KILL_MONSTER_TYPE_A_IN_CHAPTER_B_N_COUNT,
                    [stage.chapter, monster.monstertypeid], 1);

                role.achievements.updateAchievement(role, AchievementDef.TYPE.KILL_MONSTER_N_COUNT, monster.monstertypeid, 1);
            }
        }

        role.achievements.updateAchievement(role, AchievementDef.TYPE.DAMAGE_ON_ONE_ENEMY, this.currentFight.getRightMaxDamage());
    }

    public getLeftHeroHealth():FightDef.HealthCacheItem[] {
        return this.currentFight ? this.currentFight.getSideHealth(FightDef.SIDE.RIGHT) : [];
    }

    public isAllWaveFinished():boolean {
        return this.currentFight ? this.currentFight.isAllWaveFinished() : true;
    }

    public abandonProcess() {
        this.currentFight = null;
    }

    public getRandomSeed():string {
        return this.currentFight ? this.currentFight.getRandomSeed() : '';
    }

    public getOptionalLootArray():FightStc.OptionalLoot[] {
        return this.currentFight ? this.currentFight.optionalLootArray : [];
    }

    public getLeftSlay():number {
        return this.currentFight ? this.currentFight.getLeftSlay() : 0;
    }

    public getCompleteMaxChapter():number {
        return Math.floor(this.completeHighestStageID / 100);
    }

    public getLeftMonsterHealth():FightDef.HealthCacheItem[] {
        return this.currentFight ? this.currentFight.getSideHealth(FightDef.SIDE.LEFT) : [];
    }

    // 是否是正常关卡 (1到5星)
    public static isNormalStage(stageID:number):boolean {
        try {
            var config = cm.stagedb.get(stageID);
            return config.degree < 6;
        } catch (err) {
            return false;
        }
    }

    // 需设置好this.completeHighestStageID
    public updateHeadStageID():void {
        if (!this.completeHighestStageID) {
            this.headStageID = 101;
        } else {
            var stage = cm.stagedb.get(this.completeHighestStageID);
            this.headStageID = stage.nextStageID;
        }
    }

    // 是否正在关卡进度
    public isBattling():boolean {
        return this.currentFight !== null;
    }

    // 是否正在Fight
    public isFighting():boolean {
        return this.currentFight && this.currentFight.isFighting();
    }

    public hasHeroInTeam(uid:number):boolean {
        if (uid < 6) {
            for (var i = 0; i < this.fightTeam.heros.length; i += 1) {
                if (this.fightTeam.heros[i] === uid) {
                    return true;
                }
            }
        } else {
            for (var i = 0; i < this.fightTeam.hires.length; i += 1) {
                if (this.fightTeam.hires[i] === uid) {
                    return true;
                }
            }
        }
    }

    // 可以进行关卡战斗判断
    // 是否完成或者是最新关卡
    public canBattleStage(stageID:number):boolean {
        return stageID > 0 && (stageID % 100 < 6 && stageID <= this.completeHighestStageID || stageID === this.headStageID);
    }

    // getter
    public getCurrentStageID():number {
        return this.currentFight ? this.currentFight.stageID : 0;
    }

    public getHasFinishedWave():number {
        return this.currentFight ? this.currentFight.hasFinishedWave : 0;
    }

    // getter
    public getCurrentMonsterGroupID():number {
        return this.currentFight ? this.currentFight.monsterGroupID : 0;
    }

    public getFightLoot():Loot {
        return this.currentFight ? this.currentFight.getFightLoot() : null;
    }

    public getRightDeathCount():number {
        return this.currentFight ? this.currentFight.rightDeathCount : 0;
    }

    public setRightDeathCount(count:number):void {
        if (this.currentFight) this.currentFight.rightDeathCount = count;
    }

    public clearFightLoot() {
        if (this.currentFight) {
            this.currentFight.clearFightLoot();
        }
    }

    public getHireHeroBattleData():any[] {
        var battleData:any[] = [];
        this.fightTeam.hires.forEach((accountId) => {
            var player:RoleStruct.FightPlayerNet = new RoleStruct.FightPlayerNet();
            var friend = this.hireFriends[accountId];
            player.loadFromFriendEntry(HeroSuite.SuiteType.dungeon, friend);
            battleData.push(player.buildNetMsg());
        });
        return battleData;
    }

    public initNew() {
        this.completeHighestStageID = 0;
        this.fightTeam = {heros: [], hires: []};
        this.currentFight = null;
    }

    public buildDBMsg():void {
        var pck, Dungeons = pb.get('.DB.dungeons');
        pck = new Dungeons({
            completeHighestStageID: this.completeHighestStageID,
            fightTeam: this.fightTeam
        });
        if (this.currentFight) {
            pck.currentFight = this.currentFight.buildDBMsg();
        }
        Object.keys(this.hireFriends).forEach((key) => {
            var friend = this.hireFriends[key];
            pck.hireFriendList.push(friend.buildDBMsg());
        });
        return pck;
    }

    public loadDBMsg(msg:any):void {
        if (msg) {
            this.completeHighestStageID = msg.completeHighestStageID;
            this.fightTeam = msg.fightTeam || {heros: [], hires: []};
            if (msg.currentFight) {
                this.currentFight = new DungeonFight();
                this.currentFight.loadDBMsg(msg.currentFight);
            }
            msg.hireFriendList.forEach((entry) => {
                var friend = new FriendStruct.FriendEntry();
                friend.loadDBMsg(entry);
                this.hireFriends[friend.accountId] = friend;
            });
        } else {
            this.initNew();
        }

        this.updateHeadStageID();
    }

}

export = DungeonMgr;
// 开始战斗关卡
// 外部接口设置为正在副本战斗

// common
import async = require('async');
import pb = require('node-protobuf-stream');

import Time = require('../../../util/time');
import log = require('../../../util/log');
import Enum = require('../../../util/enum');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
//import CenterDB = require('../../../database/impl/center_db');
import DB = require('../../../database/database_manager');

// struct
import Universal = require('../universal');
import Role = require('../role');
import ArenaDef = require('../arena/defines');
import BossFight = require('../fight/boss_fight');
import RoleStruct = require('../role/role_struct');
import QuestDef = require('../quest/defines');
import AchievementDef = require('../achievement/defines');
import Fight = require('../fight/fight');
import HeroDef = require('../hero/defines');
import Simulation = require('../fight/simulation');
import FightDef = require('../fight/defines');
import Loot = require('../loot/loot');
import FriendStruct = require('../friend/friend_struct');
import FightStc = require('../fight/fight_struct');

// manager
import ResourceMgr = require('../resource/resource_mgr');
import LeaderboardMgr = require('../leaderboard_mgr');
import BossGlobalMgr = require('./boss_global_mgr');
import FriendGlobalMgr = require('../friend/friend_global_mgr');
import SummonBossGlobalMgr = require('../summonboss/summonboss_global_mgr');

import HeroSuite = require('../hero/hero_suite');

var cm = require('../../../config').configMgr;

class BossHistory {
    bossID:number = 0;
    rank:number = 0;
    rewardProgress:Universal.REWARD_PROGRESS = Universal.REWARD_PROGRESS.NOT_GAIN;
}

class BossGainInfo {
    milestone:{[ID:number]:boolean} = {};
}

class BossData {
    bossID:number = 0;
    bossLevel:number = 0;
    isActive:boolean = false;
    lastActiveTime:number = 0;
    leftHealth:number = 0;
    score:number = 0;
    rank:number = 0;
    killCount:number = 0;
    gainInfo:BossGainInfo = new BossGainInfo();

    public startNewBoss(bossID:number):void {
        this.bossID = bossID;
        this.bossLevel = 1;
        this.isActive = true;
        this.lastActiveTime = 0;
        this.leftHealth = 0;
        this.score = 0;
        this.rank = 0;
        this.killCount = 0;
        this.gainInfo.milestone = {};
    }

    public getLeftActiveTime(now:number):number {
        return this.lastActiveTime + Universal.GLB_BOSS_DURATION > now ?
            this.lastActiveTime + Universal.GLB_BOSS_DURATION - now : 0;
    }

    public activeBoss(now:number):void {
        this.isActive = true;
        this.lastActiveTime = now;
    }

    public buildDBMsg():any {
        var BossData = pb.get('.DB.BossData');
        var pck = new BossData({
            bossID: this.bossID,
            bossLevel: this.bossLevel,
            isActive: this.isActive,
            lastActiveTime: this.lastActiveTime,
            leftHealth: this.leftHealth,
            score: this.score,
            rank: this.rank,
            killCount: this.killCount
        });

        Object.keys(this.gainInfo.milestone).forEach((ID) => {
            pck.gainMilestoneID.push(parseInt(ID));
        });

        return pck;
    }

    public loadDBMsg(msg:any):void {
        this.bossID = msg.bossID;
        this.bossLevel = msg.bossLevel;
        this.isActive = msg.isActive;
        this.lastActiveTime = msg.lastActiveTime;
        this.leftHealth = msg.leftHealth;
        this.score = msg.score;
        this.rank = msg.rank;
        this.killCount = msg.killCount;
        this.gainInfo.milestone = {};
        msg.gainMilestoneID.forEach((ID) => {
            this.gainInfo.milestone[ID] = true;
        });
    }
}

class ScoreResult {
    damageDone:number = 0;
    totalDamage:number = 0;
    damageRank:number = 0;
    killCount:number = 0;
    milestoneRewardID:number = 0;
}

class BossMgr {

    fightTeam:Universal.FightTeam = new Universal.FightTeam();

    bossData:BossData = new BossData();
    bossHistory:BossHistory[] = [];

    currentFight:BossFight = null;
    hireFriends:{[friendId:number]:FriendStruct.FriendEntry} = {};

    // memory
    selfRank:number = 0;

    constructor() {
    }

    public initNew() {
        this.fightTeam = {heros: [], hires: []};
        this.currentFight = null;
    }

    public checkRefreshBoss(role:Role, callback:(err)=>void):void {
        var self = this;
        if (BossGlobalMgr.worldBoss.bossID !== self.bossData.bossID) {
            async.waterfall([
                (next) => {
                    if (self.bossData.bossID > 0) {
                        var bossID = self.bossData.bossID;
                        DB.Boss.fetchBossHistoryRank(role.accountId, bossID, (err, rank) => {
                            if (err) {
                                next(err);
                                return ;
                            }

                            var history:BossHistory = null;
                            var historyLength = self.bossHistory.length;
                            if (historyLength === 0 || self.bossHistory[historyLength - 1].bossID !== bossID) {
                                history = new BossHistory();
                                history.bossID = self.bossData.bossID;
                                history.rank = rank;
                                history.rewardProgress = Universal.REWARD_PROGRESS.NOT_GAIN;
                                self.bossHistory.push(history);
                            } else {
                                history = self.bossHistory[historyLength - 1];
                            }

                            var bossConf = cm.boss_infodb.get(bossID);
                            var rankGroup = BossGlobalMgr.getRankGroupIDByRank(rank);
                            var reward = BossGlobalMgr.getRankGroupReward(bossConf.rankid, rankGroup);
                            ResourceMgr.applyReward(role, Enum.USE_TYPE.BOSS_RANK_REWARD, reward);
                            history.rewardProgress = Universal.REWARD_PROGRESS.HAS_GAIN;

                            log.uInfo(role.accountId, 'BossRankReward', {
                                bossID: bossID,
                                rank: rank,
                                rankGroup: rankGroup,
                                reward: reward
                            });

                            next(null);
                        });
                    } else {
                        next(null);
                    }
                },
                (next) => {
                    var data = self.bossData;
                    log.uInfo(role.accountId, 'Boss.checkRefreshBoss', 'startNewBoss, bossID=%d',
                        BossGlobalMgr.worldBoss.bossID);

                    data.startNewBoss(BossGlobalMgr.worldBoss.bossID);
                    data.leftHealth = BossGlobalMgr.getBossLevelHp(data.bossID, data.bossLevel);
                    if (data.leftHealth === 0) {
                        log.uError(role.accountId, 'Boss.checkRefreshBoss', 'boss.leftHealth == 0, bossID=%d, bossLevel=%d',
                            data.bossID, data.bossLevel);
                        data.leftHealth = 1;
                    }
                    next(null);
                }
            ], (err) => {
                callback(err);
            });
        } else {
            callback(null);
        }
    }

    public checkBossActive() {
        if (this.bossData.isActive && this.bossData.getLeftActiveTime(Time.gameNow()) === 0) {
            this.bossData.isActive = false;
        }
    }

    public selectTeam(role:Role, team:Universal.FightTeam):void {
        Fight.checkFightTeamLength(team, 2);

        var hero, i;
        for (i = 0; i < team.heros.length; i += 1) {
            hero = role.heros.getHero(team.heros[i]);
            if (!hero) {
                throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                    msg: 'HERO.UID_NOT_FOUND, uid=' + team.heros[i]
                });
            }
        }

        FriendGlobalMgr.checkHireFriend(role, team.hires);
        this.fightTeam = team;
        FriendGlobalMgr.recordHireFriend(role, team.hires, this.hireFriends);
    }

    public startFight(role:Role):void {
        FriendGlobalMgr.checkHireFriend(role, this.fightTeam.hires);

        this.currentFight = new BossFight();
        this.currentFight.initFight(this.bossData.bossID, this.bossData.bossLevel, this.bossData.leftHealth);
        this.currentFight.startFight();

        FriendGlobalMgr.doHireForFight(role, this.fightTeam.hires, this.hireFriends);
    }

    public finishFight(role:Role, roundContext:Simulation.RoundContext, totalRound:number, result:number, callback:(err, scoreResult:ScoreResult)=>void):void {
        if (!this.currentFight) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'FIGHT.FIGHT_NOT_EXIST'
            });
        }

        var team = this.fightTeam, i, hero;
        var heroArray:Simulation.Player[] = [];
        for (i = 0; i < team.heros.length; i += 1) {
            hero = role.heros.getHero(team.heros[i]);
            if (!hero) {
                throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                    msg: 'HERO.UID_NOT_FOUND, uid=' + team.heros[i]
                });
            }
            heroArray.push(Fight.createPlayerByHero(role, hero, HeroSuite.SuiteType.boss));
        }

        var friend:FriendStruct.FriendEntry;
        for (i = 0; i < team.hires.length; ++i) {
            friend = this.hireFriends[team.hires[i]];
            if (!friend) {
                throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                    msg: 'HERO.UID_NOT_FOUND, hireUid=' + team.hires[i]
                });
            }
            heroArray.push(Fight.createPlayerByFriendEntry(friend, HeroSuite.SuiteType.boss));
        }

        // monster
        var bossOriginHp = this.bossData.leftHealth,
            bossOriginLevel = this.bossData.bossLevel;
        var monster = cm.monsterdb.get(this.bossData.bossID);
        var monsterArray:Simulation.Player[] = [];
        monsterArray.push(BossGlobalMgr.createPlayerByBoss(BossGlobalMgr.worldBoss.bossID, this.bossData.bossLevel, this.bossData.leftHealth));

        this.currentFight.finishFight(role.accountId, roundContext, heroArray, monsterArray, totalRound);
        this.currentFight.checkFightResult(result);
        this.fightTeam.hires = [];

        var milestoneRewardID = 0;
        if (result === FightDef.RESULT.VICTORY) {
            role.equips.openCraftSkillByBossLevel(this.bossData.bossID, this.bossData.bossLevel);

            // upgrade boss
            this.bossData.killCount += 1;
            this.bossData.bossLevel += 1;
            this.bossData.isActive = false;
            this.bossData.leftHealth = BossGlobalMgr.getBossLevelHp(this.bossData.bossID, this.bossData.bossLevel);

            var bossConf = cm.boss_infodb.get(this.bossData.bossID);
            milestoneRewardID = BossGlobalMgr.getMilestoneRewardID(bossConf.milestoneid, this.bossData.killCount);
            if (milestoneRewardID) {
                var reward = BossGlobalMgr.getMilestoneReward(milestoneRewardID);
                ResourceMgr.applyReward(role, Enum.USE_TYPE.BOSS_MILESTONE, reward);
            }

            role.summonBoss.addBoss(SummonBossGlobalMgr.transformBossID(monster.ID));
            role.summonBoss.sendUpdatePacket(role);

            var historyLength = this.bossHistory.length;
            if (historyLength === 0 || this.bossHistory[historyLength - 1].bossID !== this.bossData.bossID) {
                var history:BossHistory = new BossHistory();
                history.bossID = this.bossData.bossID;
                history.rank = 0;
                history.rewardProgress = Universal.REWARD_PROGRESS.NOT_GAIN;
                this.bossHistory.push(history);
            }

            role.achievements.updateAchievement(role, AchievementDef.TYPE.KILL_MONSTER_N_COUNT, monster.monstertypeid, 1);
        } else {
            this.bossData.leftHealth = this.currentFight.getSideHealth(FightDef.SIDE.LEFT)[0].currentHp;
        }

        var damage = this.currentFight.getRightTotalDamage();
        if (damage < 0) damage = 0;
        this.bossData.score += damage;

        role.achievements.updateAchievement(role, AchievementDef.TYPE.DAMAGE_ON_ONE_ENEMY, this.currentFight.getRightMaxDamage());

        var scoreResult:ScoreResult = new ScoreResult();
        scoreResult.damageDone = damage;
        scoreResult.totalDamage = this.bossData.score;
        scoreResult.damageRank = 0;
        scoreResult.killCount = this.bossData.killCount;
        scoreResult.milestoneRewardID = milestoneRewardID;

        var fightLoot = this.getFightLoot();
        log.uInfo(role.accountId, 'BossFightResult', {
            bossID: this.bossData.bossID,
            bossLevel: bossOriginLevel,
            bossOriginHp: bossOriginHp,
            damage: damage,
            score: this.bossData.score,
            result: Fight.stringifyResult(result),
            restoreCount: Object.keys(roundContext.restoreRound).length,
            paySpecialCount: Object.keys(roundContext.specialRound).length,
            fightLoot: fightLoot ? fightLoot.toString() : {}
        });

        if (this.bossData.score > 0) {
            async.waterfall([
                (next) => {
                    LeaderboardMgr.bossDamageLB.setScore(role.accountId, this.bossData.score, (err) => {
                        if (err) {
                            log.sError('BossFight', 'Redis setScore Error: ' + err.stack);
                        }
                        //CenterDB.Leaderboard.updateBossScore(role.accountId, this.bossData.score);
                        next(err);
                    });
                },
                (next) => {
                    LeaderboardMgr.bossDamageLB.queryRank(role.accountId, (err, rank) => {
                        if (err) {
                            log.sError('BossFight', 'Redis queryRank Error: ' + err.stack);
                            next(err);
                            return ;
                        }
                        scoreResult.damageRank = rank;
                        next(null);
                    });
                }
            ], (err) => {
                callback(err, scoreResult);
            });

        } else {
            callback(null, scoreResult);
        }

    }

    public getRandomSeed():string {
        return this.currentFight ? this.currentFight.getRandomSeed() : '';
    }

    public getOptionalLootArray():FightStc.OptionalLoot[] {
        return this.currentFight ? this.currentFight.optionalLootArray : [];
    }

    public getFightLoot():Loot {
        return this.currentFight ? this.currentFight.getFightLoot() : null;
    }

    public clearFightLoot() {
        if (this.currentFight) {
            this.currentFight.clearFightLoot();
        }
    }

    public isFighting():boolean {
        return this.currentFight && this.currentFight.isFighting();
    }

    public getBossResult():FightDef.RESULT {
        return this.currentFight ? this.currentFight.getResult() : FightDef.RESULT.LOSS;
    }

    public isBossActive(now:number):boolean {
        return this.bossData.bossLevel === 1 || (this.bossData.isActive &&
            this.bossData.lastActiveTime <= now && this.bossData.lastActiveTime + Universal.GLB_BOSS_DURATION > now);
    }

    public fetchScoreAndRank(accountId:number, callback:(err, rank, score)=>void):void {
        var scoreBoard = LeaderboardMgr.bossDamageLB;
        async.parallel([
            (next) => {
                scoreBoard.queryRank(accountId, next);
            },
            (next) => {
                scoreBoard.queryScore(accountId, next);
            }
        ], (err, result:number[]) => {
            if (err) callback(err, 0, 0);
            else callback(null, (result[0]) ? result[0] : 0, result[1] ? result[1] : 0);
        });
    }

    public getHireHeroBattleData():any[] {
        var battleData:any[] = [];
        this.fightTeam.hires.forEach((accountId) => {
            var player:RoleStruct.FightPlayerNet = new RoleStruct.FightPlayerNet();
            var friend = this.hireFriends[accountId];
            player.loadFromFriendEntry(HeroSuite.SuiteType.boss, friend);
            battleData.push(player.buildNetMsg());
        });
        return battleData;
    }

    public sendOnlinePacket(role:Role):void {
        role.sendPacket(this.buildInitNetMsg(role));
        var pck = {bossList: []};
        this.bossHistory.forEach((history) => {
            pck.bossList.push(history.bossID);
        });
        var M = pb.get('.Api.boss.initKillList.Notify');
        role.sendPacket(new M(pck));
    }

    public buildInitNetMsg(role:Role):any {
        var pck = {
            bossProgress: BossGlobalMgr.worldBoss.progress,
            bossID: BossGlobalMgr.worldBoss.bossID,
            bossLevel: this.bossData.bossLevel,
            isActive: this.bossData.isActive,
            bossLeftActiveTime: this.bossData.getLeftActiveTime(Time.gameNow()),
            bossTotalDuration: BossGlobalMgr.worldBoss.endTime - Time.gameNow(),
            leftHealth: this.bossData.leftHealth,
            killCount: this.bossData.killCount,
            bossEnergyNextTime: role.bossEnergyCounter ? role.bossEnergyCounter.leftSecondForCount(Time.gameNow(), 1) : 0,
            team: this.fightTeam
        };
        this.checkAddLastBossReward(pck);
        var M = pb.get('.Api.boss.initBossInfo.Notify');
        return new M(pck);
    }

    public buildNewBossNetMsg():any {
        var pck = {
            bossProgress: BossGlobalMgr.worldBoss.progress,
            bossID: BossGlobalMgr.worldBoss.bossID,
            leftHealth: this.bossData.leftHealth
        };
        this.checkAddLastBossReward(pck);
        var M = pb.get('.Api.boss.newBossInfo.Notify');
        return new M(pck);
    }

    public checkAddLastBossReward(pck:any) {
        if (this.bossHistory.length > 0) {
            var history = this.bossHistory[this.bossHistory.length - 1];
            switch (history.rewardProgress) {
                case Universal.REWARD_PROGRESS.NOT_GAIN:
                    break;
                case Universal.REWARD_PROGRESS.HAS_GAIN:
                    var groupID = BossGlobalMgr.getRankGroupIDByRank(history.rank);
                    if (groupID > 0) {
                        var bossConf = cm.boss_infodb.get(history.bossID);
                        var rewardId = BossGlobalMgr.getRankRewardID(bossConf.rankid, groupID);

                        pck.lastBossReward = {
                            bossID: history.bossID,
                            rank: history.rank,
                            rewardId: rewardId
                        }
                    }
                    history.rewardProgress = Universal.REWARD_PROGRESS.HAS_READ;
                    break;
                case Universal.REWARD_PROGRESS.HAS_READ:
                    break;
            }
        }
    }

    public buildDBMsg():any {
        var boss = pb.get('.DB.boss');
        var pck = new boss({
            fightTeam: this.fightTeam,
            bossData: this.bossData.buildDBMsg(),
            bossHistory: this.bossHistory
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
            this.fightTeam = msg.fightTeam || {heros: [], hires: []};
            if (msg.currentFight) {
                this.currentFight = new BossFight();
                this.currentFight.loadDBMsg(msg.currentFight);
            }
            msg.hireFriendList.forEach((entry) => {
                var friend = new FriendStruct.FriendEntry();
                friend.loadDBMsg(entry);
                this.hireFriends[friend.accountId] = friend;
            });

            if (msg.bossHistory) this.bossHistory = msg.bossHistory;
            if (msg.bossData) this.bossData.loadDBMsg(msg.bossData);

        } else {
            this.initNew();
        }

    }
}

export = BossMgr;
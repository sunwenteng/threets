import pb = require('node-protobuf-stream');
import log = require('../../../util/log');
import Time = require('../../../util/time');
import Enum = require('../../../util/enum');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');

import Universal = require('../universal');
import Role = require('../role');

import Loot = require('../loot/loot');
import LootMgr = require('../loot/loot_mgr');

import Fight = require('../fight/fight');
import FightDef = require('../fight/defines');
import Simulation = require('../fight/simulation');
import FightStc = require('../fight/fight_struct');

import HeroSuite = require('../hero/hero_suite');

import TrialFight = require('./trial_fight');

var cm = require('../../../config').configMgr;

class Trial {
    trialID:number = 0;
    victoryCount:number = 0;
    lastVicTime:number = 0;

    constructor(trialID) {
        this.trialID = trialID;
    }

    public refresh():void {
        this.victoryCount = 0;
        this.lastVicTime = 0;
    }

    public toNetMsg():any {
        return {
            trialID     : this.trialID,
            victoryCount: this.victoryCount,
            leftSecond  : Time.calcLeftSecond(this.lastVicTime, Universal.GLB_TRIAL_INTERVAL_PER_VICTORY)
        };
    }
}

class TrialMgr {

    firstVictoryTime:number = 0;

    trialData:{[trialID:number]:Trial} = {};

    currentFight:TrialFight = null;
    fightTeam:FightStc.FightTeam = new FightStc.FightTeam();

    roleLevel:number = 0;

    constructor() {

    }

    public startTrial(role:Role, trialID:number, team:FightStc.FightTeam):void {
        var trial = cm.experimentdb.get(trialID);

        if (this.currentFight !== null && this.currentFight.trialID !== trialID) {
            throw new CustomError.UserError(ERRC.TRIAL.HAS_ANOTHER_PROCESS, {
                msg: 'TRIAL.HAS_ANOTHER_PROCESS, stageID=' + this.currentFight.trialID
            });
        }

        if (!this.canBattleTrial(trialID)) {
            throw new CustomError.UserError(ERRC.TRIAL.TRIAL_ID_CAN_NOT_BATTLE, {
                msg: 'TRIAL.STAGE_ID_CAN_NOT_BATTLE, trialID=' + trialID
            });
        }

        var hero, i;
        if (this.currentFight === null) {
            Fight.checkFightTeamLength(team, 0);

            for (i = 0; i < team.heros.length; i += 1) {
                hero = role.heros.getHero(team.heros[i]);
                if (!hero) {
                    throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                        msg: 'HERO.UID_NOT_FOUND, uid=' + team.heros[i]
                    });
                }
            }

            this.currentFight = new TrialFight();
            this.currentFight.initFight(trialID);
            this.fightTeam = team;
        }
    }

    public finishTrial():void {
        if (!this.currentFight) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'TRIAL.FIGHT_NOT_EXIST, trial'
            });
        }

        if (!this.currentFight.isFinished()) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_FINISHED, {
                msg: 'TRIAL.FIGHT_NOT_FINISHED, trial, finished=' + this.currentFight.hasFinishedWave
            });
        }

        this.currentFight = null;
        this.fightTeam.hires = [];
    }

    public startFight():void {
        if (!this.currentFight) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'TRIAL.FIGHT_NOT_EXIST'
            });
        }

        this.currentFight.startFight();
    }

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
            heroArray.push(Fight.createPlayerByHero(role, hero, HeroSuite.SuiteType.trial));
        }

        // no hired friend

        // monster
        var monsterArray:Simulation.Player[] = [];
        var monsterGroupID = this.currentFight.monsterGroupID;
        var stageMonster = cm.stage_monstergroupdb.get(monsterGroupID);
        var monsterID, monster;
        for (i = 0; i < stageMonster.JSON_monster.length; i += 1) {
            monsterID = stageMonster.JSON_monster[i];
            monster = cm.monsterdb.get(monsterID);
            monsterArray.push(Fight.createPlayerByMonster(monster));
        }

        this.currentFight.finishFight(role.accountId, roundContext, heroArray, monsterArray, totalRound);
        this.currentFight.checkFightResult(result);

    }

    public refreshTrials():void {
        Object.keys(this.trialData).forEach((key) => {
            this.trialData[key].refresh();
        });
        this.firstVictoryTime = 0;
    }

    public getTrial(trialID:number):Trial {
        return this.trialData[trialID];
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

    public getLeftRefreshSecond():number {
        return Time.calcLeftSecond(this.firstVictoryTime, Universal.GLB_TRIAL_REFRESH_INTERVAL);
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

    private canBattleTrial(trialID:number):boolean {
        var trial = this.getTrial(trialID);
        return trial.victoryCount < Universal.GLB_VICTORY_COUNT_PER_TRIAL;
    }

    public getCurrentTrialID():number {
        return this.currentFight ? this.currentFight.trialID : 0;
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

    public buildDBMsg():void {
        var pck, self = this;
        var trials = pb.get('.DB.trials');
        pck = new trials({
            firstVictoryTime: self.firstVictoryTime,
            fightTeam       : self.fightTeam
        });
        Object.keys(self.trialData).forEach((key) => {
            pck.trialData.push(self.trialData[key]);
        });
        if (self.currentFight) {
            pck.currentFight = self.currentFight.buildDBMsg();
        }
        return pck;
    }

    public initMgr():void {
        this.checkTrials();
    }

    private checkTrials():void {
        var self = this;
        Object.keys(cm.experimentdb.all()).forEach((key) => {
            var config = cm.experimentdb.get(key);
            if (!self.trialData[key]) self.trialData[key] = new Trial(config.ID);
        });
    }

    public loadDBMsg(msg:any):void {
        if (msg) {
            this.firstVictoryTime = msg.firstVictoryTime;
            this.fightTeam = msg.fightTeam || {heros: [], hires: []};
            if (msg.currentFight) {
                this.currentFight = new TrialFight();
                this.currentFight.loadDBMsg(msg.currentFight);
            }
            var self = this;
            msg.trialData.forEach((data) => {
                var trial = self.trialData[data.trialID] = new Trial(data.trialID);
                trial.victoryCount = data.victoryCount;
                trial.lastVicTime = data.lastVicTime;
            });
            this.checkTrials();
        }
    }
}

export = TrialMgr;
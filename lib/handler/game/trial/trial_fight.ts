import log = require('../../../util/log');
import Fight = require('../fight/fight');
import Loot = require('../loot/loot');
import LootMgr = require('../loot/loot_mgr');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');
import Enum = require('../../../util/enum');
import Util = require('../../../util/game_util');
import FightDef = require('../fight/defines');
import Simulation = require('../fight/simulation');
import FightStc = require('../fight/fight_struct');

var cm = require('../../../config').configMgr;

class TrialFight extends Fight.BaseFight {

    trialID:number = 0;
    hasFinishedWave:number = 0;
    optionalLootArray:FightStc.OptionalLoot[] = [];
    rightDeathCount:number = 0;

    fightLoot:Loot = null;

    monsterGroupID:number = 0;    // 怪物组ID

    constructor() {
        super();

        this.currentFightRound = new Fight.FightRound();
    }

    public initFight(trialID:number):void {
        this.trialID = trialID;
        this.hasFinishedWave = 0;
        this.updateMonsterGroupID();
    }

    private updateMonsterGroupID():void {
        var trial = cm.experimentdb.get(this.trialID);
        this.monsterGroupID = trial.JSON_MonsterGroup[this.hasFinishedWave];
    }

    public startFight():void {
        var trial = cm.experimentdb.get(this.trialID);
        if (this.hasFinishedWave >= trial.JSON_MonsterGroup.length) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_HAS_FINISHED, {
                msg: 'FightHasFinished, trialID=' + this.trialID
            });
        }

        this.currentFightRound.newRound();
        this.currentFightRound.startRound();

        // roll all optional loot
        this.optionalLootArray = [];
        var monsterGroupID = trial.JSON_MonsterGroup[this.hasFinishedWave];
        var monsterGroup = cm.stage_monstergroupdb.get(monsterGroupID);
        var normalLoot, specialLoot, monster;
        for (var i = 0; i < monsterGroup.JSON_monster.length; ++i) {
            monster = cm.monsterdb.get(monsterGroup.JSON_monster[i]);
            normalLoot = LootMgr.rollLoot(monster.loot);
            specialLoot = LootMgr.rollLoot(monster.specialloot);
            if (monster.exploot) {
                normalLoot.addRes(Enum.RESOURCE_TYPE.ROLE_EXP, monster.exploot);
                specialLoot.addRes(Enum.RESOURCE_TYPE.ROLE_EXP, monster.exploot);
            }
            this.optionalLootArray.push({
                normalLoot: normalLoot,
                specialLoot: specialLoot
            });
        }

    }

    public finishFight(accountId:number, roundContext:Simulation.RoundContext,
                       heroList:Simulation.Player[],
                       monsterList:Simulation.Player[],
                       totalRound:number):void {
        if (!this.currentFightRound || this.currentFightRound.fightStep !== Fight.STEP.START) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'FIGHT.FIGHT_NOT_EXIST'
            });
        }
        var team:{[side:number]:Simulation.Player[]} = {};
        team[FightDef.SIDE.LEFT] = monsterList;
        team[FightDef.SIDE.RIGHT] = heroList;  // 去掉死亡英雄
        this.currentFightRound.finishRound(accountId, roundContext, team, totalRound, this.rightDeathCount);

        this.fightLoot = new Loot();
        var simulation = this.currentFightRound.getSimulation();
        var monsterDeathTypeList:FightDef.DeathType[] = simulation.getSideDeathTypeList(FightDef.SIDE.LEFT);
        monsterDeathTypeList.forEach((death, index) => {
            switch (death) {
                case FightDef.DeathType.NULL:
                    break;
                case FightDef.DeathType.NORMAL:
                    log.uDebug(accountId, 'TrialFightFinish', 'FightLoot, Monster[' + index + '], type=NORMAL, loot=' + JSON.stringify(this.optionalLootArray[index].normalLoot));
                    this.fightLoot.addLoot(this.optionalLootArray[index].normalLoot);
                    break;
                case FightDef.DeathType.SLAY:
                    log.uDebug(accountId, 'TrialFightFinish', 'FightLoot, Monster[' + index + '], type=SLAY, loot=' + JSON.stringify(this.optionalLootArray[index].specialLoot));
                    this.fightLoot.addLoot(this.optionalLootArray[index].specialLoot);
                    break;
            }
        });

        this.rightDeathCount = 0;
        var knightDeathTypeList:FightDef.DeathType[] = simulation.getSideDeathTypeList(FightDef.SIDE.RIGHT);
        knightDeathTypeList.forEach((death, index) => {
            switch (death) {
                case FightDef.DeathType.NULL:
                    break;
                case FightDef.DeathType.NORMAL:
                case FightDef.DeathType.SLAY:
                    if (this.rightDeathCount <= index) {
                        this.rightDeathCount = index + 1;
                    }
                    break;
            }
        });

        switch (simulation.getResult()) {
            case FightDef.RESULT.FLEE:
                break;
            case FightDef.RESULT.LOSS:
                this.rightDeathCount = 0;
                break;
            case FightDef.RESULT.VICTORY:
                this.hasFinishedWave += 1;
                this.updateMonsterGroupID();
                break;
        }
    }

    public getFightLoot():Loot {
        return this.fightLoot;
    }

    public clearFightLoot() {
        if (this.fightLoot) {
            this.fightLoot = null;
        }
    }

    public isAllWaveFinished():boolean {
        return this.hasFinishedWave >= TrialFight.getTrialWaveCount(this.trialID);
    }

    public static getTrialWaveCount(trialID:number):number {
        var trial = cm.experimentdb.get(trialID);
        return trial.JSON_MonsterGroup.length;
    }


    public buildDBMsg():any {
        var pck = {
            trialID: this.trialID,
            hasFinishedWave: this.hasFinishedWave,
            currentFightRound: this.currentFightRound.buildDBMsg(),
            rightDeathCount: this.rightDeathCount,
            optionalLootArray: []
        };
        this.optionalLootArray.forEach((option) => {
            pck.optionalLootArray.push({
                normalLoot: option.normalLoot.buildDBMsg(),
                specialLoot: option.specialLoot.buildDBMsg()
            })
        });
        return pck;
    }

    public loadDBMsg(msg:any) {
        this.trialID = msg.trialID;
        this.hasFinishedWave = msg.hasFinishedWave;
        this.currentFightRound.loadDBMsg(msg.currentFightRound);
        this.rightDeathCount = msg.rightDeathCount || 0;
        this.updateMonsterGroupID();

        this.optionalLootArray = [];
        msg.optionalLootArray.forEach((option) => {
            var normalLoot:Loot = new Loot();
            var specialLoot:Loot = new Loot();
            normalLoot.loadDBMsg(option.normalLoot);
            specialLoot.loadDBMsg(option.specialLoot);
            this.optionalLootArray.push({
                normalLoot: normalLoot,
                specialLoot: specialLoot
            })
        });
    }

}

export = TrialFight;
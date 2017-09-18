import Fight = require('./fight');
import Loot = require('../loot/loot');
import LootMgr = require('../loot/loot_mgr');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');
import Enum = require('../../../util/enum');
import Util = require('../../../util/game_util');
import FightDef = require('./defines');
import Simulation = require('./simulation');
import FightStc = require('./fight_struct');
import log = require('../../../util/log');

var cm = require('../../../config').configMgr;

class DungeonFight extends Fight.BaseFight {
    stageID:number = 0;
    monsterGroupID:number = 0;    // 怪物组ID
    hasFinishedWave:number = 0;   // 已完成波次
    optionalLootArray:FightStc.OptionalLoot[] = [];
    rightDeathCount:number = 0;

    fightLoot:Loot = null;

    constructor() {
        super();

        this.stageID = 0;
        this.monsterGroupID = 0;
        this.hasFinishedWave = 0;
        this.currentFightRound = new Fight.FightRound();
    }

    public initFight(stageID):void {
        this.stageID = stageID;
        this.hasFinishedWave = 0;
        this.rollMonsterGroupID();
    }

    public rollMonsterGroupID():void {
        var stageBattleID = this.getCurrentWaveID();
        if (!stageBattleID) {
            this.monsterGroupID = 0;
            return ;
        }
        var stageBattle = cm.stage_battledb.get(stageBattleID);
        switch (stageBattle.JSON_MonsterGroupid.length) {
            case 0:
                this.monsterGroupID = 0;
                break;
            case 1:
                this.monsterGroupID = stageBattle.JSON_MonsterGroupid[0];
                break;
            default :
                this.monsterGroupID = stageBattle.JSON_MonsterGroupid[ Util.randInt(0, stageBattle.JSON_MonsterGroupid.length) ];
                break;
        }
    }

    public getCurrentWaveID():number {
        var stage = cm.stagedb.get(this.stageID);
        if (this.hasFinishedWave >= stage.JSON_battleid.length) {
            return 0;
        } else {
            return stage.JSON_battleid[this.hasFinishedWave];
        }
    }

    public isAllWaveFinished():boolean {
        return this.hasFinishedWave >= DungeonFight.getStageWaveCount(this.stageID);
    }

    public static getStageWaveCount(stageID:number):number {
        var stage = cm.stagedb.get(stageID);
        return stage.JSON_battleid.length;
    }

    public startFight():void {
        // check stageID
        var stage = cm.stagedb.get(this.stageID);
        if (this.hasFinishedWave >= stage.JSON_battleid.length) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_HAS_FINISHED, {
                msg: 'FightHasFinished, stageID=' + this.stageID
            });
        }

        this.currentFightRound.newRound();
        this.currentFightRound.startRound();

        // roll all optional loot
        this.optionalLootArray = [];
        var monsterGroup = cm.stage_monstergroupdb.get(this.monsterGroupID);
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
                    log.uDebug(accountId, 'DungeonFightFinish', 'FightLoot, Monster[' + index + '], type=NORMAL, loot=' + JSON.stringify(this.optionalLootArray[index].normalLoot));
                    this.fightLoot.addLoot(this.optionalLootArray[index].normalLoot);
                    break;
                case FightDef.DeathType.SLAY:
                    log.uDebug(accountId, 'DungeonFightFinish', 'FightLoot, Monster[' + index + '], type=SLAY, loot=' + JSON.stringify(this.optionalLootArray[index].specialLoot));
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
                this.rollMonsterGroupID();
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

    public buildDBMsg():any {
        var pck = {
            stageID: this.stageID,
            monsterGroupID: this.monsterGroupID,
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
        this.stageID = msg.stageID;
        this.monsterGroupID = msg.monsterGroupID;
        this.hasFinishedWave = msg.hasFinishedWave;
        this.currentFightRound.loadDBMsg(msg.currentFightRound);
        this.rightDeathCount = msg.rightDeathCount || 0;

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

export = DungeonFight;
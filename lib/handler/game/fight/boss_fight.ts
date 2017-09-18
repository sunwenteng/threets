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

var cm = require('../../../config').configMgr;

class BossFight extends Fight.BaseFight {
    bossEntry:FightStc.BossEntry = null;
    optionalLootArray:FightStc.OptionalLoot[] = [];
    fightLoot:Loot = null;

    constructor() {
        super();

        this.currentFightRound = new Fight.FightRound();
    }

    public initFight(bossID:number, level:number, leftHp:number):void {
        this.bossEntry = new FightStc.BossEntry();
        this.bossEntry.bossID = bossID;
        this.bossEntry.level = level;
        this.bossEntry.leftHp = leftHp;
    }

    public startFight():void {
        var monster = cm.monsterdb.get(this.bossEntry.bossID);

        this.currentFightRound.newRound();
        this.currentFightRound.startRound();

        this.optionalLootArray = [];

        var normalLoot = LootMgr.rollLoot(monster.loot);
        var specialLoot = LootMgr.rollLoot(monster.specialloot);
        if (monster.exploot) {
            normalLoot.addRes(Enum.RESOURCE_TYPE.ROLE_EXP, monster.exploot);
            specialLoot.addRes(Enum.RESOURCE_TYPE.ROLE_EXP, monster.exploot);
        }
        this.optionalLootArray.push({
            normalLoot: normalLoot,
            specialLoot: specialLoot
        });
    }

    public finishFight(accountId:number,
                       roundContext:Simulation.RoundContext,
                       heroList:Simulation.Player[],
                       monsterList:Simulation.Player[],
                       totalRound:number):void {

        var team:{[side:number]:Simulation.Player[]} = {};
        team[FightDef.SIDE.LEFT] = monsterList;
        team[FightDef.SIDE.RIGHT] = heroList;

        var config = cm.boss_energydb.get(heroList.length);
        this.currentFightRound.finishRound(accountId, roundContext, team, totalRound, 0, 1 + config.damagebonus / 100);

        this.fightLoot = new Loot();
        var simulation = this.currentFightRound.getSimulation();
        var monsterDeathTypeList:FightDef.DeathType[] = simulation.getSideDeathTypeList(FightDef.SIDE.LEFT);
        monsterDeathTypeList.forEach((death, index) => {
            switch (death) {
                case FightDef.DeathType.NULL:
                    break;
                case FightDef.DeathType.NORMAL:
                    this.fightLoot.addLoot(this.optionalLootArray[index].normalLoot);
                    break;
                case FightDef.DeathType.SLAY:
                    this.fightLoot.addLoot(this.optionalLootArray[index].specialLoot);
                    break;
            }
        });
    }

    public getFightLoot():Loot {
        return this.fightLoot;
    }

    public clearFightLoot() {
        if (this.fightLoot) {
            this.fightLoot = null;
        }
    }

    public getResult():FightDef.RESULT {
        var simulation = this.currentFightRound.getSimulation();
        return simulation ? simulation.getResult() : FightDef.RESULT.LOSS;
    }

    public buildDBMsg():any {
        var pck = {
            bossEntry: this.bossEntry,
            currentFightRound: this.currentFightRound.buildDBMsg(),
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

    public loadDBMsg(msg:any):void {
        this.bossEntry = msg.bossEntry;
        this.currentFightRound.loadDBMsg(msg.currentFightRound);

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

export = BossFight;
import Fight = require('./fight');
import Loot = require('../loot/loot');
import LootMgr = require('../loot/loot_mgr');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');
import Enum = require('../../../util/enum');
import Util = require('../../../util/game_util');
import FightDef = require('./defines');
import Simulation = require('./simulation');
import RoleStruct = require('../role/role_struct');
import ArenaDef = require('../arena/defines');

var cm = require('../../../config').configMgr;

class PvPFight extends Fight.BaseFight {

    opponentId:number = 0;
    opponentPlayers:RoleStruct.FightPlayer[] = [];
    attackType:ArenaDef.ATTACK_TYPE = ArenaDef.ATTACK_TYPE.NORMAL_ATTACK;
    pvpType:ArenaDef.PVP_FIGHT_TYPE = ArenaDef.PVP_FIGHT_TYPE.NULL;

    constructor(pvpType:ArenaDef.PVP_FIGHT_TYPE) {
        super();
        this.opponentPlayers = [];
        this.currentFightRound = new Fight.FightRound();
        this.pvpType = pvpType;
    }

    public initFight(opponentId:number,
                     fightTeam:RoleStruct.FightTeam,
                     attackType:ArenaDef.ATTACK_TYPE):void {

        this.opponentId = opponentId;
        this.opponentPlayers = fightTeam.fightPlayers;
        this.attackType = attackType;
    }

    public startFight():void {
        // check stageID
        this.currentFightRound.newRound();
        this.currentFightRound.startRound();
    }

    public finishFight(accountId:number,
                       roundContext:Simulation.RoundContext,
                       heroList:Simulation.Player[],
                       totalRound:number):void {

        var team:{[side:number]:Simulation.Player[]} = {};
        team[FightDef.SIDE.LEFT] = this.createOpponentTeam();
        team[FightDef.SIDE.RIGHT] = heroList;
        if (this.attackType === ArenaDef.ATTACK_TYPE.POWER_ATTACK) {
            this.currentFightRound.finishRound(accountId, roundContext, team, totalRound, 0, 1.5);
        } else {
            this.currentFightRound.finishRound(accountId, roundContext, team, totalRound);
        }
    }

    public getResult():FightDef.RESULT {
        var simulation = this.currentFightRound.getSimulation();
        return simulation ? simulation.getResult() : FightDef.RESULT.LOSS;
    }

    private createOpponentTeam():Simulation.Player[] {
        var opponentTeam:Simulation.Player[] = [];
        this.opponentPlayers.forEach((player) => {
            opponentTeam.push(Fight.createPlayerByFightPlayer(player));
        });
        return opponentTeam;
    }

    public getSideDeathCount(side:FightDef.SIDE):number {
        var healthList = this.getSideHealth(side);
        var count = 0;
        healthList.forEach((health:FightDef.HealthCacheItem) => {
            if (health.currentHp <= 0) {
                ++count;
            }
        });
        return count;
    }

}

export = PvPFight;
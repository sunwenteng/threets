/**
 * Created by liang on 7/4/16.
 */
import Fight = require('./fight');
import RoleStruct = require('../role/role_struct');
import Role = require("../role");
import Simulation = require('./simulation');
import FightDef = require('./defines');

class RaidFight extends Fight.BaseFight {
    opponentId:number = 0;
    opponentPlayers:RoleStruct.FightPlayer[] = [];

    constructor() {
        super();
        this.opponentPlayers = [];
        this.currentFightRound = new Fight.FightRound();
    }

    public initFight(opponentId:number,
                        fightTeam:RoleStruct.FightTeam):void {
        this.opponentId = opponentId;
        this.opponentPlayers = fightTeam.fightPlayers;
    }

    public startFight():void {
        this.currentFightRound.newRound();
        this.currentFightRound.startRound();
    }

    public finishFight(accoutId:number,
                        roundContext:Simulation.RoundContext,
                        heroList:Simulation.Player[],
                        totalRound:number):void {
        var team:{[side:number]:Simulation.Player[]} = {};
        team[FightDef.SIDE.LEFT] = this.createOpponentTeam();
        team[FightDef.SIDE.RIGHT] = heroList;
        this.currentFightRound.finishRound(accoutId, roundContext, team, totalRound);
    }

    private createOpponentTeam():Simulation.Player[] {
        var opponentTeam:Simulation.Player[] = [];
        this.opponentPlayers.forEach((player) => {
            opponentTeam.push(Fight.createPlayerByFightPlayer(player));
        });
        return opponentTeam;
    }
}
export = RaidFight;
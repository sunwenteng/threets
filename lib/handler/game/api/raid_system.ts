/**
 * Created by liang on 7/4/16.
 */
import Universal = require('../universal');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Role = require('../role');
import RoleSystem = require('./role_system');
import RoleStruct = require('../role/role_struct');
import Simulation = require('../fight/simulation');
import Fight = require('../fight/fight');

export function selectTeam(role:Role, pack:any, done):void {
    role.raid.selectTeam(pack.team);
    done();
}

export function sendOnlinePacket(role:Role):void {
    role.sendPacket(role.raid.buildOnlineInfoPacket(role));
}

export function initRaid(role:Role, packet:any, done):void {
    var playerStatus = {
        score: role.raid.playerStatus.score,
        winCount: role.raid.playerStatus.winCount,
        loseCount: role.raid.playerStatus.loseCount,
        searchTime: role.raid.playerStatus.searcTime,
        protectTime: role.raid.playerStatus.protectTime
    };
    var pck = {
        playerStatus: playerStatus,
        searchCount: role.raid.searchCount
    };
    done(null,pck);
}

///TODO search
export function searchOpponents(role:Role, packet:any, done):void {

    role.raid.fetchOpponentInfo(role, (err, info:any[]) => {
        if (err) return done(err);

        done(null, {
            opponentList: info,
            searchCount: role.raid.searchCount
        });
    });
}

export function startFight(role:Role, packet:any, done):void {
    var opponentId = packet.opponentId;
    var isRaidFight = true;

    RoleSystem.fetchRoleFightTeam(opponentId, isRaidFight, (err, res) => {
        if (err) return done(err);

        var pck:any = {heros: []};

        if (res.fightPlayers && res.fightPlayers.length > 0) {

            try {
                role.raid.startFight(opponentId, res);
                pck.randomSeed = role.raid.raidFight.getRandomSeed();

                res.fightPlayers.forEach((player:RoleStruct.FightPlayer) => {
                    var fightPlayerNet = new RoleStruct.FightPlayerNet();
                    fightPlayerNet.loadFromCenterFightPlayer(player);
                    pck.heros.push(fightPlayerNet.buildNetMsg());
                });
            } catch (err) {
                return done(err);
            }

        } else {
            return done({ code: ERRC.FIGHT.OTHER_SIDE_TEAM_ERROR });
        }

        role.raid.opponentId = opponentId;
        role.raid.raidCount = 0;
        done(null, pck);
    });
}

export function finishFight(role:Role, packet:any, done):void {
    var result = packet.result;
    var totalRound = packet.totalRound;
    var roundContext:Simulation.RoundContext = new Simulation.RoundContext();
    roundContext.useSlayRound = Fight.transformClientRoundToServer(packet.useSlayRound);

    role.raid.finishFight(role, roundContext, totalRound, result, (err, res) => {
        if (err) done(err, null);

        done(null, res);
    });
}
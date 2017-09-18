import log = require('../../../util/log');

import ERRC = require('../../../util/error_code');

import RoleSystem = require('../api/role_system');
import RoleStruct = require('../role/role_struct');

import ArenaGlobalMgr = require('../arena/arena_global_mgr');
import BossGlobalMgr = require('../boss/boss_global_mgr');

export function seeProfile(session, request:any, done:(err, res)=>void) {
    var accountId = request.accountId;

    RoleSystem.fetchRoleProfile(accountId, (err, profile) => {
        var response:{error?:number; profile?:RoleStruct.Profile} = {};
        if (err) {
            response.error = ERRC.COMMON.UNKNOWN;
        } else {
            response.profile = profile;
        }
        done(err, response);
    });
}

export function fetchRoleFightTeam(session, request:any, done:(err, res) =>void) {
    var accountId = request.accountId;

    var isRaidFight = false;
    RoleSystem.fetchRoleFightTeam(accountId, isRaidFight, (err, fightTeam) => {
        var response:{error?:number; fightPlayers?:RoleStruct.FightPlayer[]} = {};
        if (err) {
            response.error = ERRC.COMMON.UNKNOWN;
        } else {
            response.fightPlayers = fightTeam.fightPlayers;
        }
        done(err, response);
    });
}

export function arenaUpdateTournament(session, request:any, done:(err, res) =>void) {
    ArenaGlobalMgr.updateArenaTournament((err) => {
        done(err, {});
    });
}

export function writeRobot(session, request:any, done:(err, res) =>void) {
    ArenaGlobalMgr.writeType3RobotToRedis(request.tournamentId);
    done(null, {});
}

export function updateWorldBoss(session, request:any, done:(err, res) =>void) {
    BossGlobalMgr.updateWorldBoss((err) => {
        done(err, {});
    });
}

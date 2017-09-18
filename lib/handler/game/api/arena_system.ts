import async = require('async');
import pbstream = require('node-protobuf-stream');

// src/util
import log = require('../../../util/log');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Enum = require('../../../util/enum');
import Time = require('../../../util/time');

// src/database
//import WorldDB = require('../../../database/impl/world_db');
import DB = require('../../../database/database_manager');

// src/gameserver
import Role = require('../role');
//import CenterClient = require('../center_client');
import ServiceManager = require('../../../service/service_manager');
import Universal = require('../universal');
import LeaderboardMgr = require('../leaderboard_mgr');
import Fight = require('../fight/fight');
import Simulation = require('../fight/simulation');

// src/handler/api/**
import RoleStruct = require('../role/role_struct');
import ResourceMgr = require('../resource/resource_mgr');
import ArenaGlobalMgr = require('./../arena/arena_global_mgr');
import ArenaStruct = require('./../arena/arena_struct');
import TimeDef = require('../time/defines');
import ArenaDef = require('./../arena/defines');
import RoleSystem = require('./role_system');

export function initSystem(cb:(err)=>void):void {
    ArenaGlobalMgr.initArenaTournament(cb);
}

export function sendOnlinePacket(role:Role):void {
    var Message = pbstream.get('.Api.arena.updateTournamentInfo.Notify');
    role.sendPacket(new Message({
        tournamentId: ArenaGlobalMgr.arenaTournament.tournamentId,
        tournamentProgress: ArenaGlobalMgr.arenaTournament.progress
    }));
    role.sendPacket(role.arena.buildOnlineInfoPacket(role));
}

export function initInfo(role:Role, packet:any, done):void {
    ArenaGlobalMgr.checkArenaOpen(role);

    role.arena.fetchScoreAndRank(role.accountId, (err, rank, score) => {
        if (err) return done(err);

        var pck:any = {};
        if (score) {
            role.arena.tournamentData.score = score;
        }

        pck.score = score || 0;
        pck.rank = rank || 0;

        if (role.arena.isWinStreakTimeOut()) {
            role.arena.tournamentData.winStreak = 0;
        }
        pck.winStreak = role.arena.tournamentData.winStreak;
        pck.streakEndTime = role.arena.getStreakEndTime();

        var energy = role.getResCount(Enum.RESOURCE_TYPE.ARENA_ENERGY);
        if (energy < Universal.GLB_ARENA_ENERGY_MAX_COUNT) {
            pck.recoverEnergyTime = role.arenaEnergyCounter ?
                role.arenaEnergyCounter.leftSecondForCount(Time.gameNow(), Universal.GLB_ARENA_ENERGY_MAX_COUNT - energy) :
                0;
        } else {
            pck.recoverEnergyTime = 0;
        }
        done(null, pck);
    });
}

export function initBattleList(role:Role, packet:any, done):void {
    ArenaGlobalMgr.checkArenaOpen(role);

    role.arena.fetchOpponentInfo(role, (err, info:any[]) => {
        if (err) return done(err);

        done(null, {
            opponentList: info
        });
    });
}

export function selectTeam(role:Role, pack:any, done):void {
    ArenaGlobalMgr.checkArenaOpen(role);
    role.arena.selectTeam(pack.team);
    done();
}

export function startFight(role:Role, packet:any, done):void {
    ArenaGlobalMgr.checkArenaOpen(role);

    var opponentId = packet.opponentId,
        fightType = packet.fightType;

    var consumeNum = 0;
    if (ArenaDef.ATTACK_TYPE.NORMAL_ATTACK == fightType) {
        consumeNum = ArenaDef.ATTACK_CONSUME.NORMAL_CONSUME;
    }
    else if (ArenaDef.ATTACK_TYPE.POWER_ATTACK == fightType) {
        consumeNum = ArenaDef.ATTACK_CONSUME.POWER_CONSUME;
    }
    else {
        throw new CustomError.UserError(ERRC.ARENA.FIGHT_TYPE_NOT_EXIST, {
            msg: 'ARENA.FIGHT_TYPE_NOT_EXIST, fightType=' + fightType
        });
    }

    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.ARENA_ENERGY] = consumeNum;

    // 扣除资源  资源不足会抛异常
    ResourceMgr.checkHasEnoughResource(role, consume);

    var req = {accountId: opponentId};
    var isRaidFight = false;

    RoleSystem.fetchRoleFightTeam(opponentId, isRaidFight, (err, res) => {
        if (err) return done(err);

        var pck:any = {heros: []};

        if (res.fightPlayers && res.fightPlayers.length > 0) {

            try {
                var now = Time.gameNow();
                role.arena.startFight(role, opponentId, res, fightType);
                pck.randomSeed = role.arena.pvpFight.getRandomSeed();
                pck.fightType = fightType;

                res.fightPlayers.forEach((player:RoleStruct.FightPlayer) => {
                    var fightPlayerNet = new RoleStruct.FightPlayerNet();
                    fightPlayerNet.loadFromCenterFightPlayer(player);
                    pck.heros.push(fightPlayerNet.buildNetMsg());
                });

                ResourceMgr.minusConsume(role, Enum.USE_TYPE.ARENA_START_FIGHT, consume);

                var current = role.getResCount(Enum.RESOURCE_TYPE.ARENA_ENERGY);
                if (current < Universal.GLB_ARENA_ENERGY_MAX_COUNT && !role.arenaEnergyCounter) {
                    role.arenaEnergyCounter = new Time.RoundCounter(Universal.GLB_ARENA_RECOVER_ENERGY_INTERVAL);
                    role.arenaEnergyCounter.setStart(Time.gameNow());
                }

                pck.arenaEnergyNextTime = role.arenaEnergyCounter ? role.arenaEnergyCounter.leftSecondForCount(now, 1) : 0;

            } catch (err) {
                return done(err);
            }

        } else {
            return done({ code: ERRC.FIGHT.OTHER_SIDE_TEAM_ERROR });
        }

        role.sendUpdatePacket(true);

        done(null, pck);
    });

}

export function finishFight(role:Role, packet:any, done):void {
    ArenaGlobalMgr.checkArenaOpen(role);

    var result = packet.result;
    var totalRound = packet.totalRound;
    var roundContext:Simulation.RoundContext = new Simulation.RoundContext();
    roundContext.useSlayRound = Fight.transformClientRoundToServer(packet.useSlayRound);

    role.arena.finishFight(role, roundContext, totalRound, result, (err, scoreResult) => {
        role.sendUpdatePacket(true);
        var pack:any = {
            earned: scoreResult.earned,
            winTimesScore: scoreResult.winStreakScore,
            revengeScore: scoreResult.revengeScore,
            totalScore: scoreResult.totalScore,
            winStreak: role.arena.tournamentData.winStreak
        };
        if (scoreResult.mileStoneRewardID) pack.scoreRewardGet = scoreResult.mileStoneRewardID;
        if (scoreResult.winStreakRewardID) pack.winTimesRewardGet = scoreResult.winStreakRewardID;
        done(null, pack);
    });
}

export function rankList(role:Role, packet:any, done):void {
    ArenaGlobalMgr.checkArenaOpen(role);

    var rankType = packet.rankType,
        page = packet.page;

    var leaderboard = LeaderboardMgr.arenaScoreLB;

    var pck:any = {};
    switch (rankType) {
        case ArenaDef.RANK_TYPE.TOP10:
            LeaderboardMgr.fetchLeaderboardContent(leaderboard, Universal.AVATAR_TYPE.ARENA, 1, (err, size, result) => {
                if (err) return done(err);

                pck.rankType = rankType;
                pck.roles = result;
                pck.currentPage = 1;
                pck.totalPage = Math.ceil(size / 10);

                done(null, pck);
            });
            break;
        case ArenaDef.RANK_TYPE.IN_FRIEND:
            sendFriendRankList(role, page, done);
            break;
        case ArenaDef.RANK_TYPE.IN_WORLD:
            async.waterfall([
                (next) => {
                    if (page === 0) {
                        leaderboard.queryRank(role.accountId, (err, rank) => {
                            next(err, LeaderboardMgr.getPageByRank(rank));
                        });
                    } else {
                        next(null, page);
                    }
                },
                (page, next) => {
                    LeaderboardMgr.fetchLeaderboardContent(leaderboard, Universal.AVATAR_TYPE.ARENA, page, (err, size, result) => {
                        if (err) return next(err);

                        pck.rankType = rankType;
                        pck.roles = result;
                        pck.currentPage = page;
                        pck.totalPage = LeaderboardMgr.getPageByRank(size);
                        next(null, pck);
                    });
                }
            ], (err, pck) => {
                done(err, pck);
            });
            break;
    }
}

function sendFriendRankList(role:Role, page:number, done):void {

    var friendIdList:number[] = [];
    Object.keys(role.friends.friendIdMap).forEach((accountId) => {
        friendIdList.push(parseInt(accountId));
    });

    role.arena.refreshFriendLeaderboard(role.accountId, friendIdList, (err) => {
        if (err) return done(err);

        var currentPage = 0;
        if (page === 0) {
            currentPage = Math.floor((role.arena.selfRankInFriend - 1) / 10) + 1;
        } else {
            currentPage = page;
        }
        var start = (currentPage - 1) * 10;

        var pck:any = {};
        pck.rankType = ArenaDef.RANK_TYPE.IN_FRIEND;
        pck.roles = role.arena.friendLeaderboard.slice(start, start + 10);
        pck.currentPage = currentPage;
        pck.totalPage = Math.ceil(role.arena.friendLeaderboard.length / ArenaGlobalMgr.LEADERBOARD_PAGE_SIZE);
        done(null, pck);
    });

}
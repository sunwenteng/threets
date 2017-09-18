/**
 * Created by liang on 7/4/16.
 */
import Universal = require('../universal');
import Fight = require('../fight/fight');
import RoleStruct = require('../role/role_struct');
import Role = require('../role');
import RaidFight = require('../fight/raid_fight');
import Time = require('../../../util/time');
import pbstream = require('node-protobuf-stream');
import Simulation = require('../fight/simulation');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import HeroSuite = require('../hero/hero_suite');
import FightDef = require('../fight/defines');
import RaidGlobalMgr = require('./raid_global_mgr');
import log = require('../../../util/log');
import PlayerInfoMgr = require('../../../cluster/player_info_mgr');
import LeaderboardMgr = require('../leaderboard_mgr');
import async = require('async');
import Enum = require('../../../util/enum');
import ResourceMgr = require('../resource/resource_mgr');
import RoleManager = require('../role_manager');
var cm = require('../../../config').configMgr;

export class PlayerStatus {
    score:number = 0;
    winCount:number = 0;
    loseCount:number = 0;
    searcTime:number = 0;
    protectTime:number = 0;
}

export class Opponent {
    accountId:number = 0;
    level:number = 0;
    username:string = '';
    socre:number = 0;
    raidGold:number = 0;
    avatar:RoleStruct.Avatar = new RoleStruct.Avatar();
}

export class RaidMgr {
    fightTeam:Universal.FightTeam = new Universal.FightTeam();
    raidFight:RaidFight = null;
    playerStatus:PlayerStatus = new PlayerStatus();
    opponentList:{[accountId:number]:Opponent} = {};
    opponentId:number = 0;      //抢夺对手(进行战斗)的accountId
    searchCount:number = 0;
    raidCount:number = 0;       //被抢次数
    isLock:boolean = false;

    constructor() {
    }

    public selectTeam(team:Universal.FightTeam):void {
        Fight.checkFightTeamLength(team, 0);
        this.fightTeam = team;
    }

    public startFight(opponentId:number,
                      fightTeam:RoleStruct.FightTeam):void {
        this.raidFight = new RaidFight();
        this.raidFight.initFight(opponentId, fightTeam);
        this.raidFight.startFight();
    }

    public finishFight(role:Role,
                       roundContext:Simulation.RoundContext,
                       totalRound:number,
                       result:number,
                       callback:(err, res:any)=>void):void {
        var self = this;
        if (!self.raidFight) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'FIGHT.FIGHT_NOT_EXIST'
            });
        }

        var team = self.fightTeam, i, hero, elementObj = {};
        var heroArray:Simulation.Player[] = [], player:Simulation.Player = null;
        for (i = 0; i < team.heros.length; i += 1) {
            hero = role.heros.getHero(team.heros[i]);
            if (!hero) {
                throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                    msg: 'HERO.UID_NOT_FOUND, uid=' + team.heros[i]
                });
            }
            player = Fight.createPlayerByHero(role, hero, HeroSuite.SuiteType.arena);
            player.natureProperty.forEach((element) => {
                elementObj[element] = true;
            });
            heroArray.push(player);
        }

        self.raidFight.finishFight(role.accountId, roundContext, heroArray, totalRound);
        self.raidFight.checkFightResult(result);

        RoleManager.read(self.opponentId, (err, opp) => {
            if (err) {
                log.uError(opp.accountId, 'RaidOpponent', 'randomOpponent error: ' + err.stack);
                callback(err, null);
            }

            var pck:any = {};

            try {
                switch(result) {
                    case FightDef.RESULT.FLEE:
                    case FightDef.RESULT.LOSS:
                        self.playerStatus.loseCount += 1;
                        opp.raid.playerStatus.winCount += 1;
                        break;
                    case FightDef.RESULT.VICTORY:
                        self.playerStatus.winCount += 1;
                        opp.raid.playerStatus.loseCount += 1;

                        var raidGold:Universal.Resource = {};
                        raidGold[Enum.RESOURCE_TYPE.GOLD] = self.opponentList[self.opponentId].raidGold;
                        ResourceMgr.applyConsumeAndReward(role, Enum.USE_TYPE.UNDEFINED, {}, raidGold);
                        ResourceMgr.applyConsume(opp, Enum.USE_TYPE.UNDEFINED, raidGold);
                        pck = {
                            raidGold: self.opponentList[self.opponentId].raidGold
                        };
                        break;
                }
            }
            catch(err) {
                callback(err,null);
            }
            callback(null, pck);
        });
    }

    public fetchOpponentInfo(role:Role, callback:(err, info:Opponent[])=>void):void {
        this.refreshOpponent(role, (err) => {
            if (err) {
                log.uError(role.accountId, 'RaidOpponent', 'refreshOpponent error: ' + err.stack);
            }

            var opponentIds = Object.keys(this.opponentList);
            var packetOpponentList:Opponent[] = [];

            async.each(
                opponentIds,
                (key, next) => {
                    PlayerInfoMgr.fetchNormalMode(parseInt(key), HeroSuite.SuiteType.arena, (err, normalMode) => {
                        if (err)
                            return next();

                        this.opponentList[key].avatar.hairType = normalMode.avatar.hairType;
                        this.opponentList[key].avatar.hairColor = normalMode.avatar.hairColor;
                        this.opponentList[key].avatar.faceType = normalMode.avatar.faceType;
                        this.opponentList[key].avatar.skinColor = normalMode.avatar.skinColor;
                        this.opponentList[key].avatar.armorID = normalMode.suite.armor.ID;
                        this.opponentList[key].avatar.armorLevel = normalMode.suite.armor.level;

                        packetOpponentList.push(this.opponentList[key]);
                        next();
                    });
                },
                (err) => {
                    callback(err, packetOpponentList);
                }
            );

        });
    }

    private refreshOpponent(role:Role, callback:(err)=>void):void {
        this.opponentList = {};
        var opponentIds = Object.keys(this.opponentList);

        if (opponentIds.length !== 0) {
            this.searchCount += 1;
            this.opponentList = {};
        }
        else {
            this.searchCount = 0;
        }
        var searchCount = this.searchCount > 10 ? 10 : this.searchCount;
        var searchCost = 0;
        //读表
        Object.keys(cm.Raid_Golddb.all()).forEach((ID) => {
            if (cm.Raid_Golddb.get(parseInt(ID)).ID === searchCount) {
                searchCost = cm.Raid_Golddb.get(parseInt(ID)).Json_count;
            }
        });

        var consume:Universal.Resource = {};
        consume[Enum.RESOURCE_TYPE.GOLD] = searchCost;
        ResourceMgr.applyConsume(role, Enum.USE_TYPE.UNDEFINED, consume);

        async.waterfall([
            (next) => {
                RaidGlobalMgr.randomOpponent(role.accountId, [], (err, list:{[accountId:number]:Opponent}) => {
                    if (err) {
                        next(err);
                    }
                    this.opponentList = list;
                    next(null);
                });
            }
        ], (err) => {
            callback(err);
        });
    }

    public setMatchScoreIfNotExist(accountId:number, cb:(err)=>void):void {
        var matchLB = LeaderboardMgr.raidMatchLB;
        matchLB.exists(accountId, (err, exist) => {
            if (err) {
                cb(err);
                return;
            }

            if (!exist) {
                var rating = Universal.calcEloRating(0);
                matchLB.setScore(accountId, rating, (err) => {
                    log.uDebug(accountId, 'MatchScoreCheck', 'rating=' + rating + ', accountId=' + accountId);
                    cb(err);
                });
            } else {
                cb(null);
            }
        });
    }

    public buildOnlineInfoPacket(role:Role):any {
        var playerStatus = {
            score: role.raid.playerStatus.score,
            winCount: role.raid.playerStatus.winCount,
            loseCount: role.raid.playerStatus.loseCount,
            searchTime: role.raid.playerStatus.searcTime,
            protectTime: role.raid.playerStatus.protectTime
        };

        var Message = pbstream.get('.Api.raid.onlineInfo.Notify');
        var pck = new Message({
            team: this.fightTeam,
            playerStatus: playerStatus
        });
        return pck;
    }

    public buildDBMsg():any {
        var Arena = pbstream.get('.DB.raid');
        var pck = new Arena({
            fightTeam: this.fightTeam
        });
        return pck;
    }

    public loadDBMsg(msg:any) {
        this.fightTeam = msg.fightTeam;
    }
}
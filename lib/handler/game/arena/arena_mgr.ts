// common
import async = require('async');
import pbstream = require('node-protobuf-stream');

import Util = require('../../../util/game_util');
import Time = require('../../../util/time');
import log = require('../../../util/log');
import Enum = require('../../../util/enum');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
//import CenterDB = require('../../../database/impl/center_db');
import DB = require('../../../database/database_manager');

// struct
import Universal = require('../universal');
import Role = require('../role');
import ArenaDef = require('./defines');
import PvPFight = require('../fight/pvp_fight');
import RoleStruct = require('../role/role_struct');
import QuestDef = require('../quest/defines');
import AchievementDef = require('../achievement/defines');
import Fight = require('../fight/fight');
import HeroDef = require('../hero/defines');
import Simulation = require('../fight/simulation');
import FightDef = require('../fight/defines');
import Loot = require('../loot/loot');
import ArenaStruct = require('./arena_struct');
import KillerList = require('../../../redis/killer_list');
import PlayerInfoMgr = require('../../../cluster/player_info_mgr');

// manager
import ResourceMgr = require('../resource/resource_mgr');
import LeaderboardMgr = require('../leaderboard_mgr');
import ArenaGlobalMgr = require('./arena_global_mgr');
import LootMgr = require('../loot/loot_mgr');
import RobotGlobalMgr = require('../robot/robot_global_mgr');
import HeroSuite = require('../hero/hero_suite');

var cm = require('../../../config').configMgr;

// 联赛历史信息
class TournamentHistory {
    tournamentId:number = 0;
    rank:number = 0;
    rewardProgress:Universal.REWARD_PROGRESS = Universal.REWARD_PROGRESS.NOT_GAIN;
}

class TournamentGainInfo {
    milestone:{[ID:number]:boolean} = {};
}

// 当次联赛数据
class TournamentData {
    tournamentId:number = 0;
    score:number = 0;
    rank:number = 0;
    winStreak:number = 0;
    lastWinTime:number = 0;
    gainInfo:TournamentGainInfo = new TournamentGainInfo();

    public startNewTournament(tournamentId:number):void {
        this.tournamentId = tournamentId;
        this.score = 0;
        this.rank = 0;
        this.winStreak = 0;
        this.lastWinTime = 0;
        this.gainInfo.milestone = {};
    }

    public buildDBMsg():any {
        var gainMilestoneID:number[] = [];
        Object.keys(this.gainInfo.milestone).forEach((ID) => {
            gainMilestoneID.push(parseInt(ID));
        });
        var msg:any = {};
        msg.tournamentId = this.tournamentId;
        msg.score = this.score;
        msg.rank = this.rank;
        msg.winStreak = this.winStreak;
        msg.lastWinTime = this.lastWinTime;
        msg.gainMilestoneID = gainMilestoneID;
        return msg;
    }

    public loadDBMsg(msg:any) {
        this.tournamentId = msg.tournamentId;
        this.score = msg.score;
        this.rank = msg.rank;
        this.winStreak = msg.winStreak;
        this.lastWinTime = msg.lastWinTime;
        this.gainInfo.milestone = {};
        msg.gainMilestoneID.forEach((ID) => {
            this.gainInfo.milestone[ID] = true;
        });
    }
}

// 所有联赛记录
class TournamentRecord {
    winCount:number = 0;
    lossCount:number = 0;
    revengeWinCount:number = 0;
}

// 对手
class Opponent {
    accountId:number = 0;
    isRevenge:boolean = false;
}

class OpponentInfo {
    accountId:number = 0;
    avatar:Universal.Avatar = new Universal.Avatar();
    level:number = 0;
    username:string = '';
    achievementID:number = 0;

    score:number = 0;
    rank:number = 0;
    isRevenge:boolean = false;
}

class ScoreResult {
    earned:number = 0;
    winStreakScore:number = 0;
    revengeScore:number = 0;
    totalScore:number = 0;
    winStreakRewardID:number = 0;
    mileStoneRewardID:number = 0;
}

class ArenaMgr {

    fightTeam:Universal.FightTeam = new Universal.FightTeam();

    tournamentData:TournamentData = new TournamentData();
    tournamentHistory:TournamentHistory[] = [];
    tournamentRecord:TournamentRecord = new TournamentRecord();

    opponentList:{[accountId:number]:Opponent} = {};

    pvpFight:PvPFight = null;

    // memory
    friendLeaderboard:Universal.LeaderboardItem[] = [];
    lastUpdateFriendLeaderboard:number = 0;
    selfRankInFriend:number = 0;

    constructor() {
    }

    public selectTeam(team:Universal.FightTeam):void {
        Fight.checkFightTeamLength(team, 0);
        this.fightTeam = team;
    }

    public checkRefreshTournament(role:Role, callback:(err) => void):void {
        if (ArenaGlobalMgr.arenaTournament.tournamentId !== this.tournamentData.tournamentId) {
            async.waterfall([
                (next) => {
                    if (this.tournamentData.tournamentId > 0) {
                        var tournamentId = this.tournamentData.tournamentId;
                        DB.Arena.fetchTournamentHistoryRank(role.accountId, tournamentId, (err, rank) => {
                            if (err) {
                                next(err);
                                return;
                            }
                            var history:TournamentHistory = new TournamentHistory();
                            history.tournamentId = this.tournamentData.tournamentId;
                            history.rank = rank;
                            history.rewardProgress = Universal.REWARD_PROGRESS.NOT_GAIN;
                            this.tournamentHistory.push(history);

                            var groupID = ArenaGlobalMgr.getGroupIDByRank(rank);
                            var reward = ArenaGlobalMgr.getGroupReward(groupID);
                            ResourceMgr.applyReward(role, Enum.USE_TYPE.ARENA_RANK_REWARD, reward);
                            history.rewardProgress = Universal.REWARD_PROGRESS.HAS_GAIN;

                            log.uInfo(role.accountId, 'BossRankReward', {
                                tournamentId: history.tournamentId,
                                rank: rank,
                                rankGroup: groupID,
                                reward: reward
                            });

                            next(null);
                        });
                    } else {
                        next(null);
                    }
                },
                (next) => {
                    this.opponentList = {};
                    this.tournamentData.startNewTournament(ArenaGlobalMgr.arenaTournament.tournamentId);
                    next(null);
                }
            ], (err) => {
                callback(err);
            });

        } else {
            callback(null);
        }
    }

    public startFight(role:Role, opponentId:number,
                      fightTeam:RoleStruct.FightTeam,
                      attackType:ArenaDef.ATTACK_TYPE):void {
        if (!ArenaGlobalMgr.canArenaTournamentFight()) {
            throw new CustomError.UserError(ERRC.ARENA.NOT_OPEN, {
                msg: 'ARENA.NOT_OPEN, can not start tournament fight'
            });
        }

        this.pvpFight = new PvPFight(ArenaDef.PVP_FIGHT_TYPE.ARENA);
        this.pvpFight.initFight(opponentId, fightTeam, attackType);
        this.pvpFight.startFight();

        role.quests.updateQuest(role, QuestDef.CriteriaType.TAKE_PART_IN_N_ARENA_FIGHT, null, 1);
    }

    public finishFight(role:Role,
                       roundContext:Simulation.RoundContext,
                       totalRound:number,
                       result:number,
                       callback:(err, scoreResult:ScoreResult)=>void):void {
        if (!this.pvpFight) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'FIGHT.FIGHT_NOT_EXIST'
            });
        }

        var team = this.fightTeam, i, hero, elementObj = {};
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

        this.pvpFight.finishFight(role.accountId, roundContext, heroArray, totalRound);
        this.pvpFight.checkFightResult(result);

        var selfId = role.accountId;
        var opponentId = this.pvpFight.opponentId;
        var isRevenge = this.opponentList[opponentId].isRevenge;

        switch (result) {
            case FightDef.RESULT.FLEE:
            case FightDef.RESULT.LOSS:
                this.tournamentData.winStreak = 0;
                this.tournamentData.lastWinTime = 0;
                this.tournamentRecord.lossCount += 1;
                break;
            case FightDef.RESULT.VICTORY:
                if (this.isWinStreakTimeOut()) {
                    this.tournamentData.winStreak = 1;
                } else {
                    this.tournamentData.winStreak += 1;
                }

                this.tournamentData.lastWinTime = Time.gameNow();
                this.tournamentRecord.winCount += 1;

                if (this.pvpFight.attackType === ArenaDef.ATTACK_TYPE.POWER_ATTACK) {
                    this.tournamentRecord.revengeWinCount += 1;
                }

                role.quests.updateQuest(role, QuestDef.CriteriaType.WIN_N_ARENA_FIGHT, null, 1);
                role.quests.updateQuest(role, QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITHOUT_X_ELEMENT, elementObj, 1);
                role.quests.updateQuest(role, QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_X_ELEMENT, elementObj, 1);
                if (isRevenge) {
                    role.quests.updateQuest(role, QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_REVENGE, null, 1);
                }
                var simulation = this.pvpFight.currentFightRound.getSimulation();
                var oppoDeathTypeList:FightDef.DeathType[] = simulation.getSideDeathTypeList(FightDef.SIDE.LEFT);
                if (oppoDeathTypeList.length > 0 && oppoDeathTypeList[oppoDeathTypeList.length - 1] === FightDef.DeathType.SLAY) {
                    role.quests.updateQuest(role, QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_SLAY, null, 1);
                }

                if (this.pvpFight.getSideDeathCount(FightDef.SIDE.RIGHT) === 0) {
                    role.quests.updateQuest(role, QuestDef.CriteriaType.WIN_N_ARENA_FIGHT_WITH_NO_DEAD, null, 1);
                }

                role.achievements.updateAchievement(role, AchievementDef.TYPE.WIN_N_ARENA_BATTLES, 1);
                role.achievements.updateAchievement(role, AchievementDef.TYPE.EARN_N_STREAK, this.tournamentData.winStreak);

                // 加入击杀列表
                if (!Universal.isRobot(opponentId) && !isRevenge) {
                    var oppoKillerList:KillerList = new KillerList(opponentId);
                    oppoKillerList.addKiller(selfId, (err) => {
                    });
                }
                break;
        }

        role.quests.updateQuest(role, QuestDef.CriteriaType.EARN_N_ARENA_WIN_STREAK, null, this.tournamentData.winStreak);
        if (isRevenge) {
            role.quests.updateQuest(role, QuestDef.CriteriaType.TAKE_PART_IN_N_ARENA_FIGHT_WITH_REVENGE, null, 1);
        }

        delete this.opponentList[opponentId];

        this.handleFightResult(role, isRevenge, this.pvpFight, (err, scoreResult:ScoreResult) => {
            callback(err, scoreResult);
        });
    }

    public getPvPResult():FightDef.RESULT {
        return this.pvpFight ? this.pvpFight.getResult() : FightDef.RESULT.LOSS;
    }

    public isWinStreakTimeOut():boolean {
        return Time.gameNow() >= this.tournamentData.lastWinTime + Universal.GLB_WINSTREAK_COOLDOWN;
    }

    public handleFightResult(role:Role, isRevenge:boolean, fight:PvPFight, callback:(err, scoreResult:ScoreResult)=>void):void {

        if (!this.pvpFight) {
            callback(new Error('PvP fight not exist'), new ScoreResult());
            return;
        }

        if (ArenaGlobalMgr.arenaTournament.tournamentId !== this.tournamentData.tournamentId || !ArenaGlobalMgr.canArenaTournamentFight()) {
            callback(new Error('tournament expired'), new ScoreResult());
            return;
        }

        var scoreBoard = LeaderboardMgr.arenaScoreLB;
        var matchBoard = LeaderboardMgr.arenaMatchLB;

        var K = 1, selfRank = 0, oppoRank = 0;
        var result = fight.getResult();
        var Era = 0, Erb = 0;

        var selfId = role.accountId, oppoId = fight.opponentId;

        async.parallel([
            (next) => {
                matchBoard.queryScore(selfId, next);
            },
            (next) => {
                matchBoard.queryScore(oppoId, next);
            },
            (next) => {
                scoreBoard.queryRank(selfId, next);
            },
            (next) => {
                scoreBoard.queryRank(oppoId, next);
            }
        ], (err, res:number[]) => {
            if (err) {
                log.uError(role.accountId, 'ArenaFight', 'queryScore error ' + err['stack']);
                callback(err, new ScoreResult());
                return;
            }

            log.uTrace(role.accountId, 'ArenaFight', 'result=' + res);
            Era = res[0] || 0;
            Erb = res[1] || 0;
            selfRank = res[2] || 0;
            oppoRank = res[3] || 0;

            log.uTrace(role.accountId, 'ArenaFight', 'Era=' + Era + ', Erb=' + Erb + ', selfRank=' + selfRank);

            var groupID = ArenaGlobalMgr.getGroupIDByRank(selfRank);
            try {
                K = cm.arena_infodb.get(groupID).factork;
            } catch (err) {
                K = 1;
            }

            var Ea = 1 / (1 + Math.pow(10, (Erb - Era) / 400));
            var Eb = 1 / (1 + Math.pow(10, (Era - Erb) / 400));

            var Ra = 0, Rb = 0;
            if (result === FightDef.RESULT.VICTORY) {
                Ra = K * (1 - Ea);
                Rb = -Ra;
            }
            else {
                Rb = K * (1 - Eb);
                Ra = -Rb;
            }
            log.uTrace(role.accountId, 'ArenaFight', 'result=' + (result === FightDef.RESULT.VICTORY ? 'VICTORY' : 'NOT_VICTORY') +
                'K=' + K + ', Ea=' + Ea + ', Eb=' + Eb + ', Ra=' + Ra + ', Rb=' + Rb);

            // earnScore
            var scoreResult:ScoreResult = new ScoreResult();
            switch (result) {
                case FightDef.RESULT.LOSS:
                    scoreResult.earned = 10 * fight.getSideDeathCount(FightDef.SIDE.LEFT);
                    break;
                case FightDef.RESULT.FLEE:
                    scoreResult.earned = 0;
                    break;
                case FightDef.RESULT.VICTORY:
                    var baseScore = Math.floor(100 + Ra);
                    // earned
                    scoreResult.earned = baseScore;
                    // revengeScore
                    scoreResult.revengeScore = isRevenge ? Math.floor(baseScore * 0.5) : 0;
                    // winStreakScore
                    if (fight.pvpType === ArenaDef.PVP_FIGHT_TYPE.ARENA) {
                        var winStreakCoe = ArenaGlobalMgr.getWinStreakScoreCoe(this.tournamentData.winStreak);
                        scoreResult.winStreakScore = Math.floor(baseScore * winStreakCoe / 10000);
                    } else {
                        scoreResult.winStreakScore = 0;
                    }
                    break;
            }

            this.tournamentData.score += scoreResult.earned + scoreResult.revengeScore + scoreResult.winStreakScore;
            scoreResult.totalScore = this.tournamentData.score;

            role.quests.updateQuest(role, QuestDef.CriteriaType.EARN_N_ARENA_POINT, null, scoreResult.earned);
            if (result === FightDef.RESULT.VICTORY && oppoRank !== 0 && oppoRank < selfRank) {
                role.quests.updateQuest(role, QuestDef.CriteriaType.DEFEAT_N_OPPONENT_WITH_HIGHER_RANK, null, 1);
            }
            role.achievements.updateAchievement(role, AchievementDef.TYPE.EARN_N_ARENA_POINT, scoreResult.earned);

            if (selfId === 0) {
                log.uError(role.accountId, 'ArenaFight', 'scoreBoard.setScore, selfId=' + selfId + ', score=' + this.tournamentData.score +
                    'role.account=' + role.account);
            }

            var milestoneRewardForLog:Universal.Resource = {},
                winStreakRewardForLog:Universal.Resource = {};

            if (this.tournamentData.score > 0) {
                scoreBoard.setScore(selfId, this.tournamentData.score, (err) => {
                    log.sInfo('Arena', 'set score board error: ' + err);

                    //CenterDB.Leaderboard.updateArenaScore(selfId, this.tournamentData.score);
                });

                var config;
                try {
                    config = cm.arena_tournamentdb.get(ArenaGlobalMgr.arenaTournament.tournamentId);
                    var milestoneReward:number[] = ArenaGlobalMgr.getMilestoneRewardIDs(config.milestoneid,
                        this.tournamentData.score,
                        this.tournamentData.gainInfo.milestone);
                    if (milestoneReward.length > 0) {
                        var cf, reward:Universal.Resource = {};
                        for (var i = 0; i < milestoneReward.length; i += 1) {
                            cf = cm.arena_milestonedb.get(milestoneReward[i]);
                            reward = {};
                            if (cf.item1) reward[cf.item1] = cf.item_num1;
                            if (cf.item2) reward[cf.item2] = cf.item_num2;
                            if (cf.item3) reward[cf.item3] = cf.item_num3;
                            milestoneRewardForLog = reward;
                            ResourceMgr.applyReward(role, Enum.USE_TYPE.ARENA_MILESTONE, reward);
                            scoreResult.mileStoneRewardID = milestoneReward[i];
                            this.tournamentData.gainInfo.milestone[milestoneReward[i]] = true;
                        }
                    }
                } catch (err) {
                    if (err) {
                        log.uInfo(role.accountId, 'ArenaFight', 'milestoneScore=' + this.tournamentData.score + ', tournamentId=' + ArenaGlobalMgr.arenaTournament.tournamentId);
                        log.uError(role.accountId, 'ArenaFight', 'reward for milestone error: ' + err.message);
                    }
                }

                if (fight.pvpType === ArenaDef.PVP_FIGHT_TYPE.ARENA) {
                    try {
                        var winStreakRewardId = ArenaGlobalMgr.getWinStreakReward(this.tournamentData.winStreak);
                        if (winStreakRewardId) {
                            config = cm.arena_winstreakdb.get(winStreakRewardId);
                            var loot:Loot = LootMgr.rollLoot(config.lootid);
                            winStreakRewardForLog = loot.getLootResource();
                            ResourceMgr.applyReward(role, Enum.USE_TYPE.ARENA_WINSTREAK, loot.getLootResource());
                            scoreResult.winStreakRewardID = winStreakRewardId;
                        }
                    } catch (err) {
                        if (err) {
                            log.uInfo(role.accountId, 'ArenaFight', 'winStreak=' + this.tournamentData.winStreak + ', tournamentId=' + ArenaGlobalMgr.arenaTournament.tournamentId);
                            log.uError(role.accountId, 'ArenaFight', 'reward for winStreak error: ' + err.message);
                        }
                    }
                }
            }

            var pvpFight = this.pvpFight;
            log.uInfo(role.accountId, 'ArenaFightResult', {
                opponentId: pvpFight.opponentId,
                attackType: ArenaGlobalMgr.stringifyAttackType(pvpFight.attackType),
                pvpType: ArenaGlobalMgr.stringifyPvPType(pvpFight.pvpType),
                result: Fight.stringifyResult(result),
                milestoneScore: this.tournamentData.score,
                milestoneReward: milestoneRewardForLog,
                winStreak: this.tournamentData.winStreak,
                winStreakReward: winStreakRewardForLog
            });

            matchBoard.incrScore(selfId, Ra, (err, newScore) => {
                if (err) return ;
                //CenterDB.Leaderboard.updateMatchScore(selfId, Math.floor(newScore));
            });
            matchBoard.incrScore(oppoId, Rb, (err, newScore) => {
                if (err) return ;
                //CenterDB.Leaderboard.updateMatchScore(oppoId, Math.floor(newScore));
            });
            callback(null, scoreResult);
        });
    }

    public fetchScoreAndRank(accountId:number, callback:(err, rank, score)=>void):void {
        var scoreBoard = LeaderboardMgr.arenaScoreLB;
        async.parallel([
            (next) => {
                scoreBoard.queryRank(accountId, next);
            },
            (next) => {
                scoreBoard.queryScore(accountId, next);
            }
        ], (err, result:number[]) => {
            if (err) callback(err, 0, 0);
            else callback(null, (result[0]) ? result[0] : 0, result[1] ? result[1] : 0);
        });
    }

    public getStreakEndTime():number {
        var now = Time.gameNow(), last = this.tournamentData.lastWinTime;
        return last ? (last + 600 > now ? last + 600 - now : 0) : 0;    // TODO 600 need replace
    }

    public isRevenge(opponentId:number):boolean {
        var oppo = this.opponentList[opponentId];
        return oppo ? oppo.isRevenge : false;
    }

    private addOpponent(accountId:number, isRevenge:boolean):void {
        var opponent = new Opponent();
        opponent.accountId = accountId;
        opponent.isRevenge = isRevenge;
        this.opponentList[accountId] = opponent;
    }

    private refreshOpponent(role:Role, callback:(err)=>void):void {
        var opponentIds = Object.keys(this.opponentList);
        if (opponentIds.length < ArenaGlobalMgr.MAX_OPPONENT_SIZE) {    // 对手数量不足
            var currentOpponentList:number[] = [],
                revengeCount = 0, i,
                hasRevengeRobot:boolean = false;
            for (i = 0; i < opponentIds.length; i += 1) {
                var id = parseInt(opponentIds[i]);
                currentOpponentList.push(id);
                if (this.opponentList[id].isRevenge) {
                    revengeCount += 1;

                    if (Universal.isRobot(id)) {
                        hasRevengeRobot = true;
                    }
                }
            }

            async.waterfall([
                (next) => {
                    // 刷新复仇列表
                    if (revengeCount < ArenaGlobalMgr.MAX_REVENGE_SIZE) {
                        var killerList:KillerList = new KillerList(role.accountId);
                        killerList.pop3Killer((err, list:number[]) => {
                            if (err) {
                                next(err);
                                return;
                            }
                            var i = 0;
                            while (currentOpponentList.length < ArenaGlobalMgr.MAX_OPPONENT_SIZE && i < list.length && revengeCount < ArenaGlobalMgr.MAX_REVENGE_SIZE) {
                                var id = list[i++];
                                currentOpponentList.push(id);
                                this.addOpponent(id, true);
                                revengeCount += 1;
                            }
                            next(null);
                        });
                    } else {
                        next(null);
                    }
                },
                (next) => {
                    // 复仇列表不足时刷新机器人复仇
                    //if (!hasRevengeRobot && revengeCount < ArenaGlobalMgr.MAX_REVENGE_SIZE && currentOpponentList.length < ArenaGlobalMgr.MAX_OPPONENT_SIZE) {
                    //    var robotId = RobotGlobalMgr.randomRobotForArenaPlayer(role.level);
                    //    if (robotId > 0) {
                    //        currentOpponentList.push(robotId);
                    //        this.addOpponent(robotId, true);
                    //        revengeCount += 1;
                    //
                    //        // 模拟机器人胜利加分
                    //        LeaderboardMgr.arenaScoreLB.incrScore(robotId, role.level, (err, score) => {
                    //            next(err);
                    //        });
                    //    } else {
                    //        next(null);
                    //    }
                    //
                    //} else {
                        next(null);
                    //}
                },
                (next) => {
                    // 刷新普通对手
                    ArenaGlobalMgr.randomOpponent(role.accountId, currentOpponentList, (err, list:number[]) => {
                        if (err) {
                            next(err);
                            return;
                        }
                        list.forEach((id) => {
                            if (!this.opponentList[id]) {
                                var opponent = new Opponent();
                                opponent.accountId = id;
                                opponent.isRevenge = false;
                                this.opponentList[id] = opponent;
                            }
                        });
                        next(null);
                    });
                }
            ], (err) => {
                callback(err);
            });

        } else {
            callback(null);
        }
    }

    public fetchOpponentInfo(role:Role, callback:(err, info:OpponentInfo[])=>void):void {
        this.refreshOpponent(role, (err) => {
            if (err) {
                log.uError(role.accountId, 'ArenaOpponent', 'refreshOpponent error: ' + err.stack);
            }

            var opponentIds = Object.keys(this.opponentList);
            var packetOpponentList:OpponentInfo[] = [];

            async.each(
                opponentIds,
                (key, next) => {
                    var item = this.opponentList[key];
                    PlayerInfoMgr.fetchNormalMode(item.accountId, HeroSuite.SuiteType.arena, (err, normalMode) => {
                        if (err)
                            return next();

                        var tmp = new OpponentInfo();
                        tmp.accountId = item.accountId;
                        tmp.level = normalMode.basic.level;
                        tmp.username = normalMode.basic.name;
                        tmp.achievementID = normalMode.basic.achievementId;

                        tmp.avatar.hairType = normalMode.avatar.hairType;
                        tmp.avatar.hairColor = normalMode.avatar.hairColor;
                        tmp.avatar.faceType = normalMode.avatar.faceType;
                        tmp.avatar.skinColor = normalMode.avatar.skinColor;

                        if (this.isRevenge(tmp.accountId)) {
                            tmp.avatar.armorID = normalMode.suite.armor.ID;
                            tmp.avatar.armorLevel = normalMode.suite.armor.level;
                            tmp.isRevenge = true;
                        } else {
                            try {
                                tmp.avatar.armorID = cm.knightdb.get(1).iniequip;
                            } catch (err) {
                                tmp.avatar.armorID = 1001;
                            }
                            tmp.avatar.armorLevel = 1;
                            tmp.isRevenge = false;
                        }

                        this.fetchScoreAndRank(item.accountId, (err, rank, score) => {
                            if (err) {
                                log.uError(role.accountId, 'ArenaOpponent', 'fetchScoreAndRank error ' + err.stack);
                                tmp.score = tmp.rank = 0;
                            } else {
                                tmp.score = score;
                                tmp.rank = rank;
                            }
                            packetOpponentList.push(tmp);
                            next();
                        });
                    });
                },
                (err) => {
                    packetOpponentList.sort((a, b)=> {
                        if (a.isRevenge === b.isRevenge) {
                            return a.rank - b.rank;
                        }
                        return a.isRevenge ? -1 : 1;
                    });
                    callback(err, packetOpponentList);
                }
            );

        }); // refreshOpponent
    }

    public buildOnlineInfoPacket(role:Role):any {
        var now = Time.gameNow();
        var Message = pbstream.get('.Api.arena.onlineInfo.Notify');
        var pck = new Message({
            tournamentId: ArenaGlobalMgr.arenaTournament.tournamentId,
            tournamentLeftTime: ArenaGlobalMgr.arenaTournament.endTime - now,
            totalWinCount: this.tournamentRecord.winCount,
            totalLossCount: this.tournamentRecord.lossCount,
            revengeWins: this.tournamentRecord.revengeWinCount,
            team: this.fightTeam,
            topRoles: ArenaGlobalMgr.top3player,
            arenaEnergyNextTime: role.arenaEnergyCounter ? role.arenaEnergyCounter.leftSecondForCount(now, 1) : 0
        });

        this.tournamentHistory.forEach((history) => {
            pck.tournamentHistory.push({
                tournamentId: history.tournamentId,
                rank: history.rank
            })
        });

        if (this.tournamentHistory.length > 0) {
            var history = this.tournamentHistory[this.tournamentHistory.length - 1];
            switch (history.rewardProgress) {
                case Universal.REWARD_PROGRESS.NOT_GAIN:
                    break;
                case Universal.REWARD_PROGRESS.HAS_GAIN:
                    var groupID = ArenaGlobalMgr.getGroupIDByRank(history.rank);
                    if (groupID > 0) {
                        pck.lastTournamentReward = {
                            rank: history.rank,
                            rewardId: cm.arena_infodb.get(groupID).rankreward
                        }
                    }
                    history.rewardProgress = Universal.REWARD_PROGRESS.HAS_READ;
                    break;
                case Universal.REWARD_PROGRESS.HAS_READ:
                    break;
            }
        }
        return pck;
    }

    public setMatchScoreIfNotExist(accountId:number, cb:(err)=>void):void {
        var matchLB = LeaderboardMgr.arenaMatchLB;
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

    public refreshFriendLeaderboard(accountId:number, friendIdList:number[], callback:(err) => void):void {
        var leaderboard = LeaderboardMgr.arenaScoreLB;
        var friendItemMap:{[accountId:number]:Universal.LeaderboardItem} = {};

        if (Time.gameNow() < this.lastUpdateFriendLeaderboard + 30) {
            callback(null);
            return;
        }

        friendIdList.push(accountId);

        async.waterfall([
            (next) => {
                // get all score
                var friendIndex = 0;
                async.until(
                    ():boolean => {
                        return friendIndex >= friendIdList.length;
                    }, (next) => {
                        var accountId = friendIdList[friendIndex++];
                        leaderboard.queryScore(accountId, (err, score) => {
                            if (err) {
                                log.uError(accountId, 'FriendLeaderboard', 'queryScore error: ' + err.stack);
                                next(null);
                                return;
                            }
                            if (score > 0) {
                                var item = new Universal.LeaderboardItem();
                                item.accountId = accountId;
                                item.score = score;
                                friendItemMap[accountId] = item;
                            }
                            next(null);
                        });
                    }, (err) => {
                        next(err);
                    });
            },
            (next) => {
                var playerList:string[] = Object.keys(friendItemMap);

                //CenterDB.fetchPlayerROInfo(playerList, (err, info:CenterDB.CenterPlayerInfo[]) => {
                //    if (err) {
                //        next(err, []);
                //        return;
                //    }
                //
                //    info.forEach((player:CenterDB.CenterPlayerInfo) => {
                //        var tmp = friendItemMap[player.accountId];
                //        tmp.level = player.level;
                //        tmp.username = player.username;
                //        tmp.achievementID = player.achievementId;
                //
                //        tmp.avatar.hairType = player.hairType;
                //        tmp.avatar.hairColor = player.hairColor;
                //        tmp.avatar.faceType = player.faceType;
                //        tmp.avatar.skinColor = player.skinColor;
                //        tmp.avatar.armorID = player.arenaArmorID;
                //        tmp.avatar.armorLevel = player.arenaArmorLevel;
                //    });
                //
                //    var result:Universal.LeaderboardItem[] = [];
                //    playerList.forEach((player) => {
                //        result.push(friendItemMap[player]);
                //    });
                //    result.sort((a, b) => {
                //        return b.score - a.score;
                //    });
                //
                //    this.selfRankInFriend = 0;
                //    result.forEach((item:Universal.LeaderboardItem, index) => {
                //        item.rank = index + 1;
                //        if (item.accountId === accountId) this.selfRankInFriend = item.rank;
                //    });
                //
                //    this.lastUpdateFriendLeaderboard = Time.gameNow();
                //    this.friendLeaderboard = result;
                //    next(null);
                //}); // fetchPlayerROInfo
            }
        ], (err) => {
            callback(err);
        });
    }

    public buildDBMsg():any {
        var Arena = pbstream.get('.DB.arena');
        var pck = new Arena({
            fightTeam: this.fightTeam,
            tournamentData: this.tournamentData.buildDBMsg(),
            tournamentHistory: this.tournamentHistory,
            tournamentRecord: this.tournamentRecord
        });
        Object.keys(this.opponentList).forEach((oppoID) => {
            var oppo = this.opponentList[oppoID];
            pck.opponentList.push({
                accountId: oppo.accountId,
                isRevenge: oppo.isRevenge
            });
        });
        return pck;
    }

    public loadDBMsg(msg:any) {
        this.fightTeam = msg.fightTeam;
        if (msg.tournamentHistory) this.tournamentHistory = msg.tournamentHistory;
        if (msg.tournamentRecord) this.tournamentRecord = msg.tournamentRecord;
        if (msg.tournamentData) this.tournamentData.loadDBMsg(msg.tournamentData);
        msg.opponentList.forEach((oppo) => {
            var opponent:Opponent = new Opponent();
            opponent.accountId = oppo.accountId;
            opponent.isRevenge = oppo.isRevenge;
            this.opponentList[opponent.accountId] = opponent;
        });
    }
}

export = ArenaMgr;
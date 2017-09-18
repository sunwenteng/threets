import async = require('async');
import pb = require('node-protobuf-stream');

import Guild = require('./guild');
import GuildMgr = require('./guild_service_mgr');
import Common = require('../../server_share/common');

import PlayerInfoMgr = require('../../cluster/player_info_mgr');
import DB = require('../../database/database_manager');
import RedisManager = require('../../redis/redis_manager');

import Config = require('../../config');

var memberStore:{[accountId:number]:Guild.Member} = {};

export function findMember(accountId:number, done):void {
    if (memberStore[accountId])
        return done(null, memberStore[accountId]);

    var m:Guild.Member = null;
    async.waterfall([
        (next) => {
            DB.Guild.fetchMember(accountId, (err, result) => {
                if (err) return next(err);

                m = memberStore[accountId] = new Guild.Member(accountId);
                if (result.length) {
                    m.guildId = result[0].guildId;
                    m.hierarchy = result[0].hierarchy;
                    m.contributeLevel = result[0].contributeLevel;
                    m.contributeProgress = result[0].contributeProgress;
                    m.totalContribute = result[0].totalContribute;
                }

                return next();
            });
        },
        (next) => {
            DB.Guild.fetchPIEntryByAccountId(accountId, (err, result) => {
                if (err) return next(err);
                if (!result.length) return next();

                result.forEach((row:any) => {
                    if (row.entryType === 0) {
                        var petition = new Guild.Petition();
                        petition.accountId = row.accountId;
                        petition.guildId = row.guildId;
                        m.addPetition(petition);
                    } else if (row.entryType === 1) {
                        var invitation = new Guild.Invitation();
                        invitation.accountId = row.accountId;
                        invitation.guildId = row.guildId;
                        m.addInvitation(invitation);
                    }
                });

                next();
            });
        }
    ], (err) => {
        if (err) return done(err);
        done(null, m);
    });
}

export function updateMember(member:Guild.Member, done):void {
    DB.Guild.insertOrUpdateMember(
        member.accountId,
        {
            guildId: member.guildId,
            hierarchy: member.hierarchy,
            contributeLevel: member.contributeLevel,
            contributeProgress: member.contributeProgress,
            totalContribute: member.totalContribute
        },
        (err, result) => {
            if (err) return done(err);
            updateMemberCache(member, done);
        });
}

export function loadMemberFromResult(row:any):Guild.Member {
    var m = memberStore[row.accountId] = new Guild.Member(row.accountId);
    m.guildId = row.guildId;
    m.hierarchy = row.hierarchy;

    m.contributeLevel = row.contributeLevel < 1 ? 1 : row.contributeLevel;
    m.contributeProgress = row.contributeProgress;
    m.totalContribute = row.totalContribute;
    return m;
}

function updateMemberCache(member:Guild.Member, done):void {
    PlayerInfoMgr.updateGuild(member.accountId, {
            guildId  : member.guildId,
            hierarchy: member.hierarchy
        },
        done);
}

export function removeAllPetitionsAndInvitation(accountId:number, done):void {
    findMember(accountId, (err, member:Guild.Member) => {
        if (err || !member) return done();

        member.invitations = {};

        async.waterfall([
            (next) => {
                DB.Guild.deleteAllPIEntryByAccountId(member.accountId, (err, result) => { next(err); });
            },
            (next) => {
                async.each(
                    Object.keys(member.petitions),
                    (key, cb) => {
                        var petition:Guild.Petition = member.petitions[key];
                        GuildMgr.findGuild(petition.guildId, (err, guild:Guild.Guild) => {
                            if (err || !guild) return cb();
                            guild.deletePetition(member.accountId);
                            cb();
                        });
                    },
                    next);
            }
        ], done);

    });
}

export function notifyMemberJoinGuild(accountId:number, done):void {
    done();
}

export function applyContribute(member:Guild.Member, money:number):Common.LevelUp {
    var levelUp = new Common.LevelUp();
    levelUp.originLevel = member.contributeLevel;
    levelUp.originExp = member.contributeProgress;
    levelUp.resultLevel = levelUp.originLevel;
    levelUp.resultExp = levelUp.originExp;

    var totalExp = money, lvc, leftNextLvExp = 0,
        maxlv = Object.keys(Config.configMgr.guild_contributiondb.all()).length;

    while (totalExp > 0 && levelUp.resultLevel < maxlv) {
        lvc = Config.configMgr.guild_contributiondb.get(levelUp.resultLevel);

        if (lvc.Amount < levelUp.resultExp) {
            leftNextLvExp = 0;                    // 当前经验溢出，剩余升级经验为0，溢出部分不计入升级经验
        } else {
            leftNextLvExp = lvc.Amount - levelUp.resultExp;
        }

        if (totalExp >= leftNextLvExp) {
            levelUp.resultLevel += 1;
            levelUp.growCount += 1;
            levelUp.resultExp = 0;
            totalExp -= leftNextLvExp;
        } else {
            levelUp.resultExp += totalExp;
            totalExp = 0;
        }
    }

    if (totalExp > 0) {
        lvc = Config.configMgr.guild_contributiondb.get(maxlv);
        levelUp.growCount += Math.floor((levelUp.resultExp + totalExp) / lvc.Amount);
        levelUp.resultExp = (levelUp.resultExp + totalExp) % lvc.Amount;
    }

    member.contributeLevel = levelUp.resultLevel;
    member.contributeProgress = levelUp.resultExp;

    return levelUp;
}

export function sendGuildNotify(accountId:number, notifyType, param?:number[]) {
    var Type = pb.get('.Rpc.controller.sendGuildNotify');
    RedisManager.pub.publishWorld(new Type({
        accountId: accountId,
        notifyData: {
            notifyType: notifyType,
            param: param ? param : []
        }
    }));
}
import async = require('async');
import pb = require('node-protobuf-stream');

import Log = require('../../util/log');
import CE = require('../../util/errors');
import ERRC = require('../../util/error_code');

import DB = require('../../database/database_manager');

import ConfigStc = require('../../config/struct/config_struct');
import Config = require('../../config');

import Guild = require('./guild');
import MemberMgr = require('./member_mgr');
import GuildEvent = require('./guild_event');

var guildStore:{[guildId:number]:Guild.Guild} = {};
var maxGuildId:number = 0;
var guildList:number[] = [];

export var maxTechLevel:number = 0;
export var maxGuildLevel:number = 0;
export var techElementTable:{[elementID:number]:{[level:number]:ConfigStc.guild_technologyDB}} = {};
export var guildLevelTable:{[level:number]:ConfigStc.guild_levelDB} = {};

export function initMgr():void {

    // read guild technology table
    Object.keys(Config.configMgr.guild_technologydb.all()).forEach((key:any) => {
        var config = Config.configMgr.guild_technologydb.get(key);
        if (!techElementTable[config.Element]) techElementTable[config.Element] = {};
        techElementTable[config.Element][config.LV] = config;
        maxTechLevel = maxTechLevel < config.LV ? config.LV : maxTechLevel;
    });

    // read guild level table
    Object.keys(Config.configMgr.guild_leveldb.all()).forEach((key:any) => {
        var config = Config.configMgr.guild_leveldb.get(key);
        guildLevelTable[parseInt(key)] = config;
        maxGuildLevel = maxGuildLevel < config.ID ? config.ID : maxGuildLevel;
    })
}

export function updateGuildTechLevel(guild:Guild.Guild, done):void {
    var result = [];
    Object.keys(guild.technology).forEach((key) => {
        result.push({
            elementId: parseInt(key),
            currentLevel: guild.technology[parseInt(key)]
        })
    });
    var guildTech = pb.get('.DB.guildTech');
    var proto = new guildTech({
        techList: result
    });

    var tech = proto.encode().toBuffer();

    DB.Guild.updateGuild(
        guild.guildId,
        {technology: tech},
        done
    );
}

export function nextGuildId():number {
    return maxGuildId + 1;
}

export function createGuild(accountId:number, name:string, badge, done):void {
    var leader:Guild.Member = null;
    async.waterfall([
        (next) => {
            MemberMgr.findMember(accountId, (err, m) => {
                if (err) return next(err);
                leader = m;
                next();
            });
        },
        (next) => {
            /****************************************
             * memory check
             ****************************************/

            if (leader.guildId !== 0) {
                return done(new CE.UserError(ERRC.GUILD.CANNOT_CREATE_GUILD_WITH_GUILD_ID, {
                    msg: 'GUILD.CANNOT_CREATE_GUILD_WITH_GUILD_ID, guildId=' + leader.guildId
                }));
            }

            var guild = new Guild.Guild();
            guild.create(nextGuildId(), name, badge);

            /****************************************
             * save memory & database
             ****************************************/

            async.waterfall([
                (next1) => {
                    DB.Guild.insertGuild(
                        guild.guildId,
                        guild.buildDBObj(),
                        (err) => {
                            next1(err);
                        }
                    );
                },
                (next1) => {
                    guild.setLeader(leader);
                    DB.Guild.updateGuild(
                        guild.guildId,
                        {leaderId: guild.leaderId},
                        next1
                    );
                },
                (next1) => {
                    guild.saveAllMembers(next1);
                },
                (next1) => {
                    addGuildToMemory(guild);
                    next1();
                }
            ], (err) => {
                next(err);
            });
        }
    ], done);
}

export function disbandGuild(guildId:number, done):void {
    var index = guildList.indexOf(guildId);
    if (index !== -1) {
        guildList.splice(index, 1);
    }
    delete guildStore[guildId];

    async.waterfall([
        (next) => {
            DB.Guild.deleteGuild(guildId, (err, result) => {
                next(err);
            });
        }
    ], (err) => {
        done(err);
    });
}

export function findGuild(guildId:number, done):void {
    if (!guildStore[guildId]) return done(new Error('ER_CANT_FIND_GUILD'));
    return done(null, guildStore[guildId]);
}

export function findGuildByAccountId(accountId:number, done):void {
    async.waterfall([
        (next) => {
            MemberMgr.findMember(accountId, next);
        },
        (member, next) => {
            if (member.guildId === 0)
                return next(new CE.UserError(ERRC.GUILD.DO_NOT_JOIN_GUILD, {
                    msg: 'GUILD.DO_NOT_JOIN_GUILD'
                }));

            findGuild(member.guildId, (err, guild) => {
                next(err, guild);
            });
        }
    ], (err, guild) => {
        done(err, guild);
    });
}

export function listGuilds(member:Guild.Member, guildIdList:number[]):any[] {
    var result:any[] = [];
    guildIdList.forEach((id) => {
        var g = guildStore[id];
        result.push({
            hasPetition: g.hasPetition(member.accountId),
            briefInfo  : g.briefInfo()
        });
    });
    return result;
}

export function getGuild(id):Guild.Guild {
    return guildStore[id];
}

export function loadGuilds(done):void {
    Log.sInfo('Guild', 'start loading all guilds');
    async.waterfall([
        (next) => {
            DB.Guild.fetchGuildList(next);
        },
        (result, next) => {
            if (!result.length) return next();
            Log.sInfo('Guild', 'loading ' + result.length + ' guilds');
            async.eachLimit(
                result,
                10,
                (value:any, cb) => {
                    loadGuild(value.guildId, (err) => {
                        cb();
                    });
                },
                next
            );
        }
    ], (err) => {
        Log.sInfo('Guild', 'finish loading all guilds');
        done(err);
    });
}

export function addPetition(guild:Guild.Guild, member:Guild.Member, done):void {
    DB.Guild.insertPetition(member.accountId, guild.guildId, (err, result) => {
        if (err) {
            Log.sError('Guild.Petition', 'code=' + err.code + ', message=' + err.message);
            return done(err);
        }

        guild.addPetition(member);
        var count = Object.keys(guild.petitions).length;
        guild.eachMember(
            (member, next) => {
                try {
                    var config = Config.configMgr.Hierarchydb.get(member.hierarchy);
                    if (config.approvePrivilege) {
                        MemberMgr.sendGuildNotify(member.accountId, Guild.NotifyType.NEW_PETITION, [count]);
                    }
                } catch (err) {}
                next();
            },
            done
        );

    });
}


export function pushEvent(guildId:number, event:GuildEvent.Event):void {
    //var msg:any = new cmd.Model.Guild.EventMsg(event.buildEventObj());
    //RedisMgr.client.lpush('cache:guild:event:' + guildId, msg.toBuffer());
}


function loadGuild(guildId:number, done):void {

    var guild:Guild.Guild = null;

    async.waterfall([
        (next) => {
            DB.Guild.fetchGuild(guildId, (err, result) => {
                if (err) return next(err);
                if (!result.length) return next(new Error('length=0'));
                guild = new Guild.Guild();
                guild.guildId = guildId;

                var row = result[0];
                guild.name = row.name;
                guild.leaderId = row.leaderId;
                guild.createDate = row.createDate;
                guild.bankMoney = row.bankMoney;
                guild.level = row.level;

                if (row.badge) {
                    guild.badge.loadString(row.badge);
                }

                // settings
                guild.settings.announce = row.announce;
                guild.settings.joinType = row.joinType;
                guild.settings.requireLevel = row.requireLevel;
                next();
            });
        },
        (next) => {
            DB.Guild.fetchGuildMemberList(guildId, (err, result) => {
                if (err) return next(err);
                if (!result.length) return next();

                result.forEach((row) => {
                    var member = MemberMgr.loadMemberFromResult(row);
                    guild.loadMember(member);
                });

                next();
            });
        },
        (next) => {
            DB.Guild.fetchPetitionByGuildId(guildId, (err, result) => {
                if (err) return next(err);
                if (!result.length) return next();

                result.forEach((row) => {
                    var petition = new Guild.Petition();
                    petition.accountId = row.accountId;
                    petition.guildId = guildId;
                    guild.petitions[petition.accountId] = petition;
                });

                next();
            });
        }
    ], (err) => {
        if (err) {
            if (err.message === 'length=0') return done(null, null);
            return done(err);
        }

        addGuildToMemory(guild);

        done(null, guild);
    });
}

function addGuildToMemory(guild:Guild.Guild) {
    guildStore[guild.guildId] = guild;
    guildList.push(guild.guildId);

    if (maxGuildId < guild.guildId)
        maxGuildId = guild.guildId;
}

function saveGuild(guild:Guild.Guild, done):void {
    async.waterfall([
        (next) => {
            DB.Guild.insertGuild(guild.guildId, guild.buildDBObj(), (err, result) => {
                next(err);
            });
        },
        (next) => {
            guild.saveAllMembers(next);
        }
    ], done);
}

export function findTechDBByElementIDAndLevel(elementId:number, currentLevel:number):ConfigStc.guild_technologyDB {

    if (!techElementTable[elementId] || !techElementTable[elementId][currentLevel]) {
        throw new CE.UserError(ERRC.GUILD.TECH_BOOST_NULL, {
            msg: "GUILD.TECH_BOOST_NULL, techElementTable is null"
        });
    }
    return techElementTable[elementId][currentLevel];
}

export function addExperience(guild:Guild.Guild, exp:number):void {
    var isMoreUpgradeExp = false;
    var lastGuildLevel = guild.level;
    var guildExp = guild.exp + exp;

    // 通过循环处理经验过多时的连续升级
    while (guildExp > guildLevelTable[guild.level].EXP) {
        if (upgradeGuildLevel(guild)) {
            guildExp -= guildLevelTable[guild.level - 1].EXP
        }
        isMoreUpgradeExp = true;
    }
    guild.exp = guildExp;

    if (guild.level > lastGuildLevel) {
        pushEvent(guild.guildId, new GuildEvent.GuildUpgrade(lastGuildLevel, guild.level));
    }

    if (!isMoreUpgradeExp) {
        guild.exp = guildExp;
    }
}

export function upgradeGuildLevel(guild:Guild.Guild):boolean {
    if (guild.level >= maxGuildLevel) {
        guild.level = maxGuildLevel;
        return false;
    }
    else {
        guild.level++;
        updateGuildLevel(guild, (err) => {});
        return true;
    }
}

export function updateGuildLevel(guild:Guild.Guild, done):void {
    var level = guild.level;
    DB.Guild.updateGuild(
        guild.guildId,
        {level: level},
        done
    );
}

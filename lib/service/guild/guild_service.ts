import async = require('async');
import pb = require('node-protobuf-stream');

import DB = require('../../database/database_manager');
import Common = require('../../server_share/common');
import Redis = require('../../redis/redis_manager');

import CE = require('../../util/errors');
import ERRC = require('../../util/error_code');
import Time = require('../../util/time');
import Config = require('../../config');

import Universal = require('../../handler/game/universal');
import Service = require('../service');

import Guild = require('./guild');
import MemberMgr = require('./member_mgr');
import GuildMgr = require('./guild_service_mgr');
import GuildEvent = require('./guild_event');

import QuestDef = require('./defines');

class GuildService extends Service {
    constructor() {
        super('guild');
    }

    public startupService(param:any):void {
        this.running = true;
        this.on('close', () => {
            this.running = false;
        });

        async.waterfall([
            (next) => {
                DB.Guild.initTables(next);
            },
            (next) => {
                GuildMgr.initMgr();
                next();
            },
            (next) => {
                GuildMgr.loadGuilds(next);
            }
        ], (err) => {
            this.emit('ready');
        });
    }

    onlineData(req:any, done):void {
        var accountId:number = req.accountId;
        GuildMgr.findGuildByAccountId(accountId, (err, guild:Guild.Guild) => {
            if (err) {
                if (err.errorId === ERRC.GUILD.DO_NOT_JOIN_GUILD) {
                    MemberMgr.findMember(accountId, (err, member) => {
                        if (err) return done(err);
                        var notJoin:any = {};
                        notJoin.joinCD = Time.calcLeftSecond(member.lastLeaveGuildTime, Universal.GLB_JOIN_GUILD_CD);
                        notJoin.inviteBubble = Object.keys(member.invitations).length;
                        return done(null, {
                            notJoin: notJoin
                        });
                    });
                }
                return done(err);
            }

            var member = guild.findMember(accountId);
            var response:any = {};
            response.guildId = guild.guildId;
            response.name = guild.name;
            response.hierarchy = member.hierarchy;
            response.badge = guild.badge;
            response.techLevels = Object.keys(guild.technology).map((key) => {
                return {
                    elementId: parseInt(key),
                    currentLevel: guild.technology[key]
                };
            });

            try {
                var config = Config.configMgr.Hierarchydb.get(member.hierarchy);
                if (config.approvePrivilege) {
                    response.petitionCount = Object.keys(guild.petitions).length
                }
            } catch (err) {}

            done(null, {
                data: response
            });
        });
    }

    initGuild(req:any, done) {
        var accountId:number = req.accountId;
        GuildMgr.findGuildByAccountId(accountId, (err, guild:Guild.Guild) => {
            if (err) {
                if (err.errorId === ERRC.GUILD.DO_NOT_JOIN_GUILD) {
                    MemberMgr.findMember(accountId, (err, member) => {
                        if (err) return done(err);
                        var notJoin:any = {};
                        notJoin.joinCD = Time.calcLeftSecond(member.lastLeaveGuildTime, Universal.GLB_JOIN_GUILD_CD);
                        notJoin.inviteBubble = Object.keys(member.invitations).length;
                        return done(null, {
                            notJoin: notJoin
                        });
                    });
                    return ;
                }
                return done(err);
            }

            var member = guild.findMember(accountId);

            var questProgress = [];
            Object.keys(guild.guildQuest.quests).forEach((key:any) => {
                //questProgress[key] = guild.guildQuest.quests[key].counter;
                questProgress.push({
                    ID: parseInt(key),
                    progress: guild.guildQuest.quests[key].counter
                });
            });

            done(null, {
                mainTab:{
                    info: guild.briefInfo(),
                    announce: guild.settings.announce,
                    guildLevel: {
                        level: guild.level,
                        exp: guild.exp
                    },
                    hierarchy: member.hierarchy,
                    bankMoney: guild.bankMoney,
                    questProgress: questProgress
                }
            });
        });
    }

    listGuilds(req:any, done):void {
        var accountId = req.accountId;
        var page = req.page;
        var totalSize = 0;
        async.waterfall([
            (next) => {
                MemberMgr.findMember(accountId, next);
            },
            (member:Guild.Member, next) => {
                DB.Guild.searchGuild(req.condition, (err, result:any[]) => {
                    if (err) return next(err);
                    totalSize = result.length;
                    next(null, GuildMgr.listGuilds(member, result.slice((page-1)*10, page*10).map((k)=>{return k.guildId;})));
                });
            }
        ], (err, result) => {
            if (err) return done(err, {});
            done(null, {
                guildList: result,
                totalSize: totalSize
            });
        });
    }

    createGuild(req:any, done:(err, res)=>void):void {

        var accountId = req.accountId,
            name      = req.name,
            badge     = req.badge;

        async.waterfall([
            (next) => {
                GuildMgr.createGuild(accountId, name, badge, next);
            }
        ], (err) => {
            if (err) return done(err, null);
            done(null, {});
        });
    }

    viewGuild(req:any, done:(err, res)=>void):void {
        var guildId = req.guildId;
        GuildMgr.findGuild(guildId, (err, guild:Guild.Guild) => {
            if (err) return done(err, null);
            done(null, {
                info: guild.detailInfo()
            });
        });
    }

    joinGuild(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId,
            guildId   = req.guildId;

        var requireCD = 60,
            now = Time.gameNow();
        async.waterfall([
            (next) => {
                async.parallel({
                    member: (cb) => {
                        MemberMgr.findMember(accountId, cb);
                    },
                    guild : (cb) => {
                        GuildMgr.findGuild(guildId, cb);
                    }
                }, (err, result:any) => {
                    next(err, result.member, result.guild);
                });
            },
            (member:Guild.Member, guild:Guild.Guild, next) => {
                if (member.guildId !== 0)
                    return next(new CE.UserError(ERRC.GUILD.ALREADY_HAS_GUILD, {
                        msg: 'GUILD.ALREADY_HAS_GUILD, guildId=' + member.guildId
                    }));

                var last = member.lastLeaveGuildTime;
                var joinGuildCD = (!last || last + requireCD <= now) ? 0 : last + requireCD - now;
                if (joinGuildCD) {
                    return next(new CE.UserError(ERRC.GUILD.JOIN_GUILD_NOT_COOL_DOWN, {
                        msg: 'GUILD.JOIN_GUILD_NOT_COOL_DOWN, joinGuildCD=' + joinGuildCD
                    }));
                }

                switch (guild.settings.joinType) {
                    //case Guild.JoinType.CLOSED:
                    //    break;
                    case Guild.JoinType.NEED_APPROVAL:
                        return next(new CE.UserError(ERRC.GUILD.GUILD_NEED_APPROVAL, {
                            msg: 'GUILD.GUILD_NEED_APPROVAL, guildId=' + guild.guildId
                        }));
                    case Guild.JoinType.OPEN:
                        // guildMemberCount has been max
                        var maxMemberCount = GuildMgr.guildLevelTable[guild.level].memberLimit;
                        if (guild.memberCount() >= maxMemberCount)
                            return next(new CE.UserError(ERRC.GUILD.GUILD_MEMBER_MAX, {
                                msg: 'ERRC.GUILD.GUILD_MEMBER_MAX, guildMemberCount=' + guild.memberCount()
                                + ', maxMemberCount=' + maxMemberCount
                            }));

                        guild.addMember(member, Guild.Hierarchy.MEMBER);
                        GuildMgr.pushEvent(guild.guildId, new GuildEvent.PlayerJoinEvent(member.accountId));
                        break;
                }

                MemberMgr.updateMember(member, next);
            }
        ], (err) => {
            done(err, {});
        });
    }

    sendPetition(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId;
        var guildId = req.guildId;
        async.waterfall([
            (next) => {
                async.parallel({
                    member: (cb) => {
                        MemberMgr.findMember(accountId, cb);
                    },
                    guild : (cb) => {
                        GuildMgr.findGuild(guildId, cb);
                    }
                }, (err, result:any) => {
                    next(err, result.member, result.guild);
                });
            },
            (member:Guild.Member, guild:Guild.Guild, next) => {
                if (member.guildId !== 0)
                    return next(new CE.UserError(ERRC.GUILD.ALREADY_HAS_GUILD, {
                        msg: 'GUILD.ALREADY_HAS_GUILD, guildId=' + member.guildId
                    }));

                // guildMemberCount has been max
                var maxMemberCount = GuildMgr.guildLevelTable[guild.level].memberLimit;
                if (guild.memberCount() >= maxMemberCount)
                    return next(new CE.UserError(ERRC.GUILD.GUILD_MEMBER_MAX, {
                        msg: 'ERRC.GUILD.GUILD_MEMBER_MAX, guildMemberCount=' + guild.memberCount()
                        + ', maxMemberCount=' + maxMemberCount
                    }));

                /****************************************
                 * 根据公会有没有申请来判断是否已经申请，而不是通过角色的申请。
                 * 防止2边数据不统一造成-玩家无法继续申请。
                 * @xienanjie
                 ****************************************/
                if (guild.hasPetition(member.accountId)) {
                    return next(new CE.UserError(ERRC.GUILD.DUP_PETITION, {
                        msg: 'GUILD.DUP_PETITION, accountId=' + member.accountId
                    }));
                }

                switch (guild.settings.joinType) {
                    //case Guild.JoinType.CLOSED:
                    //    break;
                    case Guild.JoinType.NEED_APPROVAL:
                        GuildMgr.addPetition(guild, member, next);
                        return ;
                    case Guild.JoinType.OPEN:
                        return next(new CE.UserError(ERRC.GUILD.GUILD_IS_OPEN, {
                            msg: 'GUILD.GUILD_IS_OPEN, guildId=' + guild.guildId
                        }));
                    default:
                        return next();
                }
            }
        ], (err) => {
            done(err, {});
        });
    }

    viewPetition(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId;
        async.waterfall([
            (next) => {
                GuildMgr.findGuildByAccountId(accountId, next);
            },
            (guild:Guild.Guild, next) => {
                if (!guild)
                    return next(new CE.UserError(ERRC.GUILD.DO_NOT_JOIN_GUILD, {
                        msg: 'GUILD.DO_NOT_JOIN_GUILD'
                    }));

                var member = guild.findMember(accountId);

                if (!member)
                    return next(new CE.UserError(ERRC.GUILD.YOU_ARE_NOT_GUILD_MEMBER, {
                        msg: 'GUILD.YOU_ARE_NOT_GUILD_MEMBER, guildId=' + guild.guildId + ', accountId=' + member.accountId
                    }));

                next(null, guild.listPetition());
            }
        ], (err, plist) => {
            done(err, {
                petitionList: plist
            });
        });
    }

    acceptPetition(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId;
        var petitionAccountId = req.petitionAccountId;
        async.waterfall([
            (next) => {
                async.parallel({
                    operator: (cb) => {
                        MemberMgr.findMember(accountId, cb);
                    },
                    petitioner: (cb) => {
                        MemberMgr.findMember(petitionAccountId, cb);
                    },
                    guild : (cb) => {
                        GuildMgr.findGuildByAccountId(accountId, cb);
                    }
                }, (err, result:any) => {
                    next(err, result.operator, result.petitioner, result.guild);
                });
            },
            (operator:Guild.Member, petitioner:Guild.Member, guild:Guild.Guild, next) => {
                // check privilege
                try {
                    var config = Config.configMgr.Hierarchydb.get(operator.hierarchy);
                    if (!config.approvePrivilege) {
                        return next(new CE.UserError(ERRC.GUILD.NO_PRIVILEGE, {
                            msg: 'GUILD.NO_PRIVILEGE, hierarchy=' + operator.hierarchy
                        }));
                    }
                } catch (err) {
                    return next(err);
                }

                if (petitioner.guildId !== 0) {
                    MemberMgr.removeAllPetitionsAndInvitation(petitioner.accountId, () =>{
                        next(new CE.UserError(ERRC.GUILD.ALREADY_HAS_GUILD, {
                            msg: 'GUILD.ALREADY_HAS_GUILD, guildId=' + petitioner.guildId
                        }));
                    });
                    return ;
                }

                var petition = guild.findPetition(petitionAccountId);

                if (!petition)
                    return next(new CE.UserError(ERRC.GUILD.NOT_EXIST_PETITION, {
                        msg: 'GUILD.NOT_EXIST_PETITION, guildId=' + guild.guildId + ', accountId=' + accountId
                    }));

                MemberMgr.removeAllPetitionsAndInvitation(petitioner.accountId, () => {
                    guild.addMember(petitioner, Guild.Hierarchy.MEMBER);

                    MemberMgr.updateMember(petitioner, ()=>{
                        MemberMgr.sendGuildNotify(petitioner.accountId, Guild.NotifyType.JOINED);
                    });

                    next();
                });
            }
        ], (err, guildName) => {
            done(err, {});
        });
    }

    removePetition(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId,
            dismissAll = req.dismissAll,
            dismissAccountId = req.dismissAccountId;

        async.waterfall([
            (next) => {
                async.parallel({
                    operator: (cb) => {
                        MemberMgr.findMember(accountId, cb);
                    },
                    guild : (cb) => {
                        GuildMgr.findGuildByAccountId(accountId, cb);
                    }
                }, (err, result:any) => {
                    next(err, result.operator, result.guild);
                });
            },
            (operator:Guild.Member, guild:Guild.Guild, next) => {
                try {
                    var config = Config.configMgr.Hierarchydb.get(operator.hierarchy);
                    if (!config.approvePrivilege) {
                        return next(new CE.UserError(ERRC.GUILD.NO_PRIVILEGE, {
                            msg: 'GUILD.NO_PRIVILEGE, hierarchy=' + operator.hierarchy
                        }));
                    }
                } catch (err) {
                    return next(err);
                }

                if (dismissAll) {
                    DB.Guild.deleteAllPetitionByGuildId(guild.guildId, (err) => {
                        if (err) return next(err);
                        guild.deleteAllPetition();
                        next();
                    });
                } else {
                    DB.Guild.deleteOnePIEntry(dismissAccountId, guild.guildId, (err) => {
                        if (err) return next(err);
                        guild.deletePetition(dismissAccountId);
                        next();
                    });
                }
            }
        ], (err) => {
            done(err, {});
        });
    }

    viewInvitation(req, done) {
        var accountId = req.accountId;
        var member:Guild.Member;
        var result:any = [];
        async.waterfall([
            (next) => {
                MemberMgr.findMember(accountId, (err, mbr) => {
                    if (err) return next(err);
                    member = mbr;
                    next();
                });
            },
            (next) => {
                if (member.guildId)
                    return next();

                Object.keys(member.invitations).forEach(x => {
                    var invite:Guild.Invitation = member.invitations[x];
                    var guild = GuildMgr.getGuild(invite.guildId);
                    if (guild) {
                        result.push({
                            guildId: guild.guildId,
                            briefInfo: guild.briefInfo()
                        });
                    } else {
                        delete member.invitations[x];
                    }
                });
                next();
            }
        ], (err) => {
            done(err, {invitationList: result});
        });
    }

    sendInvitation(req, done) {
        var accountId = req.accountId;
        var invitedId = req.invitedId;
        async.waterfall([
            (next) => {
                async.parallel({
                    member: (cb) => {
                        MemberMgr.findMember(invitedId, cb);
                    },
                    guild : (cb) => {
                        GuildMgr.findGuildByAccountId(accountId, cb);
                    }
                }, (err, result:any) => {
                    next(err, result.member, result.guild);
                });
            },
            (member:Guild.Member, guild:Guild.Guild, next) => {
                if (member.guildId !== 0)
                    return next(new CE.UserError(ERRC.GUILD.ALREADY_HAS_GUILD, {
                        msg: 'GUILD.ALREADY_HAS_GUILD, guildId=' + member.guildId
                    }));

                // guildMemberCount has been max
                var maxMemberCount = GuildMgr.guildLevelTable[guild.level].memberLimit;
                if (guild.memberCount() >= maxMemberCount)
                    return next(new CE.UserError(ERRC.GUILD.GUILD_MEMBER_MAX, {
                        msg: 'ERRC.GUILD.GUILD_MEMBER_MAX, guildMemberCount=' + guild.memberCount()
                        + ', maxMemberCount=' + maxMemberCount
                    }));

                var operator = guild.findMember(accountId);

                try {
                    var config = Config.configMgr.Hierarchydb.get(operator.hierarchy);
                    if (!config.approvePrivilege) {
                        return next(new CE.UserError(ERRC.GUILD.NO_PRIVILEGE, {
                            msg: 'GUILD.NO_PRIVILEGE, hierarchy=' + operator.hierarchy
                        }));
                    }
                } catch (err) {
                    return next(err);
                }


                /****************************************
                 * 根据公会有没有申请来判断是否已经申请，而不是通过角色的申请。
                 * 防止2边数据不统一造成-玩家无法继续申请。
                 * @xienanjie
                 ****************************************/
                if (guild.hasPetition(member.accountId)) {
                    return next(new CE.UserError(ERRC.GUILD.DUP_PETITION, {
                        msg: 'GUILD.DUP_PETITION, accountId=' + member.accountId
                    }));
                }

                DB.Guild.insertInvitation(invitedId, guild.guildId, (err) => {
                    if (err) return next(err);

                    member.addInvitation({
                        accountId: invitedId,
                        guildId: guild.guildId
                    });

                    MemberMgr.sendGuildNotify(invitedId, Guild.NotifyType.NEW_INVITE, [Object.keys(member.invitations).length]);
                    next();
                });
            }
        ], (err) => {
            done(err, {});
        });
    }

    acceptInvitation(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId;
        var guildId = req.guildId;
        async.waterfall([
            (next) => {
                async.parallel({
                    invited: (cb) => {
                        MemberMgr.findMember(accountId, cb);
                    },
                    guild : (cb) => {
                        GuildMgr.findGuild(guildId, cb);
                    }
                }, (err, result:any) => {
                    next(err, result.invited, result.guild);
                });
            },
            (invited:Guild.Member, guild:Guild.Guild, next) => {
                if (invited.guildId !== 0) {
                    MemberMgr.removeAllPetitionsAndInvitation(invited.accountId, () =>{
                        next(new CE.UserError(ERRC.GUILD.ALREADY_HAS_GUILD, {
                            msg: 'GUILD.ALREADY_HAS_GUILD, guildId=' + invited.guildId
                        }));
                    });
                    return ;
                }

                var invitation = invited.invitations[guild.guildId];

                if (!invitation)
                    return next(new CE.UserError(ERRC.GUILD.NOT_EXIST_INVITATION, {
                        msg: 'GUILD.NOT_EXIST_INVITATION, guildId=' + guild.guildId + ', accountId=' + accountId
                    }));

                MemberMgr.removeAllPetitionsAndInvitation(invited.accountId, () => {
                    guild.addMember(invited, Guild.Hierarchy.MEMBER);

                    MemberMgr.updateMember(invited, ()=>{
                        MemberMgr.sendGuildNotify(invited.accountId, Guild.NotifyType.JOINED);
                    });

                    next();
                });
            }
        ], (err) => {
            done(err, {});
        });
    }

    dismissInvitation(req, done) {
        var accountId = req.accountId,
            dismissAll = req.dismissAll,
            dismissGuildId = req.dismissGuildId;

        MemberMgr.findMember(accountId, (err, member) => {
            if (err) return done(err);

            if (dismissAll) {
                DB.Guild.deleteAllInvitationByAccountId(accountId, (err) => {
                    if (err) return done(err);
                    member.invitations = {};
                    done();
                });
            } else {
                DB.Guild.deleteOnePIEntry(accountId, dismissGuildId, (err) => {
                    if (err) return done(err);
                    delete member.invitations[dismissGuildId];
                    done();
                });
            }
        });
    }

    leaveGuild(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId;
        var guild:Guild.Guild = null;
        async.waterfall([
            (next) => {
                GuildMgr.findGuildByAccountId(accountId, (err, g) => {
                    if (err) return next(err);
                    guild = g;
                    next();
                });
            },
            (next) => {
                var member = guild.findMember(accountId);

                if (!member)
                    return next(new CE.UserError(ERRC.GUILD.YOU_ARE_NOT_GUILD_MEMBER, {
                        msg: 'GUILD.YOU_ARE_NOT_GUILD_MEMBER, guildId=' + guild.guildId + ', accountId=' + member.accountId
                    }));

                if (member.hierarchy <= Guild.Hierarchy.GUILD_MASTER && guild.memberCount() > 1) {
                    return next(new CE.UserError(ERRC.GUILD.GUILD_MASTER_CAN_NOT_LEAVE, {
                        msg: 'GUILD.GUILD_MASTER_CAN_NOT_LEAVE'
                    }));
                }

                guild.deleteMember(member.accountId);
                member.guildId = 0;
                GuildMgr.pushEvent(guild.guildId, new GuildEvent.PlayerLeaveEvent(member.accountId));

                if (member.hierarchy === Guild.Hierarchy.GUILD_MASTER)
                    member.lastLeaveGuildTime = 0;
                else
                    member.lastLeaveGuildTime = Time.gameNow();
                MemberMgr.updateMember(member, next);
            },
            (next) => {
                if (guild.memberCount() === 0) {
                    GuildMgr.disbandGuild(guild.guildId, next);
                } else {
                    next();
                }
            }
        ], (err) => {
            if (err) return done(err, null);
            done(null, {});
        });
    }

    mainTab(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId;

        var now = Time.gameNow();
        var requireCD = 60;

        async.waterfall([
            (next) => {
                GuildMgr.findGuildByAccountId(accountId, next);
            },
            (guild:Guild.Guild, next) => {
                var member = guild.findMember(accountId);

                var result = [];
                Object.keys(guild.technology).forEach((key:any) => {
                    //techDB    科技等级加成表
                    var techDB = GuildMgr.findTechDBByElementIDAndLevel(parseInt(key), guild.technology[key]);
                    result.push({
                        elementId: parseInt(key),
                        boost: techDB.Boost
                    });
                });

                var last = member.lastLeaveGuildTime;
                var joinGuildCD = (!last || last + requireCD <= now) ? 0 : last + requireCD - now;

                var guildQuestList = [];
                if (Object.keys(guild.guildQuest.quests).length === 0) {
                    guild.guildQuest.initGuildQuest(guild);
                }
                Object.keys(guild.guildQuest.quests).forEach((key:any) => {
                    guildQuestList.push({
                        ID: parseInt(key),
                        progress: guild.guildQuest.quests[parseInt(key)].counter
                    });
                });

                var config = Config.configMgr.Hierarchydb.get(member.hierarchy);
                var hierarchyBoost:number = config.bonuseProperty;

                next(null, {
                    mainTab:{
                        info: guild.briefInfo(),
                        announce: guild.settings.announce,
                        guildLevel: {
                            level: guild.level,
                            exp: guild.exp
                        },
                        hierarchy: member.hierarchy,
                        bankMoney: guild.bankMoney
                    },
                    techBoosts: result,
                    hierarchyBoost: hierarchyBoost,
                    guildQuestList: guildQuestList,
                    joinGuildCD: joinGuildCD
                });
            }
        ], (err:any, gi:any) => {
            if (err) {
                if (err.errorId === ERRC.GUILD.DO_NOT_JOIN_GUILD) {
                    MemberMgr.findMember(accountId,(err, member) => {
                        if (err) {
                            return done(null, {joinGuildCD: 0});
                        }
                        var last = member.lastLeaveGuildTime;
                        var joinGuildCD = (!last || last + requireCD <= now) ? 0 : last + requireCD - now;
                        return done(null, {joinGuildCD: joinGuildCD});
                    });
                }
                return done(err, null);
            }

            done(null, gi);
        });
    }

    membersTab(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId;
        async.waterfall([
            (next) => {
                GuildMgr.findGuildByAccountId(accountId, next);
            },
            (guild:Guild.Guild, next) => {
                next(null, guild.listMember());
            }
        ], (err, members) => {
            if (err) return done(err, null);
            done(null, {
                memberList: members
            });
        });
    }

    updateSettings(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId;
        var guild:Guild.Guild = null;
        var operator:Guild.Member = null;
        async.waterfall([
            (next) => {
                async.parallel({
                    operator: (cb) => {
                        MemberMgr.findMember(accountId, cb);
                    },
                    guild : (cb) => {
                        GuildMgr.findGuildByAccountId(accountId, cb);
                    }
                }, (err, result:any) => {
                    if (err) return next(err);
                    operator = result.operator;
                    guild = result.guild;
                    next();
                });
            },
            (next) => {
                try {
                    var config = Config.configMgr.Hierarchydb.get(operator.hierarchy);
                    if (!config.settingPrivilege) {
                        return next(new CE.UserError(ERRC.GUILD.NO_PRIVILEGE, {
                            msg: 'GUILD.NO_PRIVILEGE, hierarchy=' + operator.hierarchy
                        }));
                    }
                } catch (err) {
                    return next(err);
                }


                Object.keys(req.settings).forEach((key) => {
                    if (req.settings[key] === null) return ;
                    var value = req.settings[key];

                    switch (key) {
                        case 'joinType':
                            switch (value) {
                                case 'OPEN': value = Guild.JoinType.OPEN; break;
                                case 'NEED_APPROVAL': value = Guild.JoinType.NEED_APPROVAL; break;
                                default: return ;
                            }

                            GuildMgr.pushEvent(guild.guildId, new GuildEvent.UpdateJoinTypeSetting(accountId, value));
                            break;
                        case 'requireLevel':
                            GuildMgr.pushEvent(guild.guildId, new GuildEvent.UpdateJoinLevelSetting(accountId, value));
                            break;
                    }

                    guild.settings[key] = value;
                });
                next();
            },
            (next) => {
                DB.Guild.updateGuildSetting(guild.guildId, guild.settings, (err, result) => {
                    next(err);
                });
            }
        ], (err) => {
            done(err, {});
        });
    }

    kickMember(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId,
            kickedId = req.kickedId;

        if (kickedId === accountId) {
            return done(new CE.UserError(ERRC.GUILD.CAN_NOT_KICK_SELF, {
                msg: 'GUILD.CAN_NOT_KICK_SELF'
            }), null);
        }

        async.waterfall([
            (next) => {
                GuildMgr.findGuildByAccountId(accountId, next);
            },
            (guild:Guild.Guild, next) => {
                var kicker:Guild.Member = guild.findMember(accountId);
                var kicked:Guild.Member = guild.findMember(kickedId);

                if (!kicker || !kicked) {
                    return next(new CE.UserError(ERRC.GUILD.CAN_NOT_FIND_TARGET_MEMBER, {
                        msg: 'GUILD.CAN_NOT_FIND_TARGET_MEMBER, kickedId=' + kickedId
                    }));
                }

                try {
                    var kickerHierarchy = Config.configMgr.Hierarchydb.get(kicker.hierarchy);
                    var kickedHierarchy = Config.configMgr.Hierarchydb.get(kicked.hierarchy);
                    if (kickerHierarchy.power <= kickedHierarchy.power) {
                        return next(new CE.UserError(ERRC.GUILD.CAN_NOT_KICK_HIGH_LEVEL_MEMBER, {
                            msg: 'GUILD.CAN_NOT_KICK_HIGH_LEVEL_MEMBER, kicker.hierarchy=' + kicker.hierarchy
                            + ', kicked.hierarchy=' + kicked.hierarchy
                        }));
                    }
                } catch (err) {
                    return next(err);
                }

                guild.deleteMember(kicked.accountId);
                kicked.guildId = 0;
                kicked.totalContribute = 0;

                GuildMgr.pushEvent(guild.guildId, new GuildEvent.KickMember(kicker.accountId, kicked.accountId));

                kicked.lastLeaveGuildTime = Time.gameNow();
                MemberMgr.sendGuildNotify(kicked.accountId, Guild.NotifyType.KICKED);
                MemberMgr.updateMember(kicked, next);
            }
        ], (err) => {
            done(err, {});
        });
    }

    appointHierarchy(req:any, done):void {
        var operatorId = req.operatorId,
            memberId = req.memberId,
            newHierarchy = req.newHierarchy;

        async.waterfall([
            (next) => {
                async.parallel({
                    operator: (cb) => {
                        MemberMgr.findMember(operatorId, cb);
                    },
                    member: (cb) => {
                        MemberMgr.findMember(memberId, cb);
                    },
                    guild : (cb) => {
                        GuildMgr.findGuildByAccountId(operatorId, cb);
                    }
                }, (err, result:any) => {
                    next(err, result.operator, result.member, result.guild);
                });
            },
            (operator:Guild.Member, member:Guild.Member, guild:Guild.Guild, next) => {

                if (member.guildId !== operator.guildId) {
                    return new CE.UserError(ERRC.GUILD.NOT_SAME_GUILD, {
                        msg: 'GUILD.NOT_SAME_GUILD, member.guildId=' + member.guildId + ',operator.guildId=' + operator.guildId
                    });
                }

                // check privilege
                try {
                    var operatorConfig = Config.configMgr.Hierarchydb.get(operator.hierarchy);
                    if (!operatorConfig.appointPrivilege) {
                        return next(new CE.UserError(ERRC.GUILD.NO_PRIVILEGE, {
                            msg: 'GUILD.NO_PRIVILEGE, hierarchy=' + operator.hierarchy
                        }));
                    }

                    var memberConfig = Config.configMgr.Hierarchydb.get(member.hierarchy);
                    if (operatorConfig.power <= memberConfig.power) {
                        return next(new CE.UserError(ERRC.GUILD.NO_PRIVILEGE, {
                            msg: 'GUILD.NO_PRIVILEGE, power not enough, hierarchy=' + operator.hierarchy
                        }));
                    }

                    var objectConfig = Config.configMgr.Hierarchydb.get(newHierarchy);
                    if (operatorConfig.power <= objectConfig.power) {
                        return next(new CE.UserError(ERRC.GUILD.NO_PRIVILEGE, {
                            msg: 'GUILD.NO_PRIVILEGE, power not enough, hierarchy=' + operator.hierarchy
                        }));
                    }

                    var maxOfficerCount = GuildMgr.guildLevelTable[guild.level].officerLimit;
                    if (newHierarchy === Guild.Hierarchy.OFFICER && guild.officerCount() >= maxOfficerCount)
                        return next(new CE.UserError(ERRC.GUILD.GUILD_OFFICER_MAX, {
                            msg: 'GUILD.GUILD_OFFICER_MAX, guildOfficerCount=' + guild.officerCount()
                            + ', maxOfficerCount=' + maxOfficerCount
                        }));

                } catch (err) {
                    return next(err);
                }

                GuildMgr.pushEvent(guild.guildId, new GuildEvent.AppointHierarchy(operatorId, memberId, member.hierarchy, newHierarchy));

                member.hierarchy = newHierarchy;

                MemberMgr.sendGuildNotify(member.accountId, Guild.NotifyType.APPOINTED, [newHierarchy]);
                MemberMgr.updateMember(member, next);
            }
        ], (err) => {
            done(err, {});
        });
    }

    initContribute(req:any, done):void {
        var accountId = req.accountId;

        var result:any = {};
        async.waterfall([
            (next) => {
                GuildMgr.findGuildByAccountId(accountId, next);
            },
            (guild:Guild.Guild, next) => {
                var member:Guild.Member = guild.findMember(accountId);

                result.bankMoney = guild.bankMoney;
                result.contributeProgress = {
                    level: member.contributeLevel,
                    exp: member.contributeProgress
                };
                next();
            }
        ], (err) => {
            done(err, result);
        });
    }

    contributeMoney(req:any, done):void {
        var accountId = req.accountId;
        var money = req.money;

        var contributeProgressUpdate:Common.LevelUp = null, bankMoney = 0;

        async.waterfall([
            (next) => {
                GuildMgr.findGuildByAccountId(accountId, next);
            },
            (guild:Guild.Guild, next) => {
                var member:Guild.Member = guild.findMember(accountId);

                guild.bankMoney += money;
                member.totalContribute += money;

                bankMoney = guild.bankMoney;
                contributeProgressUpdate = MemberMgr.applyContribute(member, money);

                DB.Guild.updateGuild(guild.guildId, {bankMoney: guild.bankMoney}, (err) => {
                    if (err) return next(err);
                    MemberMgr.updateMember(member, next);
                });
            }
        ], (err) => {
            if (err) return done(err);

            done(null, {
                contributeProgressUpdate: contributeProgressUpdate,
                bankMoney: bankMoney
            });
        });
    }

    initContributeHistory(req:any, done):void {
        var accountId = req.accountId;

        var result:any = [];
        async.waterfall([
            (next) => {
                GuildMgr.findGuildByAccountId(accountId, next);
            },
            (guild:Guild.Guild, next) => {
                DB.Guild.fetchGuildContributeHistory(guild.guildId, (err, res) => {
                    if (err) return next(err);
                    res.forEach((value) => {
                        result.push({
                            accountId: value.accountId,
                            totalContribute: value.totalContribute
                        });
                    });

                    next();
                });
            }
        ], (err) => {
            done(err, { contributeHistory: result });
        });
    }

    initTech(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId;
        GuildMgr.findGuildByAccountId(accountId, (err, guild:Guild.Guild) => {
            if (err) return done(err, null);

            var techData:any = {};
            techData.bankMoney = guild.bankMoney;
            techData.techList = [];
            techData.techBoosts = [];

            Object.keys(guild.technology).forEach((key:any) => {
                techData.techList.push({
                    elementId: parseInt(key),
                    currentLevel: guild.technology[key]
                });

                //techDB    科技等级加成表
                var techDB = GuildMgr.findTechDBByElementIDAndLevel(parseInt(key), guild.technology[parseInt(key)]);
                techData.techBoosts.push({
                    elementId: parseInt(key),
                    boost: techDB.Boost
                });
            });
            done(null, techData);
        });
    }

    upgradeTech(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId,
            elementId = req.elementId,
            clientTechLevel = req.clientTechLevel;

        GuildMgr.findGuildByAccountId(accountId, (err, guild:Guild.Guild) => {
            if (err) return done(err, null);

            //check client technology level
            if (guild.technology[elementId] !== clientTechLevel){
                return done(new CE.UserError(ERRC.GUILD.CLIENT_TECH_LEVEL_IS_NOT_LATEST, {
                    msg: 'GUILD.CLIENT_TECH_LEVEL_IS_NOT_LATEST, clientTechLevel=' + clientTechLevel + ', serverTechLevel=' + guild.technology[elementId]
                }), null);
            }

            // check bankMoney
            try {
                //techDB    科技等级加成表
                var techDB = GuildMgr.findTechDBByElementIDAndLevel(elementId, clientTechLevel);

                if (guild.bankMoney < techDB.Gold) {
                    return done(new CE.UserError(ERRC.GUILD.BANK_MONEY_NOT_ENOUGH,{
                        msg: 'GUILD.BANK_MONEY_NOT_ENOUGH, bankMoney=' + guild.bankMoney + ',updateCost='+techDB.Gold
                    }), null);
                }

                // guild tech level is max ?
                if(guild.technology[elementId] >= GuildMgr.maxTechLevel) {
                    return done(new CE.UserError(ERRC.GUILD.TECH_LEVEL_IS_MAX,{
                        msg: 'GUILD.TECH_LEVEL_IS_MAX, currentTechLevel=' + guild.technology[elementId]
                    }), null);
                }

                // check permission
                var member = guild.findMember(accountId);
                var config = Config.configMgr.Hierarchydb.get(member.hierarchy);

                if (config.skillPrivilege === 0) {
                    return done(new CE.UserError(ERRC.GUILD.TECH_UPGRADE_PERMISSION_DENIED, {
                        msg: 'GUILD.TECH_UPGRADE_PERMISSION_DENIED, hierarchy=' + member.hierarchy
                    }), null);
                }

            } catch (e) {
                return done(e, null);
            }

            guild.upgradeTechnology(elementId);

            //techDB    科技等级加成表
            var techDB = GuildMgr.findTechDBByElementIDAndLevel(elementId, clientTechLevel);
            // minus bankMoney
            guild.bankMoney = guild.bankMoney - techDB.Gold;
            var result = {
                bankMoney: guild.bankMoney,
                techBoost: techDB.Boost
            };
            // log
            // write DB
            GuildMgr.updateGuildTechLevel(guild, (err) => {
                done(err, result);
            });
        });
    }

    transforLeader(req:any, done:(err, res)=>void):void {
        var operatorId = req.operatorId;
        var memberId = req.memberId;

        var operator:Guild.Member;
        var member:Guild.Member;

        async.waterfall([
            (next) => {
                async.parallel({
                    operator: (cb) => {
                        MemberMgr.findMember(operatorId, cb);
                    },
                    member: (cb) => {
                        MemberMgr.findMember(memberId, cb);
                    },
                    guild: (cb) => {
                        GuildMgr.findGuildByAccountId(operatorId, cb);
                    }
                },(err, res :any) => {
                    if (err) return next(err);

                    member = res['member'];
                    operator = res.operator;

                    next(null, res.guild);
                });
            },
            (guild:Guild.Guild, next) => {
                if (member.guildId !== operator.guildId) {
                    return new CE.UserError(ERRC.GUILD.NOT_SAME_GUILD, {
                        msg: 'GUILD.NOT_SAME_GUILD, member.guildId=' + member.guildId + ',operator.guildId=' + operator.guildId
                    });
                }

                if (operator.accountId === member.accountId) {
                    return new CE.UserError(ERRC.GUILD.TRANSFOR_LEADER_TO_SELF, {
                        msg: 'GUILD.TRANSFOR_LEADER_TO_SELF, operatorId=' + operator.accountId
                        + ', memberId=' + member.accountId
                    });
                }

                // check privilege
                if (operator.hierarchy !== Guild.Hierarchy.GUILD_MASTER) {
                    return next(new CE.UserError(ERRC.GUILD.NO_PRIVILEGE, {
                        msg: 'GUILD.NO_PRIVILEGE, hierarchy=' + operator.hierarchy
                    }));
                }

                GuildMgr.pushEvent(guild.guildId, new GuildEvent.AppointHierarchy(operatorId, memberId, member.hierarchy, Guild.Hierarchy.GUILD_MASTER));


                operator.hierarchy = Guild.Hierarchy.MEMBER;

                MemberMgr.updateMember(operator, (err) => {
                    if (err) {
                        operator.hierarchy = Guild.Hierarchy.GUILD_MASTER;
                        return next(err);
                    }

                    member.hierarchy = Guild.Hierarchy.GUILD_MASTER;

                    MemberMgr.updateMember(member, (err) => {
                        if (err) {
                            member.hierarchy = Guild.Hierarchy.MEMBER;
                            return next(err);
                        }
                        next(null);
                    });
                });
            }
        ], (err) => {
            done(err, {});
        });
    }

    updateGuildQuest(req:any, done:(err, res)=>void):void {
        var accountId = req.accountId;
        var questType:any = QuestDef.CriteriaType[req.questType];
        var param = req.param;
        var value = req.value;

        GuildMgr.findGuildByAccountId(accountId, (err, guild:Guild.Guild) => {
            if (err) return done(err, null);
            try {
                guild.guildQuest.updateGuildQuest(questType, param, value, guild);
            }catch (e) {
                return done(e,{});
            }
            guild.guildQuest.updateGuildQuestDB(guild, (err) => {
                done(err, {});
            });
        });
    }

    sayWords(req:any, done) {
        var accountId = req.accountId;
        var chatMessage = req.chatMessage;

        GuildMgr.findGuildByAccountId(accountId, (err, guild:Guild.Guild) => {
            if (err) return done(err);

            // check valid text content
            //this.chatHistory.push(chatMessage);
            // broadcast world chat message
            var RoleSay = pb.get('.Rpc.controller.roleSayGuild');
            Redis.pub.publishWorld(new RoleSay({
                chatMessage: chatMessage,
                guildId: guild.guildId
            }));

            done();
        });
    }
}

export = GuildService;
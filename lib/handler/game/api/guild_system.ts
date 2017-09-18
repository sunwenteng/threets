import async = require('async');
import pb = require('node-protobuf-stream');

import Log = require('../../../util/log');
import CE = require('../../../util/errors');
import ERRC = require('../../../util/error_code');

//import WorldDB = require('../../../database/impl/world_db');

import RedisMgr = require('../../../redis/redis_manager');

import Guild = require('../../../service/guild/guild');
import GuildEvent = require('../../../service/guild/guild_event');
import Role = require('../role');

import PlayerInfoMgr = require('../../../cluster/player_info_mgr');
import HeroSuite = require('../hero/hero_suite');

import Enum = require('../../../util/enum');
import Universal = require('../universal');

import ResourceMgr = require('../resource/resource_mgr');
import Config = require('../../../config');

import Common = require('../../../server_share/common');
import Util = require('../../../util/game_util');

import ServiceManager = require('../../../service/service_manager');

export function initOnline(role:Role, done) {
    ServiceManager.callRemote('guild:onlineData', {accountId:role.accountId}, (err, res) => {
        if (err) {
            Log.uError(role.accountId, 'Guild', 'message=' + err.message);
            return done(err);
        }
        if (res.error) {
            Log.uError(role.accountId, 'Guild', 'error=' + JSON.stringify(res.error));
            return done();
        }

        if (res.data) {
            var mgr = role.guilds;
            mgr.guildId = res.data.guildId;
            mgr.hierarchy = res.data.hierarchy;
            mgr.techLevels = res.data.techLevels;
        }

        var NetType = pb.get('.Api.guild.onlineData.Notify');
        role.sendPacket(new NetType({notJoin: res.notJoin, data: res.data}));
        done();
    });
}

export function initGuild(role:Role, packet:any, done):void {
    ServiceManager.callRemote('guild:initGuild', {accountId: role.accountId}, (err, res) => {
        done(err, res);
    });
}

export function createGuild(role:Role, packet:any, done):void {
    var request = {
        accountId: role.accountId,
        name     : packet.name,
        badge    : packet.badge
    };

    ServiceManager.callRemote('guild:createGuild', request, (err, res) => {
        if (err || res.error) return done(err || res.error);
        done(null, {});
    });
}

export function joinGuild(role:Role, packet:any, done):void {

    var request = {
        accountId: role.accountId,
        guildId: packet.guildId
    };

    ServiceManager.callRemote('guild:joinGuild', request, (err, res) => {
        if (err || res.error) return done(err || res.error);
        done(null, {});
    });
}

export function viewGuild(role:Role, packet:any, done):void {
    var request = {
        guildId: packet.guildId
    };
    ServiceManager.callRemote('guild:viewGuild', request, (err, res) => {
        if (err || res.error) return done(err || res.error);

        var result:any = {};
        result.briefInfo = res.info.briefInfo;
        result.announce = res.info.announce;
        result.memberList = [];

        async.each(res.info.memberList, (value:any, next) => {

            PlayerInfoMgr.fetchNormalMode(value.accountId, HeroSuite.SuiteType.dungeon, (err, normalMode) => {
                if (err) return next(err);

                result.memberList.push({
                    accountId: value.accountId,
                    hierarchy: value.hierarchy,
                    normalMode: normalMode
                });
                next();
            });

        }, (err) => {
            if (err)
                return done(err);
            done(null, {
                info: result
            });
        });
    });
}

export function leaveGuild(role:Role, packet:any, done):void {
    var request = {
        accountId: role.accountId
    };
    ServiceManager.callRemote('guild:leaveGuild', request, (err, res) => {
        if (err || res.error) return done(err || res.error);
        done(null, {});
    });
}

export function membersTab(role:Role, packet:any, done):void {
    ServiceManager.callRemote('guild:membersTab', {
        accountId: role.accountId
    }, (err, res) => {
        if (err || res.error) return done(err || res.error);

        var result:any = [];
        async.each(res.memberList, (value:any, next) => {

            PlayerInfoMgr.fetchNormalMode(value.accountId, HeroSuite.SuiteType.dungeon, (err, normalMode) => {
                if (err) return next(err);

                result.push({
                    accountId: value.accountId,
                    hierarchy: value.hierarchy,
                    normalMode: normalMode
                });
                next();
            });

        }, (err) => {
            if (err)
                return done(err);
            done(null, {
                memberList: result
            });
        });
    });
}

export function listGuilds(role:Role, packet:any, done):void {
    var request = {
        accountId: role.accountId,
        condition: packet.condition,
        page: packet.page
    };
    ServiceManager.callRemote('guild:listGuilds', request, (err, res) => {
        if (err) return done(err);
        done(null, {
            guildList: res.guildList,
            totalSize: res.totalSize
        })
    });
}

export function updateSettings(role:Role, packet:any, done):void {
    var request = {
        accountId: role.accountId,
        settings: packet.settings
    };
    ServiceManager.callRemote('guild:updateSettings', request, (err, res) => {
        done(err || res.error, {});
    });
}

export function sendPetition(role:Role, packet:any, done):void {
    var request = {
        accountId: role.accountId,
        guildId: packet.guildId
    };
    ServiceManager.callRemote('guild:sendPetition', request, (err, res) => {
        done(err || res.error, {});
    });
}

export function viewPetition(role:Role, packet:any, done):void {
    ServiceManager.callRemote('guild:viewPetition', {
        accountId: role.accountId
    }, (err, res) => {
        if (err || res.error) return done(err || res.error);

        var result:any = [];
        async.each(res.petitionList, (value:any, next) => {

            PlayerInfoMgr.fetchNormalMode(value.accountId, HeroSuite.SuiteType.dungeon, (err, normalMode) => {
                if (err) return next(err);

                result.push({
                    accountId: value.accountId,
                    guildId: value.guildId,
                    normalMode: normalMode
                });
                next();
            });

        }, (err) => {
            if (err)
                return done(err);
            done(null, {
                petitionList: result
            });
        });
    });
}

export function acceptPetition(role:Role, packet:any, done):void {
    var request = {
        accountId: role.accountId,
        petitionAccountId: packet.petitionAccountId
    };
    ServiceManager.callRemote('guild:acceptPetition', request, (err, res) => {
        if (err || res.error) return done(err || res.error);
        done(null, {
            petitionAccountId: packet.petitionAccountId
        });
    });
}

export function dismissPetition(role:Role, packet:any, done):void {
    var request = {
        accountId: role.accountId,
        dismissAll: packet.dismissAll,
        dismissAccountId: packet.dismissAccountId
    };
    ServiceManager.callRemote('guild:removePetition', request, (err, res) => {
        if (err || res.error) return done(err || res.error);
        done(null, {
            dismissAccountId: packet.dismissAccountId
        });
    });
}

export function viewInvitation(role:Role, packet:any, done) {
    ServiceManager.callRemote(
        'guild:viewInvitation',
        {
            accountId: role.accountId
        },
        done
    );
}

export function sendInvitation(role:Role, packet:any, done) {
    ServiceManager.callRemote(
        'guild:sendInvitation',
        {
            accountId: role.accountId,
            invitedId: packet.invitedId
        },
        done
    );
}

export function acceptInvitation(role:Role, packet:any, done) {
    ServiceManager.callRemote(
        'guild:acceptInvitation',
        {
            accountId: role.accountId,
            guildId: packet.guildId
        },
        done
    );
}

export function dismissInvitation(role:Role, packet:any, done) {
    ServiceManager.callRemote(
        'guild:dismissInvitation',
        {
            accountId: role.accountId,
            dismissAll: packet.dismissAll,
            dismissGuildId: packet.dismissGuildId
        },
        done
    );
}

export function kickMember(role:Role, packet:any, done):void {
    var request = {
        accountId: role.accountId,
        kickedId: packet.kickedId
    };
    ServiceManager.callRemote('guild:kickMember', request, (err, res) => {
        if (err || res.error) return done(err || res.error);
        done(null, {
            kickedId: packet.kickedId
        });
    });
}

export function fetchEvent(role:Role, packet:any, done):void {
    var page = packet.page;

    var eventList = [], namePair = [];
    var redisKey = '';
    var totalPage = 0;
    async.waterfall([
        (next) => {
            PlayerInfoMgr.fetchGuild(role.accountId, next);
        },
        (cache, next) => {
            redisKey = 'cache:guild:event:'+cache.guild.guildId;
            RedisMgr.role.conn.llen(redisKey, (err, result) => {
                if (err) return next(err);
                totalPage = Math.ceil(result / 10);
                next();
            });
        },
        (next) => {
            if (page > totalPage) page = totalPage;

            var start = (page - 1) * 10,
                stop = page * 10 - 1;

            RedisMgr.role.conn.lrange(new Buffer(redisKey), start, stop, (err, result) => {
                if (err) return next(err);
                var EventMsg = pb.get('.Model.Guild.EventMsg');
                for (var i = 0; i < result.length; i++) {
                    var event = EventMsg.decode(result[i]);
                    eventList.push(event);
                }
                next();
            });
        },
        (next) => {
            var playerList = {};
            eventList.forEach((event:GuildEvent.EventMsg) => {
                event.players.forEach((id) => { playerList[id] = true; });
            });
            async.each(
                Object.keys(playerList),
                (playerId, cb) => {
                    PlayerInfoMgr.fetchBasic(parseInt(playerId), (err, obj) => {
                        if (err) return cb(err);
                        namePair.push({
                            accountId: parseInt(playerId),
                            name: obj.basic.name
                        });
                        cb();
                    });
                },
                (err) => {
                    next(err);
                }
            );
        }
    ], (err) => {
        done(err, {
            eventList: eventList,
            namePair: namePair,
            currentPage: page,
            totalPage: totalPage
        });
    });

}

export function appointHierarchy(role:Role, packet:any, done):void {
    var memberId = packet.memberId,
        hierarchy = Guild.Hierarchy[packet.hierarchy];

    ServiceManager.callRemote('guild:appointHierarchy', {
        operatorId: role.accountId,
        memberId: memberId,
        newHierarchy: hierarchy
    }, (err, res)=>{
        if (err || res.error) return done(err || res.error);
        done(null, {});
    });
}

export function initContribute(role:Role, packet:any, done):void {

    ServiceManager.callRemote('guild:initContribute', {
        accountId: role.accountId
    }, (err, res)=>{
        if (err || res.error) return done(err || res.error);
        done(null, {
            bankMoney: res.bankMoney,
            contributeProgress: res.contributeProgress
        });
    });
}

export function contributeMoney(role:Role, packet:any, done):void {
    var money = packet.money;

    if (money < 10000)
        throw new CE.UserError(ERRC.COMMON.UNKNOWN, {
            msg: ''
        });

    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.GOLD] = money;

    ResourceMgr.checkHasEnoughResource(role, consume);

    ServiceManager.callRemote('guild:contributeMoney', {
        accountId: role.accountId,
        money: money
    }, (err, res) => {
        if (err || res.error) return done(err || res.error);

        var levelUp:Common.LevelUp = res.contributeProgressUpdate;
        var reward:Universal.Resource = {};

        try {
            ResourceMgr.applyConsume(role, Enum.USE_TYPE.UNDEFINED, consume);

            /****************************************
             * apply level up reward
             * @xienanjie 16-4-15
             ****************************************/

            if (levelUp.growCount > 0) {
                var config;
                for (var level = levelUp.originLevel; level < levelUp.resultLevel; level++) {
                    config = Config.configMgr.guild_contributiondb.get(level);
                    config.JSON_reward.forEach((res:any) => {
                        Util.plusValueInMap(reward, res.resID, res.count);
                    });
                }

                var overCount = levelUp.growCount - (levelUp.resultLevel - levelUp.originLevel);
                if (overCount > 0) {
                    config = Config.configMgr.guild_contributiondb.get(levelUp.resultLevel);
                    config.JSON_reward.forEach((res:any) => {
                        Util.plusValueInMap(reward, res.resID, res.count * overCount);
                    });
                }
            }

        } catch (e) {
            return done(e);
        }

        role.sendUpdatePacket(true);

        done(null, {
            bankMoney: res.bankMoney,
            contributeProgressUpdate: levelUp,
            reward: Universal.tranResourceToRewardList(reward)
        });

    });
}

export function initContributeHistory(role:Role, packet:any, done):void {
    ServiceManager.callRemote('guild:initContributeHistory', {
        accountId: role.accountId
    }, (err, res)=>{
        if (err || res.error) return done(err || res.error);

        var historyList:any = [];
        async.each(res.contributeHistory, (value:any, next) => {

            PlayerInfoMgr.fetchNormalMode(value.accountId, HeroSuite.SuiteType.dungeon, (err, normalMode) => {
                if (err) return next(err);

                historyList.push({
                    accountId: value.accountId,
                    contribute: value.totalContribute,
                    normalMode: normalMode
                });
                next();
            });

        }, (err) => {
            if (err) return done(err);
            done(null, {
                historyList: historyList
            });
        });
    });
}

export function initTech(role:Role, packet:any, done):void {
    ServiceManager.callRemote('guild:initTech', {accountId:role.accountId},(err, res) => {
        if(err || res.error){
            return done(err || res.error);
        }

        res.techBoosts.forEach((key) => {
            role.guildTechBoosts[key.elementId] = key.boost;
        });

        var result = {
            bankMoney: res.bankMoney,
            techList: res.techList
        };
        done(null, result);
    })
}

export function upgradeTech(role:Role, packet:any, done):void {
    var request = {
        accountId: role.accountId,
        elementId: packet.elementId,
        clientTechLevel: packet.clientTechLevel
    };
    ServiceManager.callRemote('guild:upgradeTech', request, (err,res) => {
        if (err || res.error){
            return done(err || res.error);
        }

        role.guildTechBoosts[packet.elementId] = res.boost;

        var result = {
            bankMoney: res.bankMoney
        };
        done(null, result);
    });
}

export function transforLeader(role:Role, packet:any, done):void {
    var request = {
        operatorId: role.accountId,
        memberId: packet.memberId
    };

    ServiceManager.callRemote('guild:transforLeader', request, (err, res) => {
        if (err || res.error) {
            return done(err || res.error);
        }

        done(null, {});
    });
}
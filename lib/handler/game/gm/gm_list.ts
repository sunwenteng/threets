import fs           = require('fs');
import mkdirp       = require('mkdirp');
import path         = require('path');
import pb           = require('node-protobuf-stream');

import CustomError  = require('../../../util/errors');
import log          = require('../../../util/log');
import ERRC         = require('../../../util/error_code');
import Enum         = require('../../../util/enum');
import Time         = require('../../../util/time');
import Universal    = require('../universal');

import index        = require('../../../../index');

import Role         = require('../role');

import AchievementDef   = require('../achievement/defines');
import QuestDef         = require('../quest/defines');
import ActivityDef      = require('../activity/defines');
import TimeDef          = require('../time/defines');

// system
import HeroSystem   = require('../api/hero_system');
import BattleSystem = require('../api/battle_system');
//import Rpc = require('../center_client');

// manager
import ResourceMgr  = require('../resource/resource_mgr');
import AchievementGlobalMgr = require('../achievement/achievement_global_mgr');
import DungeonMgr   = require('../battle/dungeon_mgr');
import BossGlobalMgr= require('../boss/boss_global_mgr');

import HeroSuite = require('../hero/hero_suite');

var cm = require('../../../config').configMgr;

/**
 * 新指令添加说明
 *
 * 1. 不需要手动调用role.sendAllUpdatePacket()，上层接口会调用
 */

export var gmList = {

    "set level": {
        description: '设置自己骑士的等级',
        gmLevel: 1,
        alias: ["sl"],
        fixed: [
            {
                name: "level",
                type: "number",
                max: 100,
                description: '骑士等级'
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var originLevel = role.level;
            role.level = param.fixed.level;
            role.setResCount(Enum.RESOURCE_TYPE.ROLE_LEVEL, role.level);
            role.setResCount(Enum.RESOURCE_TYPE.ROLE_EXP, 0);

            role.onLevelUp(originLevel, role.level);
            done(null);
        }
    },

    // 重置成就
    "reset ach": {
        description: '重置成就',
        gmLevel: 1,
        alias: [],
        fixed: [],
        ext: [
            {
                name: 'achievementID',
                type: 'number',
                tableColumn: ['achievement.ID'],
                description: '需要重置的成就ID'
            }
        ],
        func: function (role:Role, param:any, done:(err)=>void) {
            param.ext.forEach((item:{achievementID:number; progress:number}) => {
                if (!item.achievementID) { // reset all
                    role.achievements.resetAchievement(role);
                    return;
                }

                // reset one
                var entry = AchievementGlobalMgr.getAchievementEntry(item.achievementID);
                if (!entry) {
                    return;
                }
                role.achievements._setProgress(entry, 0, AchievementDef.PROGRESS.SET);
                delete role.achievements.mapCompleteAchievements[item.achievementID];
            });
            done(null);
        }
    },

    "add": {
        description: '添加资源',
        gmLevel: 1,
        alias: [],
        fixed: [],
        ext: [
            {
                name: "resID",
                type: "number",
                tableColumn: ['item.ID', 'equip.ID'],
                description: '资源ID'
            },

            {
                name: "count",
                type: "number"
            }
        ],
        func: function (role:Role, param:any, done:(err)=>void) {
            var i, item, resType;
            var reward:Universal.Resource = {};
            for (i = 0; i < param.ext.length; i += 1) {
                item = param.ext[i];
                resType = Universal.getResIDType(item.resID);
                reward[item.resID] = item.count;
            }
            ResourceMgr.applyReward(role, Enum.USE_TYPE.ROLE_GM, reward);
            done(null);
        }
    },

    "set": {
        description: '设置资源',
        gmLevel: 1,
        alias: [],
        fixed: [],
        ext: [
            {
                name: "resID",
                type: "number",
                tableColumn: ['item.ID', 'equip.ID'],
                description: '资源ID'
            },

            {
                name: "count",
                type: "number"
            }
        ],
        func: function (role:Role, param:any, done:(err)=>void) {
            var i, item, resType;
            for (i = 0; i < param.ext.length; i += 1) {
                item = param.ext[i];
                resType = Universal.getResIDType(item.resID);
                switch (resType) {
                    case Enum.RES_ID_TYPE.ITEM:
                    case Enum.RES_ID_TYPE.NUMERIC:
                    case Enum.RES_ID_TYPE.CAPE:
                        role.setResCount(item.resID, item.count);
                        break;
                }
            }
            done(null);
        }
    },

    //"say world": {
    //    description: '世界聊天',
    //    gmLevel: 1,
    //    alias: ["sw"],
    //    fixed: [
    //        {
    //            name: "chatText",
    //            type: "string",
    //            description: '聊天文本'
    //        }
    //    ],
    //    ext: [],
    //    func: function (role:Role, param:any, done:(err)=>void) {
    //        var pack = new cmd['cmd_cs_chat_sayWorld']({
    //            chatText: param.fixed.chatText
    //        });
    //        role.session.packetRecvQueue.push(pack);
    //        done(null);
    //    }
    //},

    "quest": {
        description: '任务类GM指令（对任务列表进行统一操作）',
        gmLevel: 1,
        alias: ['q'],
        fixed: [
            {
                name: 'action',
                type: 'string',
                enumeration: ['r', 'reset', 'c', 'complete', 'a', 'add', 'd', 'del'],
                description: '操作类型'
            }
        ],
        ext: [
            {
                name: 'questID',
                type: 'number',
                tableColumn: ['quest.ID'],
                description: '任务ID'
            }
        ],
        func: function (role:Role, param:any, done:(err)=>void) {
            var i;
            switch (param.fixed.action) {
                case 'r':
                case 'reset':
                    for (i = 0; i < param.ext.length; ++i) {
                        role.quests.resetQuest(param.ext[i].questID);
                    }
                    break;
                case 'c':
                case 'complete':
                    for (i = 0; i < param.ext.length; ++i) {
                        role.quests.autoCompleteQuest(param.ext[i].questID);
                    }
                    break;
                case 'a':
                case 'add':
                    for (i = 0; i < param.ext.length; ++i) {
                        try {
                            if (role.quests.quests[param.ext[i].questID]) {
                                role.quests.resetQuest(param.ext[i].questID);
                            } else {
                                role.quests.addQuest(param.ext[i].questID);
                            }
                        } catch (err) {
                            log.sError('GM', 'quest add ' + param.ext[i].questID + ' Error ' + err.stack);
                        }
                    }
                    break;
                case 'd':
                case 'del':
                    for (i = 0; i < param.ext.length; ++i) {
                        role.quests.deleteQuest(param.ext[i].questID);
                    }
                    break;
            }
            done(null);
        }
    },

    "dungeon max": {
        description: '设置副本最大进度',
        gmLevel: 1,
        alias: ['dm'],
        fixed: [
            {
                name: 'stageID',
                type: 'number',
                tableColumn: ['stage.ID'],
                description: '关卡ID'
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var stageID = param.fixed.stageID;
            if (DungeonMgr.isNormalStage(stageID) && stageID / 100 < 17) {
                role.dungeons.completeHighestStageID = stageID;
                role.dungeons.updateHeadStageID();
                BattleSystem.sendRoleInitDungeon(role);
            }
            done(null);
        }
    },

    "set hp": {
        description: '设置骑士血量',
        gmLevel: 1,
        alias: ['sh'],
        fixed: [
            {
                name: 'heroUid',
                type: 'number',
                max: 6,
                min: 1,
                description: '英雄ID'
            },
            {
                name: 'currentHp',
                type: 'number',
                min: 0,
                description: '当前血量'
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var hero = role.heros.getHero(param.fixed.heroUid - 1);
            if (hero) {
                hero.setHealth(HeroSuite.SuiteType.dungeon, param.fixed.currentHp);
                var now = Time.gameNow();
                role.healthCounterMap[HeroSuite.SuiteType.dungeon] = new Time.RoundCounter(20); // TODO 20s 回血， 需改成配表
                role.healthCounterMap[HeroSuite.SuiteType.dungeon].setStart(now);

            }
            done(null);
        }
    },

    "sec": {
        gmLevel: 9,
        alias: [],
        fixed: [
            {
                name: 'second',
                type: 'number'
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var second = param.fixed.second;
            Time.setOffset(second);
            done(null);
        }
    },

    "date": {
        gmLevel: 9,
        alias: [],
        fixed: [],
        ext: [
            {
                name: 'value',
                type: 'number'
            }
        ],
        func: function (role:Role, param:any, done:(err)=>void) {
            var i, multi = [1, 24, 60, 60], total = 0;
            for (i = 0; i < multi.length; ++i) {
                total = total * multi[i] + (param.ext.length > i ? param.ext[i].value : 0);
            }

            Time.setOffset(total);
            done(null);
        }
    },

    "clear friend battle cd": {
        description: '清除好友战斗cd',
        gmLevel: 1,
        alias: ['cfbc'],
        fixed: [
            {
                name: 'friendId',
                type: 'number',
                description: '好友ID'
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var friendId = param.fixed.friendId;
            delete role.friends.lastBattleTime[friendId];
            done(null);
        }
    },

    "hire count": {
        description: '设置已经雇佣好友战斗的次数',
        gmLevel: 1,
        alias: ['hc'],
        fixed: [
            {
                name: 'count',
                type: 'number',
                description: '雇佣次数'
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            role.friends.hireMgr.hiredCount = param.fixed.count;
            done(null);
        }
    },

    //"refer count": {
    //    description: '设置refer已有数量',
    //    gmLevel: 1,
    //    alias: ['rc'],
    //    fixed: [
    //        {
    //            name: 'count',
    //            type: 'number',
    //            description: 'refer数量'
    //        }
    //    ],
    //    ext: [],
    //    func: function (role:Role, param:any, done:(err)=>void) {
    //        role.friends.referFriendCount = param.fixed.count;
    //        role.sendPacket(new cmd['cmd_sc_friend_updateInfo']({
    //            referFriendCount: role.friends.referFriendCount
    //        }));
    //        done(null);
    //    }
    //},

    "add killed boss": {
        description: '添加boss到击杀列表（使其可以召唤）',
        gmLevel: 1,
        alias: ['akb'],
        fixed: [
            {
                name: 'bossId',
                type: 'number',
                tableColumn: 'boss_summon.ID',
                description: 'bossID'
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var bossId = param.fixed.bossId;
            var config = cm.boss_summondb.get(bossId);
            role.summonBoss.addBoss(config.ID);
            role.summonBoss.sendUpdatePacket(role);
            done(null);
        }
    },

    "test": {
        description: '程序用测试指令',
        gmLevel: 2,
        alias: ['t'],
        fixed: [
            {
                name: 'action',
                type: 'string'
            }
        ],
        ext: [
            {
                name: 'value',
                type: 'number'
            }
        ],
        func: function (role:Role, param:any, done:(err)=>void) {
            switch (param.fixed.action) {
                case 'rpc':
                    break;
            }
            done(null);
        }
    },

    "export": {
        description: '导出自己的数据作为模板',
        gmLevel: 3,
        alias: ['ept'],
        fixed: [
            {
                "name": "template_name",
                "type": "string",
                "description": "模板名"
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var date = new Date();
            var data:any = {
                timestamp: date.toISOString(),
                serverId: 1,
                accountId: role.accountId,
                role: role.exportData()
            };

            var filename:string = (param.fixed.template_name || role.accountId) + '.json';
            var templatePath = path.join(index.sourceRoot, 'data', 'template');
            mkdirp.sync(templatePath);
            fs.writeFile(path.join(templatePath, filename), JSON.stringify(data, null, 2), 'utf8', (err) => {
                if (err) {
                    log.sError('GM', err.message);
                    return done(err);
                }
                log.sInfo('GM', 'export ' + filename + ' successfully');
                done(null);
            });
        }
    },

    "import": {
        description: '导入模板数据',
        gmLevel: 3,
        alias: ['ipt'],
        fixed: [
            {
                "name": "template_name",
                "type": "string",
                "description": "模板名"
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var moduleList = {

                "ind": [
                    'resource',
                    'achievements',
                    'dungeons',
                    'time_control',
                    'summonBoss',
                    'boss',
                    'quests'
                ],
                "un": [
                    ['builds', 'equips', 'heros']
                ]
            };

            var filename:string = param.fixed.template_name + '.json';
            var templatePath = path.join(index.sourceRoot, 'data', 'template');

            try {
                var content:any = fs.readFileSync(path.join(templatePath, filename));
                var data = JSON.parse(content);

                function loadDBMsg(role:Role, key, data) {
                    if (key === 'resource') {
                        role.loadDBMsg(data, true);
                    } else {
                        if (role[key] && role[key].loadDBMsg) {
                            role[key].loadDBMsg(data);
                        }
                    }
                }

                moduleList.ind.forEach((key) => {
                    var tempRole = data.role;
                    if (tempRole[key]) {
                        loadDBMsg(role, key, tempRole[key]);
                    }
                });

                moduleList.un.forEach((keyList:string[]) => {
                    var tempRole = data.role,
                        valid = true;

                    keyList.forEach((key) => {
                        var mgr = key === 'resource' ? role : role[key];
                        if (!tempRole[key] || !mgr || !mgr.loadDBMsg) {
                            valid = false;
                        }
                    });

                    keyList.forEach((key) => {
                        var tempRole = data.role;
                        if (tempRole[key]) {
                            loadDBMsg(role, key, tempRole[key]);
                        }
                    });

                });
                done(null);

            } catch (err) {
                log.uError(role.accountId, 'ImportData', 'Error: ' + err.message);
                done(err);
            }

        }
    },

    "first charge": {
        description: '设置首次充值状态',
        gmLevel: 2,
        alias: ['fc'],
        fixed: [
            {
                "name": "status",
                "type": "number",
                min: 0,
                max: Enum.FIRST_CHARGE_STATUS.GAINED,
                description: '充值状态'
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var status = param.fixed.status;
            if (status >= 0 && status <= Enum.FIRST_CHARGE_STATUS.GAINED) {
                role.setSundryValue(Enum.SUNDRY.FIRST_CHARGE_STATUS, status);
            }
            done(null);
        }
    },

    "flo": {
        description: '模拟阶梯商店的充值',
        gmLevel: 2,
        alias: [],
        fixed: [],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var order = role.activities.floShopMgr.order;
            if (order && order.status === ActivityDef.FLOURISHING_SHOP_BRACKET_STATUS.HANDLING_ORDER) {
                order.status = ActivityDef.FLOURISHING_SHOP_BRACKET_STATUS.CAN_GAIN;
                role.activities.sendFlourishingShopUpdate(role);
            }
            done(null);
        }
    },

    "enable boss": {
        description: '开启世界boss',
        gmLevel: 2,
        alias: ['eb'],
        fixed: [],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            var now = Time.gameNow();
            if (!role.boss.isBossActive(now)) {
                role.boss.bossData.activeBoss(now);
                role.sendPacket(role.boss.buildInitNetMsg(role));
            }
            done(null);
        }
    },

    "clear share": {
        description: '清除分享状态',
        gmLevel: 2,
        alias: ['cs'],
        fixed: [],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            role.time_control.delKey(TimeDef.TIME_STAMP.LAST_GAIN_SHARE_REWARD);
            role.time_control.delKey(TimeDef.TIME_STAMP.LAST_SHARE_GAME);
            role.setSundryValue(Enum.SUNDRY.SHARE_GAME_STATUS, Enum.SHARE_GAME_STATUS.NULL);
            role.sendUpdatePacket(false);
            done(null);
        }
    },

    "month clear record": {
        description: '清除分享状态',
        gmLevel: 2,
        alias: ['mcr'],
        fixed: [],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            role.signIn.monthSign.lastSignTime = 0;
            var M = pb.get('.Api.role.initMonthSign.Notify');
            role.sendPacket(new M({
                month: role.signIn.monthSign.monthId,
                hasSignDays: role.signIn.monthSign.hasSignDays,
                isSigned: Time.isToday(role.signIn.monthSign.lastSignTime)
            }));
            done(null);
        }
    },

    "month set day": {
        description: '清除分享状态',
        gmLevel: 2,
        alias: ['msd'],
        fixed: [
            {
                "name": "days",
                "type": "number",
                min: 0,
                max: 25,
                description: '已签到天数'
            }
        ],
        ext: [],
        func: function (role:Role, param:any, done:(err)=>void) {
            role.signIn.monthSign.hasSignDays = param.fixed.days;
            var M = pb.get('.Api.role.initMonthSign.Notify');
            role.sendPacket(new M({
                month: role.signIn.monthSign.monthId,
                hasSignDays: role.signIn.monthSign.hasSignDays,
                isSigned: Time.isToday(role.signIn.monthSign.lastSignTime)
            }));
            done(null);
        }
    }
};
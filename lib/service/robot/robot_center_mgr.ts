import async = require('async');
import RobotStruct = require('./robot_struct');
import Robot = require('./robot');
import RobotDef = require('./defines');
//import CenterDB = require('../../database/impl/center_db');
import Loot = require('../../handler/game/loot/loot');
import LootMgr = require('../../handler/game/loot/loot_mgr');
import Util = require('../../util/game_util');
import Enum = require('../../util/enum');
import log = require('../../util/log');
import Time = require('../../util/time');
import RedisStruct = require('../../redis/struct');
import RedisMgr = require('../../redis/redis_mgr');

import RoleSystem = require('../../handler/game/api/role_system');

var cm = require('../../config').configMgr;

var robotMap:{[accountId:number]:Robot} = {};
var levelMap:{[level:number]:number} = {};
var robotUpdate:{[accountId:number]:boolean} = {};

export var TYPE_3_ROBOT_START_ID = 5000;

export var maxRobotT2Id = 0;
export var maxRobotT3Id = 0;

function randomOneValue(lootId:number):number {
    var loot:Loot = LootMgr.rollLoot(lootId);
    var list = Object.keys(loot.resource);
    return list.length > 0 ? parseInt(list[0]) : 0;
}

function addRobot(robot:Robot, needUpdate:boolean):void {
    robotMap[robot.accountId] = robot;
    if (!levelMap[robot.level]) {
        levelMap[robot.level] = 1;
    } else {
        levelMap[robot.level] += 1;
    }

    switch (robot.robotType) {
        case RobotDef.ROBOT_TYPE.TYPE1:
            break;
        case RobotDef.ROBOT_TYPE.TYPE2:
            if (maxRobotT2Id < robot.accountId) {
                maxRobotT2Id = robot.accountId;
            }
            break;
        case RobotDef.ROBOT_TYPE.TYPE3:
            if (maxRobotT3Id < robot.accountId) {
                maxRobotT3Id = robot.accountId;
            }
            break;
    }

    if (needUpdate) {
        robotUpdate[robot.accountId] = true;
    }
}

function generateType1Robot():void {
    if (!robotMap[1]) {
        var config = cm.robotdb.get(1);
        var robot:Robot = new Robot();
        robot.accountId = 1;
        robot.level = config.robotLv;
        robot.username = RoleSystem.randomName();
        robot.equipAchievementTitle = randomOneValue(config.achiLoot);
        robot.robotType = RobotDef.ROBOT_TYPE.TYPE1;

        robot.pushNewHero(1, robot.username, robot.level,
            randomOneValue(config.equip1Loot), Util.randInt(config.equip1LVmin, config.equip1LVmax));

        addRobot(robot, true);
    }
}

function generateType2Robot():void {
    var count = 0;
    var accountId = maxRobotT2Id + 1;
    Object.keys(cm.robotdb.all()).forEach((ID) => {
        if (accountId >= TYPE_3_ROBOT_START_ID) return ;

        var config = cm.robotdb.get(ID);
        var robot:Robot, i, j, armorCol, levelMin, levelMax;

        var current = levelMap[config.robotLv] || 0;
        for (i = 0; i < config.robotCount - current; i += 1) {
            robot = new Robot();
            robot.accountId = accountId;
            robot.level = config.robotLv;
            robot.username = RoleSystem.randomName();
            robot.equipAchievementTitle = randomOneValue(config.achiLoot);
            robot.robotType = RobotDef.ROBOT_TYPE.TYPE2;

            for (j = 1; j <= 3; j += 1) {
                armorCol = 'equip' + j + 'Loot';
                levelMin = 'equip' + j + 'LVmin';
                levelMax = 'equip' + j + 'LVmax';
                if (config[armorCol] > 0 && config[levelMin] > 0 && config[levelMax] > 0) {
                    robot.pushNewHero(j, robot.username, robot.level,
                        randomOneValue(config[armorCol]), Util.randInt(config[levelMin], config[levelMax]));
                }
            }

            addRobot(robot, true);

            count += 1;
            accountId += 1;
        }
    });
    log.sInfo('Robot', 'generate type2 robot ' + count + ' count');
}

function genRobotByRobotRO(robotRO:RedisStruct.RobotRO):void {
    [-1, 1].forEach((delta) => {
        if (maxRobotT3Id >= Enum.VALID_ROLE_ID) return ;

        var robot:Robot = new Robot();
        robot.accountId = maxRobotT3Id + 1;
        robot.username = RoleSystem.randomName();
        robot.level = robotRO.level;
        robot.equipAchievementTitle = robotRO.achievementId;
        robot.robotType = RobotDef.ROBOT_TYPE.TYPE3;

        for (var i = 1; i <= 3; i += 1) {
            if (robotRO['hero' + i + 'armorID'] !== 0) {
                var armorID = robotRO['hero' + i + 'armorID'];
                var armorLevel = robotRO['hero' + i + 'armorLevel'] + delta;

                var config = cm.equipdb.get(armorID);
                if (armorLevel < 1) armorLevel = 1;
                if (armorLevel > config.maxlv) armorLevel = config.maxlv;

                robot.pushNewHero(i, robot.username, robot.level, armorID, armorLevel);
            }
        }

        addRobot(robot, true);  // this will modify maxRobotT3Id
    });
}

function generateType3Robot(robotList:RedisStruct.RobotRO[], callback:(err)=>void):void {
    robotList.forEach((ro) => {
        genRobotByRobotRO(ro);
    });
    callback(null);
}

export function handleType3RobotFromRedis(robotIdList:number[], callback:(err)=>void):void {
    async.waterfall([
        (next) => {
            var robotList:RedisStruct.RobotRO[] = [];
            async.eachLimit(robotIdList, 20, (robotId, cb) => {
                var robot:RedisStruct.RobotRO = new RedisStruct.RobotRO(robotId);
                robot.attach((err) => {
                    if (err) {
                        cb(null);
                        return ;
                    }

                    robotList.push(robot);

                    // 删除redis缓存，并不会删除robot内存
                    RedisMgr.del(robot, (err) => {
                        cb(null);
                    });
                });
            }, (err) => {
                next(err, robotList);
            });
        },
        (robotList:RedisStruct.RobotRO[], next) => {
            generateType3Robot(robotList, (err) => {
                next(err);
            });
        },
        (next) => {
            saveAllUpdateRobot(next);
        }
    ], (err) => {
        callback(err);
    });
}

export function loadAllRobot(callback:(err) => void):void {
    var count = 0, start = Date.now();
    var typeList:number[] = [0, 1, 5000, 10000];
    log.sInfo('Robot', 'loadAllRobot start');
    //CenterDB.fetchRobotRange(1, Enum.VALID_ROLE_ID, (err, result:CenterDB.CenterRobotInfo[]) => {
    //    if (err) {
    //        callback(err);
    //        return ;
    //    }
    //
    //    result.forEach((rb) => {
    //        var i, robot = new Robot();
    //        robot.accountId = rb.accountId;
    //        robot.level = rb.level;
    //        robot.username = rb.username;
    //        robot.equipAchievementTitle = rb.achievementId;
    //
    //        for (i = 1; i < typeList.length; i += 1) {
    //            if (robot.accountId <= typeList[i]) {
    //                robot.robotType = i;
    //                break;
    //            }
    //        }
    //
    //        for (i = 1; i <= 3; i += 1) {
    //            var col = 'hero' + i + 'armorID';
    //            if (rb[col]) {
    //                robot.pushNewHero(i, robot.username, robot.level, rb[col], rb['hero' + i + 'armorLevel']);
    //            }
    //        }
    //
    //        addRobot(robot, false);
    //        count += 1;
    //    });
    //
    //    var duration = (Date.now() - start) || -1;
    //    log.sInfo('Robot', 'loadAllRobot finished');
    //    log.sInfo('Robot', 'Statistic, loadAllRobot, size=' + count +
    //        ', time=' + duration + 'ms, rate=' + (count * 1000 / duration) + '/s');
    //    callback(null);
    //});
}

export function saveAllUpdateRobot(callback:(err)=>void):void {
    var now = Time.realNow(),
        robotList = Object.keys(robotUpdate),
        totalSize = robotList.length,
        finished = 0, percent = 0, start = Date.now();

    log.sInfo('Robot', 'saveAllUpdateRobot start');
    async.eachLimit(robotList, 20, (robotId, cb) => {
        var robot = robotMap[robotId];
        var content = {
            accountId: robot.accountId,
            username: robot.username,
            level: robot.level,
            achievementId: robot.equipAchievementTitle,
            updateTime: now
        };
        robot.heroes.forEach((hero) => {
            content['hero' + hero.ID + 'armorID'] = hero.armorID;
            content['hero' + hero.ID + 'armorLevel'] = hero.armorLevel;
        });

        for (var i = 1; i <= 3; i += 1) {
            if (!content.hasOwnProperty('hero' + i + 'armorID')) {
                content['hero' + i + 'armorID'] = 0;
                content['hero' + i + 'armorLevel'] = 0;
            }
        }

        //CenterDB.insertOrUpdateRobot(content, (err) => {
        //    finished += 1;
        //    var tmp = Math.ceil(finished / totalSize * 100);
        //    if (tmp > percent) {
        //        percent = tmp;
        //        log.sInfo('Robot', 'saveAllUpdateRobot, finished=' + finished + ', total=' + totalSize + ', percent=' + percent + '%');
        //    }
        //    cb(err);
        //});
    }, (err) => {
        robotUpdate = {};
        var duration = (Date.now() - start) || -1;
        log.sInfo('Robot', 'saveAllUpdateRobot finished');
        log.sInfo('Robot', 'Statistic, saveAllUpdateRobot, size=' + totalSize +
            ', time=' + duration + 'ms, rate=' + (totalSize * 1000 / duration) + '/s');
        callback(err);
    });
}

export function updateToCenterPlayer(callback:(err)=>void):void {
    var robotList = Object.keys(robotMap),
        totalSize = robotList.length,
        finished = 0, percent = 0, start = Date.now();

    log.sInfo('Robot', 'updateToCenterPlayer start');
    async.eachLimit(robotList, 20, (robotId, cb) => {
        var robot = robotMap[robotId];
        var content = {
            accountId: robot.accountId,
            username: robot.username,
            level: robot.level,
            arenaArmorID: robot.heroes[0].armorID,
            arenaArmorLevel: robot.heroes[0].armorLevel,
            bossArmorID: robot.heroes[0].armorID,
            bossArmorLevel: robot.heroes[0].armorLevel,
            dungeonArmorID: robot.heroes[0].armorID,
            dungeonArmorLevel: robot.heroes[0].armorLevel
        };
        //CenterDB.insertCenterRobotInfo(content, (err) => {
        //    finished += 1;
        //    var tmp = Math.ceil(finished / totalSize * 100);
        //    if (tmp > percent) {
        //        percent = tmp;
        //        log.sInfo('Robot', 'updateToCenterPlayer, finished=' + finished + ', total=' + totalSize + ', percent=' + percent + '%');
        //    }
        //    cb(err);
        //});
    }, (err) => {
        var duration = (Date.now() - start) || -1;
        log.sInfo('Robot', 'updateToCenterPlayer finished');
        log.sInfo('Robot', 'Statistic, updateToCenterPlayer, size=' + totalSize +
            ', time=' + duration + 'ms, rate=' + (totalSize * 1000 / duration) + '/s');
        callback(err);
    });
}

export function initRobot(callback:(err) => void):void {
    log.sInfo('Robot', 'start initRobot');
    robotMap = {};
    maxRobotT2Id = 0;
    maxRobotT3Id = TYPE_3_ROBOT_START_ID;

    async.waterfall([
        (next) => {
            log.sInfo('Robot', 'loadAllRobot start');
            loadAllRobot((err) => {
                if (err) {
                    log.sError('Robot', 'loadAllRobot Error:' + err.stack);
                    log.sWarn('Robot', 'generate new robot');
                } else {
                    log.sInfo('Robot', 'loadAllRobot finished');
                }
                next(null);
            });
        },
        (next) => {
            generateType1Robot();
            generateType2Robot();
            next(null);
        },
        (next) => {
            saveAllUpdateRobot(next);
        }
    ], (err) => {
        log.sInfo('Robot', 'finish initRobot');
        callback(err);
    });
}

export function getRobot(robotId:number):Robot {
    return robotMap[robotId];
}

export function hasRobot(robotId:number):boolean {
    return !!robotMap[robotId];
}
import async = require('async');
import RobotStruct = require('../../../service/robot/robot_struct');
import Robot = require('../../../service/robot/robot');
import RobotDef = require('../../../service/robot/defines');

//import CenterDB = require('../../../database/impl/center_db');
import Loot = require('../loot/loot');
import LootMgr = require('../loot/loot_mgr');

import Util = require('../../../util/game_util');
import Enum = require('../../../util/enum');
import log = require('../../../util/log');

import DB = require('../../../database/database_manager');

import RoleSystem = require('../api/role_system');

var cm = require('../../../config').configMgr;

var robotMap:{[accountId:number]:Robot} = {};
var robotFightScoreArray:{accountId:number; score:number;}[] = [];
var robotMaxUpdateTime:number = 0;

function insertRobot(robot:Robot):void {
    robotMap[robot.accountId] = robot;
}

export function updateAllRobot(callback:(err) => void):void {
    DB.Arena.fetchRobotByUpdateTime(robotMaxUpdateTime, (err, result:any[]) => {
        if (err) {
            callback(err);
            return ;
        }

        result.forEach((rb) => {
            var robot = new Robot();
            robot.accountId = rb.accountId;
            robot.level = rb.level;
            robot.username = rb.username;
            robot.equipAchievementTitle = rb.achievementId;

            for (var i = 1; i <= 3; i += 1) {
                var col = 'hero' + i + 'armorID';
                if (rb[col]) {
                    robot.pushNewHero(i, robot.username, robot.level, rb[col], rb['hero' + i + 'armorLevel']);
                }
            }

            insertRobot(robot);

            if (robotMaxUpdateTime < rb.updateTime) {
                robotMaxUpdateTime = rb.updateTime;
            }
        });

        callback(null);
    });
}

function generateFightScoreArray():void {
    robotFightScoreArray = [];
    var robotList:string[] = Object.keys(robotMap);
    robotList.forEach((id) => {
        var accountId = robotMap[id].accountId;
        var level = robotMap[id].level;
        robotFightScoreArray.push({
            accountId: accountId,
            score: level
        });
    });
    robotFightScoreArray.sort((a, b) => {
        return a.score - b.score;
    });
}

export function randomRobotForArenaPlayer(playerScore:number):number {
    var length = robotFightScoreArray.length;
    var floor = Util.lowerBound(playerScore, length, (index) => {
        return robotFightScoreArray[index].score;
    });

    if (floor >= length) return 0;

    var upper = length >= floor + 10 ? (floor + 10) : length;
    var pos = Util.randInt(floor, upper);
    return robotFightScoreArray[pos].accountId;
}

export function initRobot(callback:(err) => void):void {
    robotMap = {};
    robotMaxUpdateTime = 0;

    async.waterfall([
        (next) => {
            updateAllRobot((err) => {
                if (err) {
                    log.sError('Robot', 'updateAllRobot Error:' + err.stack);
                }
                next(null);
            });
        },
        (next) => {
            generateFightScoreArray();
            next(null);
        }
    ], (err) => {
        callback(err);
    });
}

export function getRobot(robotId:number):Robot {
    return robotMap[robotId];
}

export function hasRobot(robotId:number):boolean {
    return !!robotMap[robotId];
}
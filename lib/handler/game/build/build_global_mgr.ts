import ConfigStruct = require('../../../config/struct/config_struct');
var cm = require('../../../config').configMgr;

var buildUpgrade:{[ID:number]:{[level:number]:ConfigStruct.build_upgradeDB}} = {};
var buildMaxLevel:{[ID:number]:number} = {};

export function reloadConfig():void {
    buildUpgrade = {};  // clear data first

    var mapConfig = cm.build_upgradedb.all(),
        config;

    Object.keys(mapConfig).forEach((key) => {
        config = cm.build_upgradedb.get(key);
        if (!buildUpgrade[config.build_ID]) {
            buildUpgrade[config.build_ID] = {};
        }
        buildUpgrade[config.build_ID][config.buildLevel] = config;

        if (!buildMaxLevel[config.build_ID]) {
            buildMaxLevel[config.build_ID] = config.buildLevel;
        } else if (buildMaxLevel[config.build_ID] < config.buildLevel) {
            buildMaxLevel[config.build_ID] = config.buildLevel;
        }
    });
}

export function getUpgradeConfig(ID:number, level:number):ConfigStruct.build_upgradeDB {
    var config = buildUpgrade[ID];
    if (!config) {
        return null;
    }
    var configLevel = config[level];
    if (!configLevel) {
        return null;
    }
    return configLevel;
}

export function getBuildMaxLevel(ID:number):number {
    return buildMaxLevel[ID] ? buildMaxLevel[ID] : 0;
}
import Enum = require('../../util/enum');
import Universal = require('../../handler/game/universal');
import AchievementDef = require('../../handler/game/achievement/defines');


// ./impl/
import AchievementCheck = require('./impl/achievement_check');
import ArenaCheck = require('./impl/arena_check');
import BossCheck = require('./impl/boss_check');
import BuildCheck = require('./impl/build_check');
import ChanceCheck = require('./impl/chest_check');
import EquipCheck = require('./impl/equip_check');
import DungeonCheck = require('./impl/dungeon_check');
import HeroCheck = require('./impl/hero_check');
import QuestCheck = require('./impl/quest_check');
import ShopCheck = require('./impl/shop_check');
import SignCheck = require('./impl/sign_check');

//var ConfigStruct;
//export var cm:any = null;

import ConfigStruct = require('../struct/config_struct');
export var cm:ConfigStruct.ConfigMgr = null;

// entrance
export function verifyConfig(path:string):void {
    tableColumnCache = {};
    ROLE_MAX_LEVEL = 0;
    cm = new ConfigStruct.ConfigMgr();

    reloadAllConfig(path);
    readConstant();

    // ****** begin *******//

    AchievementCheck.verify();
    ArenaCheck.verify();
    BossCheck.verify();
    BuildCheck.verify();
    ChanceCheck.verify();
    EquipCheck.verify();
    DungeonCheck.verify();
    HeroCheck.verify();
    QuestCheck.verify();
    ShopCheck.verify();
    SignCheck.verify();

    // ******  end  *******//
}

export function getErrorList():ErrorData[] {
    return errorList;
}

export function reloadAllConfig(path:string) {
    cm.loadAllConfig(path);
    console.log('加载config文件...');
}

export class ErrorData {
    table:string = '';
    ID:number = 0;
    column:string = '';
    message:string = '';

    constructor(table:string, ID:number, column:string, message:string) {
        this.table = table;
        this.ID = ID;
        this.column = column;
        this.message = message;
    }

    public toString():string {
        return '表[' + this.table + '][' + this.ID + '][' + this.column + ']: ' + this.message;
    }
}

var tableName:string = '';
var ID:number = 0;
var errorList:ErrorData[] = [];
export function setTableName(name:string):void {
    tableName = name;
}
export function setID(id:number):void {
    ID = id;
}
export function addErrorData(table:string, ID:number, column:string, message:string):void {
    errorList.push(new ErrorData(table, ID, column, message));
}

// constant
export var ROLE_MAX_LEVEL:number = 0;

export function readConstant():void {
    Object.keys(cm.knightexpdb.all()).forEach((key) => {
        var ID = parseInt(key);
        var config = cm.knightexpdb.get(ID);
        if (ROLE_MAX_LEVEL < config.ID) {
            ROLE_MAX_LEVEL = config.ID;
        }
    });
}

export function checkRoleLevel(column:string, level:number):void {
    if (level > ROLE_MAX_LEVEL) {
        addErrorData(tableName, ID, column, '角色等级[' + level + ']大于最高等级[' + ROLE_MAX_LEVEL+ ']');
    }
}

export function checkTableRef(column:string, id:number, table:string):void {
    if (!cm[table + 'db']) {
        addErrorData(tableName, ID, column, '表' + table + '未找到');
        return ;
    }

    if (id === undefined || id === null) {
        addErrorData(tableName, ID, column, '未找到[' + table +  '表]编号[' + id + ']');
        return ;
    }

    var value = cm[table + 'db'][table + 'DBConfig'][id];
    if (value !== 0 && !value) {
        addErrorData(tableName, ID, column, '未找到[' + table +  '表]编号[' + id + ']');
    }
}

var tableColumnCache:{[table:string]:{[column:string]:{[value:number]:boolean}}} = {};

export function checkTableExistValue(colName:string, value:any, table:string, column:string):void {
    if (!cm[table + 'db']) {
        addErrorData(tableName, ID, colName, '表' + table + '未找到');
        return ;
    }
    if (!tableColumnCache[table]) tableColumnCache[table] = {};
    if (!tableColumnCache[table][column]) {
        tableColumnCache[table][column] = {};

        Object.keys(cm[table + 'db'].all()).forEach((key) => {
            var config = cm[table + 'db'].get(parseInt(key));
            if (config[column] !== undefined) {
                tableColumnCache[table][column][ config[column] ] = true;
            }
        });
    }

    var cache = tableColumnCache[table][column];
    if (!cache[value]) {
        addErrorData(tableName, ID, colName, '在表[' + table + ']，列[' + column + ']中，未找到值[' + value + ']');
    }

}

export function checkTableExistColumn(colName:string, column:string, table:string):void {
    if (!cm[table + 'db']) {
        addErrorData(tableName, ID, colName, '表' + table + '未找到');
        return ;
    }

    var keyList:string[] = Object.keys(cm[table + 'db'].all());
    var exist = keyList.some((key) => {
        var config = cm[table + 'db'].get(parseInt(key));
        return config[column] !== undefined;
    });

    if (!exist) {
        addErrorData(tableName, ID, colName, '表[' + table + ']未找到列[' + column + ']');
    }
}

export function checkResourceIdValid(column:string, resId:number):void {
    var resType = Universal.getResIDType(resId);
    switch (resType) {
        case Enum.RES_ID_TYPE.ITEM: {
            checkTableRef(column, resId, 'item');
            break;
        }
        case Enum.RES_ID_TYPE.NUMERIC: {
            switch (resId) {
                case Enum.RESOURCE_TYPE.BOSS_ENERGY:
                case Enum.RESOURCE_TYPE.ARENA_ENERGY:
                //case Enum.RESOURCE_TYPE.ARENA_REPUTATION:
                case Enum.RESOURCE_TYPE.ROLE_EXP:
                case Enum.RESOURCE_TYPE.ROLE_LEVEL:
                case Enum.RESOURCE_TYPE.DIAMOND:
                case Enum.RESOURCE_TYPE.DIAMOND_CHARGE:
                case Enum.RESOURCE_TYPE.GOLD:
                case Enum.RESOURCE_TYPE.CASH:
                case Enum.RESOURCE_TYPE.FUSE_STONE:
                case Enum.RESOURCE_TYPE.HEAL_BOTTLE:
                    break;
                default :
                    addErrorData(tableName, ID, column, '未找到NUMERIC类型资源编号[' + resId + ']');
            }   // switch (resId)
            break;
        }
        case Enum.RES_ID_TYPE.ARMOR: {
            checkTableRef(column, resId, 'equip');
            break;
        }
        case Enum.RES_ID_TYPE.CAPE: {
            checkTableRef(column, resId, 'fashion');
            break;
        }
        case Enum.RES_ID_TYPE.BUILD: {
            checkTableRef(column, resId, 'build_basic');
            break;
        }
        default :
            addErrorData(tableName, ID, column,  '无效的资源类型');
    }
}

export function checkAchievementType(column:string, achievementType:number):void {
    if (achievementType >= AchievementDef.TYPE.TYPE_COUNT) {
        addErrorData(tableName, ID, column,  '成就类型未找到');
    }
}
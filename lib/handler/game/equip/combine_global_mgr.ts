import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Util = require('../../../util/game_util');
import ConfigStc = require('../../../config/struct/config_struct');

var cm = require('../../../config').configMgr;

var alterEquipIDByRare:{[rare:number]:number[]} = {};
var definiteCombine:{[e1:number]:{[e2:number]:number}} = {};

export function reloadConfig():void {

    // alterEquipIDByRare
    var forbidList = {};
    alterEquipIDByRare = {};
    var forbidConfigs = cm.fuse_nonedb.all();
    Object.keys(cm.fuse_nonedb.all()).forEach((ID) => {
        forbidList[forbidConfigs[ID].equipID] = true;
    });

    Object.keys(cm.equipdb.all()).forEach((key) => {
        var ID = parseInt(key);
        if (forbidList[ID]) {
            return ;
        }
        var config = cm.equipdb.get(ID);
        if (config.plus) {
            return ;
        }
        if (!alterEquipIDByRare[config.raity]) {
            alterEquipIDByRare[config.raity] = [config.ID];
        } else {
            alterEquipIDByRare[config.raity].push(config.ID);
        }
    });

    // definiteCombine
    definiteCombine = {};
    Object.keys(cm.fuse_definitedb.all()).forEach((key) => {
        var config = cm.fuse_definitedb.get(parseInt(key));
        var e1 = Math.min(config.equip1ID, config.equip2ID);
        var e2 = Math.max(config.equip1ID, config.equip2ID);

        definiteCombine[e1] = {};
        definiteCombine[e1][e2] = config.ID;
    });
}

function getDefiniteConfigID(IDArray:number[]) {
    if (!definiteCombine[IDArray[0]]) return null;
    return definiteCombine[IDArray[0]][IDArray[1]];
}

export function rollEquip(equipIDArray:number[]):number {
    if (equipIDArray.length !== 2) {
        throw new CustomError.UserError(ERRC.EQUIP.COMBINE_LENGTH_NOT_EQ_2, {
            msg: 'EQUIP.COMBINE_LENGTH_NOT_EQ_2, rollEquip'
        });
    }
    if (equipIDArray[0] > equipIDArray[1]) {
        var tmp = equipIDArray[0];
        equipIDArray[0] = equipIDArray[1];
        equipIDArray[1] = tmp;
    }

    var definiteID = getDefiniteConfigID(equipIDArray);
    if (definiteID) {
        return Util.randOneObjectByWeight(cm.fuse_definitedb.get(definiteID).JSON_equip3ID);
    }

    var combineConfigs:ConfigStc.equipDB[] = [],
        attrDuplicate = false,  // 属性重合
        attrSet = {}, // 属性集合
        attrList = [];
    for (var i = 0; i < 2; i++) {
        combineConfigs[i] = cm.equipdb.get(equipIDArray[i]);
        attrList.push({});
        combineConfigs[i].JSON_attribute.forEach((attr) => {
            if (attrSet[attr]) {
                attrDuplicate = true;
            }
            attrList[i][attr] = true;
            attrSet[attr] = true;
        });
    }

    if (attrDuplicate) {
        throw new CustomError.UserError(ERRC.EQUIP.COMBINE_TWO_SAME_ATTRIBUTE_EQUIP, {
            msg: 'EQUIP.COMBINE_TWO_SAME_ATTRIBUTE_EQUIP, ' + JSON.stringify(combineConfigs.map((e) => {
                return e.JSON_attribute;
            }))
        });
    }

    var rarity = Math.min(combineConfigs[0].raity, combineConfigs[1].raity);

    var rareConfig = cm.fuse_raritydb.get(rarity);
    var weight:{[key:number]:number} = {}, i:number, value;
    for (i = 1; i < 8; ++i) {
        value = rareConfig['rare' + i];
        if (value && alterEquipIDByRare[i]) {
            weight[i] = value;
        }
    }

    var rare = Util.randOneObjectByWeight(weight);

    //1	不允许出现2个装备属性之外的属性元素
    //2	不允许出现与2个装备相同的属性组合
    var availableList:number[] = [];
    alterEquipIDByRare[rare].forEach((element) => {
        try {
            var config = cm.equipdb.get(element);
            for (var i = 0; i < config.JSON_attribute.length; i++) {
                if ( ! attrSet[ config.JSON_attribute[i] ]) {
                    // 出现已有属性之外的属性
                    return ;
                }
            }

            if (config.JSON_attribute.length > 1) {
                var sameCount;
                for (var i = 0; i < attrList.length; i++) {
                    sameCount = 0;
                    for (var j = 0; j < config.JSON_attribute.length; j++) {
                        if (attrList[i][config.JSON_attribute[j]]) {
                            sameCount++;
                        }
                    }
                    if (sameCount > 1) {
                        //出现与2个装备相同的属性组合
                        return ;
                    }
                }
            }

            availableList.push(config.ID);
        } catch (err) {
            // do nothing
        }
    });

    return availableList.length === 0 ? 0 : Util.randArray(availableList)[0];
}
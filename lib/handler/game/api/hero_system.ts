import log      = require('../../../util/log');
import Util     = require('../../../util/game_util');
import HeroDef  = require('./../hero/defines');
import EquipSystem = require('./equip_system');
import CustomError = require('../../../util/errors');
import ERRC     = require('../../../util/error_code');
import Enum     = require('../../../util/enum');
import Role     = require('../role');
import Hero     = require('./../hero/hero');
import Universal = require('../universal');
import HeroSuite = require('./../hero/hero_suite');
import ResourceMgr = require('../resource/resource_mgr');

import RoleSystem = require('./role_system');
import PlayerInfoMgr = require('../../../cluster/player_info_mgr');

// conifg
var cm = require('../../../config').configMgr;

// protocol
// 会涉及到3件装备
export function setArmor(role:Role, packet:any, done):void {
    var i, reqDressing:{heroUid:number;armorUid:number}[] = packet.heroArmor;

    var heroUid, armorUid, equip, hero;

    var needSyncCenter = false, syncValue = {};
    var suiteType = packet.type.slice(0, -4);

    if (HeroSuite.SuiteList.indexOf(suiteType) === -1)
        throw new CustomError.UserError(ERRC.COMMON.PROTOCOL_ERROR, {msg: 'protocol error, packet.type=' + packet.type + ' is not allowed'});

    var dressing = role.heros.getHeroArmorBySuite(suiteType),
        dress;
    // 遍历请求
    for (i = 0; i < reqDressing.length; i++) {
        dress = reqDressing[i];

        // check hero exist
        hero = role.heros.getHero(dress.heroUid);
        if (!hero) {
            throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {msg: 'HeroNotFound, uid=' + dress.heroUid});
        }

        if (suiteType === HeroSuite.SuiteType.dungeon) {
            if (role.dungeons.isBattling() && role.dungeons.hasHeroInTeam(hero.uid)) {
                throw new CustomError.UserError(ERRC.HERO.SET_ARMOR_WHEN_IN_DUNGEON, {
                    msg: 'HERO.SET_ARMOR_WHEN_IN_DUNGEON, heroUid=' + hero.uid
                });
            }
        }

        // check equip exist
        equip = role.equips.getEquip(dress.armorUid);
        if (!equip) {
            throw new CustomError.UserError(ERRC.EQUIP.UID_NOT_FOUND, {msg: 'EquipNotFound, uid=' + dress.armorUid});
        }

        if (!equip.isSatisfyNature(hero.natureProperty)) {
            throw new CustomError.UserError(ERRC.EQUIP.NATURE_PROPERTY_NOT_SATISFY, {
                msg: 'NaturePropertyNotSatisfy, hero.uid=' + hero.uid + ', hero.property=' + hero.natureProperty + ', armor.ID=' + equip.ID
            });
        }

        dressing[dress.heroUid] = dress.armorUid;
    }

    // check duplicate
    var dupCount = {}, keys = Object.keys(dressing);
    // 遍历所有英雄
    for (i = 0; i < keys.length; i++) {
        heroUid = keys[i];
        armorUid = dressing[heroUid];

        if (dupCount[armorUid]) {
            throw new CustomError.UserError(ERRC.EQUIP.HAS_EQUIP_BY_OTHERS, {
                msg: 'ArmorHasEquipByOtherHero, heroList=[' + [heroUid, dupCount[armorUid].heroUid].join(',') + '], ' +
                'armorUid=' + armorUid
            });
        }
        else {
            dupCount[armorUid] = {heroUid: heroUid};
        }
    }

    // do set armor
    for (i = 0; i < reqDressing.length; i++) {
        dress = reqDressing[i];

        hero = role.heros.getHero(dress.heroUid);
        hero.setArmor(suiteType, dress.armorUid);
        calculateHeroProperty(role, hero);

        if (hero.uid === 0 && HeroSuite.SyncSuiteKeyList.indexOf(suiteType) != -1) {
            needSyncCenter = true;
            equip = role.equips.getEquip(dress.armorUid);

            syncValue[suiteType + 'ArmorID'] = equip.ID;
            syncValue[suiteType + 'ArmorLevel'] = equip.level;
        }
    }

    role.heros.sendUpdatePacket(role);

    done(null, {
        heroArmor: reqDressing
    });

    if (needSyncCenter) {
        //CenterDB.updateRoleInfo(role.accountId, syncValue, (err) => {
        //    if (err) {
        //        log.uError(role.accountId, 'setArmor.updateCenter', 'message=' + err.message);
        //    }
        //});
        PlayerInfoMgr.updateMainHero(role.accountId, role.buildCacheMainHero(), ()=> {
        });
    }
}

export function upgradeRune(role:Role, packet:any, done) {
    var runeType = packet.runeType;
    var currentLevel = role.heros.rune[runeType] || 0;
    var nextLevel = currentLevel + 1;
    var config = cm.Runedb.get(nextLevel);
    if (role.level < config.Level) {
        throw new CustomError.UserError(ERRC.HERO.ROLE_LEVEL_NOT_SATISFY, {
            msg: 'HERO.ROLE_LEVEL_NOT_SATISFY, role.level=' + role.level + ', config.level=' + config.Level
        });
    }

    var consume:Universal.Resource = {};
    config.JSON_cost.forEach(x => {
        consume[x.resID] = x.count;
    });

    ResourceMgr.applyConsume(role, Enum.USE_TYPE.UNDEFINED, consume);

    role.heros.rune[runeType] = nextLevel;

    calculateAllProperty(role);
    role.sendUpdatePacket(true);

    done(null, {
        runeType: runeType
    });
}

// protocol
export function setAppearance(role:Role, packet:any, done) {
    var hero = role.heros.getHero(packet['heroUid']);
    if (!hero) {
        throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {msg: 'HeroNotFound, uid=' + packet['heroUid']});
    }

    var logContent = {};
    var originName = null, resultName = null;

    for (var key in packet) {
        if (key !== 'heroUid' && packet.hasOwnProperty(key)) {
            if (packet[key] === null) {
                continue;
            }
            if (key === 'name') {
                if (Universal.replaceForbiddenWorld(packet[key]) !== '') {
                    throw new CustomError.UserError(ERRC.HERO.HERO_NAME_FORBIDDEN, {
                        msg: 'HERO.HERO_NAME_FORBIDDEN, name=' + packet[key]
                    });
                }

                originName = hero.getValue(key);
                resultName = packet[key];
            }
            logContent[key] = packet[key];

            hero.setValue(key, packet[key]);
        }
    }

    if (hero.uid === 0) {
        role.username = hero.name;
    }

    role.sendUpdatePacket(false);
    role.heros.sendUpdatePacket(role);

    done();

    // Sync Center
    if (hero.uid === 0) {
        var value = {}, needSyncCenter = false;
        Object.keys(packet).forEach((key) => {
            if (packet[key] === null) return;
            switch (key) {
                case 'name':
                    needSyncCenter = true;
                    value['username'] = packet[key];
                    break;
                case 'hairType':
                case 'hairColor':
                case 'faceType':
                case 'skinColor':
                case 'cape':
                    needSyncCenter = true;
                    value[key] = packet[key];
                    break;
                default :
                    break;
            }
        });

        //if (needSyncCenter) {
        //    CenterDB.updateRoleInfo(role.accountId, value, (err) => {});    // TODO need remove
        //    PlayerInfoMgr.updateMainHero(role.accountId, role.buildCacheMainHero(), ()=>{});
        //}
        //
        //if (originName && resultName) {
        //    PlayerInfoMgr.updateBasic(role.accountId, role.buildCacheBasic(), ()=>{});
        //
        //    GameWorld.routeRequest('common_modifyName',
        //        {
        //            accountId: role.accountId,
        //            originName: originName,
        //            resultName: resultName
        //        }, ()=>{});
        //}
    }
}

export function sendOnlinePacket(role:Role) {
    var pck = role.heros.buildInitNetMsg();
    role.sendPacket(pck);
}

export function checkUnlockHero(role:Role) {
    var container, config, hero, armor;
    container = role.heros.heroArray;
    for (var i = 0; i < container.length; i += 1) {
        hero = container[i];
        if (hero.canUnlock()) {
            config = cm.knightdb.get(hero.ID);
            if (config) {
                var heroName = "";
                hero.setValue(HeroDef.PROPERTY.NAME, heroName);
                armor = role.equips.createEquip(config.iniequip);
                hero.initArmor(armor.uid);
            }
            hero.unlock();
        }
    }
}

export function calculateAllProperty(role:Role) {
    var container, hero;
    container = role.heros.heroArray;
    for (var i = 0; i < container.length; i += 1) {
        hero = container[i];
        calculateHeroProperty(role, hero);
    }
}

export function calculateHeroProperty(role:Role, hero:Hero) {
    var levelProperty = hero.getLevelProperty();
    var runeProperty = Universal.calcHeroRuneProperty(role.heros.rune);
    HeroSuite.SuiteList.forEach((key) => {
        var property:{[key:string]:any} = {};
        var equipProperty = EquipSystem.getEquipProperty(role, hero, key);
        Util.addObject(property, levelProperty);
        Util.addObject(property, runeProperty);
        Util.addObject(property, equipProperty);
        hero.setSuiteProperty(HeroSuite.SuiteType[key], property);
    });
    //HeroDef.COPY_KEY_ARRAY.forEach((key) => {
    //    var property:{[key:string]:any} = {};
    //    var equipProperty = EquipSystem.getEquipProperty(role, hero, key);
    //    Util.addObject(property, levelProperty);
    //    Util.addObject(property, equipProperty);
    //    hero.setProperty(key, property);
    //});
}
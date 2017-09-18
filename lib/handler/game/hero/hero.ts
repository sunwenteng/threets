import util = require('util');
import log = require('../../../util/log');
import Util = require('../../../util/game_util');
import DynObject = require('../../../util/dynamicobject/dyn_object');
import ObjectDefine = require('../../../util/dynamicobject/defines');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Universal = require('../universal');
import HeroDef = require('./defines');
import HeroSuite = require('./hero_suite');

// conifg
var cm = require('../../../config').configMgr;

class HeroBattle extends DynObject{
    constructor() {
        super();
        this.setValue(HeroDef.PROPERTY.ARMOR, 0);
        this.setValue(HeroDef.PROPERTY.CURRENT_HP, 0);
        this.setValue(HeroDef.PROPERTY.HP, 0);
        this.setValue(HeroDef.PROPERTY.ATTACK, 0);
        this.setValue(HeroDef.PROPERTY.DEFENCE, 0);
        this.setValue(HeroDef.PROPERTY.CRITICAL, 0);
        this.setValue(HeroDef.PROPERTY.HIT, 0);
        this.setValue(HeroDef.PROPERTY.DODGE, 0);
    }
}

class Hero {
    objectTypeId = ObjectDefine.TYPEID.HERO;
    uid = 0;       // 等同位置，从0开始
    ID = 0;        // 配表ID
    name = '';
    isUnlock = false;
    runeLevel = 0;     // 符文等级

    hairType = 0;      // 发型
    hairColor = 0;     // 发色
    faceType = 0;      // 脸型
    skinColor = 0;     // 肤色

    cape = 0;          // 披风

    //arenaCopy = new HeroBattle();          // 竞技场战斗数据
    //bossCopy = new HeroBattle();           // BOSS战斗数据
    //dungeonCopy = new HeroBattle();        // 副本战斗数据

    suiteData = new HeroSuite.HeroSuite();

    // 冗余数据
    level = 0;     // 与role相同，role等级更新需要同步
    updateMask:{[key:string]:boolean} = {};
    natureProperty = 0; // 自然属性？

    constructor() {
        this.setValue(HeroDef.PROPERTY.UID, 0);
        this.setValue(HeroDef.PROPERTY.ID, 0);
        this.setValue(HeroDef.PROPERTY.NAME, 'hero_name');
        this.setValue(HeroDef.PROPERTY.IS_UNLOCK, false);
        this.setValue(HeroDef.PROPERTY.LEVEL, 1);
        this.setValue(HeroDef.PROPERTY.HAIR_TYPE, 1);
        this.setValue(HeroDef.PROPERTY.HAIR_COLOR, 1);
        this.setValue(HeroDef.PROPERTY.FACE_TYPE, 1);
        this.setValue(HeroDef.PROPERTY.SKIN_COLOR, 1);
        this.setValue(HeroDef.PROPERTY.CAPE, 0);
    }

    public canUnlock():boolean {
        if (this.isUnlock) {
            return false;
        }
        var config = cm.knightdb.get(this.ID);
        if (!config) {
            return false;
        }
        return this.level >= config.unlock;
    }

    public unlock():void {
        this.isUnlock = true;
        this.updateMask[HeroDef.PROPERTY.IS_UNLOCK] = true;
    }

    public needUpdate():boolean {
        return !Util.isEmpty(this.updateMask) ||
            this.suiteData.some(function (suite) {
                return suite.needUpdate();
            });
    }

    public clearUpdateMask():void {
        this.updateMask = {};
        this.suiteData.forEach(function (suite) {
            suite.clearUpdateMask();
        });
    }

    public buildInitNetMsg():any {
        var obj = {
            uid: this.uid,
            ID: this.ID,
            name: this.name,
            isUnlock: this.isUnlock,
            hairType: this.hairType,
            hairColor: this.hairColor,
            faceType: this.faceType,
            skinColor: this.skinColor,
            cape: this.cape,
            arenaCopy: this.suiteData.arena.getInitObject(),
            bossCopy: this.suiteData.boss.getInitObject(),
            dungeonCopy: this.suiteData.dungeon.getInitObject(),
            trialCopy: this.suiteData.trial.getInitObject(),
            raidCopy: this.suiteData.raid.getInitObject()
        };
        this.clearUpdateMask();
        return obj;
    }

    public buildUpdateNetMsg():any {
        var obj = Util.copyObject(this.updateMask), msg, i;
        var self = this;

        HeroSuite.SuiteList.forEach((key) => {
            if (self.suiteData[key].needUpdate()) {
                obj[key + 'Copy'] = self.suiteData[key].getUpdateObject();
                self.suiteData[key].clearUpdateMask();
            }
        });

        obj['uid'] = this.uid;
        this.clearUpdateMask();
        return obj;
    }

    public buildDBMsg():any {
        return {
            uid: this.uid,
            ID: this.ID,
            name: this.name,
            isUnlock: this.isUnlock,
            hairType: this.hairType,
            hairColor: this.hairColor,
            faceType: this.faceType,
            skinColor: this.skinColor,
            cape: this.cape,
            arenaCopy: this.suiteData.arena.getInitObject(),
            bossCopy: this.suiteData.boss.getInitObject(),
            dungeonCopy: this.suiteData.dungeon.getInitObject(),
            trialCopy: this.suiteData.trial.getInitObject(),
            raidCopy: this.suiteData.raid.getInitObject()
        };
    }

    public loadDBMsg(msg:any):void {
        this.uid = msg.uid;
        this.ID = msg.ID;
        this.name = msg.name;
        this.isUnlock = msg.isUnlock;
        this.hairType= msg.hairType;
        this.hairColor= msg.hairColor;
        this.faceType= msg.faceType;
        this.skinColor= msg.skinColor;

        HeroSuite.SuiteList.forEach((key) => {
            var suite:HeroSuite.FightSuite = this.suiteData[key];
            if (msg[key + 'Copy']) {
                Object.keys(msg[key + 'Copy']).forEach((keyId) => {
                    var value:number = msg[key + 'Copy'][keyId];
                    if (!Util.isInteger(value)) {
                        log.sError('Hero', 'NotAnInteger, uid=' + this.uid + ',key=' + key + ', keyId=' + keyId + ', value=' + value);
                    }
                    suite.setValue(keyId, value);
                });
            }
        });

    }

    public setValue(index:string, value:any):void {
        switch (index) {
            case HeroDef.PROPERTY.UID:    // can not set by this function ?
            case HeroDef.PROPERTY.ID:
            case HeroDef.PROPERTY.NAME:
            case HeroDef.PROPERTY.IS_UNLOCK:
            case HeroDef.PROPERTY.HAIR_TYPE:
            case HeroDef.PROPERTY.HAIR_COLOR:
            case HeroDef.PROPERTY.FACE_TYPE:
            case HeroDef.PROPERTY.SKIN_COLOR:
            case HeroDef.PROPERTY.CAPE:
                if (this[index] !== value) {
                    this.updateMask[index] = value;
                }
                this[index] = value;
                break;
            case HeroDef.PROPERTY.LEVEL:
                this.level = value;
                break;
            default :
                log.sError('Hero', 'error hero key=' + index + ', value=' + value);
                break;
        }

        if (index === HeroDef.PROPERTY.ID) {
            try {
                var config = cm.knightdb.get(value);
                this.natureProperty = config.attributetype;
            }
            catch (err) {
                this.natureProperty = 0;
            }
        }
    }

    public getValue(index:string):any {
        return this[index];
    }

    //public setEquip(key:string, vType:any, equipUid:number):void {
    //    switch (key) {
    //        case HeroDef.COPY_KEY.ARENA_COPY:
    //        case HeroDef.COPY_KEY.BOSS_COPY:
    //        case HeroDef.COPY_KEY.DUNGEON_COPY:
    //            switch (vType) {
    //                case HeroDef.PROPERTY.ARMOR:
    //                    this[key].setValue(vType, equipUid);
    //                    break;
    //            }
    //            break;
    //    }
    //}

    public initArmor(armorUid):void {
        HeroSuite.SuiteList.forEach((key) => {
            this.suiteData.setArmor(HeroSuite.SuiteType[key], armorUid);
        });
    }

    public setArmor(suite:HeroSuite.SuiteType, armorUid:number):void {
        this.suiteData.setArmor(suite, armorUid);
    }

    public getArmor(suite:HeroSuite.SuiteType):number {
        return this.suiteData.getArmor(suite);
    }

    public setSuiteProperty(key:HeroSuite.SuiteType, property:{[key:string]:any}):void {
        this.suiteData.setProperty(key, property);
    }

    public getSuiteProperty(key:HeroSuite.SuiteType):{[key:number]:any} {
        return this.suiteData.getProperty(key);
    }

    public getDyncObject(suiteType:HeroSuite.SuiteType):DynObject {
        return this.suiteData.getDyncObject(suiteType);
    }

    public getArmorList():{[type:string]:number} {
        return this.suiteData.getArmorList();
    }

    public addHealth(suite:HeroSuite.SuiteType, health:number):void {
        if (!health) return ;
        this.suiteData[suite].addCurrentHp(health);
    }

    public setHealth(suite:HeroSuite.SuiteType, health:number):void {
        if (health < 0) health = 0;
        this.suiteData[suite].setCurrentHp(health);
    }

    public getHealth(suite:HeroSuite.SuiteType):number {
        return this.suiteData[suite].getValue(HeroDef.PROPERTY.CURRENT_HP);
    }

    public isFullHealth(suite:HeroSuite.SuiteType):boolean {
        return this.suiteData[suite].isFullHp();
    }

    public recoverHealth(suite:HeroSuite.SuiteType) {
        this.suiteData[suite].fullCurrentHp();
    }

    public getLevelProperty():{[heroProperty:string]:number} {
        return Universal.calcHeroLevelProperty(this.uid, this.level);
    }

    public getAvatar():any {
        return {
            hairType: this.hairType,
            hairColor: this.hairColor,
            faceType: this.faceType,
            skinColor: this.skinColor
        }
    }
}

export = Hero;

import pb = require('node-protobuf-stream');

import log = require('../../../util/log');
import Hero = require('./hero');
import HeroDef = require('./defines');
import Role = require('../role');
import HeroSuite = require('./hero_suite');

var HERO_COUNT = 6;

class HeroMgr {
    heroArray:Hero[] = [];
    rune:{[t:number]:number} = {};

    constructor() {
        this.initContainer();
    }

    public initContainer():void {
        this.heroArray = [];
        this.rune = {};
    }

    public initMgr():void {
        var hero, i;
        this.initContainer();
        for (i = 0; i < HERO_COUNT; i += 1) {
            hero = new Hero();
            hero.setValue(HeroDef.PROPERTY.UID, i);
            hero.setValue(HeroDef.PROPERTY.ID, i + 1);
            this.heroArray.push(hero);
        }
    }

    public checkAllID():void {

    }

    public setAllLevel(level:number):void {
        var i, hero;
        for (i = 0; i < this.heroArray.length; i += 1) {
            hero = this.heroArray[i];
            hero.setValue(HeroDef.PROPERTY.LEVEL, level);
        }
    }

    public recoverAllHeroHealth(suite:HeroSuite.SuiteType):void {
        var i, hero;
        for (i = 0; i < this.heroArray.length; i += 1) {
            hero = this.heroArray[i];
            hero.recoverHealth(suite);
        }
    }

    public addAllHeroHealth(suite:HeroSuite.SuiteType, health:number):void {
        var i, hero;
        for (i = 0; i < this.heroArray.length; i += 1) {
            hero = this.heroArray[i];
            if (!hero.isFullHealth(suite)) {
                hero.addHealth(suite, health);
            }
        }
    }

    public isAllFullHealth(suite:HeroSuite.SuiteType):boolean {
        var i, hero;
        for (i = 0; i < this.heroArray.length; i += 1) {
            hero = this.heroArray[i];
            if (!hero.isFullHealth(suite)) {
                return false;
            }
        }
        return true;
    }

    public getHero(uid:number):Hero {
        return this.heroArray[uid];
    }

    public getMainHeroCurrentHP():number {
        return this.heroArray[0] ? this.heroArray[0].getHealth(HeroSuite.SuiteType.dungeon) : 0;
    }

    public getAllHero():Hero[] {
        return this.heroArray;
    }

    public getMainHeroAndTopAttacks(top:number):number {
        var attacks = [];
        var result = 0;
        this.heroArray.forEach((item, index)=> {
            if (index = 0) {
                result += item.getLevelProperty()[HeroDef.PROPERTY.ATTACK];
            }
            else {
                attacks.push(item.getLevelProperty()[HeroDef.PROPERTY.ATTACK]);
            }
        });
        attacks.sort();
        attacks.reverse();

        for (var i = 0; i < attacks.length && i < top; i++) {
            result += attacks[i];
        }
        return result;
    }

    //public getHeroArmorMap(hType:string):{[heroUid:number]:number} {
    //    var result:{[heroUid:number]:number} = {}, i, hero, armor;
    //    for (i = 0; i < this.heroArray.length; i += 1) {
    //        hero = this.heroArray[i];
    //        armor = hero[hType].getValue(HeroDef.PROPERTY.ARMOR);
    //        if (armor) {
    //            result[hero.uid] = armor;
    //        }
    //    }
    //    return result;
    //}

    //public getEquipArmorHero(armorUid:number):{[hType:string]:number} {
    //    var result:{[hType:string]:number} = {};
    //    this.heroArray.forEach((hero, index) => {
    //        HeroDef.COPY_KEY_ARRAY.forEach((hType) => {
    //            if (!hero[hType]) return;
    //
    //            var armor = hero[hType].getValue(HeroDef.PROPERTY.ARMOR);
    //            if (armor === armorUid) {
    //                result[hType] = index;
    //            }
    //        });
    //    });
    //    return result;
    //}

    // 限定一套战斗配置，获取Hero => Armor
    public getHeroArmorBySuite(suite:HeroSuite.SuiteType) {
        var result:{[heroUid:number]:number} = {}, i, hero, armor;
        for (i = 0; i < this.heroArray.length; i += 1) {
            hero = this.heroArray[i];
            armor = hero.suiteData[suite].getValue(HeroDef.PROPERTY.ARMOR);
            if (armor) {
                result[hero.uid] = armor;
            }
        }
        return result;
    }

    // 限定1种armor，获取Hero => Armor
    public getSuiteHeroByArmor(armorUid:number) {
        var result:{[hType:string]:number} = {};

        this.heroArray.forEach((hero, index) => {
            HeroSuite.SuiteList.forEach((suite) => {
                var armor = hero.suiteData[suite].getValue(HeroDef.PROPERTY.ARMOR);
                if (armor === armorUid) result[suite] = index;
            });
        });

        return result;
    }

    public buildInitNetMsg():any {
        var pck:any, i;
        var M = pb.get('.Api.role.initHero.Notify');
        pck = {allHero: []};
        if (this.heroArray.length === 0) {
            log.sError('HeroArray', 'heroArray.length == 0');
        }
        for (i = 0; i < this.heroArray.length; i += 1) {
            pck.allHero.push(this.heroArray[i].buildInitNetMsg());
        }
        pck.runeLevels = Object.keys(this.rune).map(x => { return {runeType: parseInt(x), level: this.rune[x]}; });
        return new M(pck);
    }

    public buildUpdateNetMsg():any {
        var pck, i, needUpdate = false;

        pck = {allHero: []};
        for (i = 0; i < this.heroArray.length; i += 1) {
            if (this.heroArray[i].needUpdate()) {
                needUpdate = true;
                pck.allHero.push(this.heroArray[i].buildUpdateNetMsg());
            }
        }
        if (needUpdate) {
            var M = pb.get('.Api.role.updateHero.Notify');
            return new M(pck);
        } else {
            return null;
        }
    }

    public sendUpdatePacket(role:Role):void {
        // 英雄更新包
        role.sendPacket(this.buildUpdateNetMsg());
    }

    public buildDBMsg():any {
        var heros = pb.get('.DB.heros');
        var pck = new heros(), i;
        for (i = 0; i < this.heroArray.length; i += 1) {
            pck['allHero'].push(this.heroArray[i].buildDBMsg());
        }
        return pck;
    }

    public loadDBMsg(msg:any):void {
        this.initMgr();
        for (var i = 0; i < msg['allHero'].length; i += 1) {
            this.heroArray[i].loadDBMsg(msg['allHero'][i]);
        }
    }
}

export = HeroMgr;
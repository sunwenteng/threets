
import DynObject = require('../../../util/dynamicobject/dyn_object');

import HeroDef = require('./defines');

export enum SuiteType {
    arena = <any> 'arena',
    boss = <any> 'boss',
    dungeon = <any> 'dungeon',
    trial = <any> 'trial',
    raid = <any> 'raid'
}

export var SuiteList = Object.keys(SuiteType);

export var SyncSuiteKeyList:any[] = [SuiteType.arena, SuiteType.boss, SuiteType.dungeon];

export class FightSuite extends DynObject{

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

    public setProperty(property:any):void {
        Object.keys(property).forEach((p) => {
            this.setValue(p, property[p]);
        });
    }

    public getProperty():{[key:number]:any} {
        return this.getInitObject();
    }

    /**
     * Add CURRENT_HP
     * @param count     add count
     * @returns {boolean}  true: full hp; false: not full
     */
    public addCurrentHp(count:number):boolean {
        var current = this.getValue(HeroDef.PROPERTY.CURRENT_HP);
        var maxHp = this.getValue(HeroDef.PROPERTY.HP);
        this.setValue(HeroDef.PROPERTY.CURRENT_HP, current + count > maxHp ? maxHp : current + count);
        return current + count >= maxHp;
    }

    public setCurrentHp(count:number):void {
        var maxHp = this.getValue(HeroDef.PROPERTY.HP);
        this.setValue(HeroDef.PROPERTY.CURRENT_HP, count >= maxHp ? maxHp : count);
    }

    public fullCurrentHp():void {
        this.setValue(HeroDef.PROPERTY.CURRENT_HP, this.getValue(HeroDef.PROPERTY.HP));
    }

    public isFullHp():boolean {
        return this.getValue(HeroDef.PROPERTY.HP) === this.getValue(HeroDef.PROPERTY.CURRENT_HP);
    }
}

export class HeroSuite {
    dungeon:FightSuite = new FightSuite();
    arena:FightSuite = new FightSuite();
    boss:FightSuite = new FightSuite();
    trial:FightSuite = new FightSuite();
    raid:FightSuite = new FightSuite();
    constructor() {

    }

    public forEach(fn:(suite:FightSuite)=>void):void {
        SuiteList.forEach((suite) => {
            if (!this[suite]) return;
            fn(this[suite]);
        });
    }

    public some(fn:(suite:FightSuite)=>void):boolean {
        for (var i = 0; i < SuiteList.length; i++) {
            if (fn(this[SuiteList[i]])) return true;
        }
        return false;
    }

    public findSuite(suiteType:SuiteType):FightSuite {
        var suite = SuiteType[suiteType];
        if (!suite) return null;
        return this[suite];
    }

    public setArmor(suiteType:SuiteType, armorUid:number):void {
        var suite = SuiteType[suiteType];
        if (!suite) return null;
        this[suite].setValue(HeroDef.PROPERTY.ARMOR, armorUid);
    }

    public getArmor(suiteType:SuiteType):number {
        var suite = SuiteType[suiteType];
        if (!suite) return 0;
        return this[suite].getValue(HeroDef.PROPERTY.ARMOR);
    }

    public getArmorList():{[type:string]:number} {
        var list:{[type:string]:number} = {};
        SuiteList.forEach((suite) => {
            list[suite] = this[suite].getValue(HeroDef.PROPERTY.ARMOR);
        });
        return list;
    }

    public setProperty(suiteType:SuiteType, property:any):void {
        var suite = SuiteType[suiteType];
        if (!suite) return null;
        this[suite].setProperty(property);
    }

    public getProperty(suiteType:SuiteType):{[key:number]:any} {
        var suite = SuiteType[suiteType];
        if (!suite) return null;
        return this[suite].getProperty();
    }

    public getDyncObject(suiteType:SuiteType):DynObject {
        var suite = SuiteType[suiteType];
        if (!suite) return null;
        return this[suite];
    }


}
import HeroDefine = require('../hero/defines');
import CustomError = require('../../../util/errors');
import ERRC = require("../../../util/error_code");
import Universal = require('../universal');

var cm = require('../../../config').configMgr;

class Equip {
    uid:number = 0;
    ID:number = 0;
    level:number = 0;
    exp:number = 0;

    public toString():string {
        return '{type:Equip' +
            ', uid:' + this.uid +
            ', ID:' + this.ID +
            ', level:' + this.level +
            ', exp:' + this.exp +
            '}';
    }

    public assignUid(uid:number) {
        this.uid = uid;
    }

    public initObject(ID:number) {
        this.ID = ID;
        this.level = 1;
        this.exp = 0;
    }

    public loadObject(ID:number, level:number, exp:number) {
        this.ID = ID;
        this.level = level;
        this.exp = exp;
    }

    public getProperty():{[heroProperty:string]:number} {
        return Universal.calcEquipProperty(this.ID, this.level);
    }

    public isSatisfyNature(limitNature:number):boolean {
        if (limitNature === 0) {
            return true;
        }
        var config = cm.equipdb.get(this.ID);
        if (!config) {
            return false;
        }
        return config.attribute1 === limitNature || config.attribute2 === limitNature;
    }

    public isMaxLevel():boolean {
        var config = cm.equipdb.get(this.ID);
        if (!config) {
            return true;
        }
        return this.level >= config.maxlv;
    }

    public addExp(exp:number):boolean {
        var config = cm.equipdb.get(this.ID), lvc;
        if (!config) {
            return false;
        }
        var totalExp = exp,
            leftNextLvExp = 0,
            expField = 'LV' + config.maxlv + 'Exp',
            changed = false;
        while (totalExp > 0 && this.level < config.maxlv) {
            lvc = cm.equipexpdb.get(this.level);
            if (!lvc.hasOwnProperty(expField)) {
                throw new CustomError.UserError(ERRC.COMMON.CONFIG_FIELD_ERROR, {
                    msg: 'COMMON.CONFIG_FIELD_ERROR, EquipExpDB, FieldNotFound, field=' + expField
                })
            }

            if (lvc[expField] < this.exp) {
                leftNextLvExp = 0;                    // 当前经验溢出，剩余升级经验为0，溢出部分不计入升级经验
            } else {
                leftNextLvExp = lvc[expField] - this.exp;
            }

            if (totalExp >= leftNextLvExp) {
                this.level += 1;
                this.exp = 0;
                totalExp -= leftNextLvExp;
                changed = true;
            } else {
                this.exp += totalExp;
                totalExp = 0;
                changed = true;
            }
        }
        return changed;
    }

    public buildInitNetMsg():any {
        return {
            uid: this.uid,
            ID: this.ID,
            level: this.level,
            exp: this.exp
        };
    }

    public buildDBMsg():any {
        return {
            uid: this.uid,
            ID: this.ID,
            level: this.level,
            exp: this.exp
        };
    }

    public loadDBMsg(msg:any) {
        this.uid = msg.uid;
        this.ID = msg.ID;
        this.level = msg.level;
        this.exp = msg.exp;

        var key;
        for (key in msg) {
            if (msg.hasOwnProperty(key)) {
                this[key] = msg[key];
            }
        }
    }
}

export = Equip;
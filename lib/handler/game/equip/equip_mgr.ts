import pb = require('node-protobuf-stream');

import log = require('../../../util/log');

import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import DynObject = require('../../../util/dynamicobject/dyn_object');
import CraftSkillGlobalMgr = require('./craft_skill_global_mgr');
import CombineGlobalMgr = require('./combine_global_mgr');
import EquipGlobalMgr = require('./equip_global_mgr');
import HeroDefine = require('../hero/defines');

// defines
import BuildDef = require('../build/defines');

// class
import Role = require('../role');
import Build = require('../build/build');
import Equip = require('./equip');
import CraftTask = require('./craft_task');

// config
import Config = require('../../../config');
var cm = Config.configMgr;

class EquipMgr {
    container:{[uid:number]:Equip} = {};        // Equip container
    craftTasks:{[uid:number]:CraftTask} = {};       // CraftTask container
    handbook:{[equipID:number]:boolean} = {};

    // 内存数据
    maxuid:number = 0;
    craftSkills:DynObject = new DynObject();     //
    updateMask:{[uid:number]:boolean} = {};
    deleteMask:{[uid:number]:boolean} = {};   // 删除装备uid缓存

    equipCounter:{[equipID:number]:number} = {};

    public initMgr() {
        this.container = {};
        this.equipCounter = {};
        this.maxuid = this.getMaxUid();
    }

    public checkHandbook():void {
        Object.keys(this.container).forEach((uid) => {
            var equip = this.container[uid];
            if (!this.handbook.hasOwnProperty(equip.ID)) {
                this.handbook[equip.ID] = true;
            }
        });
    }

    private getMaxUid():number {
        var maxUid = 0, key;
        for (key in this.container) {
            if (maxUid < parseInt(key)) {
                maxUid = parseInt(key);
            }
        }
        return maxUid;
    }

    private getNextUid():number {
        if (this.container[this.maxuid + 1]) {
            this.maxuid = this.getMaxUid();
        }
        return this.maxuid + 1;
    }

    public createEquip(ID:number):Equip {
        var config = cm.equipdb.get(ID);
        var nextUid = this.getNextUid();
        var equip = new Equip();
        equip.assignUid(nextUid);
        equip.initObject(ID);
        this.container[nextUid] = equip;
        this.updateMask[nextUid] = true;

        if (!this.handbook.hasOwnProperty(ID.toString())) {
            this.handbook[ID] = true;
        }

        if (!this.equipCounter[ID]) this.equipCounter[ID] = 1;
        else this.equipCounter[ID] += 1;

        return equip;
    }

    public getEquip(uid:number):Equip {
        return this.container[uid];
    }

    public deleteEquip(uid:number) {
        if (this.container[uid]) {
            var equip = this.container[uid];
            this.deleteMask[uid] = true;
            delete this.updateMask[uid];
            this.equipCounter[equip.ID] -= 1;

            delete this.container[uid];
        }
    }

    public getEquipCount(equipID:number):number {
        return this.equipCounter[equipID] || 0;
    }

    public getTopAttack(top:number):number {
        var attacks = [];
        Object.keys(this.container).forEach((index)=> {
            attacks.push(this.container[index].getProperty()[HeroDefine.PROPERTY.ATTACK]);
        });
        attacks.sort();
        attacks.reverse();
        var result = 0;
        for (var i = 0; i < attacks.length && i < top; i++) {
            result += attacks[i];
        }
        return result;
    }

    public buildInitEquipNetMsg():any {
        var M = pb.get('.Api.role.initEquip.Notify');
        var pck = new M();
        for (var key in this.container) {
            pck.allEquip.push(this.container[key].buildInitNetMsg());   // no update net msg
        }
        this.clearUpdateMask();
        return pck;
    }

    public buildInitCraftTaskNetMsg(now:number):any {
        var M = pb.get('.Api.equip.initCraftTask.Notify');
        var pck = new M();
        for (var key in this.craftTasks) {
            pck.craftTasks.push(this.craftTasks[key].buildInitNetMsg(now));
        }
        return pck;
    }

    public buildInitHandBook():void {
        var M = pb.get('.Api.equip.initHandbook.Notify');
        var pck = new M();
        Object.keys(this.handbook).forEach((key) => {
            pck.handbook.push(parseInt(key));
        });
        return pck;
    }

    public buildUpdateNetMsg():any {
        var needUpdate = false;
        var M = pb.get('.Api.role.updateEquip.Notify');
        var pck = new M();
        for (var key in this.updateMask) {
            if (this.container[key]) {
                needUpdate = true;
                pck.allEquip.push(this.container[key].buildInitNetMsg());
            }
        }
        this.clearUpdateMask();
        if (needUpdate) {
            return pck;
        } else {
            return null;
        }
    }

    public buildDeleteEquipNetMsg():any {
        var needDelete = false, keyUid;
        var M = pb.get('.Api.role.deleteEquip.Notify');
        var pck = new M();
        for (var key in this.deleteMask) {
            keyUid = parseInt(key);
            if (!isNaN(keyUid)) {
                needDelete = true;
                pck.deleteUidArray.push(keyUid);
            }
        }
        this.clearDeleteMask();
        if (needDelete) {
            return pck;
        } else {
            return null;
        }
    }

    public buildDistribution():{star:{[star:number]:number}; level:{[level:number]:number}} {
        var result:{star:{[star:number]:number}; level:{[level:number]:number}} = {star:{}, level:{}};

        function add(obj, key) {
            if (!obj[key]) {
                obj[key] = 1;
            } else {
                obj[key] += 1;
            }
        }

        Object.keys(this.container).forEach((key) => {
            var equip = this.container[key];
            try {
                var config = cm.equipdb.get(equip.ID);

                add(result.star, config.raity);
                add(result.level, Math.floor(equip.level / 10));
            } catch (err) {

            }
        });
        return result;
    }

    public sendUpdatePacket(role:Role):void {
        // 装备删除包
        role.sendPacket(this.buildDeleteEquipNetMsg());
        // 装备更新包
        role.sendPacket(this.buildUpdateNetMsg());
    }

    public clearUpdateMask() {
        this.updateMask = {};
    }

    public clearDeleteMask() {
        this.deleteMask = {};
    }

    public buildDBMsg():any {
        var equips = pb.get('.DB.equips');
        var key, pck = new equips();
        for (key in this.container) {
            pck.allEquip.push(this.container[key].buildDBMsg());
        }
        for (key in this.craftTasks) {
            pck.craftTasks.push(this.craftTasks[key].buildDBMsg());
        }

        Object.keys(this.handbook).forEach((key) => {
            pck.handbook.push(parseInt(key));
        });

        return pck;
    }

    public loadDBMsg(msg:any) {
        var i, equipMsg, equip, craftTaskMsg, craftTask;
        this.initMgr();
        for (i = 0; i < msg.allEquip.length; i++) {
            equipMsg = msg.allEquip[i];
            equip = new Equip();
            equip.loadDBMsg(equipMsg);
            this.container[equip.uid] = equip;
            if (!this.equipCounter[equip.ID]) this.equipCounter[equip.ID] = 1;
            else this.equipCounter[equip.ID] += 1;
        }
        this.maxuid = this.getMaxUid();

        for (i = 0; i < msg.craftTasks.length; i++) {
            craftTaskMsg = msg.craftTasks[i];
            craftTask = new CraftTask();
            craftTask.loadDBMsg(craftTaskMsg);
            this.craftTasks[craftTask.buildUid] = craftTask;
        }

        if (msg.handbook) {
            msg.handbook.forEach((ID) => {
                this.handbook[ID] = true;
            });
        }
    }

// ===================== CraftTask ======================= //
    public createCraftTask(build:Build, craftTaskID:number, now:number):CraftTask {
        var craftSkill = cm.craftskilldb.get(craftTaskID);
        var craftTask = new CraftTask();
        craftTask.buildUid = build.uid;
        craftTask.craftSkillID = craftTaskID;
        craftTask.startTime = now;
        craftTask.timeLength = Math.ceil(craftSkill.timeCost * (1.0 - (build.level - 1) * 0.05));
        this.craftTasks[craftTask.buildUid] = craftTask;
        return this.craftTasks[craftTask.buildUid];
    }

    public deleteCraftTask(buildUid:number) {
        delete this.craftTasks[buildUid];
    }

    public getCraftTask(buildUid:number):CraftTask {
        if (!this.craftTasks[buildUid]) {
            throw new CustomError.UserError(ERRC.EQUIP.NOT_HAS_CRAFT_TASK_IN_BUILD, {
                msg: 'EQUIP.NOT_HAS_CRAFT_TASK_IN_BUILD, buildUid=' + buildUid
            });
        }
        return this.craftTasks[buildUid];
    }

    public existTaskInBuild(buildUid:number):boolean {
        return !!this.craftTasks[buildUid];
    }

    public checkAllCraftTask(buildMgr) {

    }

    public buildInitCraftSkillArray():any {
        return this.craftSkills.buildInitArray();
    }

    public buildUpdateCraftSkillArray():any {
        return this.craftSkills.buildUpdateArray();
    }

    // 通过道具和装备的获取开启打造技能
    public openCraftSkillByItemGain(resID:number) {
        var openList = CraftSkillGlobalMgr.getCraftIDByItemID(resID);
        for (var i = 0; i < openList.length; i += 1) {
            this.craftSkills.setValue(openList[i], 1);
        }
    }

    public openCraftSkillByEquipLevel(equipID:number, level1:number, level2?:number) {
        var openList = CraftSkillGlobalMgr.getCraftIDByEquipLevel(equipID, level1, level2);
        for (var i = 0; i < openList.length; i += 1) {
            this.craftSkills.setValue(openList[i], 1);
        }
    }

    public openCraftSkillByRoleLevel(level1:number, level2:number) {
        var openList = CraftSkillGlobalMgr.getCraftIDByRoleLevel(level1, level2);
        for (var i = 0; i < openList.length; i += 1) {
            this.craftSkills.setValue(openList[i], 1);
        }
    }

    public openCraftSkillByBossLevel(bossID:number, bossLevel:number):void {
        var openList = CraftSkillGlobalMgr.getCraftIDByBossLevel(bossID, bossLevel);
        openList.forEach((value) => {
            this.craftSkills.setValue(value, 1);
        });
    }

    public checkAllCraftSkill(role:Role) {
        this.craftSkills.clearAllValue();
        this.openCraftSkillByRoleLevel(1, role.level);
        var equip, key, resMap = role.accumulateResource.getInitObject();
        for (key in resMap) {
            this.openCraftSkillByItemGain(key);
        }
        for (key in this.container) {
            equip = this.container[key];
            this.openCraftSkillByEquipLevel(equip.ID, 1, equip.level);
        }
    }

// ====================== enhanceEquip ================= //

    public enhanceEquip(equipArray:Equip[]):number {
        var i, equip, expSum = 0, config, mainEquip, mainConfig;
        for (i = 0; i < equipArray.length; i += 1) {
            equip = equipArray[i];
            if (!equip) {
                throw new CustomError.UserError(ERRC.EQUIP.UID_NOT_FOUND, {
                    msg: 'EQUIP.UID_NOT_FOUND, public enhanceEquip'
                });
            }
        }

        // check main equip
        mainEquip = equipArray[0];
        mainConfig = cm.equipdb.get(mainEquip.ID);
        var oldLevel = mainEquip.level;

        // sum exp
        for (i = 1; i < equipArray.length; i += 1) {
            equip = equipArray[i];
            config = cm.equipdb.get(equip.ID);

            var match = mainConfig.JSON_attribute.some(function (ele) {
                for (var i = 0; i < config.JSON_attribute.length; i+=1) {
                    if (ele === config.JSON_attribute[i]) return true;
                }
                return false;
            });
            if (match) {
                expSum += config.matchexp;
            } else {
                expSum += config.nomatchexp;
            }

            expSum += equip.level - 1;
        }

        var changed = mainEquip.addExp(expSum);
        if (changed) {
            this.updateMask[mainEquip.uid] = true;
            var newLevel = mainEquip.level;
            if (oldLevel < newLevel) {
                this.openCraftSkillByEquipLevel(mainEquip.ID, oldLevel, newLevel);
            }
        }

        for (i = 1; i < equipArray.length; i += 1) {
            this.deleteEquip(equipArray[i].uid);
        }

        return expSum;
    }


// ====================== combineEquip ================= //
    public combineEquip(equipArray:Equip[]):Equip {
        var i, equip;
        for (i = 0; i < equipArray.length; i += 1) {
            equip = equipArray[i];
            if (!equip) {
                throw new CustomError.UserError(ERRC.EQUIP.UID_NOT_FOUND, {
                    msg: 'EQUIP.UID_NOT_FOUND, public combineEquip'
                });
            }
        }

        var ID = CombineGlobalMgr.rollEquip(equipArray.map((e) => { return e.ID; }));

        if (!ID) {
            throw new CustomError.UserError(ERRC.EQUIP.COMBINE_NO_AVAILABLE_LIST, {
                msg: 'EQUIP.COMBINE_NO_AVAILABLE_LIST'
            });
        }

        var newEquip = this.createEquip(ID);

        var totalExp = 0, config;
        for (i = 0; i < equipArray.length; i += 1) {
            config = cm.equipdb.get(equipArray[i].ID);
            totalExp += equipArray[i].exp + EquipGlobalMgr.getTotalExp(equipArray[i].level, config.maxlv);

            this.deleteEquip(equipArray[i].uid);
        }

        newEquip.addExp(Math.floor(totalExp / 2));
        this.openCraftSkillByEquipLevel(newEquip.ID, 1, newEquip.level);
        return newEquip;
    }
}

export = EquipMgr;

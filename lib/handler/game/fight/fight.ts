// common
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');
import Enum = require('../../../util/enum');
import Util = require('../../../util/game_util');
import log = require('../../../util/log');
import ConfigStruct = require('../../../config/struct/config_struct');
import Universal = require('../universal');

import FightDef = require('./defines');
import HeroDef = require('../hero/defines');
import Hero = require('../hero/hero');
import Role = require('../role');
import RoleStruct = require('../role/role_struct');
import Loot = require('../loot/loot');
import LootMgr = require('../loot/loot_mgr');
import FriendStruct = require('../friend/friend_struct');

import Simulation = require('./simulation');

// config
import Config = require('../../../config');
import HeroSuite = require('../hero/hero_suite');
var cm = Config.configMgr;

export enum STEP {
    NEW = 0,
    START = 1,
    END = 2
}

export function stringifyResult(result:FightDef.RESULT):string {
    switch (result) {
        case FightDef.RESULT.FLEE:
            return 'flee';
        case FightDef.RESULT.LOSS:
            return 'loss';
        case FightDef.RESULT.VICTORY:
            return 'victory';
        default :
            return 'unknownResult';
    }
}

export function createPlayerByHero(role:Role, hero:Hero, copyKey:HeroSuite.SuiteType):Simulation.Player {
    var player = new Simulation.Player(FightDef.PlayerType.KNIGHT);
    player.uid = hero.uid;
    player.level = hero.level;
    player.natureProperty = [];

    var property = hero.getSuiteProperty(copyKey);

    var armor = property[HeroDef.PROPERTY.ARMOR];
    var equip = role.equips.getEquip(armor);
    player.skillId = 0;
    if (equip) {
        player.armorID = equip.ID;

        var config = cm.equipdb.get(equip.ID);
        if (config.attribute1) {
            player.natureProperty.push(config.attribute1);
        }
        if (config.attribute2) {
            player.natureProperty.push(config.attribute2);
        }

        player.skillId = config.skillid;
    } else {
        log.sError('Fight', 'EquipNotFound, set SkillID=0');
    }

    player.maxHp = property[HeroDef.PROPERTY.HP];
    player.currentHp = property[HeroDef.PROPERTY.CURRENT_HP];
    player.attack = property[HeroDef.PROPERTY.ATTACK];
    player.defence = property[HeroDef.PROPERTY.DEFENCE];
    player.critical = property[HeroDef.PROPERTY.CRITICAL];
    player.hit = property[HeroDef.PROPERTY.HIT];
    return player;
}

export function createPlayerByFightPlayer(centerPlayer:RoleStruct.FightPlayer):Simulation.Player {
    var player = new Simulation.Player(FightDef.PlayerType.KNIGHT);
    player.uid = centerPlayer.uid;
    player.level = centerPlayer.level;
    player.natureProperty = [];

    var property = {};
    var levelProperty = Universal.calcHeroLevelProperty(centerPlayer.uid, centerPlayer.level);
    var equipProperty = Universal.calcEquipProperty(centerPlayer.armorID, centerPlayer.armorLevel);
    Util.addObject(property, levelProperty);
    Util.addObject(property, equipProperty);

    player.armorID = centerPlayer.armorID;

    var config = cm.equipdb.get(centerPlayer.armorID);
    if (config.attribute1) {
        player.natureProperty.push(config.attribute1);
    }
    if (config.attribute2) {
        player.natureProperty.push(config.attribute2);
    }

    player.skillId = config.skillid;

    player.maxHp = property[HeroDef.PROPERTY.HP];
    player.currentHp = property[HeroDef.PROPERTY.HP];
    player.attack = property[HeroDef.PROPERTY.ATTACK];
    player.defence = property[HeroDef.PROPERTY.DEFENCE];
    player.critical = property[HeroDef.PROPERTY.CRITICAL];
    player.hit = property[HeroDef.PROPERTY.HIT];
    return player;
}

export function createPlayerByFriendEntry(friendEntry:FriendStruct.FriendEntry, suite:HeroSuite.SuiteType):Simulation.Player {
    var player = new Simulation.Player(FightDef.PlayerType.KNIGHT);
    player.uid = friendEntry.accountId;
    player.level = friendEntry.level;
    player.natureProperty = [];

    var armorID = friendEntry[suite + 'ArmorID'];
    var armorLevel = friendEntry[suite + 'ArmorLevel'];
    var property = Universal.calcHeroAllProperty(0, friendEntry.level, armorID, armorLevel);

    player.armorID = armorID;
    var config = cm.equipdb.get(friendEntry.dungeonArmorID);
    if (config.attribute1) {
        player.natureProperty.push(config.attribute1);
    }
    if (config.attribute2) {
        player.natureProperty.push(config.attribute2);
    }

    player.skillId = config.skillid;

    player.maxHp = property[HeroDef.PROPERTY.HP];
    player.currentHp = property[HeroDef.PROPERTY.HP];
    player.attack = property[HeroDef.PROPERTY.ATTACK];
    player.defence = property[HeroDef.PROPERTY.DEFENCE];
    player.critical = property[HeroDef.PROPERTY.CRITICAL];
    player.hit = property[HeroDef.PROPERTY.HIT];
    return player;
}

export function createPlayerByMonster(monster:ConfigStruct.monsterDB):Simulation.Player {
    var monsterType = cm.monstertypedb.get(monster.monstertypeid);

    var player = new Simulation.Player(FightDef.PlayerType.MONSTER);
    player.uid = monster.ID;
    player.level = monster.level;
    player.natureProperty = [];
    player.skillId = monsterType.skillid;
    if (monsterType.attribute1) {
        player.natureProperty.push(monsterType.attribute1);
    }
    if (monsterType.attribute2) {
        player.natureProperty.push(monsterType.attribute2);
    }

    player.maxHp = monster.hp;
    player.currentHp = monster.hp;
    player.attack = monster.atk;
    player.defence = monster.def;
    player.critical = monster.crt;
    player.hit = monster.hit;
    return player;
}

export function checkFightTeamLength(team:Universal.FightTeam, maxHire:number):void {
    if (!team.heros || team.heros.length === 0 || team.heros.length > 3 ||
        (team.hires && team.hires.length > maxHire)) {
        throw new CustomError.UserError(ERRC.FIGHT.TEAM_ERROR, {
            msg: 'FIGHT.TEAM_ERROR, team=' + JSON.stringify(team)
        });
    }
}

export class FightRoundData {
    attackerSide:number = 0;   // 攻击方：1=Left，2=Right
    attackerIndex:number = 0;  // 攻击者下标
    defenderIndex:number = 0;  // 防御这下标
    attackFlag:number = 0;     // 攻击标记：使用与或判断
    isSlay:boolean = false;           // 使用怒气
    damage:number = 0;         // 伤害
}

export class FightRound {
    fightType:FightDef.TYPE = FightDef.TYPE.PVE;
    fightSeed:string = '';          // 随机种子
    fightStep:STEP = STEP.NEW;
    fightSlay:number = 0;           // 幼方怒气值

    // memory data
    simulation:Simulation.FightSimulation = null;

    constructor() {
        this.fightSlay = 0;
    }

    public newRound() {
        this.fightStep = STEP.NEW;
        this.fightSeed = Math.random().toString();
    }

    public startRound() {
        this.fightStep = STEP.START;
    }

    /**
     * @param accountId     - 战斗发生方的角色ID
     * @param roundContext  - 回合数上下文
     * @param team          - 双方队伍
     * @param totalRound    - 总回合数
     * @param rightDeathCount - 右方死亡个数
     * @param rightDamageCoe    - float 右边伤害系数，（可选，默认：1）
     */
    public finishRound(accountId:number,
                       roundContext:Simulation.RoundContext,
                       team:{[side:number]:Simulation.Player[]},
                       totalRound:number,
                       rightDeathCount:number = 0,
                       rightDamageCoe:number = 1) {

        var fightArgument = new Simulation.FightArgument();
        fightArgument.seed = this.fightSeed;
        fightArgument.slaySlot = { "1": 0, "2": this.fightSlay };
        fightArgument.team = team;
        fightArgument.totalRound = totalRound;
        fightArgument.rightDeathCount = rightDeathCount;
        fightArgument.roundContext = roundContext;
        fightArgument.accountId = accountId;

        if (rightDamageCoe) fightArgument.rightDamageCoe = rightDamageCoe;

        this.simulation = new Simulation.FightSimulation();
        this.simulation.setArgument(fightArgument);
        this.simulation.doSimulation();

        this.fightSlay = this.simulation.getLeftSlayBySide(FightDef.SIDE.RIGHT);

        this.fightStep = STEP.END;
    }

    public isFighting():boolean {
        return this.fightStep === STEP.START;
    }

    public isFinished():boolean {
        return this.fightStep === STEP.END;
    }

    public getSimulation():Simulation.FightSimulation {
        return this.simulation;
    }

    public getLeftHealthList(side:FightDef.SIDE):FightDef.HealthCacheItem[] {
        return this.simulation ? this.simulation.getLeftHealthList(side) : [];
    }

    public getRightMaxDamage():number {
        return this.simulation ? this.simulation.rightMaxDamage : 0;
    }

    public getRightTotalDamage():number {
        return this.simulation ? this.simulation.rightTotalDamage : 0;
    }

    public buildDBMsg():any {
        return {
            fightType: this.fightType,
            fightSeed: this.fightSeed,
            fightStep: this.fightStep,
            fightSlay: this.fightSlay
        };
    }
    public loadDBMsg(msg:any) {
        this.fightType = msg.fightType;
        this.fightSeed = msg.fightSeed;
        this.fightStep = msg.fightStep || STEP.NEW;
        this.fightSlay = msg.fightSlay || 0;
    }
}

export class BaseFight {
    currentFightRound:FightRound = null;

    constructor() {
        this.currentFightRound = null;
    }

    public isFighting():boolean {
        return this.currentFightRound && this.currentFightRound.isFighting();
    }

    public isFinished():boolean {
        return this.currentFightRound ? this.currentFightRound.isFinished() : false;
    }

    public getLeftSlay():number {
        return this.currentFightRound ? this.currentFightRound.fightSlay : 0;
    }

    public getRandomSeed():string {
        return this.currentFightRound ? this.currentFightRound.fightSeed : '';
    }

    public getSideHealth(side:FightDef.SIDE):FightDef.HealthCacheItem[] {
        return this.currentFightRound ? this.currentFightRound.getLeftHealthList(side) : [];
    }

    public getRightMaxDamage():number {
        return this.currentFightRound ? this.currentFightRound.getRightMaxDamage() : 0;
    }

    public getRightTotalDamage():number {
        return this.currentFightRound ? this.currentFightRound.getRightTotalDamage() : 0;
    }

    public checkFightResult(result:FightDef.RESULT) {
        var simulation = this.currentFightRound.getSimulation();
        if (simulation && result !== simulation.getResult()) {
            throw new CustomError.UserError(ERRC.FIGHT.RESULT_ERROR, {
                msg: 'FIGHT.RESULT_ERROR, clientResult=' + result + ', serverResult=' + simulation.getResult()
            });
        }
    }
}

// 将客户端数组类型的回合数转换为服务器可用的table类型
// 同时回合数加1（回合数：客户端从0开始，服务器从1开始）
export function transformClientRoundToServer(round:number[]):{[round:number]:boolean} {
    var result:{[round:number]:boolean} = {};
    round.forEach((rd) => {
        result[rd + 1] = true;
    });
    return result;
}
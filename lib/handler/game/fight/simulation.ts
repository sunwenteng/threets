import seedrandom = require('seedrandom');
import BattleParam = require('./battle_param');
import FightDef = require('./defines');
import log = require('../../../util/log');
import Loot = require('../loot/loot');
import LootMgr = require('../loot/loot_mgr');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');

var cm = require('../../../config').configMgr;

enum AttackFlag {
    NULL = 0x0000,   // 无
    NORMAL = 0x0001,
    SLAY = 0x0002,   // 怒气
    CRITICAL = 0x0004,   // 暴击
    DODGE = 0x0008,   // 闪避
    NEXT = 0x0010,
}

class FightMsg {
    damage:number = 0;
    attackFlag:number = 0;  //攻击结果 暴击/闪避/格挡。。。混合攻击结果

    constructor() {
        this.attackFlag = (0 | AttackFlag.NORMAL);
    }

    public hasAttackType(value) {
        return (this.attackFlag & value) !== 0;
    }

    public isAttackType(value) {
        return (this.attackFlag & value) === value;
    }

}

// 随机概率的分母
var RandomDenominator = 10000;
// 最大回合数
var maxRound = 2000;

export class Player {
    playerType:FightDef.PlayerType;
    uid:number = 0;
    level:number = 1;
    natureProperty:number[];
    skillId:number = 0;
    armorID:number = 0;
    // fight
    maxHp:number = 0;
    currentHp:number = 0;
    attack:number = 0;
    defence:number = 1;
    critical:number = 0;
    hit:number = 0;

    constructor(playerType:FightDef.PlayerType) {
        this.playerType = playerType;
        this.uid = 0;
        this.level = 10;
        this.natureProperty = [];
        this.maxHp = 0;
        this.currentHp = 100;
        this.attack = 30;
        this.defence = 20;
        this.critical = 1500;
        this.hit = 7500;
    }
}

function getNatureCoe(attackerNature:number[], defenderNature:number[]):number {
    if (attackerNature.length < 1) {
        return 1;//无装备
    }
    var arr = [];  // 克制列表
    var find = false;
    var ADV = 1;
    for (var i = 0; i < attackerNature.length; i++) {
        for (var j = 0; j < defenderNature.length; j++) {
            find = false;
            for (var m = 0; m < arr.length; m++) {
                if (arr[m] == defenderNature[j]) {
                    find = true;
                    break;
                }
            }
            if (find) {
                continue;
            }
            var config = cm.interplaydb.get(attackerNature[i]);
            var vv = config['p' + defenderNature[j]] / 100;
            if (vv > 1) {
                arr.push(j);
                ADV += (vv - 1);
            }
        }
    }
    return ADV;
}

function calcCriticalDamage(damage:number):number {
    return damage * (1 + BattleParam.critdam / 10000);
}

function calculateKnightAttackTarget(attacker:Player,
                                     defender:Player,
                                     fightMsg:FightMsg):number {
    // 计算我方 boss战斗时的攻击力
    // 参数：A 攻方攻击力； BD 防御力；ADV 属性克制加成 ；NO boss战斗人数压制(boss战有效)
    var level = attacker.level,
        A = attacker.attack,
        BD = defender.defence;

    var ADV = getNatureCoe(attacker.natureProperty, defender.natureProperty);
    var levelCoe = 1.0,
        nemesisCoe = 1.0;

    switch (defender.playerType) {
        case FightDef.PlayerType.BOSS:
            // set NO
            //NO = BattleParam['no_' + totalPlayerSize] / RandomDenominator;
            var bossConf = cm.boss_infodb.boss_infoDBConfig[defender.uid];
            if (bossConf && attacker.armorID === bossConf.nemesis) {
                nemesisCoe = bossConf.nemesisrate / 10000;
            }
            levelCoe = cm.damagecaldb.get(level).epicBoss;
            break;
        case FightDef.PlayerType.MONSTER:
            levelCoe = cm.damagecaldb.get(level).advanture;
            break;
        case FightDef.PlayerType.KNIGHT:
            levelCoe = cm.damagecaldb.get(level).PVP;
            break;
    }

    var DMG = levelCoe * (A / BD) * ADV * nemesisCoe;
    if (isNaN(DMG)) {
        throw new CustomError.UserError(ERRC.FIGHT.DAMAGE_CALCULATE_ERROR, {
            msg: 'FIGHT.DAMAGE_CALCULATE_ERROR,KnightAttack,DMG=' + DMG + ',levelCoe=' + levelCoe + ',A=' + A + ',BD=' + BD +
            ',ADV=' + ADV + ', nemesisCoe=' + nemesisCoe
        });
    }
    if (fightMsg.hasAttackType(AttackFlag.SLAY)) {
        var slayDamageRate = 1.0;
        if (attacker.skillId) {
            var skillInfo = cm.skilldb.get(attacker.skillId);
            slayDamageRate = skillInfo.damge / RandomDenominator;
        }
        DMG = DMG * slayDamageRate;
    }

    if (fightMsg.hasAttackType(AttackFlag.CRITICAL)) {
        DMG = calcCriticalDamage(DMG);
    }

    log.sTrace('FightSimulation', 'DMG=' + DMG + ',level=' + level + ',A=' + A + ',BD=' + BD + ',ADV=' + ADV + ', nemesisCoe=' +
        nemesisCoe + ', slayDamageRate=' + slayDamageRate);

    return DMG;
}

function calculateMonsterAttackTarget(attacker:Player,
                                      defender:Player,
                                      fightMsg:FightMsg):number {
    var level = attacker.level,
        A = attacker.attack,
        BD = defender.defence;
    var ADV = getNatureCoe(attacker.natureProperty, defender.natureProperty);
    var levelCoe = cm.damagecaldb.get(level).advanture;

    var DMG = levelCoe * (A / BD) * ADV;
    if (isNaN(DMG)) {
        throw new CustomError.UserError(ERRC.FIGHT.DAMAGE_CALCULATE_ERROR, {
            msg: 'FIGHT.DAMAGE_CALCULATE_ERROR,MonsterAttack,DMG=' + DMG + ',levelCoe=' + levelCoe + ',A=' + A + ',BD=' + BD +
            ',ADV=' + ADV
        });
    }

    var slayDamageRate = 1.0;
    if (fightMsg.hasAttackType(AttackFlag.SLAY)) {
        if (attacker.skillId) {
            var skillInfo = cm.skilldb.get(attacker.skillId);
            slayDamageRate = skillInfo.damge / 10000;
        }
        DMG = DMG * slayDamageRate;
    }

    if (fightMsg.hasAttackType(AttackFlag.CRITICAL)) {
        DMG = calcCriticalDamage(DMG);
    }

    log.sTrace('FightSimulation', 'DMG=' + DMG + ',levelCoe=' + levelCoe + ',A=' + A + ',BD=' + BD + ',ADV=' + ADV + ', slayDamageRate=' + slayDamageRate);

    return DMG;
}

function calculateBossAttackTarget(attacker:Player,
                                   defender:Player,
                                   fightMsg:FightMsg):number {
    var level = attacker.level,
        BA = attacker.attack, // BOSS攻击力
        D = defender.defence;

    var ADV = getNatureCoe(attacker.natureProperty, defender.natureProperty);
    var levelCoe = cm.damagecaldb.get(level).epicBoss;
    var DMG = levelCoe * (BA / D) * ADV;

    if (isNaN(DMG)) {
        throw new CustomError.UserError(ERRC.FIGHT.DAMAGE_CALCULATE_ERROR, {
            msg: 'FIGHT.DAMAGE_CALCULATE_ERROR,BossAttack,DMG=' + DMG + ',BA=' + BA + ',D=' + D +
            ',ADV=' + ADV + ', levelCoe=' + levelCoe
        });
    }

    if (fightMsg.hasAttackType(AttackFlag.SLAY)) {
        var slayDamageRate = 1.0;
        if (attacker.skillId) {
            var skillInfo = cm.skilldb.get(attacker.skillId);
            slayDamageRate = skillInfo.damge / 10000;
        }
        DMG = DMG * slayDamageRate;
    }

    if (fightMsg.hasAttackType(AttackFlag.CRITICAL)) {
        DMG = calcCriticalDamage(DMG);
    }

    log.sTrace('FightSimulation', 'DMG=' + DMG + ',BA=' + BA + ',D=' + D + ',ADV=' + ADV + ',levelCoe=' + levelCoe + ',slayDamageRate=' + slayDamageRate);

    return DMG;
}

export class RoundContext {
    useSlayRound:{[round:number]:boolean} = {};
    restoreRound:{[round:number]:boolean} = {};
    specialRound:{[round:number]:boolean} = {};
}

export class FightArgument {
    seed:string = 'hello';
    slaySlot:{[side:number]:number} = {"1": 0, "2": 0};
    team:{[side:number]:Player[]} = {};
    totalRound:number = maxRound + 1;
    rightDamageCoe:number = 1;
    rightDeathCount:number = 0;
    roundContext:RoundContext = new RoundContext();
    accountId:number = 0;
}

export class FightSimulation {

    // arguments
    private seed:string = 'hello';
    private team:{[side:number]:Player[]} = {};
    private totalRound:number = maxRound + 1;
    private rightDamageCoe:number = 1;
    private rightDeathCount:number = 0;
    private roundContext:RoundContext = new RoundContext();
    private accountId:number = 0;

    // internal data
    private rng:seedrandom.ARC4Function = null;
    private round:number = 0;
    private topIndex:{[side:number]:number} = {"1": 0, "2": 0};
    private slaySlot:{[side:number]:number} = {"1": 0, "2": 0};
    private deathTypeList:{[side:number]:FightDef.DeathType[]} = {"1": [], "2": []};
    private result:FightDef.RESULT = 0;
    public rightMaxDamage:number = 0;
    public rightTotalDamage:number = 0;

    public setArgument(fightArgument:FightArgument) {
        this.seed = fightArgument.seed;
        this.slaySlot = fightArgument.slaySlot;
        this.team = fightArgument.team;
        this.totalRound = fightArgument.totalRound;
        this.rightDamageCoe = fightArgument.rightDamageCoe;
        this.rightDeathCount = fightArgument.rightDeathCount;
        this.roundContext = fightArgument.roundContext;
        this.accountId = fightArgument.accountId;

        Object.keys(this.team).forEach((side) => {
            var i, length = this.team[side].length;
            this.deathTypeList[side] = [];
            for (i = 0; i < length; ++i) {
                this.deathTypeList[side].push(FightDef.DeathType.NULL);
            }
        });

        for (var i = 0; i < this.rightDeathCount; i += 1) {
            this.deathTypeList[FightDef.SIDE.RIGHT][i] = FightDef.DeathType.NORMAL;
        }
    }

    // entrance
    public doSimulation() {
        this.rng = seedrandom(this.seed);
        this.round = 0;
        this.topIndex = {"1": 0, "2": this.rightDeathCount};
        this.result = FightDef.RESULT.LOSS;

        while (true) {
            ++this.round;
            if (this.round > maxRound) {
                break;
            }
            if (this.totalRound && this.round > this.totalRound) {
                this.result = FightDef.RESULT.FLEE;
                break;
            }

            this.recurRound();

            var defenderSide = this.getDefenderSide();
            if (this.topIndex[defenderSide] >= this.team[defenderSide].length) {

                var hasRestore = false;
                // defender is all defeated
                if (defenderSide == FightDef.SIDE.LEFT) {
                    this.result = FightDef.RESULT.VICTORY;
                } else {
                    if (this.roundContext.restoreRound[this.round]) {
                        this.topIndex[defenderSide] = 0;
                        this.team[defenderSide].forEach((player:Player) => {
                            player.currentHp = player.maxHp;
                        });
                        this.deathTypeList[defenderSide] = [];
                        hasRestore = true;
                    } else {
                        this.result = FightDef.RESULT.LOSS;
                    }
                }
                if (!hasRestore) break;

            } else {    // 防守方没有全部死亡
                if (this.roundContext.restoreRound[this.round]) {
                    this.topIndex[defenderSide] = 0;
                    this.team[defenderSide].forEach((player:Player) => {
                        player.currentHp = player.maxHp;
                    });
                    this.deathTypeList[defenderSide] = [];
                }
            }
        }

        if (this.round < this.totalRound) {
            throw new CustomError.UserError(ERRC.FIGHT.ROUND_COUNT_ERROR, {
                msg: 'FIGHT.ROUND_COUNT_ERROR, round=' + this.round + ",totalRound=" + this.totalRound
            });
        }
    }

    public getResult():FightDef.RESULT {
        return this.result;
    }

    public getLeftHealthList(side:FightDef.SIDE):FightDef.HealthCacheItem[] {
        var healthList:FightDef.HealthCacheItem[] = [];
        if (this.team[side]) {
            this.team[side].forEach((player:Player) => {
                healthList.push({
                    uid: player.uid,
                    currentHp: player.currentHp
                });
            });
        }
        return healthList;
    }

    public getSideDeathTypeList(side:FightDef.SIDE):FightDef.DeathType[] {
        return this.deathTypeList[side];
    }

    public getLeftSlayBySide(side:FightDef.SIDE):number {
        return this.slaySlot[side];
    }

    private recurRound() {
        var attackerSide = this.getAttackerSide(),
            defenderSide = this.getDefenderSide();
        var attacker = this.getTopAlivePlayer(attackerSide),
            defender = this.getTopAlivePlayer(defenderSide);

        if (!attacker || !defender) {
            log.sError('FightSimulation', 'CanNotGetPlayer, hasAttacker=' + (!!attacker) + ',hasDefender=' + (!!defender));
            return;
        }

        var fightMsg = this.simulateAttackMsg(attacker, defender);

        if (fightMsg.hasAttackType(AttackFlag.SLAY)) {
            if (!this.roundContext.specialRound[this.round]) {  // 不是买大招的回合才会把怒气值清空
                this.slaySlot[attackerSide] = 0;
            }

            this.slaySlot[defenderSide] += BattleParam.underatk_sp;
        } else {
            // all add slay
            this.slaySlot[attackerSide] += BattleParam.atk_sp;
            this.slaySlot[defenderSide] += BattleParam.underatk_sp;
        }

        Object.keys(this.slaySlot).forEach((side) => {
            if (this.slaySlot[side] > 100) {
                this.slaySlot[side] = 100;
            }
        });

        defender.currentHp -= fightMsg.damage;
        if (attackerSide === FightDef.SIDE.RIGHT) {
            if (this.rightMaxDamage < fightMsg.damage) {
                this.rightMaxDamage = fightMsg.damage;
            }

            this.rightTotalDamage += fightMsg.damage;
        }

        if (log.isInit()) {
            log.uTrace(this.accountId, 'RoundDetail', '\n[' + this.accountId + '] ===>>> round[' + this.round + '] result:' +
                '\n[' + this.accountId + ']\tslay=' + JSON.stringify(this.slaySlot) +
                '\n[' + this.accountId + ']\tattacker: ' + (this.getAttackerSide() === FightDef.SIDE.LEFT ? 'left' : 'right') +
                '\n[' + this.accountId + ']\tfightMsg=' + JSON.stringify(fightMsg) +
                '\n[' + this.accountId + ']\tattackerTeam=' + JSON.stringify(this.team[this.getAttackerSide()]) +
                '\n[' + this.accountId + ']\tdefenderTeam=' + JSON.stringify(this.team[this.getDefenderSide()]) +
                '\n========== <<<');
        }

        var defenderSide = this.getDefenderSide();
        if (defender.currentHp <= 0) {
            this.deathTypeList[defenderSide][this.topIndex[defenderSide]] =
                fightMsg.hasAttackType(AttackFlag.SLAY) ? FightDef.DeathType.SLAY : FightDef.DeathType.NORMAL;
            ++this.topIndex[defenderSide];
        }
    }

    private simulateAttackMsg(attacker:Player, defender:Player):FightMsg {
        var fightMsg = new FightMsg();

        switch (this.getAttackerSide()) {
            case FightDef.SIDE.LEFT:
                if (this.slaySlot[FightDef.SIDE.LEFT] >= BattleParam.sp_max) {
                    fightMsg.attackFlag |= AttackFlag.SLAY;
                    if (!this.roundContext.useSlayRound[this.round]) {
                        // monster must use slay skill now
                        throw new CustomError.UserError(ERRC.FIGHT.LEFT_SLAY_ENOUGH_BUT_NOT_USE, {
                            msg: 'FIGHT.LEFT_SLAY_ENOUGH_BUT_NOT_USE, round=' + this.round
                        });
                    }
                }
                break;
            case FightDef.SIDE.RIGHT:
                if (this.roundContext.specialRound[this.round]) {
                    fightMsg.attackFlag |= AttackFlag.SLAY;
                }
                else if (this.roundContext.useSlayRound[this.round]) {
                    if (this.slaySlot[FightDef.SIDE.RIGHT] < BattleParam.sp_max) {
                        throw new CustomError.UserError(ERRC.FIGHT.RIGHT_SLAY_NOT_ENOUGH, {
                            msg: 'FIGHT.RIGHT_SLAY_NOT_ENOUGH, round=' + this.round + ', slay=' + this.slaySlot[FightDef.SIDE.RIGHT]
                        });
                    }
                    fightMsg.attackFlag |= AttackFlag.SLAY;
                }
                break;
        }

        var rate;
        if (!fightMsg.hasAttackType(AttackFlag.SLAY)) {
            // random attacker hit
            rate = this.rng();
            if (rate * RandomDenominator > attacker.hit) {
                log.sTrace('FightSimulation', 'hit rate: ' + rate + ', dodge');
                fightMsg.attackFlag |= AttackFlag.DODGE;
            } else {
                log.sTrace('FightSimulation', 'hit rate: ' + rate + ', not dodge');
            }
        }

        // 暴击 闪避不能同时发生; 暴击 必杀 不能同时发生
        // 没有闪避+怒气情况下，随机是否暴击
        if (!fightMsg.hasAttackType(AttackFlag.DODGE) && !fightMsg.hasAttackType(AttackFlag.SLAY)) {
            // random attacker critical
            rate = this.rng();
            if (rate * RandomDenominator < attacker.critical) {
                log.sTrace('FightSimulation', 'critical rate: ' + rate + ', critical');
                fightMsg.attackFlag |= AttackFlag.CRITICAL;
            } else {
                log.sTrace('FightSimulation', 'critical rate: ' + rate + ', not critical');
            }
        }

        if (!fightMsg.hasAttackType(AttackFlag.DODGE)) {
            var damage = 0;
            switch (attacker.playerType) {
                case FightDef.PlayerType.KNIGHT:
                    damage = calculateKnightAttackTarget(attacker, defender, fightMsg);
                    break;
                case FightDef.PlayerType.MONSTER:
                    damage = calculateMonsterAttackTarget(attacker, defender, fightMsg);
                    break;
                case FightDef.PlayerType.BOSS:
                    damage = calculateBossAttackTarget(attacker, defender, fightMsg);
                    break;
                default :
                    damage = 0;
                    break;
            }
            if (this.getAttackerSide() === FightDef.SIDE.RIGHT) {
                damage = damage * this.rightDamageCoe;
            }

            fightMsg.damage = Math.ceil(damage);

        } else { // 有闪避
            fightMsg.damage = 0;
        }

        return fightMsg;
    }

    private getTopAlivePlayer(side:number):Player {
        if (!this.topIndex.hasOwnProperty(side.toString())) {
            return null;
        }
        if (this.topIndex[side] >= this.team[side].length) {
            return null;
        }
        return this.team[side][this.topIndex[side]];
    }

    private getAttackerSide():number {
        return this.round % 2 ? 1 : 2;
    }

    private getDefenderSide():number {
        return this.round % 2 ? 2 : 1;
    }

}
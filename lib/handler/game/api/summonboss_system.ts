import Role = require('../role');
import Enum = require('../../../util/enum');
import ResourceMgr = require('../resource/resource_mgr');
import Simulation = require('../fight/simulation');
import Fight = require('../fight/fight');
import Universal = require('../universal');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import log = require('../../../util/log');

var cm = require('../../../config').configMgr;

export function sendOnlinePacket(role:Role):void {
    role.sendPacket(role.summonBoss.buildInitNetMsg());
}

export function summonBoss(role:Role, packet:any, done):void {
    var bossID = packet.bossID;

    if (role.level < Universal.GLB_SUMMON_BOSS_OPEN_LEVEL) {
        throw new CustomError.UserError(ERRC.SUMMON_BOSS.LEVEL_NOT_ENOUGH, {
            msg: 'SUMMON_BOSS.LEVEL_NOT_ENOUGH'
        });
    }

    var config = cm.boss_summondb.boss_summonDBConfig[bossID];
    if (!config) {
        throw new CustomError.UserError(ERRC.SUMMON_BOSS.BOSS_ID_NOT_FOUND, {
            msg: 'SUMMON_BOSS.BOSS_ID_NOT_FOUND, bossID=' + bossID
        })
    }

    var price = config.cost;
    var consume:Universal.Resource = {};
    consume[Enum.RESOURCE_TYPE.DIAMOND] = price;
    // 扣除资源  资源不足会抛异常
    ResourceMgr.applyConsume(role, Enum.USE_TYPE.SUMMON_BOSS, consume);

    //record summonboss
    var summonMgr = role.summonBoss;
    summonMgr.summonBoss(bossID);

    role.sendUpdatePacket(true);
    done(null, {
        bossID: summonMgr.bossID,
        bossLeftHp: summonMgr.bossHp
    });
}

export function selectTeam(role:Role, packet:any, done):void {
    var team = packet.team;
    role.summonBoss.selectTeam(role, team);

    done(null, {
        bossId: role.summonBoss.bossID,
        bossHp: role.summonBoss.getBossHp(),
        hireFriendList: role.summonBoss.getHireHeroBattleData()
    });
}

export function startFight(role:Role, packet:any, done):void {
    var summonMgr = role.summonBoss;
    summonMgr.startFight(role);

    var pck = {
        randomSeed: summonMgr.currentFight.getRandomSeed(),
        leftSlay: summonMgr.currentFight.getLeftSlay(),
        hireFriendList: [],
        fightLootArray: []
    };

    pck.hireFriendList = role.summonBoss.getHireHeroBattleData();

    var optionalLootArray = summonMgr.getOptionalLootArray();
    optionalLootArray.forEach((option) => {
        pck.fightLootArray.push({
            normalLoot: option.normalLoot.buildInitNetMsg(),
            specialLoot: option.specialLoot.buildInitNetMsg()
        })
    });

    done(null, pck);
}

export function finishFight(role:Role, packet:any, done):void {
    var result = packet.result;
    var totalRound = packet.totalRound;
    var summonMgr = role.summonBoss;

    var roundContext:Simulation.RoundContext = new Simulation.RoundContext();
    roundContext.useSlayRound = Fight.transformClientRoundToServer(packet.useSlayRound);
    roundContext.restoreRound = Fight.transformClientRoundToServer(packet.restoreRound);
    roundContext.specialRound = Fight.transformClientRoundToServer(packet.specialRound);

    var bossID = summonMgr.bossID;
    summonMgr.finishFight(role, roundContext, totalRound, result);

    var fightLoot = summonMgr.getFightLoot();

    log.uInfo(role.accountId, 'SummonBossFightResult', {
        bossID: bossID,
        result: Fight.stringifyResult(result),
        restoreCount: packet.restoreRound.length,
        paySpecialCount: packet.specialRound.length,
        fightLoot: fightLoot ? fightLoot.toString() : 'null'
    });

    if (fightLoot) {
        ResourceMgr.applyReward(role, Enum.USE_TYPE.SUMMON_BOSS_FINISH_FIGHT, fightLoot.resource);
        summonMgr.clearFightLoot();
    }

    role.sendUpdatePacket(true);

    done(null, {
        bossID: role.summonBoss.bossID,
        bossLeftHp: role.summonBoss.bossHp
    });
}

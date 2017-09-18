// common
import log = require('../../../util/log');
import Util = require('../../../util/game_util');
import Enum = require('../../../util/enum');
import Time = require('../../../util/time');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');
import Role = require('../role');
import Universal = require('../universal');
import ResourceMgr = require('../resource/resource_mgr');
import LootMgr = require('../loot/loot_mgr');
import QuestDef = require('../quest/defines');
import AchievementDef = require('../achievement/defines');

var cm = require('../../../config').configMgr;

// 协议方法
export function openbox(role:Role, packet:any, done):void {

    var chanceBoxId = packet.boxId;
    var batch = packet.batch;

    var chanceChestItem = cm.chance_chestdb.get(chanceBoxId);

    var reward:Universal.Resource = {},
        consume:Universal.Resource = {};

    var openCount = 1,
        rewardCount = 0;

    var resId = chanceChestItem.key;
    var resCount = role.getResCount(resId);

    if (resCount !== 0) {
        if (batch === 1) {
            openCount = (Enum.MAX_KEY_CHANCE_BATCH_TIMES > resCount) ? resCount : Enum.MAX_KEY_CHANCE_BATCH_TIMES;
        }
        consume[resId] = openCount;
    }
    else {
        resId = Enum.RESOURCE_TYPE.DIAMOND;
        if (batch === 1) {
            openCount = Enum.MAX_CHANCE_BATCH_TIMES;
            rewardCount = 1;
        }
        consume[resId] = chanceChestItem.gemPrice * openCount;
    }

    ResourceMgr.checkHasEnoughResource(role, consume);

    var oneReward:Universal.Resource = {};
    for (var i = 0; i < (openCount + rewardCount); i++) {
        oneReward = openOneBox(role, chanceBoxId, resId, (i < rewardCount));
        //整合奖励
        Object.keys(oneReward).forEach((key) => {
            if (reward[key]) {
                reward[key] += oneReward[key];
            } else {
                reward[key] = oneReward[key];
            }
        });
    }

    ResourceMgr.applyConsumeAndReward(role, Enum.USE_TYPE.CHEST_OPEN_CHEST, consume, reward); // 扣除资源  资源不足会抛异常

    log.uInfo(role.accountId, 'OpenChest', {
        chestID: chanceBoxId,
        openCount: openCount,
        rewardCount: rewardCount,
        consume: consume,
        reward: reward
    });

    var totalOpenCount = openCount + rewardCount;
    role.quests.updateQuest(role, QuestDef.CriteriaType.OPEN_CHANCE_CHEST_ID_N_COUNT, [chanceBoxId], totalOpenCount);
    role.achievements.updateAchievement(role, AchievementDef.TYPE.OPEN_CHANCE_CHEST_N_COUNT, chanceBoxId, totalOpenCount);

    role.sendUpdatePacket(true);

    done(null, {
        reward: Universal.tranResourceToRewardList(reward)
    });
}

function openOneBox(role:Role, chanceChestId:number, resId:number, free:boolean):Universal.Resource {
    var chanceCounter = role.chanceCounter;
    var config = cm.chance_chestdb.get(chanceChestId);

    var lootGroupId = 0;
    var hasOpenCount = chanceCounter.getCounter(chanceChestId);
    if (hasOpenCount === 0) {
        lootGroupId = config.FirstLoot;
    } else if (!free && (hasOpenCount % config.totalTimes) === 0) {
        lootGroupId = config.specialLoot;
    } else {
        switch (resId) {
            case Enum.RESOURCE_TYPE.DIAMOND:
                lootGroupId = config.gemLoot;
                break;
            case config.key:
                lootGroupId = config.keyLoot;
                break;
            default :
                lootGroupId = 0;
                break;
        }
    }

    var loots = LootMgr.rollLoot(lootGroupId);

    //计数器处理
    if (!free) {
        chanceCounter.addCounter(chanceChestId); //增加计数
    }

    return loots.getLootResource();
}

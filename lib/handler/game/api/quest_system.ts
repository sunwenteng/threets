import log = require('../../../util/log');
import Util = require('../../../util/game_util');
import Enum = require('../../../util/enum');
import Time = require('../../../util/time');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');
import Role = require('../role');
import Universal = require('../universal');

// config
var cm = require('../../../config').configMgr;

// system
import ResourceMgr = require('../resource/resource_mgr');

export function sendOnlinePacket(role:Role):void {
    role.sendPacket(role.quests.buildInitNetMsg());
}

export function readQuest(role:Role, packet:any, done):void {
    var questID = packet.ID;
    role.quests.readQuest(role, questID);
    role.quests.sendUpdatePacket(role);
    done(null, {
        ID: questID
    });
}

export function completeQuest(role:Role, packet:any, done):void {
    var questID = packet.ID;
    var quest = role.quests.getQuest(questID);
    var config = cm.questdb.get(quest.ID);

    role.quests.completeQuest(role, questID);

    var reward:Universal.Resource = {};
    config.JSON_reward.forEach((res:{resID:number; count:number}) => {
        if (res.resID && res.count) {
            // xxx 策划控制内容
            reward[res.resID] = res.count;
        }
    });

    ResourceMgr.applyReward(role, Enum.USE_TYPE.QUEST_COMPLETE_QUEST, reward);

    log.uInfo(role.accountId, 'CompleteQuest', {questID: questID, reward: reward});

    role.sendUpdatePacket(true);
    done(null, {
        ID: questID
    });
}
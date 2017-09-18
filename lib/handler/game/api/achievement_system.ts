// common
import log = require('../../../util/log');
import Util = require('../../../util/game_util');
import Enum = require('../../../util/enum');
import Time = require('../../../util/time');
import ERRC = require('../../../util/error_code');
import CustomError = require('../../../util/errors');
import Role = require('../role');
import PlayerInfoMgr = require('../../../cluster/player_info_mgr');

export function sendOnlinePacket(role:Role):void {
    role.sendPacket(role.achievements.buildInitNetMsg());
}

export function equipTitle(role:Role, packet:any, done):void {
    var achievementID = packet.achievementID;

    if (!role.achievements.isCompleteAchievement(achievementID)) {
        throw new CustomError.UserError(ERRC.ACHIEVEMENT.NOT_COMPLETE, {
            msg: 'ACHIEVEMENT.NOT_COMPLETE, ID=' + achievementID
        })
    }

    role.setSundryValue(Enum.SUNDRY.ACHIEVEMENT_TITLE, achievementID);
    role.sendUpdatePacket(false);

    //CenterDB.updateRoleInfo(role.accountId, {achievementId: achievementID}, (err) => {});
    PlayerInfoMgr.updateBasic(role.accountId, role.buildCacheBasic(), ()=>{});

    done();
}

export function readAchievement(role:Role, packet:any, done):void {
    var achievementID = packet.achievementID;

    if (!role.achievements.isCompleteAchievement(achievementID)) {
        throw new CustomError.UserError(ERRC.ACHIEVEMENT.NOT_COMPLETE, {
            msg: 'ACHIEVEMENT.NOT_COMPLETE, ID=' + achievementID
        })
    }

    role.achievements.readAchievement(achievementID);
    role.achievements.sendUpdatePacket(role);

    done();
}
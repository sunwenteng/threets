import AchievementDef = require('../../../handler/game/achievement/defines');

import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkAchievementDB();
}

function checkAchievementDB():void {
    VerifyMgr.setTableName('achievement');
    Object.keys(VerifyMgr.cm.achievementdb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.achievementdb.get(ID);

        switch (config.requiredType) {
            case AchievementDef.TYPE.ROLE_LEVEL:
                VerifyMgr.checkRoleLevel('count', config.count);
                break;
            case AchievementDef.TYPE.SPECIFY_RESOURCE_ALL_CONSUME:
                VerifyMgr.checkResourceIdValid('param', config.param);
                break;
            case AchievementDef.TYPE.LOGIN_IN_SERIES_N_DAYS:
            case AchievementDef.TYPE.COMPLETE_N_QUEST:
            case AchievementDef.TYPE.DEFEAT_N_FRIEND:
            case AchievementDef.TYPE.UNLOCK_N_CHAPTER:
            case AchievementDef.TYPE.WIN_N_BATTLES:
            case AchievementDef.TYPE.HAVE_N_AREA:
                break;
            case AchievementDef.TYPE.EARN_N_ITEM:
                VerifyMgr.checkResourceIdValid('param', config.param);
                break;
            case AchievementDef.TYPE.EARN_N_FRIEND:
            case AchievementDef.TYPE.WIN_N_ARENA_BATTLES:
            case AchievementDef.TYPE.EARN_N_ARENA_POINT:
            case AchievementDef.TYPE.EARN_N_STREAK:
            case AchievementDef.TYPE.HIRE_FRIEND_FOR_N_BATTLE:
                break;
            case AchievementDef.TYPE.OPEN_CHANCE_CHEST_N_COUNT:
                VerifyMgr.checkTableRef('param', config.param, 'chance_chest');
                break;
            case AchievementDef.TYPE.KILL_MONSTER_N_COUNT:
                VerifyMgr.checkTableRef('param', config.param, 'monstertype');
                break;
            case AchievementDef.TYPE.LEVEL_MAX_ON_EQUIP_WITH_STAR_A_OR_B:
            case AchievementDef.TYPE.ENTER_BUILD_N_COUNT:
            case AchievementDef.TYPE.CRAFT_N_EQUIP:
            case AchievementDef.TYPE.FUSE_N_COUNT:
            case AchievementDef.TYPE.GAME_FOR_N_HOUR:
            case AchievementDef.TYPE.CONSUME_GOLD_ON_EQUIP:
            case AchievementDef.TYPE.CONSUME_GOLD_ON_BUILD:
            case AchievementDef.TYPE.PURCHASE_DIAMOND_ONCE:
            case AchievementDef.TYPE.EARN_N_EQUIP_WITH_M_STAR:
            case AchievementDef.TYPE.CRAFT_N_EQUIP_WITH_M_START:
            case AchievementDef.TYPE.ENHANCE_EQUIP_N_COUNT:
            case AchievementDef.TYPE.CRAFT_N_EQUIP_WITH_ELEMENT:
            case AchievementDef.TYPE.DAMAGE_ON_ONE_ENEMY:
                break;
            default :
                VerifyMgr.checkAchievementType('requiredType', config.requiredType);
                break;
        }
    });
}
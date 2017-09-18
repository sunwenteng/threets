import VerifyMgr = require('../verify_mgr');
import QuestDef = require('../../../handler/game/quest/defines');

export function verify():void {
    checkQuestDB();
    checkSubTaskDB();
}

function checkQuestDB():void {
    VerifyMgr.setTableName('quest');
    Object.keys(VerifyMgr.cm.questdb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.questdb.get(ID);

        if (config.preQuestID > 0) {
            VerifyMgr.checkTableRef('preQuestID', config.preQuestID, 'quest');
        }

        config.JSON_reward.forEach((reward) => {
            VerifyMgr.checkResourceIdValid('JSON_reward', reward.resID);
        });
        config.JSON_achiParam.forEach((id, index) => {
            VerifyMgr.checkTableRef('JSON_achiParam[' + index + ']', id, 'subtask');
        });

        config.JSON_startTalk.forEach((id, index) => {
            VerifyMgr.checkTableRef('JSON_startTalk[' + index + ']', id, 'quest_talk');
        });
        config.JSON_overTalk.forEach((id, index) => {
            VerifyMgr.checkTableRef('JSON_overTalk[' + index + ']', id, 'quest_talk');
        });
    });
}

function checkSubTaskDB():void {
    VerifyMgr.setTableName('subtask');
    Object.keys(VerifyMgr.cm.subtaskdb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.subtaskdb.get(ID);

        switch (config.type) {
            //case QuestDef.CriteriaType.NULL:
            //    break;
            case QuestDef.CriteriaType.OWN_N_BUILD:
            case QuestDef.CriteriaType.OWN_N_BUILD_WITH_LEVEL:
                VerifyMgr.checkTableRef('JSON_param[0]', config.JSON_param[0], 'build_basic');
                break;
            case QuestDef.CriteriaType.EARN_N_EQUIP_WITH_LEVEL:
                VerifyMgr.checkTableExistValue('JSON_param[0]', config.JSON_param[0], 'equip', 'groupID');
                break;
            case QuestDef.CriteriaType.UNLOCK_CHAPTER:
                VerifyMgr.checkTableRef('JSON_param[0]', config.JSON_param[0], 'stage');
                break;
            case QuestDef.CriteriaType.STAGE_PASS_N_COUNT:
                VerifyMgr.checkTableRef('JSON_param[0]', config.JSON_param[0], 'stage');
                break;
            case QuestDef.CriteriaType.KILL_MONSTER_TYPE_A_IN_CHAPTER_B_N_COUNT:
                VerifyMgr.checkTableRef('JSON_param[0]', config.JSON_param[0], 'chapter');
                VerifyMgr.checkTableRef('JSON_param[1]', config.JSON_param[1], 'monstertype');
                break;
            case QuestDef.CriteriaType.COLLECT_GOLD_IN_BUILD_A:
                VerifyMgr.checkTableRef('JSON_param[0]', config.JSON_param[0], 'build_basic');
                break;
            case QuestDef.CriteriaType.EARN_N_RES_ID:
                VerifyMgr.checkResourceIdValid('JSON_param[0]', config.JSON_param[0]);
                break;
            case QuestDef.CriteriaType.CRAFT_N_EQUIP_A:
                VerifyMgr.checkTableExistValue('JSON_param[0]', config.JSON_param[0], 'equip', 'groupID');
                break;
            case QuestDef.CriteriaType.FUSE_EQUIP_A_B_N_COUNT:
                VerifyMgr.checkTableExistValue('JSON_param[0]', config.JSON_param[0], 'equip', 'groupID');
                VerifyMgr.checkTableExistValue('JSON_param[1]', config.JSON_param[1], 'equip', 'groupID');
                break;
            case QuestDef.CriteriaType.OPEN_CHANCE_CHEST_ID_N_COUNT:
                VerifyMgr.checkTableRef('JSON_param[0]', config.JSON_param[0], 'chance_chest');
                break;
            case QuestDef.CriteriaType.OWN_N_AREA:
            case QuestDef.CriteriaType.EARN_N_FRIEND:
            case QuestDef.CriteriaType.HIRE_FRIEND_N_FIGHT:
            case QuestDef.CriteriaType.TAKE_PART_IN_N_ARENA_FIGHT:
            case QuestDef.CriteriaType.TAKE_PART_IN_N_FRIEND_PVP_FIGHT:
            case QuestDef.CriteriaType.WIN_N_ARENA_FIGHT:
            case QuestDef.CriteriaType.WIN_N_FRIEND_PVP_FIGHT:
            case QuestDef.CriteriaType.EARN_N_ARENA_POINT:
            case QuestDef.CriteriaType.EARN_N_FRIEND_REFER_BONUS:
                break;
            default :
                if (config.type >= QuestDef.CriteriaType.MAX) {
                    VerifyMgr.addErrorData('subtask', ID, 'type', '子任务类型错误[' + config.type + ']');
                }
                break;
        }
    });
}
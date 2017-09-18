import pb = require('node-protobuf-stream');
import Hero = require('./hero/hero');
import HeroMgr = require('./hero/hero_mgr');
import EquipMgr = require('./equip/equip_mgr');
import BuildMgr = require('./build/build_mgr');
import DungeonMgr = require('./battle/dungeon_mgr');
import SignMgr = require('./signin/sign_mgr');
import ChanceMgr = require('./chance/chance_mgr');
import SummonBossMgr = require('./summonboss/summonboss_mgr');
import QuestMgr = require('./quest/quest_mgr');
import AchievementMgr = require('./achievement/achievement_mgr');
import FriendMgr = require('./friend/friend_mgr');
import ArenaMgr = require('./arena/arena_mgr');
import TimeMgr = require('./time/time_mgr');
import BossMgr = require('./boss/boss_mgr');
import MailMgr = require('./mail/mail_mgr');
import ActivityMgr = require('./activity/activity_mgr');
import ChatMgr = require('./chat/chat_mgr');
import TrialMgr = require('./trial/trial_mgr');
import RaidMgr = require('./raid/raid_mgr');

var _protoify = {};
var _parse = {};

var _Define:{[key:string]:any} = {
    heros: HeroMgr,
    equips: EquipMgr,
    builds: BuildMgr,
    dungeons: DungeonMgr,
    signIn: SignMgr,
    chanceCounter: ChanceMgr,
    summonBoss: SummonBossMgr,
    quests: QuestMgr,
    achievements: AchievementMgr,
    arena: ArenaMgr,
    friends: FriendMgr,
    time_control: TimeMgr,
    boss: BossMgr,
    mails: MailMgr,
    activities: ActivityMgr,
    chats: ChatMgr,
    trials: TrialMgr,
    raid: RaidMgr

    // TODO add new
};

export function serialize(key:string, obj:any):any {

    var msg = obj;
    if (obj.buildDBMsg && typeof obj.buildDBMsg === 'function') {
        msg = obj.buildDBMsg();
    }

    return msg.encode().toBuffer();
}

export function parse(key:string, buffer:Buffer):any {

    var mgrFn = _Define[key];
    if (mgrFn) {
        var mgr = new mgrFn();

        if (!buffer) {
            if (typeof mgr.initMgr === 'function') {
                mgr.initMgr();
            }
        } else {
            if (typeof mgr.loadDBMsg === 'function') {
                mgr.loadDBMsg(pb.get('.DB.' + key).decode(buffer));
            }
        }

        return mgr;
    }

    return null;

}
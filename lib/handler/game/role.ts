import pb = require('node-protobuf-stream');

import util     = require('util');
import async    = require('async');

export = Role;
// src/database
//import WorldDB  = require('../../database/impl/world_db');
//import LoginDB  = require('../../database/impl/login_db');
//import CenterDB = require('../../database/impl/center_db');

// src/util
import log      = require('../../util/log');
import Time     = require('../../util/time');
import Enum     = require('../../util/enum');
import DynObject= require('../../util/dynamicobject/dyn_object');
import Util     = require('../../util/game_util');

// src/gameserver
//import PlayerSession  = require('./client_session');
//import GameWorld    = require('./game_world');
import Universal    = require('./universal');
//import CenterClient = require('./center_client');
//import Rpc = require('./center_client');
import HeroDef      = require('./hero/defines');
import TimeDef      = require('./time/defines');
import BuildDef     = require('./build/defines');
import HeroSuite    = require('./hero/hero_suite');
import Hero         = require('./hero/hero');

// src/redis
import RedisStc     = require('../../redis/struct');
import RedisMgr     = require('../../redis/redis_mgr');

// managers
import HeroMgr      = require('./hero/hero_mgr');
import EquipMgr     = require('./equip/equip_mgr');
import BuildMgr     = require('./build/build_mgr');
import DungeonMgr   = require('./battle/dungeon_mgr');
import AchievementMgr = require('./achievement/achievement_mgr');
import AchievementDef = require('./achievement/defines');
import SignMgr      = require('./signin/sign_mgr');
import QuestMgr     = require('./quest/quest_mgr');
import ChanceMgr    = require('./chance/chance_mgr');
import FriendMgr    = require('./friend/friend_mgr');
import ArenaMgr     = require('./arena/arena_mgr');
import SummonBossMgr= require('./summonboss/summonboss_mgr');
import ArenaGlobalMgr = require('./arena/arena_global_mgr');
import TimeMgr      = require('./time/time_mgr');
import BossMgr      = require('./boss/boss_mgr');
import ActivityMgr  = require('./activity/activity_mgr');
import MailMgr      = require('./mail/mail_mgr');
import ChatMgr      = require('./chat/chat_mgr');
import TrialMgr     = require('./trial/trial_mgr');
import GuildMgr     = require('./guild/guild_mgr');
import RaidMgr      = require('./raid/raid_mgr');

// systems
import ResourceMgr  = require('./resource/resource_mgr');
import BuildSystem  = require('./api/build_system');
import HeroSystem   = require('./api/hero_system');
import EquipSystem  = require('./api/equip_system');
import BattleSystem = require('./api/battle_system');
import QuestSystem  = require('./api/quest_system');
import FriendSystem = require('./api/friend_system');
import ArenaSystem  = require('./api/arena_system');
import SummonSystem = require('./api/summonboss_system');
import RoleSystem   = require('./api/role_system');
import BossSystem   = require('./api/boss_system');
import ActivitySystem   = require('./api/activity_system');
import AchievementSystem= require('./api/achievement_system');
import MailSystem   = require('./api/mail_system');
import ChatSystem   = require('./api/chat_system');
import GMSystem     = require('./api/gm_system');
import GuildSystem  = require('./api/guild_system');
import RaidSystem   = require('./api/raid_system');

import PlayerInfoMgr = require('../../cluster/player_info_mgr');
import CacheRole = require('../../cluster/cache_role');

//import DB           = require('../../share/db');
import Tcp = require('../../net/tcp');
import GameCharacter = require('./game_character');
import DB = require('../../database/database_manager');
import RoleManager = require('./role_manager');
import ServiceManager = require('../../service/service_manager');
import RedisUtil = require('../../redis/redis_util');

var Key = RedisUtil.Key;

// configs
var cm = require('../../config').configMgr;

class Reader {
    data:any = null;
    constructor(data) {
        this.data = data;
    }
    string(key):string {
        return this.data[key] ? this.data[key].toString() : '';
    }
    number(key):number {
        return parseInt(this.data[key]);
    }
    manager(key, mgrFn):any {
        var mgr = new mgrFn();
        var value = this.data[key];
        if (!value) {
            if (typeof mgr.initMgr === 'function') {
                mgr.initMgr();
            }
        } else {
            if (typeof mgr.loadDBMsg === 'function') {
                mgr.loadDBMsg(pb.get('.DB.' + key).decode(value));
            }
        }
        return mgr;
    }
}

class Writer {
    data:any = null;
    constructor(data) {
        this.data = data;
    }
    string(key):string {
        return this.data[key];
    }
    number(key):number {
        return this.data[key].toString();
    }
    manager(key):any {
        var obj = this.data[key], msg;
        if (obj && obj.buildDBMsg && typeof obj.buildDBMsg === 'function') {
            msg = obj.buildDBMsg();
        }

        return msg ? msg.encode().toBuffer() : null;
    }
}

var managerParser:{[key:string]:any} = {
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
    raid: RaidMgr.RaidMgr
};

class Role {
    session:Tcp.SyncSession = null;
    bInited:boolean = false;               // 载入数据完成
    bInitPacketSent:boolean = false;       // 上线操作完成，必须在载入数据操作之后

    // need save
    accountId:number = 0;
    account:string = '';
    username:string = '';
    progress:number = 0;
    level:number = 0;
    exp:number = 0;
    gold:number = 0;
    diamond:number = 0;
    diamondCharge:number = 0;
    bossEnergy:number = 0;
    arenaEnergy:number = 0;
    loginTime:number = 0;
    logoutTime:number = 0;
    loginKey:number = 0;
    gmAuth:number = 0;
    lastGmCmdTime:number = 0; // 上次处理GM时间戳 秒
    createTime:number = 0; // 角色创建时间
    deleteTime:number = 0;
    roleSt:number = Enum.ROLE_ST.NORMAL; // 角色状态

    // do not save
    lastUpdateChargeInfo:number = 0; // 上次读取充值信息，不需要存入DB
    passportGmAuth:number = 0;
    guildTechBoosts:{[elementId:number]:number} = {};
    guildHierarchyBoost:number = 0;

    accumulateResource:DynObject = new DynObject();     // 累计资源
    sundryValue:DynObject = new DynObject();            // 杂项

    signIn:SignMgr = new SignMgr();
    achievements:AchievementMgr = new AchievementMgr();   // 成就
    heros:HeroMgr = new HeroMgr();
    equips:EquipMgr = new EquipMgr();
    builds:BuildMgr = new BuildMgr();
    dungeons:DungeonMgr = new DungeonMgr();
    time_control:TimeMgr = new TimeMgr();
    activities:ActivityMgr = new ActivityMgr();
    mails:MailMgr = new MailMgr();
    trials:TrialMgr = new TrialMgr();
    guilds:GuildMgr = new GuildMgr();
    raid:RaidMgr.RaidMgr = new RaidMgr.RaidMgr();

    // time counter
    //healthCounter:Time.RoundCounter = null;          // 回血计数器
    arenaEnergyCounter:Time.RoundCounter = null;
    bossEnergyCounter:Time.RoundCounter = null;
    healthCounterMap:{[suite:string]:Time.RoundCounter} = {};

    chanceCounter:ChanceMgr = new ChanceMgr();          // 宝箱计数器系统
    summonBoss:SummonBossMgr = new SummonBossMgr();
    boss:BossMgr = new BossMgr();
    quests:QuestMgr = new QuestMgr();
    //arena:Arena.ArenaMgr = new Arena.ArenaMgr();

    arena:ArenaMgr = new ArenaMgr();
    friends:FriendMgr = new FriendMgr();
    chats:ChatMgr = new ChatMgr();

    // 缓存相关
    bSaving:boolean = false;
    bOnline:boolean = false;
    cacheLastSaveTime:number = Date.now();
    useCount:number = 0;
    bDirty:boolean = false;

    // 异步操作flag: Enum.ROLE_ASYNC_FLAG
    asyncFlagMap:{[flag:number]:boolean} = {};

    // 用户钻石消费记录，离线时存入login
    diamondUseArr:Universal.DiamondUse[] = [];

    constructor() {
    }

    public checkAsyncFlag(flag:Enum.ROLE_ASYNC_FLAG):boolean {
        return this.asyncFlagMap.hasOwnProperty(String(flag));
    }

    public setAsyncFlag(flag:Enum.ROLE_ASYNC_FLAG) {
        this.asyncFlagMap[flag] = true;
    }

    public rmAsyncFlag(flag:Enum.ROLE_ASYNC_FLAG) {
        delete this.asyncFlagMap[flag];
    }

    public saveAllData():any {
        var writer = new Writer(this);
        var result = {};

        [
            'account',
            'username',
            'progress',
            'level',
            'exp',
            'gold',
            'diamond',
            'diamondCharge',
            'bossEnergy',
            'arenaEnergy',
            'loginTime',
            'logoutTime',
            'gmAuth',
            'lastGmCmdTime',
            'createTime',
            'deleteTime',
            'roleSt',

        ].forEach((key) => {
            result[key] = this[key];
        });

        Object.keys(managerParser).forEach((key) => {
            result[key] = writer.manager(key);
        });

        return result;
    }

    public loadAllData(data):void {
        var reader = new Reader(data);
        [
            'account',
            'username',

        ].forEach((key) => {
            this[key] = reader.string(key);
        });

        [
            'progress',
            'level',
            'exp',
            'gold',
            'diamond',
            'diamondCharge',
            'bossEnergy',
            'arenaEnergy',
            'loginTime',
            'logoutTime',
            'gmAuth',
            'lastGmCmdTime',
            'createTime',
            'deleteTime',
            'roleSt',

        ].forEach((key) => {
            this[key] = reader.number(key);
        });

        Object.keys(managerParser).forEach((key) => {
            this[key] = reader.manager(key, managerParser[key]);
        });
    }

    /**
     * 检查内存数据
     *
     * 1. 数据库数据加载完毕，上线操作之前的内存操作：内容应该是将一些内存冗余数据进行正确同步
     * 2. 可以做一些修复操作
     *
     * 重要： 包括他人使用CacheMgr引用**也会**调用这个函数!!
     * 重要： 不要调用initMgr方法!!
     */
    public checkMemoryData():void {
        if (this.level === 0) {
            this.level = 1;
        }

        // 这步之前使用的是database的resource字段
        // 以player_info表为准，可以手动修改数据，并且同步到动态结构中
        this.setResCount(Enum.RESOURCE_TYPE.ROLE_LEVEL, this.level);
        this.setResCount(Enum.RESOURCE_TYPE.ROLE_EXP, this.exp);
        this.setResCount(Enum.RESOURCE_TYPE.GOLD, this.gold);
        this.setResCount(Enum.RESOURCE_TYPE.DIAMOND, this.diamond);
        this.setResCount(Enum.RESOURCE_TYPE.DIAMOND_CHARGE, this.diamondCharge);
        this.setResCount(Enum.RESOURCE_TYPE.BOSS_ENERGY, this.bossEnergy);
        this.setResCount(Enum.RESOURCE_TYPE.ARENA_ENERGY, this.arenaEnergy);

        this.setSundryValue(Enum.SUNDRY.NEW_ROLE_GUIDE, this.progress);

        this.builds.checkAreaData();
        this.builds.checkAllFinishBuilding(this, null);

        this.equips.checkAllCraftSkill(this);
        this.equips.checkHandbook();

        this.heros.checkAllID();
        this.heros.setAllLevel(this.level);
        HeroSystem.checkUnlockHero(this);
        HeroSystem.calculateAllProperty(this);

        this.achievements.checkAllAchievement(this);

        // 任务检查应放在所有相关业务逻辑之后
        this.quests.checkQuestByLevel(1, this.level);
        this.quests.checkAllQuests(this);
    }

    /**
     * 玩家上线时的检查初始化操作
     *
     * 例如：
     *      1. 血量判断
     *      2. 上线领奖检查
     *
     * 重要： 他人使用CacheMgr引用**不会**调用这个函数
     */
    public onlineCheckMemory(callback:(err)=>void):void {
        async.waterfall([
            (next) => {
                // 副本战斗英雄血量回血计时器
                var self = this;

                var now = Time.gameNow();
                var lastLogout = this.logoutTime;
                var offlineHealth = Universal.getOfflineReviveHealth(lastLogout, now);

                [HeroSuite.SuiteType.dungeon, HeroSuite.SuiteType.trial].forEach((suite) => {
                    if (!self.heros.isAllFullHealth(suite)) {
                        if (!self[suite + 's'].isFighting()) {
                            if (offlineHealth) {
                                self.heros.addAllHeroHealth(suite, offlineHealth);
                            }
                            self.healthCounterMap[suite] = new Time.RoundCounter(Universal.GLB_REVIVE_HEALTH_INTERVAL);
                            self.healthCounterMap[suite].setStart(now);
                        }
                    }
                });

                if (!this.boss.currentFight) {
                    this.heros.recoverAllHeroHealth(HeroSuite.SuiteType.boss);
                }

                if (!this.trials.currentFight) {
                    this.heros.recoverAllHeroHealth(HeroSuite.SuiteType.trial);
                }

                this.heros.recoverAllHeroHealth(HeroSuite.SuiteType.arena);

                // Arena Energy
                var current = this.getResCount(Enum.RESOURCE_TYPE.ARENA_ENERGY);
                if (current < Universal.GLB_ARENA_ENERGY_MAX_COUNT) {
                    this.arenaEnergyCounter = new Time.RoundCounter(Universal.GLB_ARENA_RECOVER_ENERGY_INTERVAL);
                    this.arenaEnergyCounter.setStart(this.time_control.getTime(TimeDef.TIME_STAMP.LAST_EARN_ARENA_ENERGY));

                    var count = this.arenaEnergyCounter.roundCount(Time.gameNow());
                    if (count + current >= Universal.GLB_ARENA_ENERGY_MAX_COUNT) {
                        this.setResCount(Enum.RESOURCE_TYPE.ARENA_ENERGY, Universal.GLB_ARENA_ENERGY_MAX_COUNT);
                        this.arenaEnergyCounter = null;
                    } else {
                        this.setResCount(Enum.RESOURCE_TYPE.ARENA_ENERGY, count + current);
                    }
                }

                // Boss Energy
                current = this.getResCount(Enum.RESOURCE_TYPE.BOSS_ENERGY);
                if (current < Universal.GLB_BOSS_MAX_ENERGY) {
                    this.bossEnergyCounter = new Time.RoundCounter(Enum.BOSS_ENERGY_RECOVERY_INTERVAL);
                    this.bossEnergyCounter.setStart(this.time_control.getTime(TimeDef.TIME_STAMP.LAST_EARN_BOSS_ENERGY));

                    var count = this.bossEnergyCounter.roundCount(Time.gameNow());
                    if (count + current >= Universal.GLB_BOSS_MAX_ENERGY) {
                        this.setResCount(Enum.RESOURCE_TYPE.BOSS_ENERGY, Universal.GLB_BOSS_MAX_ENERGY);
                        this.bossEnergyCounter = null;
                    } else {
                        this.setResCount(Enum.RESOURCE_TYPE.BOSS_ENERGY, count + current);
                    }
                }

                // Share Status
                var lastShareTime = this.time_control.getTime(TimeDef.TIME_STAMP.LAST_SHARE_GAME);

                if (!Time.isToday(lastShareTime)) {
                    this.setSundryValue(Enum.SUNDRY.SHARE_GAME_STATUS, Enum.SHARE_GAME_STATUS.NULL);
                }

                // Month Sign
                var month = (new Date()).getMonth() + 1;    // [1-12]
                if (this.signIn.monthSign.monthId !== month) {
                    this.signIn.clearMonth();
                    this.signIn.monthSign.monthId = month;
                }

                next(null);
            },
            (next) => {
                this.arena.checkRefreshTournament(this, (err) => {
                    if (err) log.sError('OnlineCheck', 'checkRefreshTournament Error: ' + err.stack);
                    next(err);
                });
            },
            (next) => {
                this.boss.checkRefreshBoss(this, (err) => {
                    if (err) log.sError('OnlineCheck', 'checkRefreshBoss Error: ' + err.stack);
                    this.boss.checkBossActive();
                    next(err);
                });
            },
            (next) => {
                var lastShareTime = this.time_control.getTime(TimeDef.TIME_STAMP.LAST_SHARE_GAME);
                if (Time.isToday(lastShareTime)) {
                    this.setSundryValue(Enum.SUNDRY.SHARE_GAME_STATUS, Enum.SHARE_GAME_STATUS.SHARED);
                } else {
                    this.setSundryValue(Enum.SUNDRY.SHARE_GAME_STATUS, Enum.SHARE_GAME_STATUS.NULL);
                }
                next(null);
            }
        ], (err) => {
            callback(err);
        });
    }

    public online(callback:(err) => void):void {
        var self = this;
        if (!self.bInited) {
            callback(new Error('role not init'));
        }
        else {
            var character = self.session.getBindingData();
            async.series(
                [
                    (cb:(err) => void) => {
                        DB.Login.insertLoginInfo(self.accountId, self.session.address.address,
                            character.device.OS, character.device.type, (err, loginKey) => {
                                self.loginKey = loginKey;
                                cb(err);
                            }
                        );
                    },
                    (cb:(err) => void) => {
                        self.checkMemoryData();
                        cb(null);
                    },
                    (cb:(err)=>void) => {
                        self.onlineCheckMemory(cb);
                    }
                ],
                (err) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    var gameNow = Time.gameNow(),
                        lastLoginTime = self.loginTime;

                    self.bOnline = true;
                    self.bInitPacketSent = true;

                    // sign in module
                    var hasLogin = Time.isToday(lastLoginTime);
                    if (hasLogin) {
                        self.signIn.firstLogin = false;
                    } else {
                        if (!Time.isYesterday(lastLoginTime)) {
                            self.signIn.resetLoginDays();
                        }
                        // set sign days and check reward
                        var reward = self.signIn.rollNewReward();
                        self.signIn.pushNewSign(reward);

                        var config = cm.sign_in_rewarddb.get(self.signIn.loginDays);
                        // add reward and record reward
                        self.signIn.firstLogin = true;
                        var resource:Universal.Resource = {};
                        resource[reward.id] = reward.count;
                        resource[config.key] = 1;
                        ResourceMgr.applyReward(self, Enum.USE_TYPE.SIGN_IN, resource);

                        this.achievements.updateAchievement(self, AchievementDef.TYPE.LOGIN_IN_SERIES_N_DAYS, self.signIn.loginDays);
                    }

                    if (lastLoginTime) {    // 已经登陆过，不是新角色
                        var notLoginDays = Time.getDateDiff(lastLoginTime, gameNow) - 1;

                        var returnSign = self.signIn.returnSign;
                        if (notLoginDays > 0) {
                            returnSign.notLoginDays = notLoginDays;
                            returnSign.returnDays = 0;
                        }

                        //if (returnSign.notLoginDays < 21) returnSign.notLoginDays = 21;

                        if (returnSign.notLoginDays >= Universal.GLB_RETURN_REWARD_LIMIT_DAYS) {
                            var returnConfig = cm.ReturnRewsrdsdb.ReturnRewsrdsDBConfig[returnSign.returnDays + 1];
                            if (returnConfig) {
                                if (!Time.isToday(self.time_control.getTime(TimeDef.TIME_STAMP.LAST_GAIN_RETURN_REWARD))) {
                                    var returnReward:Universal.Resource = {};
                                    returnConfig.JSON_reward.forEach((reward:any) => {
                                        returnReward[reward.resID] = reward.count;
                                    });
                                    ResourceMgr.applyReward(self, Enum.USE_TYPE.RETURN_REWARD, returnReward);

                                    self.time_control.setTime(TimeDef.TIME_STAMP.LAST_GAIN_RETURN_REWARD, gameNow);
                                    returnSign.returnDays += 1;
                                }
                            }
                        }

                    }

                    self.loginTime = gameNow;
                    log.uInfo(self.accountId, 'RoleLifeCycle', 'online, account=%s, remoteIp=%s, deviceOS=%s, deviveType=%s',
                        self.account, self.session.address.address, character.device.OS, character.device.type);

                    self.sendOnlinePacket();
                    self.afterOnline();
                    callback(null);
                }
            );
        }
    }

    public offline(callback:(err) => void):void {
        if (!this.bOnline) {
            log.uWarn(this.accountId, 'RoleLifeCycle', 'offline, already offline');
            callback(null);
        }
        else {
            var gameNow = Time.gameNow();
            log.uInfo(this.accountId, 'RoleLifeCycle', 'offline start');
            this.logoutTime = gameNow;
            this.bOnline = false;
            var gameSecond = this.logoutTime > this.loginTime ? this.logoutTime - this.loginTime : 0;
            this.achievements.updateAchievement(this, AchievementDef.TYPE.GAME_FOR_N_HOUR, gameSecond);

            var offlineData:any = {};
            offlineData.isRecharged     = this.getSundryValue(Enum.SUNDRY.FIRST_CHARGE_STATUS) !== Enum.FIRST_CHARGE_STATUS.UNCHARGE;
            offlineData.rechargeDiamond = this.getResCount(Enum.RESOURCE_TYPE.DIAMOND_CHARGE);
            offlineData.freeDiamond     = this.getResCount(Enum.RESOURCE_TYPE.DIAMOND) - this.getResCount(Enum.RESOURCE_TYPE.DIAMOND_CHARGE);
            offlineData.gold            = this.getResCount(Enum.RESOURCE_TYPE.GOLD);
            offlineData.fuseStone       = this.getResCount(Enum.RESOURCE_TYPE.FUSE_STONE);
            offlineData.healBottle      = this.getResCount(Enum.RESOURCE_TYPE.HEAL_BOTTLE);
            var distribution = this.equips.buildDistribution();
            offlineData.equipStarDist   = distribution.star;
            offlineData.equipLevelDist  = distribution.level;
            offlineData.landOpenCount   = this.builds.land.getColorCount(BuildDef.LandColor.OPEN);
            offlineData.maxDungeonStageID = this.dungeons.completeHighestStageID;
            offlineData.completeQuestSum= this.quests.getCompleteQuestCount();
            offlineData.friendCount     = this.friends.friendCount;
            offlineData.handbookCount   = Object.keys(this.equips.handbook).length;

            log.uInfo(this.accountId, 'RoleOfflineLog', offlineData);

            async.series(
                [
                    (cb:(err) => void) => {
                        log.uDebug(this.accountId, 'RoleLifeCycle', 'DB.Login.insertLogOutInfo');
                        DB.Login.insertLogOutInfo(this.loginKey, cb);
                    }
                ],
                (err) => {
                    log.uDebug(this.accountId, 'RoleLifeCycle', 'RoleManager.saveRole');
                    RoleManager.saveRole(this, true, (err) => {
                        log.uInfo(this.accountId, 'RoleLifeCycle', 'offline success');
                        callback(err);
                    });
                }
            );

            PlayerInfoMgr.updateBasic(this.accountId, this.buildCacheBasic(), ()=>{});

            this.raid.setMatchScoreIfNotExist(this.accountId, (err) => {});
        }
    }

    public sendPacket(pck:any):void {
        if (!this.bInitPacketSent || !this.bInited || !pck || !this.session) {
            return;
        }
        this.session.sendProtoMessage(pck);
    }

    /**
     * 发送上线包
     *
     * 此时已保证
     * 1. DB加载完成
     * 2. 内存数据预处理完成
     */
    public sendOnlinePacket():void {
        log.sDebug('OnlinePacket', '===>> RoleSystem.sendServerSundryData(this);');
        RoleSystem.sendServerSundryData(this);

        this.sendPacket(this.buildRoleInfoMsg());
        this.sendPacket(this.buildInitProperty());
        // other system online packet
        log.sDebug('OnlinePacket', '===>> BuildSystem.sendOnlinePacket(this);');
        BuildSystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> EquipSystem.sendOnlinePacket(this);');
        EquipSystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> HeroSystem.sendOnlinePacket(this);');
        HeroSystem.sendOnlinePacket(this);      // must after EquipSystem, for client require
        log.sDebug('OnlinePacket', '===>> BattleSystem.sendOnlinePacket(this);');
        BattleSystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> FriendSystem.sendOnlinePacket(this);');
        FriendSystem.sendRoleOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> ArenaSystem.sendOnlinePacket(this);');
        ArenaSystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> SummonSystem.sendOnlinePacket(this);');
        SummonSystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> BossSystem.sendOnlinePacket(this);');
        BossSystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> AchievementSystem.sendOnlinePacket(this);');
        AchievementSystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> QuestSystem.sendOnlinePacket(this);');
        QuestSystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> ActivitySystem.sendOnlinePacket(this);');
        ActivitySystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> MailSystem.sendOnlinePacket(this);');
        MailSystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> ChatSystem.sendOnlinePacket(this);');
        ChatSystem.sendOnlinePacket(this);
        log.sDebug('OnlinePacket', '===>> GMSystem.sendGMCommandList(this);');
        GMSystem.sendGMCommandList(this);
        log.sDebug('OnlinePacket', '===>> RaidSystem.sendOnlinePacket(this);');
        RaidSystem.sendOnlinePacket(this);

        var initMonthSign = pb.get('.Api.role.initMonthSign.Notify');
        this.sendPacket(new initMonthSign({
            month: this.signIn.monthSign.monthId,
            hasSignDays: this.signIn.monthSign.hasSignDays,
            isSigned: Time.isToday(this.signIn.monthSign.lastSignTime)
        }));

        console.log(this.loginTime, this.time_control.getTime(TimeDef.TIME_STAMP.LAST_GAIN_RETURN_REWARD));

        var initReturnReward = pb.get('.Api.role.initReturnReward.Notify');
        this.sendPacket(new initReturnReward({
            returnDays: this.signIn.returnSign.returnDays,
            hasReward: (this.loginTime === this.time_control.getTime(TimeDef.TIME_STAMP.LAST_GAIN_RETURN_REWARD))
        }));

        log.sInfo('OnlinePacket', 'sendOnlinePacket finished, accountId=' + this.accountId);
    }

    public sendAllUpdatePacket():void {
        // role动态属性更新包
        this.sendPacket(this.buildUpdateProperty());
        // 装备更新包
        this.equips.sendUpdatePacket(this);
        // 英雄更新包
        this.heros.sendUpdatePacket(this);
        // 任务更新包
        this.quests.sendUpdatePacket(this);
        // 成就更新包
        this.achievements.sendUpdatePacket(this);
    }

    /**
     * 如果bHasResourceChange为true，则外部可以省略quest和achievement的更新包发送
     */
    public sendUpdatePacket(bHasResourceChange:boolean):void {
        // role动态属性更新包
        this.sendPacket(this.buildUpdateProperty());

        if (bHasResourceChange) {
            this.quests.sendUpdatePacket(this);
            this.achievements.sendUpdatePacket(this);
            this.equips.sendUpdatePacket(this); // 装备在英雄前面
            this.heros.sendUpdatePacket(this);
        }
    }

    public static isNPC(roleId:number):boolean {
        return roleId < Enum.VALID_ROLE_ID;
    }

    public getResCount(resId:number):number {
        return this.accumulateResource.getValue(resId.toString()) || 0;
    }

    public setResCount(resId:number, count:number):void {
        this.accumulateResource.setValue(resId.toString(), count);
        this.setEnumValue(resId, count);
    }

    public getSundryValue(sundryId:number):number {
        return this.sundryValue.getValue(sundryId.toString()) || 0;
    }

    public setSundryValue(sundryId:number, value:number) {
        this.sundryValue.setValue(sundryId.toString(), value);
    }

    public addResCount(resId:number, count:number):void {
        if (count === 0) {
            return;
        }
        var origin = this.accumulateResource.getValue(resId.toString());
        var value = origin ? origin + count : count;
        if (value < 0) {
            value = 0;
        }
        this.accumulateResource.setValue(resId.toString(), value);
        this.setEnumValue(resId, value);
    }

    public setEnumValue(resId:number, value:number):void {
        switch (resId) {
            case Enum.RESOURCE_TYPE.ARENA_ENERGY:
                this.arenaEnergy = value;
                break;
            //case Enum.RESOURCE_TYPE.ARENA_REPUTATION:
            //    this.arenaReputation = value;
            //    break;
            case Enum.RESOURCE_TYPE.BOSS_ENERGY:
                this.bossEnergy = value;
                break;
            case Enum.RESOURCE_TYPE.GOLD:
                this.gold = value;
                break;
            case Enum.RESOURCE_TYPE.DIAMOND:
                this.diamond = value;
                break;
            case Enum.RESOURCE_TYPE.ROLE_EXP:
                this.exp = value;
                break;
            case Enum.RESOURCE_TYPE.ROLE_LEVEL:
                this.level = value;
                break;
            case Enum.RESOURCE_TYPE.DIAMOND_CHARGE:
                this.diamondCharge = value;
                break;
        }
    }

    public getRatingScore():number {
        //	elo rating=1500+玩家等级*2+（玩家身上3件攻击力最高的装备合值+玩家指挥官攻击值+玩家2个骑士攻击值-3000）/10
        var attackScore = (this.equips.getTopAttack(3) + this.heros.getMainHeroAndTopAttacks(2) - 3000) / 10;
        if (attackScore < 1) {
            attackScore = 1
        }

        return Enum.ARENA_BASE_RATING_SCORE + this.level * this.level + attackScore;
    }

    public buildRoleInfoMsg():any {
        var initInfo = pb.get('.Api.role.initInfo.Notify');
        return new initInfo({
            accountId: this.accountId
        });
    }

    /**
     * role属性全包，绑定于role的动态属性放这里
     * 包含：资源属性，craftskill，杂项
     * @returns {*}
     */
    public buildInitProperty():any {
        var initProperty = pb.get('.Api.role.initProperty.Notify');
        var pck = new initProperty();

        // values
        var buildArray = this.accumulateResource.buildInitArray();
        var craftSkillArray = this.equips.buildInitCraftSkillArray();
        log.sTrace('RoleProperty', '%j', buildArray);
        for (var i = 0; i < buildArray.length; i++) {
            pck.add('values', buildArray[i]);
        }
        for (i = 0; i < craftSkillArray.length; i++) {
            pck.add('values', craftSkillArray[i]);
        }

        // sundry
        pck.sundry = this.sundryValue.buildInitArray();
        return pck;
    }

    // 同buildInitProperty
    public buildUpdateProperty():any {
        var buildArray = this.accumulateResource.buildUpdateArray();
        var craftSkillArray = this.equips.buildUpdateCraftSkillArray();
        var sundry = this.sundryValue.buildUpdateArray();

        if (!buildArray.length && !craftSkillArray.length && !sundry.length) {
            return null;
        }

        // values
        var updateProperty = pb.get('.Api.role.updateProperty.Notify');
        var i, pck = new updateProperty();
        for (i = 0; i < buildArray.length; i++) {
            pck.add('values', buildArray[i]);
        }
        for (i = 0; i < craftSkillArray.length; i++) {
            pck.add('values', craftSkillArray[i]);
        }

        // sundry
        pck.sundry = sundry;
        return pck;
    }

    private checkAndSaveTimestamp(counter:Time.RoundCounter, timestampType:TimeDef.TIME_STAMP):void {
        if (counter) {
            this.time_control.setTime(timestampType, counter.getStart());
        } else {
            this.time_control.delKey(timestampType);
        }
    }

    private beforeSaveDB(callback:(err)=>void):void {
        this.checkAndSaveTimestamp(this.arenaEnergyCounter, TimeDef.TIME_STAMP.LAST_EARN_ARENA_ENERGY);
        this.checkAndSaveTimestamp(this.bossEnergyCounter, TimeDef.TIME_STAMP.LAST_EARN_BOSS_ENERGY);

        callback(null);
    }

    public buildDBMsg():any {
        var pck;
        var Resource = pb.get('.DB.resource');
        pck = new Resource();
        pck.values = this.accumulateResource.buildInitArray();
        pck.sundry = this.sundryValue.buildInitArray();

        return pck;
    }

    public loadDBMsg(msg:any, force?:boolean):void {
        if (!msg) return ;
        var i, key;
        for (i = 0; i < msg.values.length; i += 1) {
            key = msg.values[i].key;
            switch (key) {
                case Enum.RESOURCE_TYPE.BOSS_ENERGY:
                case Enum.RESOURCE_TYPE.ARENA_ENERGY:
                case Enum.RESOURCE_TYPE.ARENA_REPUTATION:
                case Enum.RESOURCE_TYPE.ROLE_EXP:
                case Enum.RESOURCE_TYPE.ROLE_LEVEL:
                case Enum.RESOURCE_TYPE.DIAMOND:
                case Enum.RESOURCE_TYPE.DIAMOND_CHARGE:
                case Enum.RESOURCE_TYPE.GOLD:
                    if (force) {
                        this.setResCount(msg.values[i].key, msg.values[i].value);
                    }
                    break;
                default :
                    this.setResCount(msg.values[i].key, msg.values[i].value);
                    break;
            }
        }
        for (i = 0; i < msg.sundry.length; i += 1) {
            this.sundryValue.setValue(msg.sundry[i].key, msg.sundry[i].value);
        }
    }

    public initNew():void {
        this.setResCount(Enum.RESOURCE_TYPE.ROLE_LEVEL, 1);
        this.setResCount(Enum.RESOURCE_TYPE.ROLE_EXP, 0);
        this.setResCount(Enum.RESOURCE_TYPE.GOLD, 0);
        this.setResCount(Enum.RESOURCE_TYPE.DIAMOND, 0);
        this.setResCount(Enum.RESOURCE_TYPE.BOSS_ENERGY, 0);
        this.setResCount(Enum.RESOURCE_TYPE.ARENA_ENERGY, 0);
        this.setResCount(Enum.RESOURCE_TYPE.ARENA_REPUTATION, 0);

        this.equips.initMgr();
        this.builds.initMgr();
        this.builds.checkAreaData();

        this.heros.initMgr();
        this.heros.setAllLevel(this.level);
        HeroSystem.checkUnlockHero(this);
        HeroSystem.calculateAllProperty(this);
        this.heros.recoverAllHeroHealth(HeroSuite.SuiteType.dungeon);

        var hero = this.heros.getHero(0);
        hero.name = this.username;

        ResourceMgr.applyReward(this, Enum.USE_TYPE.NEW_ROLE, Universal.newRoleInitalReward);
    }

    public addExp(exp:number):void {
        var maxlv = Object.keys(cm.knightexpdb.all()).length, lvc;
        var totalExp = exp,
            leftNextLvExp = 0,
            oldLevel = this.level;
        while (totalExp > 0 && this.level < maxlv) {
            lvc = cm.knightexpdb.get(this.level);

            if (lvc.EXP < this.exp) {
                leftNextLvExp = 0;                    // 当前经验溢出，剩余升级经验为0，溢出部分不计入升级经验
            } else {
                leftNextLvExp = lvc.EXP - this.exp;
            }

            if (totalExp >= leftNextLvExp) {
                this.level += 1;
                this.exp = 0;
                totalExp -= leftNextLvExp;
            } else {
                this.exp += totalExp;
                totalExp = 0;
            }
        }

        this.setResCount(Enum.RESOURCE_TYPE.ROLE_LEVEL, this.level);
        this.setResCount(Enum.RESOURCE_TYPE.ROLE_EXP, this.exp);

        if (this.level !== oldLevel) {
            this.onLevelUp(oldLevel, this.level);
        }
    }

    // 角色升级触发
    public onLevelUp(beginLevel:number, afterLevel:number):void {
        var self = this;
        this.heros.setAllLevel(afterLevel);
        HeroSystem.checkUnlockHero(this);
        HeroSystem.calculateAllProperty(this);
        HeroSuite.SuiteList.forEach(function (key:any) {
            self.heros.recoverAllHeroHealth(key);
        });

        this.equips.openCraftSkillByRoleLevel(beginLevel, afterLevel);

        this.quests.checkQuestByLevel(beginLevel, afterLevel);

        this.achievements.updateAchievement(this, AchievementDef.TYPE.ROLE_LEVEL, afterLevel);

        var reward:Universal.Resource = {}, hasReward = false;
        for (var i = beginLevel + 1; i <= afterLevel; i += 1) {
            var config = cm.knightexpdb.get(i);
            for (var j = 1; j <= 3; j += 1) {
                if (config['itemID' + j] > 0 && config['count' + j] > 0) {
                    hasReward = true;
                    Universal.addResource(reward, config['itemID' + j], config['count' + j]);
                }
            }
        }
        if (hasReward) {
            ResourceMgr.applyReward(this, Enum.USE_TYPE.LEVEL_UP, reward);
        }

        //CenterDB.updateRoleInfo(this.accountId, {level: afterLevel}, (err) => {});
        PlayerInfoMgr.updateBasic(this.accountId, this.buildCacheBasic(), ()=>{});
    }

    public onBuy(resid:number):void {
        switch (resid) {
            case Enum.RESOURCE_TYPE.ARENA_ENERGY:
                break;
            case Enum.RESOURCE_TYPE.BOSS_ENERGY:
                break;
            default :
                break;
        }
    }

    public afterOnline():void {
        PlayerInfoMgr.updateBasic(this.accountId, this.buildCacheBasic(), ()=>{});
        PlayerInfoMgr.updateMainHero(this.accountId, this.buildCacheMainHero(), ()=>{});

        if (ArenaGlobalMgr.isArenaOpen(this.level)) {
            this.arena.setMatchScoreIfNotExist(this.accountId, (err) => {
            });
        }

        this.activities.onLogin(this);
        GuildSystem.initOnline(this, (err)=>{});
    }

    public reviveHealth():void {
        var self = this, update = false, now = Time.gameNow();
        [HeroSuite.SuiteType.dungeon, HeroSuite.SuiteType.trial].forEach((suite) => {
            if (self.healthCounterMap[suite]) {
                var count = self.healthCounterMap[suite].roundCount(now);
                if (count > 0) {
                    update = true;
                    self.heros.addAllHeroHealth(suite, count);
                    if (self.heros.isAllFullHealth(suite)) {
                        self.healthCounterMap[suite] = null;
                    }
                }
            }
        });
        if (update) this.heros.sendUpdatePacket(this);
    }

    public reviveArenaEnergy():void {
        if (this.arenaEnergyCounter) {
            var count = this.arenaEnergyCounter.roundCount(Time.gameNow());

            if (count > 0) {
                var current = this.getResCount(Enum.RESOURCE_TYPE.ARENA_ENERGY);
                if (current >= Universal.GLB_ARENA_ENERGY_MAX_COUNT) {
                    this.arenaEnergyCounter = null;
                } else if (count + current >= Universal.GLB_ARENA_ENERGY_MAX_COUNT) {
                    this.setResCount(Enum.RESOURCE_TYPE.ARENA_ENERGY, Universal.GLB_ARENA_ENERGY_MAX_COUNT);
                    this.arenaEnergyCounter = null;
                    this.sendUpdatePacket(false);
                } else {
                    this.setResCount(Enum.RESOURCE_TYPE.ARENA_ENERGY, count + current);
                    this.sendUpdatePacket(false);
                }
            }
        }
    }

    public reviveBossEnergy():void {
        if (this.bossEnergyCounter) {
            var count = this.bossEnergyCounter.roundCount(Time.gameNow());

            if (count > 0) {
                var current = this.getResCount(Enum.RESOURCE_TYPE.BOSS_ENERGY);
                if (current >= Universal.GLB_BOSS_MAX_ENERGY) {
                    this.bossEnergyCounter = null;
                } else if (count + current >= Universal.GLB_BOSS_MAX_ENERGY) {
                    this.setResCount(Enum.RESOURCE_TYPE.BOSS_ENERGY, Universal.GLB_BOSS_MAX_ENERGY);
                    this.bossEnergyCounter = null;
                    this.sendUpdatePacket(false);
                } else {
                    this.setResCount(Enum.RESOURCE_TYPE.BOSS_ENERGY, count + current);
                    this.sendUpdatePacket(false);
                }
            }
        }
    }

    public logDescription():string {
        return 'accountId=' + this.accountId + ', username=' + this.username + ', account=' + this.account + ', level=' + this.level;
    }

    public bindSession(session:Tcp.SyncSession):void {
        this.session = session;
        session.sessionId = this.accountId;
    }

    public buildDungeonAvatar():Universal.Avatar {
        var avatar = new Universal.Avatar();
        var hero = this.heros.getHero(0);

        avatar.faceType = hero.faceType;
        avatar.hairColor = hero.hairColor;
        avatar.hairType = hero.hairType;
        avatar.skinColor = hero.skinColor;

        var armorUid = hero.getArmor(HeroSuite.SuiteType.dungeon);
        var armor = this.equips.getEquip(armorUid);
        if (armor) {
            avatar.armorID = armor.ID;
            avatar.armorLevel = armor.level;
        }

        return avatar;
    }

    public buildCacheBasic():any {
        log.uDebug(this.accountId, 'buildCacheBasic', 'login=' + this.loginTime + ', logout=' + this.logoutTime);
        return {
            name: this.username,
            level: this.level,
            achievementId: this.getSundryValue(Enum.SUNDRY.ACHIEVEMENT_TITLE),
            lastLogin: this.loginTime,
            lastLogout: this.logoutTime
        };
    }

    public buildCacheMainHero():any {
        var m = this;
        var hero:Hero = this.heros.getHero(0);
        var cache:any = {};
        cache.avatar = hero.getAvatar();
        HeroSuite.SuiteList.forEach((key:any) => {
            var armor = m.equips.getEquip(hero.getArmor(key));
            if (!armor) return ;

            var suite:any = {};
            suite.suite = {
                armor: armor
            };
            var tmp:DynObject = hero.getDyncObject(key);
            suite.attack = tmp.getValue(HeroDef.PROPERTY.ATTACK);
            suite.defence = tmp.getValue(HeroDef.PROPERTY.DEFENCE);

            cache[key] = suite;
        });
        return cache;
    }

    public exportData():any {
        var data:any = {};
        Object.keys(this).forEach((key) => {
            var value = this[key];
            var type = typeof this[key];
            if (type === 'object') {
                if (!value) return ;

                //if (value.exportData && typeof value.exportData === 'function') {
                //    data[key] = value.exportData();
                //    return ;
                //}

                if (value.buildDBMsg && typeof value.buildDBMsg === 'function') {
                    data[key] = value.buildDBMsg();
                }

            }
        });

        data['resource'] = this.buildDBMsg();

        return data;
    }

    public detachSession():void {
        RoleManager.detach(this.accountId, true);
    }
}
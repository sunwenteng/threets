import Role = require('../role');
import Hero = require('../hero/hero');
import HeroDef = require('../hero/defines');
import Enum = require('../../../util/enum');
import Log = require('../../../util/log');
import Util = require('../../../util/game_util');
import Universal = require('../universal');
import FriendStruct = require('../friend/friend_struct');
import Robot = require('../../../service/arena/robot');
import RobotStruct = require('../../../service/arena/robot_struct');
import HeroSuite = require('../hero/hero_suite');

var cm = require('../../../config').configMgr;

export class HeroBattleInfo {
    armorID:number = 0;
    armorLevel:number = 1;
    maxHp:number = 0;
    attack:number = 0;
    defence:number = 0;
}

export class HeroInfo {
    level:number = 1;
    name:string = '';
    hairType:number = 1;
    hairColor:number = 1;
    faceType:number = 1;
    skinColor:number = 1;
    cape:number = 0;

    dungeonCopy:HeroBattleInfo = new HeroBattleInfo();
    bossCopy:HeroBattleInfo = new HeroBattleInfo();
    arenaCopy:HeroBattleInfo = new HeroBattleInfo();
    raidCopy:HeroBattleInfo = new HeroBattleInfo();

    public loadFromHero(role:Role, hero:Hero):void {
        this.level = hero.level;
        this.name = hero.name;
        this.hairType = hero.hairType;
        this.hairColor = hero.hairColor;
        this.faceType = hero.faceType;
        this.skinColor = hero.skinColor;
        this.cape = hero.cape;

        HeroSuite.SuiteList.forEach((key) => {
            var bi = this[key + 'Copy'] = new HeroBattleInfo();
            var property = hero.suiteData[key].getProperty();
            var armorUid = property[HeroDef.PROPERTY.ARMOR];
            var armor = role.equips.getEquip(armorUid);
            if (armor) {
                bi.armorID = armor.ID;
                bi.armorLevel = armor.level;
            }

            bi.attack = property[HeroDef.PROPERTY.ATTACK];
            bi.defence = property[HeroDef.PROPERTY.DEFENCE];
            bi.maxHp = property[HeroDef.PROPERTY.HP];
        });

    }

    public loadFromFriendEntry(entry:FriendStruct.FriendEntry):void {
        this.level = entry.level;
        this.name = entry.username;
        this.hairType = entry.hairType;
        this.hairColor = entry.hairColor;
        this.faceType = entry.faceType;
        this.skinColor = entry.skinColor;
        this.cape = entry.cape;

        HeroSuite.SuiteList.forEach((key) => {
            var armorID = entry[key + 'ArmorID'],
                armorLevel = entry[key + 'ArmorLevel'];

            if (!armorID || !armorLevel) return ;

            var bi = this[key + 'Copy'] = new HeroBattleInfo();
            var property = Universal.calcHeroAllProperty(0, entry.level, armorID, armorLevel);
            bi.armorID = armorID;
            bi.armorLevel = armorLevel;

            bi.attack = property[HeroDef.PROPERTY.ATTACK];
            bi.defence = property[HeroDef.PROPERTY.DEFENCE];
            bi.maxHp = property[HeroDef.PROPERTY.HP];
        });

    }

    public loadFromRobotHero(hero:RobotStruct.Hero):void {
        this.level = hero.level;
        this.name = hero.name;
        this.hairType = hero.hairType;
        this.hairColor = hero.hairColor;
        this.faceType = hero.faceType;
        this.skinColor = hero.skinColor;
        this.cape = hero.cape;

        HeroSuite.SuiteList.forEach((key) => {
            var armorID = hero.armorID, armorLevel = hero.armorLevel;

            if (!armorID || !armorLevel) return ;

            var bi = this[key + 'Copy'] = new HeroBattleInfo();
            var property = Universal.calcHeroAllProperty(0, hero.level, armorID, armorLevel);
            bi.armorID = armorID;
            bi.armorLevel = armorLevel;

            bi.attack = property[HeroDef.PROPERTY.ATTACK];
            bi.defence = property[HeroDef.PROPERTY.DEFENCE];
            bi.maxHp = property[HeroDef.PROPERTY.HP];
        });
    }
}

export class ProgressionSummary {
    equipAchievementID:number = 0;
    completedAchievementCount:number = 0;
    epicBossesFought:number[] = [];
}

export class ArenaHistory {
    arenaId:number = 0;
    rank:number = 0;
}

export class ArenaCombatSummary {
    win:number = 0;
    loss:number = 0;
    revengeWin:number = 0;
    tournamentWinnings:ArenaHistory[] = [];
}

export class Profile {
    accountId:number;
    friendCode:string;
    heroInfo:HeroInfo;
    summary:ProgressionSummary;
    arena:ArenaCombatSummary;

    constructor() {
        this.accountId = 0;
        this.friendCode = '';
        this.heroInfo = new HeroInfo();
        this.summary = new ProgressionSummary();
        this.arena = new ArenaCombatSummary();
    }

    public loadFromRole(role:Role):void {
        this.accountId = role.accountId;
        this.friendCode = role.accountId.toString();

        var hero = role.heros.getHero(0);
        this.heroInfo.loadFromHero(role, hero);

        this.summary.equipAchievementID = role.getSundryValue(Enum.SUNDRY.ACHIEVEMENT_TITLE);
        this.summary.completedAchievementCount = Object.keys(role.achievements.mapCompleteAchievements).length;
        role.boss.bossHistory.forEach((history) => {
            this.summary.epicBossesFought.push(history.bossID);
        });

        // arenaCombatSummary
        this.arena.win = role.arena.tournamentRecord.winCount;
        this.arena.loss = role.arena.tournamentRecord.lossCount;
        this.arena.revengeWin = role.arena.tournamentRecord.revengeWinCount;
        role.arena.tournamentHistory.forEach((history) => {
            this.arena.tournamentWinnings.push({
                arenaId: history.tournamentId,
                rank: history.rank
            });
        });
    }

    public loadFromRobot(robot:Robot):void {
        this.accountId = robot.accountId;
        this.friendCode = robot.accountId.toString();

        var hero = robot.heroes[0];
        this.heroInfo.loadFromRobotHero(hero);

    }
}

// fight info struct
export class FightPlayer {
    uid:number = 0;
    ID:number = 1;
    name:string = '';
    level:number = 1;
    armorID:number = 0;
    armorLevel:number = 1;

    hairType:number = 1;      // 发型
    hairColor:number = 1;     // 发色
    faceType:number = 1;      // 脸型
    skinColor:number = 1;     // 肤色
    cape:number = 0;

    constructor() {

    }
}

export class FightPlayerNet extends FightPlayer {

    currentHp:number = 0;
    health:number = 0;
    attack:number = 0;
    defence:number = 0;
    critical:number = 0;
    hit:number = 0;
    dodge:number = 0;

    constructor() {
        super();
    }

    public loadFromCenterFightPlayer(fightPlayer:FightPlayer):void {
        this.uid = fightPlayer.uid;
        this.ID = this.uid + 1;
        this.name = fightPlayer.name;
        this.level = fightPlayer.level;
        this.armorID = fightPlayer.armorID;
        this.armorLevel = fightPlayer.armorLevel;

        var property = Universal.calcHeroAllProperty(this.uid, this.level, this.armorID, this.armorLevel);

        this.currentHp = property[HeroDef.PROPERTY.HP];
        this.health = property[HeroDef.PROPERTY.HP];
        this.attack = property[HeroDef.PROPERTY.ATTACK];
        this.defence = property[HeroDef.PROPERTY.DEFENCE];
        this.critical = property[HeroDef.PROPERTY.CRITICAL];
        this.hit = property[HeroDef.PROPERTY.HIT];
        this.dodge = property[HeroDef.PROPERTY.DODGE];
    }

    public loadFromFriendEntry(suiteType:HeroSuite.SuiteType, friend:FriendStruct.FriendEntry) {
        this.uid = 0;
        this.ID = 1;
        this.name = friend.username;
        this.level = friend.level;

        this.armorID = friend[suiteType + 'ArmorID'];
        this.armorLevel = friend[suiteType + 'ArmorLevel'];

        var property = Universal.calcHeroAllProperty(this.uid, this.level, this.armorID, this.armorLevel);
        this.currentHp = property[HeroDef.PROPERTY.HP];
        this.health = property[HeroDef.PROPERTY.HP];
        this.attack = property[HeroDef.PROPERTY.ATTACK];
        this.defence = property[HeroDef.PROPERTY.DEFENCE];
        this.critical = property[HeroDef.PROPERTY.CRITICAL];
        this.hit = property[HeroDef.PROPERTY.HIT];
        this.dodge = property[HeroDef.PROPERTY.DODGE];
    }

    public buildNetMsg():any {
        return {
            uid: this.uid,
            ID: this.uid + 1,
            level: this.level,
            name: this.name,
            hairType: this.hairType,
            hairColor: this.hairColor,
            faceType: this.faceType,
            skinColor: this.skinColor,
            cape: this.cape,
            currentHp: this.currentHp,
            health: this.health,
            attack: this.attack,
            defence: this.defence,
            critical: this.critical,
            hit: this.hit,
            dodge: this.dodge,
            armorID: this.armorID,
            armorLevel: this.armorLevel
        };
    }
}

export class FightTeam {
    fightPlayers:FightPlayer[] = [];

    public loadFromRole(role:Role, raidFight:boolean):void {
        var teams;
        if(raidFight) {
            teams = role.raid.fightTeam.heros;
        }
        else {
            teams = role.arena.fightTeam.heros;
        }

        if (!teams || !Array.isArray(teams) || teams.length === 0) {
            // 如果没有竞技场队伍，则选择0号英雄
            teams = [0];
        }

        teams.forEach((uid) => {
            var hero = role.heros.getHero(uid);
            if (hero) {
                var fightPlayer = new FightPlayer();
                fightPlayer.uid = hero.uid;
                fightPlayer.level = hero.level;
                fightPlayer.name = hero.name;

                fightPlayer.hairType = hero.hairType;
                fightPlayer.hairColor = hero.hairColor;
                fightPlayer.faceType = hero.faceType;
                fightPlayer.skinColor = hero.skinColor;
                fightPlayer.cape = hero.cape;

                var property = hero.getSuiteProperty(HeroSuite.SuiteType.arena);

                var armor = property[HeroDef.PROPERTY.ARMOR];
                var equip = role.equips.getEquip(armor);
                if (equip) {
                    fightPlayer.armorID = equip.ID;
                    fightPlayer.armorLevel = equip.level;
                } else {
                    fightPlayer.armorID = 0;
                    fightPlayer.armorLevel = 1;
                }

                this.fightPlayers.push(fightPlayer);
            } else {
                Log.sError('Fight', 'can not find hero[' + uid + '], accountId=' + role.accountId);
            }
        });
    }

    public loadFromRobot(robot:Robot):void {
        var heroes = robot.heroes;

        heroes.forEach((hero) => {
            var fightPlayer = new FightPlayer();
            fightPlayer.uid = hero.uid;
            fightPlayer.level = hero.level;
            fightPlayer.name = hero.name;
            fightPlayer.armorID = hero.armorID;
            fightPlayer.armorLevel = hero.armorLevel;

            fightPlayer.hairType = hero.hairType;
            fightPlayer.hairColor = hero.hairColor;
            fightPlayer.faceType = hero.faceType;
            fightPlayer.skinColor = hero.skinColor;
            fightPlayer.cape = hero.cape;

            this.fightPlayers.push(fightPlayer);
        });
    }
}

export class Avatar {
    armorID:number = 0;
    armorLevel:number = 1;
    hairType:number = 1;      // 发型
    hairColor:number = 1;     // 发色
    faceType:number = 1;      // 脸型
    skinColor:number = 1;     // 肤色
}

// 玩家对外显示信息
// 主角英雄外观
export class RoleAppearance {
    accountId:number = 0;
    avatar:Avatar = new Avatar();
    level:number = 0;
    username:string = '';
}
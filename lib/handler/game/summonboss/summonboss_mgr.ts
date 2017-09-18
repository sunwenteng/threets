import pb = require('node-protobuf-stream');

import CustomError = require('../../../util/errors');
import Enum = require('../../../util/enum');
import ERRC = require('../../../util/error_code');
import Universal = require('../universal');
import ResourceMgr = require('../resource/resource_mgr');
import FriendStruct = require('../friend/friend_struct');
import RoleStruct = require('../role/role_struct');
import HeroDef = require('../hero/defines');
import Fight = require('../fight/fight');
import FightDef = require('../fight/defines');
import FightStc = require('../fight/fight_struct');
import BossFight = require('../fight/boss_fight');
import AchievementDef = require('../achievement/defines');
import Loot = require('../loot/loot');
import Simulation = require('../fight/simulation');
import FriendGlobalMgr = require('../friend/friend_global_mgr');
import BossGlobalMgr = require('../boss/boss_global_mgr');
import HeroSuite = require('../hero/hero_suite');

//import Role = require('../role');
//import protodb = require('../../../share/db');

// config
var cm = require('../../../config').configMgr;

class SummonBossMgr {
    killBossList:number[] = [];
    bossID:number = 0;
    bossHp:number = 0;

    fightTeam:FightStc.FightTeam = new FightStc.FightTeam();
    hireFriends:{[friendId:number]:FriendStruct.FriendEntry} = {};

    // memory
    currentFight:BossFight = null;
    updateBossList:number[] = [];

    constructor() {
    }

    public getBossHp():number {
        if (this.bossID == 0) {
            return 0;
        }
        if (this.bossHp == 0) {
            return cm.monsterdb.get(this.bossID).hp;
        }
        return this.bossHp;
    }

    public addBoss(bossID:number):boolean {
        if (!cm.boss_summondb.boss_summonDBConfig[bossID]) {
            return false;
        }

        if (this.killBossList.indexOf(bossID) != -1) {
            return false;
        }

        this.killBossList.push(bossID);
        this.updateBossList.push(bossID);
        return true;
    }

    public summonBoss(bossID:number):void {
        //record summonboss
        this.bossID = bossID;
        this.bossHp = BossGlobalMgr.getBossLevelHp(bossID, 1);
    }

    public startFight(role):void {
        var monster = cm.monsterdb.get(this.bossID);

        FriendGlobalMgr.checkHireFriend(role, this.fightTeam.hires);
        this.currentFight = new BossFight();
        this.currentFight.initFight(this.bossID, 1, this.bossHp);
        FriendGlobalMgr.doHireForFight(role, this.fightTeam.hires, this.hireFriends);

        this.currentFight.startFight();
    }

    public finishFight(role, roundContext:Simulation.RoundContext, totalRound:number, result:number):void {
        if (!this.currentFight) {
            throw new CustomError.UserError(ERRC.FIGHT.FIGHT_NOT_EXIST, {
                msg: 'FIGHT.FIGHT_NOT_EXIST'
            });
        }

        var team = this.fightTeam, i, hero;
        var heroArray:Simulation.Player[] = [];
        for (i = 0; i < team.heros.length; i += 1) {
            hero = role.heros.getHero(team.heros[i]);
            if (!hero) {
                throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                    msg: 'HERO.UID_NOT_FOUND, uid=' + team.heros[i]
                });
            }
            heroArray.push(Fight.createPlayerByHero(role, hero, HeroSuite.SuiteType.boss));
        }

        var friend:FriendStruct.FriendEntry;
        for (i = 0; i < team.hires.length; ++i) {
            friend = this.hireFriends[team.hires[i]];
            if (!friend) {
                throw new CustomError.UserError(ERRC.HERO.UID_NOT_FOUND, {
                    msg: 'HERO.UID_NOT_FOUND, hireUid=' + team.hires[i]
                });
            }
            heroArray.push(Fight.createPlayerByFriendEntry(friend, HeroSuite.SuiteType.boss));
        }

        // monster
        var monster = cm.monsterdb.get(this.bossID);
        var monsterArray:Simulation.Player[] = [];
        var boss = Fight.createPlayerByMonster(monster);
        boss.playerType = FightDef.PlayerType.BOSS;
        boss.level = 1;
        monsterArray.push(boss);

        this.currentFight.finishFight(role.accountId, roundContext, heroArray, monsterArray, totalRound);
        this.currentFight.checkFightResult(result);
        this.fightTeam.hires = [];

        if (result === FightDef.RESULT.VICTORY) {
            this.bossID = 0;
            this.bossHp = 0;
            role.achievements.updateAchievement(role, AchievementDef.TYPE.KILL_MONSTER_N_COUNT, monster.monstertypeid, 1);
        } else {
            this.bossHp = this.currentFight.getSideHealth(FightDef.SIDE.LEFT)[0].currentHp;
        }

        role.achievements.updateAchievement(role, AchievementDef.TYPE.DAMAGE_ON_ONE_ENEMY, this.currentFight.getRightMaxDamage());
    }

    public getRandomSeed():string {
        return this.currentFight ? this.currentFight.getRandomSeed() : '';
    }

    public getOptionalLootArray():FightStc.OptionalLoot[] {
        return this.currentFight ? this.currentFight.optionalLootArray : [];
    }

    public getFightLoot():Loot {
        return this.currentFight ? this.currentFight.getFightLoot() : null;
    }

    public clearFightLoot() {
        if (this.currentFight) {
            this.currentFight.clearFightLoot();
        }
    }

    public isFighting():boolean {
        return this.currentFight && this.currentFight.isFighting();
    }

    public getHireHeroBattleData():any[] {
        var battleData:any[] = [];
        this.fightTeam.hires.forEach((accountId) => {
            var player:RoleStruct.FightPlayerNet = new RoleStruct.FightPlayerNet();
            var friend = this.hireFriends[accountId];
            player.loadFromFriendEntry(HeroSuite.SuiteType.dungeon, friend);
            battleData.push(player.buildNetMsg());
        });
        return battleData;
    }

    //select team
    public selectTeam(role, team:Universal.FightTeam):void {
        Fight.checkFightTeamLength(team, 2);
        FriendGlobalMgr.checkHireFriend(role, team.hires);
        this.fightTeam = team;
        FriendGlobalMgr.recordHireFriend(role, team.hires, this.hireFriends);
    }

    public sendUpdatePacket(role):void {
        role.sendPacket(this.buildUpdateNetMsg());
    }

    public buildInitNetMsg():any {
        var M = pb.get('.Api.summonboss.initInfo.Notify');
        return new M({
            bossList: this.killBossList,
            bossID: this.bossID,
            bossLeftHp: this.bossHp,
            team: this.fightTeam
        });
    }

    public buildUpdateNetMsg():any {
        if (this.updateBossList.length > 0) {
            var updateInfo = pb.get('.Api.summonboss.updateInfo.Notify');
            var pck = new updateInfo({
                newBossList: this.updateBossList
            });
            this.updateBossList = [];
            return pck;
        }
        return null;
    }

    public buildDBMsg():any {
        var summonBoss = pb.get('.DB.summonBoss');
        var pck = new summonBoss();
        pck.killBossList = this.killBossList;
        pck.bossID = this.bossID;
        pck.bossHp = this.bossHp;
        pck.fightTeam = this.fightTeam;
        return pck;
    }

    public loadDBMsg(msg:any) {
        ['killBossList', 'bossID', 'bossHp', 'fightTeam'].forEach((key) => {
            if (msg[key]) {
                this[key] = msg[key];
            }
        });
        this.hireFriends = {};
        msg.hireFriends.forEach((entry:FriendStruct.FriendEntry) => {
            this.hireFriends[entry.accountId] = entry;
        });
    }
}

export  = SummonBossMgr;
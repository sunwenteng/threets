import pb = require('node-protobuf-stream');

import Enum = require('../../util/enum');

import Role = require('../../handler/game/role');
import RoleStruct = require('../../handler/game/role/role_struct');
import HeroSuite = require('../../handler/game/hero/hero_suite');

import RobotStruct = require('./robot_struct');
import RobotDef = require('./defines');

class Robot {
    accountId:number = 0;
    level:number = 1;
    username:string = 'I\'m Robot~';
    equipAchievementTitle:number = 0;
    heroes:RobotStruct.Hero[] = [];

    robotType:RobotDef.ROBOT_TYPE = RobotDef.ROBOT_TYPE.NULL;

    public buildRole():any {
        var role = new Role();
        role.accountId = this.accountId;
        role.level = this.level;
        role.username = this.username;
        role.setSundryValue(Enum.SUNDRY.ACHIEVEMENT_TITLE, this.equipAchievementTitle);

        role.initNew();
        role.progress = Enum.ROLE_PROGRESS.INITIAL;
        this.heroes.forEach((hero) => {
            var tmp = role.heros.getHero(hero.uid);
            tmp.name = hero.name;
            tmp.level = hero.level;
            // TODO Break changes
        });
    }


    public pushNewHero(ID:number, name:string, level:number, armorID:number, armorLevel:number):void {
        var hero:RobotStruct.Hero = new RobotStruct.Hero();
        hero.uid = ID - 1;
        hero.ID = ID;
        hero.name = name;
        hero.level = level;
        hero.armorID = armorID;
        hero.armorLevel = armorLevel;
        this.heroes.push(hero);
    }

    public buildFightTeam():RoleStruct.FightTeam {
        var fightTeam:RoleStruct.FightTeam = new RoleStruct.FightTeam();
        fightTeam.loadFromRobot(this);
        return fightTeam;
    }

    public buildProfile():RoleStruct.Profile {
        var profile:RoleStruct.Profile = new RoleStruct.Profile();
        profile.loadFromRobot(this);
        return profile;
    }

    public buildCacheBasic():any {
        return {
            name: this.username,
            level: this.level,
            achievementId: this.equipAchievementTitle,
            lastLogin: 0,
            lastLogout: 0
        };
    }

    public buildCacheMainHero():any {
        var m = this;
        var hero = this.heroes[0];
        var cache:any = {};
        cache.avatar = {
            hairType: hero.hairType,
            hairColor: hero.hairColor,
            faceType: hero.faceType,
            skinColor: hero.skinColor
        };
        HeroSuite.SuiteList.forEach((key:any) => {
            var suite:any = {};
            suite.suite = {
                armor: {
                    uid: 1,
                    ID: hero.armorID,
                    level: hero.armorLevel,
                    exp: 0
                }
            };
            suite.attack = 0;
            suite.defence = 0;

            cache[key] = suite;
        });
        return cache;
    }
}

export = Robot;
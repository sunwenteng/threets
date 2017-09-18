import RobotStruct = require('./robot_struct');
import RoleStruct = require('../../handler/game/role/role_struct');
import RobotDef = require('./defines');

class Robot {
    accountId:number = 0;
    level:number = 1;
    username:string = 'I\'m Robot~';
    equipAchievementTitle:number = 0;
    heroes:RobotStruct.Hero[] = [];

    robotType:RobotDef.ROBOT_TYPE = RobotDef.ROBOT_TYPE.NULL;

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

    //public buildFightTeam():RoleStruct.FightTeam {
    //    var fightTeam:RoleStruct.FightTeam = new RoleStruct.FightTeam();
    //    fightTeam.loadFromRobot(this);
    //    return fightTeam;
    //}
    //
    //public buildProfile():RoleStruct.Profile {
    //    var profile:RoleStruct.Profile = new RoleStruct.Profile();
    //    profile.loadFromRobot(this);
    //    return profile;
    //}
}

export = Robot;
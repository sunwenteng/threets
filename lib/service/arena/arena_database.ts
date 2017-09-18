import async = require('async');

import Log = require('../../util/log');
import Database = require('../../database/database');

import ArenaCenterDef = require('./defines');

class BossDatabase extends Database {
    constructor() {
        super('mysql.world');
    }

    initTables(done):void {
        var tables:{[tableName:string]:string} = {
            "player_arena_history": "CREATE TABLE IF NOT EXISTS player_arena_history (" +
            "accountId		bigint(20)	unsigned 	NOT NULL," +
            "tournamentId		INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "score		    INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "rank		    INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "PRIMARY KEY (accountId, tournamentId)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "player_arena_top_history": "CREATE TABLE IF NOT EXISTS player_arena_top_history (" +
            "accountId		bigint(20)	unsigned 	NOT NULL," +
            "tournamentId		INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "score		    INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "rank		    INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "username 		VARCHAR(64) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "level 			SMALLINT 	UNSIGNED	NOT NULL	DEFAULT '0'," +
            "hairType 	    INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            "hairColor 	    INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            "faceType 	    INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            "skinColor 	    INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            "cape 	        INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            "arenaArmorID       INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            "arenaArmorLevel    INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            "achievementId  INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            "PRIMARY KEY (accountId, tournamentId)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "robot": "CREATE TABLE IF NOT EXISTS robot (" +
            "accountId		bigint(20)	unsigned 	NOT NULL," +
            "username 		VARCHAR(64) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "level 			SMALLINT 	UNSIGNED	NOT NULL	DEFAULT '0'," +
            "hero1armorID       INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            "hero1armorLevel    INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            "hero2armorID       INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            "hero2armorLevel    INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            "hero3armorID       INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            "hero3armorLevel    INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            "achievementId  INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            "updateTime     INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            "PRIMARY KEY (accountId)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "tournament_log": "CREATE TABLE IF NOT EXISTS tournament_log (" +
            "tournamentId		bigint(20)	unsigned 	NOT NULL," +
            "startTime		    INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "endTime		    INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "progress          	INT 	UNSIGNED	NOT NULL	DEFAULT '1'," + // 1 进行中  2 未结算 3 已经结算
            "PRIMARY KEY (tournamentId)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",


            // add new here
        };

        var columns = [
            // one table can't have more than 10 blob field
            // add new update column here
        ];
        var indexes = [
            // player_arena_history
            ['index_player_arena_history_rank', 'player_arena_history', ['rank']],

            // robot
            ['index_robot_updateTime', 'robot', ['updateTime']]
        ];

        this.initTCI(tables, columns, indexes, done);
    }

    public getLatestLog(callback:(err, arenaTournament:ArenaCenterDef.ArenaTournament)=>void):void {
        var sql = "select * from tournament_log order by tournamentId desc limit 1";
        this.conn.execute(sql, [], (err, connection, result) => {
            if (err) return callback(err, null);
            if (result.length === 0) return callback(null, null);
            var arenaTournament = new ArenaCenterDef.ArenaTournament();
            arenaTournament.tournamentId = result[0].tournamentId;
            arenaTournament.startTime = result[0].startTime;
            arenaTournament.endTime = result[0].endTime;
            arenaTournament.progress = result[0].progress;
            callback(null, arenaTournament);
        });
    }

    public insertOrUpdateLog(arenaTournament:ArenaCenterDef.ArenaTournament, callback:(err, result)=>void):void {
        var content = {
            tournamentId: arenaTournament.tournamentId,
            startTime: arenaTournament.startTime,
            endTime: arenaTournament.endTime,
            progress: arenaTournament.progress
        };
        var sql = "insert into tournament_log set ? on duplicate key update ?";
        this.conn.execute(sql, [content, content], (err, connection, result) => {
            callback(err, result);
        });
    }

    insertOrUpdateRobot(robot:any, callback:(err)=>void):void {
        var sql = "insert into robot set ? on duplicate key update ?";
        this.conn.execute(sql, [robot, robot], (err, connection, result) => {
            callback(err);
        });
    }

    fecthRobot(robotId:number, callback:(err, result)=>void) {
        var sql = "select * from robot where accountId = ?";
        this.conn.execute(sql, [robotId], (err, connection, result) => {
            callback(err, result.length ? result[0] : null);
        });
    }

    fetchRobotRange(left:number, right:number, callback:(err, result:any[])=>void):void {
        var sql = "select * from robot where accountId between ? and ?";
        this.conn.execute(sql, [left, right], (err, connection, result) => {
            callback(err, result);
        });
    }

    fetchRobotByUpdateTime(updateTime:number, callback:(err, result:any[])=>void):void {
        var sql = "select * from robot where updateTime > ?";
        this.conn.execute(sql, [updateTime], (err, connection, result) => {
            callback(err, result);
        });
    }

    fetchTournamentHistoryRank(accountId:number, tournamentId:number, cb:(err, result) => void):void {
        var sql = "select rank from player_arena_history where accountId = ? and tournamentId = ?";
        this.conn.execute(sql, [accountId, tournamentId], (err, connection, result) => {
            cb(err, result ? (result.length > 0 ? result[0].rank : 0) : 0);
        });
    }

    fetchTournamentHistoryRangeByRank(tournamentId:number,
                                      start:number,
                                      stop:number,
                                      cb:(err, result:any[])=>void):void {
        var sql = "select accountId from player_arena_history where tournamentId = ? and rank between ? and ?";
        this.conn.execute(sql, [tournamentId, start, stop], (err, connection, result) => {
            cb(err, result);
        });
    }

}

export = BossDatabase;
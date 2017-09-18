import async = require('async');

import Log = require('../../util/log');
import Database = require('../../database/database');

import BossDef = require('./defines');

class BossDatabase extends Database {
    constructor() {
        super('mysql.world');
    }

    initTables(done):void {
        var tables:{[tableName:string]:string} = {
            "boss_log": "CREATE TABLE IF NOT EXISTS boss_log (" +
            "bossID		        bigint(20)	unsigned 	NOT NULL," +
            "startTime		    INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "endTime		    INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "progress          	INT 	UNSIGNED	NOT NULL	DEFAULT '1'," + // 1 进行中  2 未结算 3 已经结算
            "PRIMARY KEY (bossID)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "player_boss_history": "CREATE TABLE IF NOT EXISTS player_boss_history (" +
            "accountId		bigint(20)	unsigned 	NOT NULL," +
            "bossID         INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "score		    INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "rank		    INT	UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "PRIMARY KEY (accountId, bossID)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            // add new here
        };

        var columns = [
            // one table can't have more than 10 blob field
            // add new update column here
        ];
        var indexes = [];

        this.initTCI(tables, columns, indexes, done);
    }

    getLatestLog(callback:(err, worldBoss:BossDef.WorldBoss)=>void):void {
        var sql = "select * from boss_log order by bossID desc limit 1";
        this.conn.execute(sql, [], (err, connection, result) => {
            if (err) return callback(err, null);
            if (result.length === 0) return callback(null, null);
            var worldBoss = new BossDef.WorldBoss();
            worldBoss.bossID = result[0].bossID;
            worldBoss.startTime = result[0].startTime;
            worldBoss.endTime = result[0].endTime;
            worldBoss.progress = result[0].progress;
            callback(null, worldBoss);
        });
    }

    insertOrUpdateLog(worldBoss:BossDef.WorldBoss, callback:(err, result)=>void):void {
        var content = {
            bossID   : worldBoss.bossID,
            startTime: worldBoss.startTime,
            endTime  : worldBoss.endTime,
            progress : worldBoss.progress
        };
        var sql = "insert into boss_log set ? on duplicate key update ?";
        this.conn.execute(sql, [content, content], (err, connection, result) => {
            callback(err, result);
        });
    }

    insertBossRankHistory(values:number[][], cb:(err) => void):void {
        // accountId, bossID, score, rank
        // check reference if change order
        if (values.length === 0) {
            cb(null);
            return;
        }

        var sql = 'insert into player_boss_history(accountId, bossID, score, rank) values ?';
        this.conn.execute(sql, [values], (err, connection, result) => {
            cb(err);
        });
    }

    fetchMaxBossRank(bossID:number, cb:(err, rank:number)=>void):void {
        var sql = 'select max(rank) as maxRank from player_boss_history where bossID = ?';
        this.conn.execute(sql, [bossID], (err, connection, result:{maxRank:number}[]) => {
            cb(err, result ? (result[0].maxRank ? result[0].maxRank : 0 ) : 0);
        });
    }

    fetchBossHistoryRank(accountId:number, bossID:number, cb:(err, result) => void):void {
        var sql = "select rank from player_boss_history where accountId = ? and bossID = ?";
        this.conn.execute(sql, [accountId, bossID], (err, connection, result) => {
            cb(err, result ? (result.length > 0 ? result[0].rank : 0) : 0);
        });
    }
}

export = BossDatabase;
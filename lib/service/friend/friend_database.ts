import async = require('async');
import Log = require('../../util/log');
import Database = require('../../database/database');


interface Friendship {
    friendId:number;
    updateTime:number;
    status:number;
    username:string;
}

interface CenterPlayerInfo {
    accountId:number;
    username:string;
    level:number;
    hairType:number;      // 发型
    hairColor:number;     // 发色
    faceType:number;      // 脸型
    skinColor:number;     // 肤色
    cape:number;

    dungeonArmorID:number;
    dungeonArmorLevel:number;
    arenaArmorID:number;
    arenaArmorLevel:number;
    bossArmorID:number;
    bossArmorLevel:number;

    achievementId:number;
}

class FriendDatabase extends Database {
    constructor() {
        super('mysql.world');
    }

    public initTables(done):void {
        var tables:{[tableName:string]:string} = {
            // "center_player_info": "CREATE TABLE IF NOT EXISTS center_player_info (" +
            // "accountId 	    BIGINT(20) 	UNSIGNED 	NOT NULL," +
            // "username 		VARCHAR(64) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            // "level 			SMALLINT 	UNSIGNED	NOT NULL	DEFAULT '0'," +
            // "hairType 	    INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            // "hairColor 	    INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            // "faceType 	    INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            // "skinColor 	    INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            // "cape 	        INT 	    UNSIGNED	NOT NULL	DEFAULT '0'," +
            // "dungeonArmorID     INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            // "dungeonArmorLevel  INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            // "bossArmorID        INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            // "bossArmorLevel     INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            // "arenaArmorID       INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            // "arenaArmorLevel    INT     UNSIGNED    NOT NULL    DEFAULT '0'," +
            // "achievementId  SMALLINT 	UNSIGNED	NOT NULL	DEFAULT '0'," +
            // "PRIMARY KEY (accountId)" +
            // ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "friendship": "CREATE TABLE IF NOT EXISTS friendship (" +
            "auto_id        bigint(20)  unsigned NOT NULL AUTO_INCREMENT," +
            "accountId      bigint(20)  unsigned NOT NULL DEFAULT '0'," +
            "friendId       bigint(20)  unsigned NOT NULL DEFAULT '0'," +
            "updateTime      int(10)     unsigned NOT NULL DEFAULT '0'," +
            "status         smallint(8) unsigned NOT NULL DEFAULT '0'," +
            "PRIMARY KEY (auto_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            // add new here
        };

        var columns = [
            // one table can't have more than 10 blob field
            // add new update column here
        ];
        var indexes = [
            // friendship
            ['index_friendship_accountId', 'friendship', ['accountId']],
            ['index_friendship_accountId_status', 'friendship', ['accountId', 'status']],
            ['index_friendship_accountId_friendId', 'friendship', ['accountId', 'friendId']],
        ];

        async.waterfall([
                (next) => {
                    this.conn.createTables(tables, (err, info) => {
                        if (err) {
                            Log.sError('Mysql', 'check ' + info + ' failed');
                        }
                        next(err);
                    });
                },
                (next) => {
                    this.conn.addColumns(columns, (err, info) => {
                        if (err) {
                            Log.sError('Mysql', 'check ' + info + ' failed');
                        }
                        next(err);
                    });
                },
                (next) => {
                    this.conn.addIndexes(indexes, (err, info) => {
                        if (err) {
                            Log.sError('Mysql', 'check ' + info + ' failed');
                        }
                        next(err);
                    });
                }

            ], (err) => {
                if (err) {
                    done(err);
                    return;
                }
                Log.sInfo('Mysql', 'checked all tables, columns, indexes');
                done(null);
            }
        );

    }

    fetchFriendship(accountId:number, cb:(err, result:Friendship[]) => void):void {
        var sql = "select friendId, updateTime, status " +
            "from friendship " +
            "where accountId = " + accountId;
        this.conn.execute(sql, null, (err, connection, result) => {
            cb(err, result);
        });
    }

    // fetchRoleFriendInfo(accountIdList:number[], cb:(err, result:CenterPlayerInfo[]) => void):void {
    //     if (accountIdList.length === 0) {
    //         cb(null, []);
    //         return;
    //     }
    //     var sql = "select accountId, username, level, hairType, hairColor, faceType, skinColor, cape, achievementId," +
    //         "dungeonArmorID, dungeonArmorLevel, arenaArmorID, arenaArmorLevel, bossArmorID, bossArmorLevel" +
    //         " from center_player_info where accountId in (";
    //     accountIdList.forEach((accountId, index) => {
    //         if (index === accountIdList.length - 1) {
    //             sql += accountId;
    //         } else {
    //             sql += accountId + ',';
    //         }
    //     });
    //     sql += ')';
    //     console.log(sql);
    //
    //     var result:any[] = [];
    //     accountIdList.forEach((id) => {
    //         result.push({
    //             accountId: id,
    //             username: 'xx' + id,
    //             level: 1,
    //             hairType: 1,
    //             hairColor: 1,
    //             faceType: 1,
    //             skinColor: 1,
    //             cape: 0,
    //             achievementId: 0,
    //             dungeonArmorID: 1001,
    //             dungeonArmorLevel: 4,
    //             arenaArmorID: 1002,
    //             arenaArmorLevel: 3,
    //             bossArmorID: 1003,
    //             bossArmorLevel:  5
    //         });
    //     });
    //
    //     cb(null, result);
    //
    //     //this.conn.execute(sql, [], (err, connection, result) => {
    //     //    cb(err, result);
    //     //});
    // }

    // fetchPlayerROInfo(accountIdList:string[], cb:(err, result:CenterPlayerInfo[]) => void):void {
    //     if (accountIdList.length === 0) {
    //         cb(null, []);
    //         return;
    //     }
    //     var sql = "select accountId, username, level, hairType, hairColor, faceType, skinColor, cape, achievementId," +
    //         "dungeonArmorID, dungeonArmorLevel, arenaArmorID, arenaArmorLevel, bossArmorID, bossArmorLevel" +
    //         " from center_player_info where accountId in (";
    //     accountIdList.forEach((accountId, index) => {
    //         if (index === accountIdList.length - 1) {
    //             sql += accountId;
    //         } else {
    //             sql += accountId + ',';
    //         }
    //     });
    //     sql += ')';
    //     console.log(sql);
    //
    //     this.conn.execute(sql, [], (err, connection, result) => {
    //         cb(err, result);
    //     });
    // }

    insertFriendEntry(accountId:number, friendId:number, updateTime:number, status:number, cb:(err)=>void):void {
        var sql = "insert into friendship set ?";
        this.conn.execute(sql, {
            accountId : accountId,
            friendId  : friendId,
            updateTime: updateTime,
            status    : status
        }, (err, connection, result) => {
            cb(err);
        });
    }

    updateFriendEntry(accountId:number,
                      friendId:number,
                      updateTime:number,
                      status:number,
                      cb:(err) => void):void {
        var sql = "update friendship set ? where accountId=? and friendId=?";
        this.conn.execute(sql, [{updateTime: updateTime, status: status}, accountId, friendId], (err, connection, result) => {
            cb(err);
        });
    }

    deleteFriendEntry(accountId:number, friendId:number, cb:(err) => void):void {
        var sql = "delete from friendship where accountId=? and friendId=?";
        this.conn.execute(sql, [accountId, friendId], (err, connection, result) => {
            cb(err);
        });
    }
}

export = FriendDatabase;
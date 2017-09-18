import async = require('async');
import util = require('util');
import mysql = require('mysql');
import pb = require('node-protobuf-stream');

import Database = require('../../database/database');
import DatabaseManager = require('../../database/database_manager');
import Log = require('../../util/log');
import Enum = require('../../util/enum');
import Time = require('../../util/time');
import CustomError = require('../../util/errors');
import ERRC = require('../../util/error_code');
import Role = require('./role');

//import BlobTransform = require('./blob_transform');
//import Activity = require('../api/activity/activity');

class GameDatabase extends Database {
    tableList = [];
    tableInfos = {};

    constructor() {
        super('mysql.world');
    }

    public initTables(done):void {
        var tables:{[tableName:string]:string} = {
            "role_info": "CREATE TABLE IF NOT EXISTS role_info (" +
            "accountId 	    BIGINT(20) 	UNSIGNED 	NOT NULL," +
            "account 		VARCHAR(64) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "username 		VARCHAR(64) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            //"playerIcon 	SMALLINT 	UNSIGNED	NOT NULL	DEFAULT '0'," +
            "level 			INT		 	UNSIGNED	NOT NULL	DEFAULT '0'," +
            "exp		 	INT 		UNSIGNED	NOT NULL	DEFAULT '0'," +
            "gold 			INT 		UNSIGNED	NOT NULL	DEFAULT '0'," +
            "diamond 		INT 		UNSIGNED	NOT NULL	DEFAULT '0'," +
            "diamondCharge  INT 		UNSIGNED	NOT NULL	DEFAULT '0'," +
            "bossEnergy		INT 		UNSIGNED	NOT NULL	DEFAULT '0'," +
            "arenaEnergy 	INT 		UNSIGNED	NOT NULL	DEFAULT '0'," +
            "loginTime		INT			UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "logoutTime	    INT			UNSIGNED	NOT NULL	DEFAULT	'0'," +
            "roleSt 		SMALLINT 	UNSIGNED	NOT NULL	DEFAULT '0'," +
            "deleteTime	    INT 		UNSIGNED 	NOT NULL 	DEFAULT '0'," +
            "createTime	    INT 		UNSIGNED 	NOT NULL 	DEFAULT '0'," +
            "progress   	INT 		UNSIGNED 	NOT NULL 	DEFAULT '0'," +
            "gmAuth        	INT 		UNSIGNED 	NOT NULL 	DEFAULT '0'," +
            "lastGmCmdTime 	INT 		UNSIGNED 	NOT NULL 	DEFAULT '0'," +
            "PRIMARY KEY (accountId)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "role_blob_1": "CREATE TABLE IF NOT EXISTS role_blob_1 (" +
            "accountId		bigint(20)	unsigned 	NOT NULL," +
            "signIn	        blob 		NULL," +
            "heros          blob        NULL," +
            "equips         blob        NULL," +
            "builds         blob        NULL," +
            "resource       blob        NULL," +
            "dungeons       blob        NULL," +
            "chanceCounter  blob        NULL," +
            "summonBoss     blob        NULL," +
            "quests         blob        NULL," +
            "PRIMARY KEY (accountId)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "role_blob_2": "CREATE TABLE IF NOT EXISTS role_blob_2 (" +
            "accountId		bigint(20)	unsigned 	NOT NULL," +
            "achievements   blob 		NULL," +
            "arena          blob 		NULL," +
            "friends        blob 		NULL," +
            "time_control   blob 		NULL," +
            "boss           blob 		NULL," +
            "mails          blob 		NULL," +
            "activities     blob 		NULL," +
            "chats          blob 		NULL," +
            "trials         blob 		NULL," +
            "PRIMARY KEY (accountId)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "activities": "CREATE TABLE IF NOT EXISTS activities (" +
            "activityId		INT(10)	    UNSIGNED 	NOT NULL," +
            "activityType   INT		 	UNSIGNED	NOT NULL	DEFAULT '0'," +
            "startTime      INT		 	UNSIGNED	NOT NULL	DEFAULT '0'," +
            "endTime        INT		 	UNSIGNED	NOT NULL	DEFAULT '0'," +
            "params         VARCHAR(2048) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "PRIMARY KEY (activityId)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;"

            // add new here
        };
        var columns = [
            // one table can't have more than 10 blob field
            // add new update column here
        ];
        var indexes = [];

        this.tableList = [];
        this.tableInfos = {};
        for (var table in tables) {
            if (tables.hasOwnProperty(table)) {
                this.tableList.push(table);
                this.tableInfos[table] = {};
            }
        }

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
                },
                (next) => {
                    this.fetchAllColumns((err) => {
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

        Time.allTimer.push(setInterval(() => {
            this.conn.execute('select 1', null, () => {
                Log.sInfo('Mysql', 'keep mysql alive');
            });
        }, 1000 * 3600));
    }

    public fetchAllColumns(callback:(err) => void):void {
        async.eachSeries(this.tableList, (table, next) => {
            this.conn.fetchTableColumns(table, (err, columns) => {
                if (err) {
                    next(err);
                    return;
                }
                this.tableInfos[table] = columns;
                next(null);
            });
        }, (err) => {
            if (err) {
                Log.sError('Mysql', 'fetch all columns failed.');
            }
            callback(err);
        });
    }
    //
    //fetchAllColumns(callback:(err) => void):void {
    //    async.eachSeries(this.tableList, (table, next) => {
    //        this.conn.fetchTableColumns(table, (err, columns) => {
    //            if (err) {
    //                next(err);
    //                return;
    //            }
    //            this.tableInfos[table] = columns;
    //            next(null);
    //        });
    //    }, (err) => {
    //        if (err) {
    //            Log.sError('Mysql', 'fetch all columns failed.');
    //        }
    //        callback(err);
    //    });
    //}
    //
    insertRoleInfo(accountId:number,
                   account:string,
                   username:string,
                   serverId:number,
                   createTime:number, callback:(err) => void):void {
        var sql   = "insert into role_info set ?",
            param = {
                accountId     : accountId,
                account       : account,
                username      : username,
                //serverIdOrigin: serverId,
                createTime    : createTime
            };
        this.conn.execute(sql, param, (err) => {
            if (err) {
                Log.sError('Mysql', 'Insert Role Info failed');
            }
            callback(err);
        });
    }

    updateRoleInfo(connection:mysql.IConnection, role:Role, callback:(err) => void):void {
        var sql = "update role_info set ? where accountId = ?", tableName = "role_info", exclude = ['accountId', 'account'], value = {}, uid = role.accountId || 0;
        for (var col in this.tableInfos[tableName]) {
            if (this.tableInfos[tableName].hasOwnProperty(col)) {
                if (exclude.indexOf(col) === -1) {
                    if (role.hasOwnProperty(col)) {
                        value[col] = role[col];
                    }
                }
            }
        }
        connection.query(sql, [value, uid], (err) => {
            if (err) {
                Log.sError('Mysql', 'Update Role Info failed: ' + err.stack);
            }
            callback(err);
        });
    }

    fetchRoleInfo(id:number, callback:(err, result?) => void):void {
        var sql = "select * from role_info where accountId = ?";
        this.conn.execute(sql, [id], (err, connection, result) => {
                if (err) {
                    callback(err);
                    return;
                }
                if (result.length === 0) {
                    callback(new CustomError.UserError(ERRC.COMMON.ROLE_NOT_FOUND, {msg: "COMMON.ROLE_NOT_FOUND"}));
                    return;
                }
                if (result.length > 1) {
                    callback(new CustomError.UserError(ERRC.COMMON.DUPLICATE_ROLEID, {msg: "COMMON.DUPLICATE_ROLEID"}));
                    return;
                }
                callback(null, result[0]);
            }
        )
        ;
    }

    createRoleInfo(accountId:number, account:string, username:string, serverId:number, callback:(err, roleInfo:any) => void):void {
        async.waterfall([
            (next) => {
                this.getDBTime((err, dbTime) => {
                    next(err, dbTime);
                });
            },
            (dbTime, next) => {
                this.insertRoleInfo(accountId, account, username, serverId, dbTime, next);
            }
        ], (err, roleInfo) => {
            if (err) {
                callback(err, null);
                Log.sError('Mysql', 'create role info failed');
                return;
            }
            callback(null, roleInfo);
        });
    }

    createNewRole(accountId:number, account:string, username:string, serverId:number, callback:(err) => void):void {
        this.createRoleInfo(accountId, account, username, serverId, (err) => {
            if (err) {
                callback(err);
                return;
            }
            var tables = ['role_blob_1', 'role_blob_2']; // add new player_blob_ table here
            async.eachSeries(tables, (table, next) => {
                this.insertNewRoleExtTable(table, accountId, (err) => {
                    next(err);
                });
            }, (err) => {
                DatabaseManager.Login.insertRoleInfo(accountId, username, callback);
            });
        });
    }

    //getAccountIdByAccount(account:string, callback:(err, accountId:number) => void):void {
    //    var sql = 'select accountId from role_info where ?';
    //    this.conn.execute(sql, {account: account}, (err, connection, result)
    //            => {
    //            if (err) {
    //                callback(err, 0);
    //                return;
    //            }
    //            if (result.length === 0) {
    //                sql = 'select max(accountId) as maxId from role_info';
    //                this.conn.execute(sql, null, (err, connection, result)
    //                        => {
    //                        if (err) {
    //                            callback(err, 0);
    //                            return;
    //                        }
    //                        callback(null, result[0].maxId ? result[0].maxId + 1 : 1);
    //                    }
    //                )
    //                ;
    //            }
    //            else {
    //                callback(null, result[0].accountId);
    //            }
    //        }
    //    )
    //    ;
    //}

    existRole(accountId:number, callback:(err, exist:boolean) => void):void {
        var sql = 'select accountId from role_info where ?';
        this.conn.execute(sql, {accountId: accountId}, (err, connection, result) => {
                if (err) {
                    callback(err, false);
                    return;
                }
                callback(null, result.length > 0);
            }
        );
    }

    insertNewRoleExtTable(table:string, accountId:number, callback:(err) => void):void {
        var sql = 'insert into ??(accountId) values(?)';
        this.conn.execute(sql, [table, accountId], (err) => {
            callback(err);
        });
    }

    fetchRoleBlobTable(table:string, accountId:number, callback:(err, result?) => void):void {
        var id = accountId;
        var sql = 'select * from ?? where accountId=?';
        this.conn.execute(sql, [table, id], (err, connection, result) => {
                if (err) {
                    return callback(err);
                }
                if (result.length === 0) {
                    return callback(null);
                }
                if (result.length > 1) {
                    callback(new CustomError.UserError(ERRC.COMMON.DUPLICATE_ROLEID, {
                        msg: "COMMON.DUPLICATE_ROLEID"
                    }));
                    return;
                }

                callback(null, result[0]);
            }
        )
        ;
    }

    //fetchEffectActivities(now:number, callback:(err, result)=>void):void {
    //    var sql = "select activityId, activityType, startTime, endTime, params from activities where endTime > ?";
    //    this.conn.execute(sql, [now], (err, connection, result)
    //            => {
    //            callback(err, result);
    //        }
    //    )
    //    ;
    //}
    //
    //insertOrUpdateActivity(content:Activity.ActivityDBData, callback:(err, result)=>void):void {
    //    var sql = "insert into activities set ? on duplicate key update ?";
    //    this.conn.execute(sql, [content, content], (err, connection, result)
    //            => {
    //            callback(err, result);
    //        }
    //    )
    //    ;
    //}
    //
    //deleteActivity(activityId:number, callback:(err, result)=>void):void {
    //    var sql = "delete from activities where activityId = ?";
    //    this.conn.execute(sql, [activityId], (err, connection, result)
    //            => {
    //            callback(err, result);
    //        }
    //    )
    //    ;
    //}
    //
    updateRoleBlobTable(connection:mysql.IConnection, table:string, role:Role, callback:(err) => void):void {
        var sql             = 'insert into ' + table + ' set ? on duplicate key update ?',
            value = {}, uid = role.accountId || 0;
        Object.keys(this.tableInfos[table]).forEach((col) => {
            if (col === 'accountId') {
                value[col] = uid;
            } else {
                switch (col) {
                    case 'resource':
                    {
                        value[col] = role.buildDBMsg().encode().toBuffer();
                        break;
                    }
                    default:
                    {
                        if (role.hasOwnProperty(col)) {
                            //value[col] = BlobTransform.serialize(col, role[col]);
                        }
                        break;
                    }
                }
            }
        });
        connection.query(sql, [value, value], (err) => {
            if (err) {
                Log.sError('Mysql', 'Update Role Blob Table failed' + err.stack);
            }
            callback(err);
        });
    }

    //shutDownDB(callback:(err) => void):void {
    //    this.conn.closeDb((err) => {
    //        callback(err);
    //    });
    //}
    updateRoleTable(connection, tableName, data, accountId, callback) {
        var sql = "update ?? set ? where accountId = ?",
            value = {};

        Object.keys(this.tableInfos[tableName]).forEach((col) => {
            var column = this.tableInfos[tableName][col];

            if (!data[column.field])
                return ;

            if (['account', 'accountId'].indexOf(column.field) !== -1)
                return;

            if (/(small|big)?int\(\d+\)( unsigned)?/.test(column.type)) {
                var tmp = parseInt(data[column.field]);
                if (isNaN(tmp)) {
                    value[column.field] = parseInt(column.defaultVal);
                } else {
                    value[column.field] = tmp;
                }
            } else if (/blob/.test(column.type)) {
                value[column.field] = data[column.field];
            } else {
                value[column.field] = data[column.field].toString();
            }
        });

        if (!Object.keys(value).length) return callback();

        connection.query(sql, [tableName, value, accountId], (err) => {
            if (err) {
                Log.sError('Mysql', 'Update Role Info failed: ' + err.stack);
            }
            callback(err);
        });
    }

    saveRoleData(accountId, data, callback) {
        this.conn._pool.getConnection((err, connection) => {
            if (err) {
                Log.uError(accountId, 'RoleSaveAll', 'getConnection Error: ' + err.message);
                callback(err);
                return;
            }

            Log.uDebug(accountId, 'RoleSaveAll', 'connection.beginTransaction');
            connection.beginTransaction((err) => {
                if (err) {
                    Log.uError(accountId, 'RoleSaveAll', 'beginTransaction Error: ' + err.message);
                    connection.release();
                    callback(err);
                    return;
                }
                Log.uDebug(accountId, 'RoleSaveAll', 'begin transaction');
                async.series([
                        (cb:(err) => void) => {
                            var tables = ['role_info', 'role_blob_1', 'role_blob_2'];    // EXTENSION player_blob
                            async.eachSeries(tables, (table, next) => {
                                this.updateRoleTable(connection, table, data, accountId, next);
                            }, (err) => {
                                cb(err);
                            });
                        }
                    ],
                    (err:any) => {
                        if (err) {
                            Log.uError(accountId, 'RoleSaveAll', 'transaction error and rollback, Error: ' + err.message);
                            var errToCb = err;
                            connection.rollback(() => {
                                if (err) {
                                    Log.uError(accountId, 'RoleSaveAll', 'rollback Error: ' + err.message);
                                }
                                Log.uWarn(accountId, 'RoleSaveAll', 'connection.rollback success');
                                connection.release();
                                callback(errToCb);
                            });
                        }
                        else {
                            Log.uInfo(accountId, 'RoleSaveAll', 'transaction success');
                            connection.commit((err) => {
                                if (err) {
                                    Log.uError(accountId, 'RoleSaveAll', 'connection.commit Error: ' + err.message);
                                }
                                Log.uInfo(accountId, 'RoleSaveAll', 'connection.commit success');
                                connection.release();
                                callback(err);
                            });
                        }
                    }
                );
            });
        });
    }
}

export = GameDatabase;
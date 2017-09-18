import async = require('async');
import Database = require('../../database/database');
import Log = require('../../util/log');
import Enum = require('../../util/enum');
import Util = require('../../util/game_util');
import ErrorMsg     = require('../../util/error_msg');
import MysqlConnection = require('../../database/mysql_connection');

import Role = require('../game/role');
//import Universal = require('../api/universal');
//import GmStruct = require('../api/gm/gm_struct');
//import ConfigStc    = require('../../config/struct/config_struct');

interface Server {
    server_id:number;
    server_name:string;
    ip:string;
    local_ip:string;
    port:number;
    version:string;
    res_version:string;
    res_server_ip:string;
    res_server_config:string;
    online_num:number;
    can_login:boolean;
    status:number;
    alive:boolean;
    update_time:number;
    login_strategy_id:number;
    is_recommend:boolean;
}

interface LoginStrategyCondition {
    type:number;
    value:string;
}

enum LoginStrategyType {
    PLATFORM = 1,
    IP       = 2,
    AUTH     = 3,
    VERSION  = 4,
    DEVICE   = 5
}

enum NoticeConditionType {
    DEFAULT   = 0,
    PLATFORM  = 1,
    SERVER_ID = 2
}

enum NoticeUseType {
    LOGIN                   = 1,
    GAME                    = 2,
    CUSTOME_SERVICE         = 3,
    WEIBO                   = 4,
    UPDATE_ADDR             = 5,
    PLATFORM_CLIENT_VERSION = 8,
    LOGIN_ROLL              = 9,
    LOGIN_PICTURE           = 10,
    WEIXINMA                = 11,
    CAN_UPDATE              = 13,            // 是否开启更新
    FORBID_FUNCTION         = 14,       // 禁用功能列表
}

// notice_info_v2 这张表里有乱七八糟各种信息，都是key-value，用来存储各种杂乱信息
interface LoginNoticeInfo {
    auto_id:number;
    use_type:number;
    condition_type:number;
    condition_value:number;
    content:string;
    start_time:number;
    end_time:string;
}

class LoginDatabase extends Database {
    constructor() {
        super('mysql.login');
    }

    initTables(done):void {
        var tables:{[tableName:string]:string} = {
            "gameserver_info": "CREATE TABLE IF NOT EXISTS gameserver_info (" +
            "server_id		SMALLINT	UNSIGNED	NOT NULL," +
            "server_name	VARCHAR(32)	CHARACTER SET utf8 NOT NULL," +
            "ip				VARCHAR(64)	CHARACTER SET utf8 NOT NULL," +
            "local_ip		VARCHAR(64)	CHARACTER SET utf8 NOT NULL," +
            "port			SMALLINT	UNSIGNED	NOT NULL," +
            "version		VARCHAR(20)	CHARACTER SET utf8 NOT NULL," +
            "res_version	VARCHAR(20)	CHARACTER SET utf8 NOT NULL," +
            "res_server_ip	VARCHAR(64) CHARACTER SET utf8 NOT NULL," +
            "res_server_config	VARCHAR(64) CHARACTER SET utf8 NOT NULL," +
            "res_version_config	VARCHAR(64) CHARACTER SET utf8 NOT NULL," +
            "online_num		MEDIUMINT	UNSIGNED	NOT NULL," +
            "can_login		TINYINT		UNSIGNED	NOT NULL," +
            "status			TINYINT		UNSIGNED	NOT NULL," +
            "update_time	INT			UNSIGNED	NOT NULL," +
            "login_strategy_id	INT		    UNSIGNED	NOT NULL," +
            "is_recommend		TINYINT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY (server_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "player_info": "CREATE TABLE IF NOT EXISTS player_info (" +
            "role_id		INT			UNSIGNED	NOT NULL," +
            "name			VARCHAR(32)	CHARACTER SET utf8 NOT NULL," +
            "gm_auth		TINYINT		UNSIGNED	NOT NULL," +
            "status			TINYINT		UNSIGNED	NOT NULL," +
            "progress		INT			UNSIGNED	NOT NULL," +
            "level			INT			UNSIGNED	NOT NULL," +
            "gold			INT			UNSIGNED	NOT NULL," +
            "diamond		INT			UNSIGNED	NOT NULL," +
            "vip_level		INT			UNSIGNED	NOT NULL," +
            "vip_exp		INT			UNSIGNED	NOT NULL," +
            "diamond_paid	INT			UNSIGNED	NOT NULL," +
            "last_login_time	INT		UNSIGNED	NOT NULL," +
            "cur_stage  	INT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY (role_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "player_detail": "CREATE TABLE IF NOT EXISTS player_detail (" +
            "role_id		INT			UNSIGNED	NOT NULL," +
            "PRIMARY KEY (role_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "passport_info": "CREATE TABLE IF NOT EXISTS passport_info (" +
            "passport_id	BIGINT		UNSIGNED	NOT NULL AUTO_INCREMENT," +
            "passport		VARCHAR(64)	CHARACTER SET utf8 NOT NULL," +
            "pwd			VARCHAR(64) CHARACTER SET utf8 NOT NULL," +
            "mail			VARCHAR(64) CHARACTER SET utf8 NOT NULL," +
            "uid			VARCHAR(128) CHARACTER SET utf8 NOT NULL," +
            "token			VARCHAR(128) CHARACTER SET utf8 NOT NULL," +
            "platform		MEDIUMINT	UNSIGNED	NOT NULL," +
            "auth_type		TINYINT		UNSIGNED	NOT NULL," +
            "create_time	INT			UNSIGNED	NOT NULL," +
            "gm_auth		TINYINT		UNSIGNED	NOT NULL," +
            "reg_ip			VARCHAR(64) CHARACTER SET utf8 NOT NULL," +
            "reg_device		VARCHAR(32)	CHARACTER SET utf8 NOT NULL," +
            "reg_device_type VARCHAR(64) CHARACTER SET utf8 NOT NULL," +
            "last_login_time	INT		UNSIGNED	NOT NULL," +
            "last_login_server	SMALLINT	UNSIGNED	NOT NULL," +
            "status			TINYINT		UNSIGNED	NOT NULL," +
            "diamond_pay	INT			UNSIGNED	NOT NULL DEFAULT '0'," +
            "PRIMARY KEY (passport_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "login_strategy": "CREATE TABLE IF NOT EXISTS login_strategy (" +
            "auto_id		INT		UNSIGNED	NOT NULL	AUTO_INCREMENT," +
            "strategy_id	INT		UNSIGNED	NOT NULL," +
            "condition_id	TINYINT	UNSIGNED	NOT NULL," +
            "type			TINYINT	UNSIGNED	NOT NULL," +
            "value			VARCHAR(64) CHARACTER SET utf8 NOT NULL," +
            "PRIMARY KEY(auto_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "login_strategy_backup": "CREATE TABLE IF NOT EXISTS `login_strategy_backup` (" +
            "`idx` int(10) unsigned NOT NULL AUTO_INCREMENT," +
            "`auto_id` int(10) unsigned NOT NULL DEFAULT '0'," +
            "`strategy_id` int(10) unsigned NOT NULL," +
            "`condition_id` tinyint(3) unsigned NOT NULL," +
            "`type` tinyint(3) unsigned NOT NULL," +
            "`value` varchar(64) NOT NULL," +
            "`creator` varchar(32) DEFAULT NULL COMMENT '记录创建人'," +
            "`remark` varchar(100) DEFAULT NULL COMMENT '备注'," +
            "`backup_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '备份时间'," +
            "PRIMARY KEY (`idx`)" +
            ") ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8;",

            "re_passport_player": "CREATE TABLE IF NOT EXISTS re_passport_player (" +
            "role_id		INT			UNSIGNED	NOT NULL AUTO_INCREMENT," +
            "passport_id	BIGINT		UNSIGNED	NOT NULL," +
            "server_id		SMALLINT	UNSIGNED	NOT NULL," +
            "create_time	INT			UNSIGNED	NOT NULL," +
            "role_st		SMALLINT	UNSIGNED	NOT NULL DEFAULT '0'," +
            "PRIMARY KEY (role_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "role_login_info": "CREATE TABLE IF NOT EXISTS role_login_info (" +
            "auto_id		INT			UNSIGNED	NOT NULL AUTO_INCREMENT," +
            "role_id		INT			UNSIGNED	NOT NULL," +
            "login_time		INT			UNSIGNED	NOT NULL," +
            "logout_time	INT			UNSIGNED	NOT NULL," +
            "login_ip				VARCHAR(64) CHARACTER SET utf8 NOT NULL," +
            "login_device			VARCHAR(32)	CHARACTER SET utf8 NOT NULL," +
            "login_device_type		VARCHAR(64) CHARACTER SET utf8 NOT NULL," +
            "PRIMARY KEY (auto_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "goods_info": "CREATE TABLE IF NOT EXISTS goods_info (" +
            "server_id		SMALLINT	UNSIGNED	NOT NULL," +
            "goods_id			INT		UNSIGNED	NOT NULL," +
            "shop_type			INT		UNSIGNED	NOT NULL," +
            "buy_type_id		INT		UNSIGNED	NOT NULL," +
            "buy_content_id		INT		UNSIGNED	NOT NULL," +
            "buy_count			INT		UNSIGNED	NOT NULL," +
            "cost_type_id		INT		UNSIGNED	NOT NULL," +
            "cost_content_id	INT		UNSIGNED	NOT NULL," +
            "cost_count			INT		UNSIGNED	NOT NULL," +
            "cost_count_old		INT		UNSIGNED	NOT NULL," +
            "status			TINYINT		UNSIGNED	NOT NULL," +
            "limit_day			INT		UNSIGNED	NOT NULL," +
            "sort_idx			INT		UNSIGNED	NOT NULL," +
            "icon_id			INT		UNSIGNED	NOT NULL," +
            "goods_name			VARCHAR(64)	CHARACTER SET utf8 NOT NULL," +
            "description	VARCHAR(256) CHARACTER SET utf8 NOT NULL," +
            "limit_once			INT		UNSIGNED	NOT NULL," +
            "platform_type		TINYINT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY (server_id, goods_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "notice_info_v2": "CREATE TABLE IF NOT EXISTS notice_info_v2 (" +
            "auto_id			INT		UNSIGNED	NOT NULL AUTO_INCREMENT," +
            "use_type			TINYINT	UNSIGNED	NOT NULL," +
            "condition_type		TINYINT	UNSIGNED	NOT NULL," +
            "condition_value	INT		UNSIGNED	NOT NULL," +
            "content			VARCHAR(1024)	CHARACTER SET utf8 NOT NULL," +
            "start_time	INT		UNSIGNED	NOT NULL," +
            "end_time	INT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY (auto_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "active_info": "CREATE TABLE IF NOT EXISTS active_info (" +
            "auto_id		INT		UNSIGNED	NOT NULL AUTO_INCREMENT," +
            "server_id		INT		UNSIGNED	NOT NULL," +
            "type_id	TINYINT		UNSIGNED	NOT NULL," +
            "param		VARCHAR(256) CHARACTER SET utf8 NOT NULL," +
            "act_data		blob," +
            "gm_cmd_id		INT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY (auto_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "charge_info": "CREATE TABLE IF NOT EXISTS charge_info (" +
            "auto_id			INT		UNSIGNED	NOT NULL AUTO_INCREMENT," +
            "role_id			INT		UNSIGNED	NOT NULL," +
            "goods_id			INT		UNSIGNED	NOT NULL," +
            "goods_quantity		INT		UNSIGNED	NOT NULL," +
            "currency			VARCHAR(16) CHARACTER SET utf8 NOT NULL," +
            "value				INT		UNSIGNED	NOT NULL," +
            "virtual_value		INT		UNSIGNED	NOT NULL DEFAULT '0'," +
            "type				INT		UNSIGNED	NOT NULL," +
            "inner_order_id			VARCHAR(128) CHARACTER SET utf8 NOT NULL," +
            "platform			MEDIUMINT	UNSIGNED	NOT NULL," +
            "platform_order_id		VARCHAR(128) CHARACTER SET utf8 NOT NULL," +
            "platform_account_id	VARCHAR(128) CHARACTER SET utf8 NOT NULL," +
            "platform_payment_type	TINYINT	UNSIGNED	NOT NULL," +
            "state				TINYINT	UNSIGNED	NOT NULL," +
            "payment_time		INT	UNSIGNED	NOT NULL DEFAULT '0'," +
            "distribute_time	INT UNSIGNED 	NOT NULL DEFAULT '0'," +
            "payment_ip			VARCHAR(64) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "payment_device		VARCHAR(32) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "payment_device_type VARCHAR(64) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "payment_device_uid VARCHAR(128) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "client_order_id	VARCHAR(128) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "addition1			VARCHAR(128) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "addition2			VARCHAR(128) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "addition3			VARCHAR(128) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "addition4			VARCHAR(128) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "addition5			VARCHAR(128) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "PRIMARY KEY (auto_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "gain_info": "CREATE TABLE IF NOT EXISTS gain_info (" +
            "auto_id		INT 	UNSIGNED	NOT NULL AUTO_INCREMENT," +
            "role_id		INT		UNSIGNED	NOT NULL," +
            "source_type	INT		UNSIGNED	NOT NULL," +
            "source_id		INT		UNSIGNED	NOT NULL," +
            "value			INT		UNSIGNED	NOT NULL," +
            "time			INT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY(auto_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "purchase_info": "CREATE TABLE IF NOT EXISTS purchase_info (" +
            "auto_id		INT		UNSIGNED	NOT NULL AUTO_INCREMENT," +
            "role_id		INT		UNSIGNED	NOT NULL," +
            "goods_id		INT		UNSIGNED	NOT NULL," +
            "goods_quantity	INT		UNSIGNED	NOT NULL," +
            "value			INT		UNSIGNED	NOT NULL," +
            "time			INT		UNSIGNED	NOT NULL," +
            "diamond_paid_use			INT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY (auto_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "gm_cmd": "CREATE TABLE IF NOT EXISTS gm_cmd (" +
            "auto_id			INT		UNSIGNED	NOT NULL AUTO_INCREMENT," +
            "opr			VARCHAR(32)	CHARACTER SET utf8 NOT NULL," +
            "params			VARCHAR(8192) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "target_type	TINYINT		UNSIGNED	NOT NULL," +
            "target_id		BIGINT		UNSIGNED	NOT NULL," +
            "start_time			INT		UNSIGNED	NOT NULL DEFAULT '0'," +
            "end_time			INT		UNSIGNED	NOT NULL DEFAULT '0'," +
            "backup_value	VARCHAR(128) 	CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "status			TINYINT		UNSIGNED	NOT NULL DEFAULT '0'," +
            "error_msg		VARCHAR(256)	CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "create_time		INT		UNSIGNED	NOT NULL DEFAULT '0'," +
            "sortserial		INT		UNSIGNED	NOT NULL DEFAULT '0'," +
            "author			VARCHAR(32) CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "PRIMARY KEY (auto_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "active_stat": "CREATE TABLE IF NOT EXISTS active_stat (" +
            "auto_id			INT		UNSIGNED	NOT NULL AUTO_INCREMENT," +
            "active_id			INT		UNSIGNED	NOT NULL," +
            "active_type		INT		UNSIGNED	NOT NULL," +
            "role_id			INT		UNSIGNED	NOT NULL," +
            "reach_idx			INT		UNSIGNED	NOT NULL," +
            "reach_time			INT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY (auto_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "gift_box": "CREATE TABLE IF NOT EXISTS gift_box(" +
            "id			INT		UNSIGNED	NOT NULL," +
            "idx		INT		UNSIGNED	NOT NULL," +
            "role_id	INT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY(id, idx)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "invite_info": "CREATE TABLE IF NOT EXISTS invite_info(" +
            "role_id	INT		UNSIGNED	NOT NULL," +
            "level		INT		UNSIGNED	NOT NULL," +
            "inviter_id	INT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY(role_id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "gift_box_config": "CREATE TABLE IF NOT EXISTS gift_box_config(" +
            "id			INT		UNSIGNED	NOT NULL," +
            "param1		INT		UNSIGNED	NOT NULL," +
            "param2		INT		UNSIGNED	NOT NULL," +
            "param3		INT		UNSIGNED	NOT NULL," +
            "reward		VARCHAR(512) 	CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "server		VARCHAR(512) 	CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "dead_time	INT		UNSIGNED	NOT NULL," +
            "use_max	INT		UNSIGNED	NOT NULL," +
            "platform	VARCHAR(512) 	CHARACTER SET utf8 NOT NULL DEFAULT '0'," +
            "use_every	INT		UNSIGNED	NOT NULL DEFAULT '1'," +
            "PRIMARY KEY(id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "gift_box_config_backup": "CREATE TABLE IF NOT EXISTS gift_box_config_backup(" +
            "id			INT		UNSIGNED	NOT NULL," +
            "param1		INT		UNSIGNED	NOT NULL," +
            "param2		INT		UNSIGNED	NOT NULL," +
            "param3		INT		UNSIGNED	NOT NULL," +
            "reward		VARCHAR(512) 	CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "server		VARCHAR(512) 	CHARACTER SET utf8 NOT NULL DEFAULT ''," +
            "dead_time	INT		UNSIGNED	NOT NULL," +
            "use_max	INT		UNSIGNED	NOT NULL," +
            "platform	VARCHAR(512) 	CHARACTER SET utf8 NOT NULL DEFAULT '0'," +
            "backup_time	INT		UNSIGNED	NOT NULL" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "gift_box_backup": "CREATE TABLE IF NOT EXISTS gift_box_backup(" +
            "id			INT		UNSIGNED	NOT NULL," +
            "idx		INT		UNSIGNED	NOT NULL," +
            "role_id	INT		UNSIGNED	NOT NULL," +
            "backup_time	INT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY(id)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "gift_generate_record": "CREATE TABLE IF NOT EXISTS gift_generate_record(" +
            "id			INT		UNSIGNED	NOT NULL," +
            "idx		INT		UNSIGNED	NOT NULL," +
            "gen_start		INT		UNSIGNED	NOT NULL," +
            "gen_end		INT		UNSIGNED	NOT NULL," +
            "gen_use		VARCHAR(512)	NOT NULL," +
            "create_time		INT		UNSIGNED	NOT NULL," +
            "creator		VARCHAR(512)    NOT NULL," +
            "PRIMARY KEY(id, idx)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "gift_generate_record_backup": "CREATE TABLE IF NOT EXISTS gift_generate_record_backup(" +
            "id			INT		UNSIGNED	NOT NULL," +
            "idx		INT		UNSIGNED	NOT NULL," +
            "gen_start		INT		UNSIGNED	NOT NULL," +
            "gen_end		INT		UNSIGNED	NOT NULL," +
            "gen_use		VARCHAR(512)	NOT NULL," +
            "create_time		INT		UNSIGNED	NOT NULL," +
            "creator		VARCHAR(512)    NOT NULL," +
            "backup_time	INT		UNSIGNED	NOT NULL," +
            "PRIMARY KEY(id, idx)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;"

            // add new here
        };
        var columns = [
            // example: ['gameserver_info', 'test', 'smallint null']
            // add new update column here
            ['re_passport_player', 'server_id_origin', 'INT UNSIGNED NOT NULL'],
            ['player_info', 'cur_stage', 'INT UNSIGNED NOT NULL'],

            ['player_info', 'cur_train', 'INT UNSIGNED NOT NULL'],
            ['player_info', 'energy', 'INT UNSIGNED NOT NULL'],
            ['player_info', 'stamina', 'INT UNSIGNED NOT NULL'],
            ['player_info', 'quest', 'INT UNSIGNED NOT NULL'],

            ['charge_info', 'diamond_pay', 'int(10) unsigned NOT NULL DEFAULT 0'],

            ['gameserver_info', 'res_version_config', 'VARCHAR(64) CHARACTER SET utf8 NOT NULL'],

            ['gift_box_config', "use_every", "INT UNSIGNED NOT NULL DEFAULT '1'"],
            ['login_strategy', 'is_not', "TINYINT UNSIGNED NOT NULL DEFAULT '0'"],
            ['login_strategy_backup', 'is_not', "TINYINT UNSIGNED NOT NULL DEFAULT '0'"]
        ];
        var indexes = [
            ['idx_p_p_a', 'passport_info', ['passport', 'platform', 'auth_type']],
            ['index_passport', 'passport_info', ['passport']],
            ['index_status', 'gm_cmd', ['status']]
            //['inner_order_id', 'charge_info', ['auto_id']] // sql statement: alter table `charge_info` add unique(`inner_order_id`)
        ];

        async.waterfall([
                (next) => {
                    this.conn.createTables(tables, (err, info) => {
                        if (err) {
                            Log.sError('Mysql', 'check ' + info + 'failed');
                        }
                        next(err);
                    });
                },
                (next) => {
                    this.conn.addColumns(columns, (err, info) => {
                        if (err) {
                            Log.sError('Mysql', 'check ' + info + 'failed');
                        }
                        next(err);
                    });
                },
                (next) => {
                    this.conn.addIndexes(indexes, (err, info) => {
                        if (err) {
                            Log.sError('Mysql', 'check ' + info + 'failed');
                        }
                        next(err);
                    });
                },
                (next) => {
                    this.conn.execute('alter table re_passport_player auto_increment = ' + Enum.VALID_ROLE_ID, null, (err, connecton, result) => {
                        if (err) {
                            Log.sError('Mysql', 'set auto_increment err');
                        }
                        else {
                            Log.sInfo('Mysql', 'roleId init set to 10000');
                        }
                        next(err);
                    });
                }

            ], (err) => {
                if (!err) {
                    Log.sInfo('Mysql', 'checked all tables, columns, indexes');
                }
                done(err);
            }
        );
    }

    validateAuthFast(passport:string,
                     platformId:number,
                     deviceUid:string,
                     deviceToken:string,
                     device:string,
                     deviceType:string,
                     ip:string,
                     cb:(err:any, passportId?:number, gmAuth?:number, lastLoginServer?:number) => void):void {
        var sql = 'select passport_id, gm_auth, last_login_server from passport_info where ? and ? and ?';
        this.conn.execute(sql, [{passport: passport}, {platform: platformId}, {auth_type: 2}], (err, connection, result) => {
            if (err) {
                cb(err);
                return;
            }
            if (result.length === 0) {
                this.getDBTime((err, dbTime) => {
                    if (err) {
                        cb(err);
                        return;
                    }
                    var insertSql = "insert into passport_info set ?";
                    this.conn.execute(insertSql, {
                            passport                                               : passport, platform: platformId,
                            auth_type                                              : 2, pwd                                      : '', mail: '', uid: deviceUid, token: deviceToken,
                            create_time: dbTime, gm_auth: 0, reg_ip: ip, reg_device: device,
                            reg_device_type                                        : deviceType, last_login_time           : dbTime,
                            status                                                 : 0, last_login_server                           : 0
                        },
                        (err, connection, result) => {
                            if (err) {
                                cb(err);
                                return;
                            }
                            cb(null, result.insertId, 0, 0);
                        }
                    );
                });
            }
            else {
                cb(null, result[0].passport_id, result[0].gm_auth, result[0].last_login_server);
            }
        });
    }

    fetchServerIdByRoleId(roleId:number, cb:(err, serverId)=>void) {
        this.conn.execute('select server_id from re_passport_player where ?', {role_id: roleId}, (err, connection, result) => {
            if (err) {
                cb(err, 0);
                return;
            }

            cb(null, result.length === 0 ? 0 : result[0].server_id);
        });
    }


    insertRepassportPlayer(passportId:number, serverId:number, callback:(err, insertId:number) => void):void {
        var sql = 'insert into re_passport_player set create_time = (select unix_timestamp()), ? ;';
        this.conn.execute(sql, {
            passport_id     : passportId,
            server_id       : serverId,
            server_id_origin: serverId
        }, (err, connection, result) => {
            if (err) {
                callback(err, 0);
                return;
            }
            callback(null, result.insertId);
        });
    }
    //
    //updateLastLoginServerId(passportId:number, lastLoginServerId:number, cb:(err) => void) {
    //    var sql = 'update passport_info set ? where ?';
    //    this.conn.execute(sql, [{last_login_server: lastLoginServerId}, {passport_id: passportId}], (err, connection, result) => {
    //        cb(err);
    //    });
    //}

    validateAuth(passport:string, platformId:number, cb:(err, passportId:number, lastLoginServer:number, gmAuth:number) => void):void {
        var sql = 'select passport_id, last_login_server, gm_auth from passport_info where ? and ?';
        this.conn.execute(sql, [{passport: passport}, {platform: platformId}], (err, connection, result) => {
            if (err || result.length === 0) {
                cb(err, 0, 0, 0);
            }
            else {
                cb(err, result[0].passport_id, result[0].last_login_server, result[0].gm_auth);
            }
        });
    }

    getRoleIdByPassportIdAndServerId(passportId:number, serverId:number, cb:(err, roleId:number) => void):void {
        var sql = 'select role_id from re_passport_player where ? and ?';
        this.conn.execute(sql, [{passport_id: passportId}, {server_id: serverId}], (err, connection, result) => {
            if (err || result.length === 0) {
                cb(err, 0);
            }
            else {
                cb(err, result[0].role_id);
            }
        });
    }
    //
    //shutDownDB(callback:(err) => void):void {
    //    Log.sInfo('Mysql', 'shutting down login database');
    //    this.conn.closeDb((err) => {
    //        if (err) {
    //            Log.sInfo('Mysql', 'shut down login database failed');
    //        } else {
    //            Log.sInfo('Mysql', 'shut down login database success');
    //        }
    //        callback(err);
    //    });
    //}
    //
    //
    //getAllLoginStrategy(cb:(err, allLoginStrategy:{[loginStrategyId:number]:LoginStrategyCondition[]})=>void):void {
    //    this.conn.execute('select strategy_id, condition_id, type, value from login_strategy', null, (err, connection, result) => {
    //        if (err) {
    //            return cb(err, []);
    //        }
    //
    //        var ret:{[loginStrategyId:number]:LoginStrategyCondition[]} = {};
    //        for (var i = 0; i < result.length; i++) {
    //            var obj = result[i];
    //            if (!ret[obj.strategy_id]) {
    //                ret[obj.strategy_id] = [];
    //            }
    //            ret[obj.strategy_id].push({type: obj.type, value: obj.value});
    //        }
    //
    //        cb(null, ret);
    //    });
    //}
    //
    //
    //getServerList(serverList:{
    //    [server_id
    //        :
    //        number
    //        ]:
    //        Server
    //}
    //    ,
    //              cb:(err) => void):void {
    //    this.conn.execute('select * from gameserver_info', null, (err, connection, result) => {
    //        if (err) {
    //            cb(err);
    //            return;
    //        }
    //        var server, oldServer;
    //        for (var i = 0; i < result.length; i++) {
    //            server = result[i];
    //            oldServer = serverList[server.server_id];
    //            if (oldServer) {
    //                server.alive = (server.update_time !== oldServer.update_time);
    //            }
    //            else {
    //                server.alive = true;
    //            }
    //            serverList[server.server_id] = server;
    //        }
    //        cb(null);
    //    });
    //}
    //
    //
    //updateGameServerInfo(serverId:number,
    //                     serverName:string,
    //                     serverIp:string,
    //                     localIp:string,
    //                     port:number,
    //                     resServerAddr:string,
    //                     onlineNum:number,
    //                     version:string,
    //                     resVersion:string,
    //                     canLoginIn:boolean,
    //                     status:number,
    //                     loginStrategyId:number,
    //                     bRecommend:boolean,
    //                     cb:(err:any) => void):void {
    //    this.getDBTime((err, dbTime)
    //            => {
    //            this.conn.execute('select update_time from gameserver_info where ?', {server_id: serverId}, (err, connection, result) => {
    //                if (err) {
    //                    cb(err);
    //                    return;
    //                }
    //
    //                if (result.length === 0) {
    //
    //                    connection.query('insert into gameserver_info set ?',
    //                        {
    //                            server_id: serverId, server_name: serverName, ip: serverIp, local_ip: localIp,
    //                            port                                                                : port, version                                                 : version, res_version                           : resVersion, online_num: onlineNum,
    //                            can_login                                                           : canLoginIn, status                                       : status, login_strategy_id            : loginStrategyId,
    //                            res_server_ip                                                       : resServerAddr, update_time                           : dbTime, is_recommend     : bRecommend
    //                        },
    //                        (err, result) => {
    //                            cb(err);
    //                        }
    //                    );
    //                }
    //                else {
    //                    connection.query('update gameserver_info set ? where ?',
    //                        [
    //                            {
    //                                server_name                                                      : serverName, ip                                      : serverIp, local_ip: localIp,
    //                                port: port, version: version, res_version: resVersion, online_num: onlineNum,
    //                                can_login                                                        : canLoginIn, status: status, login_strategy_id         : loginStrategyId,
    //                                res_server_ip                                                    : resServerAddr, update_time: dbTime, is_recommend: bRecommend
    //                            },
    //                            {server_id: serverId}
    //                        ],
    //                        (err, result) => {
    //                            cb(err);
    //                        }
    //                    );
    //                }
    //            });
    //        }
    //    )
    //    ;
    //}
    //
    //
    insertLogOutInfo(loginKey:number, callback:(err) => void):void {
        if (
            !loginKey
        ) {
            return callback(null);
        }

        this.getDBTime((err, dbTime) => {
            this.conn.execute('update role_login_info set ? where ?',
                [{logout_time: dbTime}, {auto_id: loginKey}], (err, connection, result) => {
                    callback(err);
                }
            );
        });
    }


    insertLoginInfo(roleId:number,
                    loginIp:string,
                    loginDeviceOS:string,
                    loginDeviceType:string,
                    callback:(err, loginKey) => void):void {
        this.getDBTime((err, dbTime) => {
                async.parallel(
                    [
                        (cb:(err) => void) => {
                            this.conn.execute('insert into player_info set ? on duplicate key update ?',
                                [{
                                    role_id        : roleId,
                                    last_login_time: dbTime
                                }, {last_login_time: dbTime}], (err, connection, result) => {
                                    cb(err);
                                }
                            );
                        },
                        (cb:(err) => void) => {
                            this.conn.execute('update passport_info a inner join re_passport_player b on (a.passport_id=b.passport_id) set ? where ?',
                                [{'a.last_login_time': dbTime}, {'b.role_id': roleId}], (err, connection, result) => {
                                    cb(err);
                                }
                            );
                        },
                        (cb:(err, result:any) => void) => {
                            this.conn.execute('insert into role_login_info set ?',
                                {
                                    role_id          : roleId,
                                    login_time       : dbTime,
                                    logout_time      : 0,
                                    login_ip         : loginIp,
                                    login_device     : loginDeviceOS,
                                    login_device_type: loginDeviceType
                                },
                                (err, connection, result) => {
                                    if (err) {
                                        cb(err, null);
                                    }
                                    else {
                                        cb(null, result.insertId);
                                    }
                                }
                            );
                        }
                    ],
                    (err, results) => {
                        if (err) {
                            callback(err, null);
                        }
                        else {
                            callback(null, results[2]);
                        }

                    }
                );
            }
        )
        ;
    }

    insertRoleInfo(accountId:number, name:string, cb:(err) => void):void {
        this.conn.execute('select role_id from player_info where ?', {role_id: accountId}, (err, connection, result) => {
            if (result.length === 0) {
                this.conn.execute('insert into player_info set ?', {role_id: accountId, name: name}, (err) => {
                        cb(err);
                    }
                );
            } else {
                cb(err);
            }
        });
    }

    insertOrUpdateRoleInfo(role:Role, callback:(err) => void):void {
        var sql      = 'insert into player_info set ? on duplicate key update ?',
            roleInfo = {
                role_id     : role.accountId,
                name        : role.username,
                gm_auth     : role.gmAuth,
                status      : role.roleSt,
                progress    : role.progress,
                level       : role.level,
                gold        : role.gold,
                diamond     : role.diamond,
                cur_stage   : role.dungeons.completeHighestStageID,    // 使用最大副本进度
                cur_train   : 0,
                vip_level   : 0,
                vip_exp     : 0,
                diamond_paid: role.diamondCharge,
                energy      : role.heros.getMainHeroCurrentHP(),
                quest       : 0
            };
        this.conn.execute(sql, [roleInfo, roleInfo], (err, connection, result) => {
            if (err) {
                Log.sError('Mysql', 'Update player_info Table failed' + err.stack);
            }
            callback(err);
        });
    }


    //fetchServerIdByRoleId(roleId:number, cb:(err, serverId)=>void) {
    //    this.conn.execute('select server_id from re_passport_player where ?', {role_id: roleId}, (err, connection, result) => {
    //        if (err) {
    //            cb(err, 0);
    //            return;
    //        }
    //
    //        cb(null, result.length === 0 ? 0 : result[0].server_id);
    //    });
    //}
    //
    //
    fetchPassportInfoByPassportAndPlatformId(passport:string,
                                             platformId:number,
                                             cb:(err:any, passportId?:number, gmAuth?:number, lastLoginServer?:number) => void):void {
        var sql = 'select passport_id, gm_auth, last_login_server from passport_info where ? and ? and ?';
        this.conn.execute(sql, [{passport: passport}, {platform: platformId}, {auth_type: 2}], (err, connection, result) => {
            if (err) {
                cb(err);
                return;
            }
            if (result.length === 0) {
                cb(null, 0, 0, 0);
            }
            else {
                cb(null, result[0].passport_id, result[0].gm_auth, result[0].last_login_server);
            }
        });
    }


    //getUnhandledCharge(role_id, cb:(err, ret:Universal.ChargeInfo[])=>void):void {
    //    this.conn.execute("select auto_id, role_id, goods_id, goods_quantity, platform, platform_payment_type, addition1, addition2 from charge_info where ?",
    //        [{state: Enum.CHARGE_STATE.E_CHARGE_STATE_PAIED}, {role_id: role_id}], (err, connection, result:any) => {
    //            cb(err, result);
    //        }
    //    );
    //}
    //
    //
    //chargeHandled(autoId:number, diamondValue:number, diamondPaid:number, ip:string, deviceOS:string, deviceType:string, deviceUid:string, cb:(err)=>void) {
    //    this.getDBTime((err, dbTime) => {
    //        if (err) {
    //            return cb(err);
    //        }
    //
    //        this.conn.execute("update charge_info set ? where ?",
    //            [{
    //                virtual_value      : diamondValue,
    //                state              : Enum.CHARGE_STATE.E_CHARGE_STATE_DISTRIBUTED,
    //                distribute_time    : dbTime,
    //                payment_ip         : ip,
    //                payment_device     : deviceOS,
    //                payment_device_type: deviceType,
    //                payment_device_uid : deviceUid
    //            }, {auto_id: autoId}], (err, connection, result:any) => {
    //                cb(err);
    //            }
    //        );
    //    });
    //}
    //
    //
    //getNewGmCommand(commandId:number, state:number, cb:(err, ret)=>void) {
    //    this.conn.execute("select auto_id, opr, target_type, target_id, start_time, end_time, backup_value, status, params from gm_cmd" +
    //        " where auto_id > " + commandId + " and status = " + state, null, (err, connection, result:any) => {
    //        cb(err, result);
    //    });
    //}
    //
    //
    //getInitGmCommand(cb:(err, ret)=>void) {
    //    this.conn.execute("select auto_id, opr, target_type, target_id, start_time, end_time, backup_value, status, params from gm_cmd" +
    //        " where status != ? and status != ? and status != ?", [GmStruct.GM_STATE.ERROR, GmStruct.GM_STATE.COMPLETE, GmStruct.GM_STATE.CANCELED], (err, connection, result:any) => {
    //        cb(err, result);
    //    });
    //}
    //
    //
    //getRoleServerId(roleId:number, cb:(err, serverId:number)=>void):void {
    //    this.conn.execute("select server_id from re_passport_player where ?", {role_id: roleId}, (err, connection, result) => {
    //        if (err || result.length === 0) {
    //            cb(err, 0);
    //            return;
    //        }
    //
    //        cb(null, result[0].server_id);
    //    });
    //}
    //
    //
    //updateGmCmdError(autoId:number, errorMsg:string, cb:(err)=>void):void {
    //    this.conn.execute("update gm_cmd set ? where ?", [{
    //        status   : GmStruct.GM_STATE.ERROR,
    //        error_msg: errorMsg
    //    }, {auto_id: autoId}], (err, connection, result) => {
    //        cb(err);
    //    });
    //}
    //
    //
    //updateGmCmdDirtyInfo(autoId:number,
    //                     opr:string,
    //                     targetType:number,
    //                     targetId:number,
    //                     startTime:number,
    //                     endTime:number,
    //                     backupValue:string,
    //                     status:number,
    //                     errorMsg:string,
    //                     cb:(err)=>void) {
    //    this.conn.execute("update gm_cmd set ? where ?", [{
    //        status    : status, error_msg: errorMsg
    //        , opr     : opr, target_type: targetType, target_id: targetId, start_time: startTime
    //        , end_time: endTime, backup_value: backupValue
    //    }, {auto_id: autoId}], (err, connection, result) => {
    //        cb(err);
    //    });
    //}
    //
    //
    //hasLoginStrategy(strategyId:number, cb:(ret:boolean)=>void) {
    //    if (!strategyId) {
    //        return cb(true);
    //    }
    //
    //    this.conn.execute("select * from login_strategy where ?", {strategy_id: strategyId}, (err, connection, result) => {
    //        if (err) {
    //            cb(false);
    //        }
    //        else {
    //            cb(result.length !== 0);
    //        }
    //    });
    //}
    //
    //
    //updatePassportGmAuth(roleId, gmAuth, cb:(err)=>void) {
    //    this.conn.execute("update passport_info p inner join re_passport_player rpp on p.passport_id = rpp.passport_id set ? where ?",
    //        [{gm_auth: gmAuth}, {role_id: roleId}], (err, connection, result) => {
    //            if (err) {
    //                cb(false);
    //            }
    //            else {
    //                if (result) {
    //                    cb(true);
    //                }
    //            }
    //        });
    //}
    //
    //
    //resetServerRecommend(cb:(err)=>void) {
    //    this.conn.execute("update gameserver_info set is_recommend = 0", null, (err, connection, result) => {
    //        cb(err);
    //    });
    //}
    //
    //
    getAllNotice(cb:(err, allNoticeInfo:LoginNoticeInfo[])=>void) {
        this.getDBTime((err, dbTime) => {
            if (err) {
                return cb(err, []);
            }

            this.conn.execute("select * from notice_info_v2 where start_time < " + dbTime + " and end_time > " + dbTime, null, (err, connection, result) => {
                cb(err, result || []);
            });
        });
    }


    getGiftCodeInfo(id, cb:(err, param1:number, param2:number, param3:number, reward:string, server:string, platform:string, dead_time:number, use_max:number)=>void) {
        this.conn.execute("select param1, param2, param3, reward, server, platform, dead_time, use_max from gift_box_config where ?", {id: id}, (err, connection, result) => {
            if (err) {
                cb(err, 0, 0, 0, '', '', '', 0, 0);
                return;
            }

            if (!result || result.length === 0) {
                cb(new Error(ErrorMsg.GIFT_CODE_ID_NOT_FOUND), 0, 0, 0, '', '', '', 0, 0);
                return;
            }

            cb(null, result[0].param1, result[0].param2, result[0].param3, result[0].reward, result[0].server, result[0].platform, result[0].dead_time, result[0].use_max);
        });
    }


    verifyGiftCodeIsUsed(id:number, idx:number, cb:(err, isUsed:boolean)=>void) {
        this.conn.execute("select * from gift_box where ? and ?", [{id: id}, {idx: idx}], (err, connection, result) => {
            cb(err, result ? result.length !== 0 : false);
        });
    }


    getGiftCodeUsedCount(roleId, id, cb:(err, ret:number)=>void) {
        this.conn.execute("select count(*) as usedCount from gift_box where ? and ?", [{id: id}, {role_id: roleId}], (err, connection, result) => {
            cb(err, result && result.length > 0 ? result[0].usedCount : 0);
        });
    }


    insertGiftCodeUse(roleId, id, idx, cb:(err)=>void) {
        this.conn.execute("insert into gift_box set ?", {
            id     : id,
            role_id: roleId,
            idx    : idx
        }, (err, connection, result) => {
            cb(err);
        });
    }
    //
    //
    //initGoodsInfo(serverId:number, allGoodsInfo:any, cb:(err)=>void) {
    //    this.conn.execute("delete from goods_info where ?", {server_id: serverId}, (err, connection, result) => {
    //        if (err) {
    //            return cb(err);
    //        }
    //
    //        var arr = Util.objectToArray(allGoodsInfo);
    //        async.each(arr, (goodsInfo:ConfigStc.payDB, next) => {
    //                this.conn.execute("insert into goods_info set ?", {
    //                    server_id      : serverId,
    //                    goods_id       : goodsInfo.ID,
    //                    cost_count     : goodsInfo.discount,
    //                    cost_content_id: goodsInfo.type,
    //                    goods_name     : goodsInfo.Text_proName,
    //                    platform_type  : goodsInfo.payplatformID
    //                }, (err, connection, result) => {
    //                    next(err);
    //                });
    //            },
    //            (err) => {
    //                cb(err);
    //            }
    //        );
    //    });
    //}
    //
    insertPurchaseInfo(roleId:number, goodsId:number, goodsQuantity:number, value:number, time:number, diamondPaidUse:number, cb:(err)=>void) {
        this.conn.execute("insert into purchase_info set ?", {
            role_id         : roleId,
            goods_id        : goodsId,
            goods_quantity  : goodsQuantity,
            value           : value,
            time            : time,
            diamond_paid_use: diamondPaidUse
        }, (err, connection, result) => {
            cb(err);
        });
    }
    //
    //fetchPlayerCountEachServer(callback:(err, result:{server_count:number; server_id:number}[])=>void):void {
    //    var sql = "select count(*) as server_count, server_id from re_passport_player group by server_id";  // TODO 性能问题？
    //    this.conn.execute(sql, [], (err, connection, result) => {
    //        callback(err, result);
    //    });
    //}
}

export = LoginDatabase;
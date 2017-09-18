import async = require('async');

import Log = require('../../util/log');
import Util = require('../../util/game_util');
import CustomError = require('../../util/errors');
import ERRC = require('../../util/error_code');

import Database = require('../../database/database');
import Guild = require('./guild');

class GuildDatabase extends Database {
    constructor() {
        super('mysql.world');
    }

    initTables(done):void {
        var tables:{[tableName:string]:string} = {
            "guild": "CREATE TABLE IF NOT EXISTS guild (" +
            "guildId        bigint(20)  unsigned    NOT NULL," +
            "name           varchar(50) CHARACTER SET utf8    NOT NULL    DEFAULT	''," +
            "leaderId       bigint(20)  unsigned    NOT NULL    DEFAULT	'0'," +
            "createDate     int(10)     unsigned NOT NULL DEFAULT '0'," +
            "bankMoney      bigint(20)  unsigned NOT NULL DEFAULT '0'," +
            "level          int(10)     unsigned DEFAULT '1'," +
            "announce       varchar(500) CHARACTER SET utf8   not null default ''," +
            "requireLevel   int(10)     unsigned    not null default '0'," +
            "joinType       smallint    unsigned    not null default '0'," +
            "badge          varchar(100) character set utf8  not null default ''," +
            "technology     blob        NULL," +
            "quest          blob        NULL," +
            "UNIQUE KEY (name)," +
            "PRIMARY KEY (guildId)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "guild_member": "create table if not exists guild_member (" +
            "accountId      bigint(20)  unsigned    NOT NULL," +
            "guildId        bigint(20)  unsigned    NOT NULL," +
            "hierarchy      smallint    unsigned    NOT NULL default '0' comment '公会职位'," +
            "contributeLevel smallint   unsigned    NOT NULL default '1' comment '捐献等级'," +
            "contributeProgress int(10) unsigned    NOT NULL default '0' comment '捐献进度'," +
            "totalContribute int(10)    unsigned    NOT NULL default '0' comment '单个公会的捐献总量'," +
            "lastLeaveGuildTime INT     unsigned    NOT NULL default '0' comment '上次离开公会的时间'," +
            "primary key (accountId)," +
            "key (guildId)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;",

            "guild_petition": "create table if not exists guild_petition (" +
            "accountId      bigint(20)  unsigned    NOT NULL," +
            "guildId        bigint(20)  unsigned    NOT NULL," +
            "entryType      smallint    unsigned    NOT NULL default '0' comment '申请或者邀请'," +
            "unique key `index_accountId_guildId` (accountId, guildId)" +
            ") engine=InnoDB default charset=utf8 comment='玩家向公会的申请';",

            // add new here
        };

        var columns = [
            // one table can't have more than 10 blob field
            // add new update column here
            ['guild', 'quest', 'blob null'],
            ['guild', "badge", "varchar(100) character set utf8  not null default ''"],
            ['guild_member', 'lastLeaveGuildTime', "INT     unsigned    NOT NULL default '0' comment '上次离开公会的时间'"],
            ['guild_petition', 'entryType', "smallint    unsigned    NOT NULL default '0' comment '申请或者邀请'"]
        ];
        var indexes = [
        ];

        this.initTCI(tables, columns, indexes, done);
    }

    /****************************************
     * table guild
     * @xienanjie
     ****************************************/

    public insertGuild(guildId:number, valueObj:any, callback):void {
        var content:any = Util.extend({guildId: guildId}, valueObj);
        var sql = "insert into guild set ?";
        this.conn.execute(sql, [content, content], (err, connection, result) => {
            if (err && err.code === 'ER_DUP_ENTRY') {
                return callback(new CustomError.UserError(ERRC.GUILD.DUP_GUILD_NAME, {
                    msg: 'GUILD.DUP_GUILD_NAME, name=' + valueObj.name
                }));
            }
            callback(err);
        });
    }

    public updateGuild(guildId:number, valueObj:any, callback):void {
        var sql = "update guild set ? where guildId = ?";
        this.conn.execute(sql, [valueObj, guildId], (err, connection, result) => {
            callback(err);
        });
    }

    public deleteGuild(guildId:number, callback):void {
        var sql = "delete from guild where ?";
        this.conn.execute(sql, {guildId: guildId}, (err, connection, result) => {
            callback(err, result);
        });
    }

    public fetchGuild(guildId:number, callback):void {
        var sql = "select * from guild where ?";
        this.conn.execute(sql, {guildId: guildId}, (err, con, result) => {
            callback(err, result);
        });
    }

    public fetchGuildList(callback):void {
        var sql = "select guildId from guild";
        this.conn.execute(sql, [], (err, con, result) => {
            callback(err, result);
        });
    }

    public updateGuildSetting(guildId:number, valueObj:any, callback):void {
        var sql = "update guild set ? where guildId = ?";
        this.conn.execute(sql, [valueObj, guildId], (err, connection, result) => {
            callback(err, result);
        });
    }

    public searchGuild(conditions, callback) {
        var opt:any = {};
        opt.joinType = conditions.needApproval ? Guild.JoinType.NEED_APPROVAL : Guild.JoinType.OPEN;
        opt.requireLevel = conditions.requireLevel ? conditions.requireLevel : 0;
        var sql = 'select guildId from guild where joinType=' + opt.joinType;
        if (opt.requireLevel) sql += ' and requireLevel<=' + opt.requireLevel;
        if (conditions.filterString) sql += ' and name COLLATE UTF8_GENERAL_CI like \'%' + conditions.filterString + '%\'';
        sql += ' order by level desc';
        this.conn.execute(sql, [], (err, connection, result) => {
            callback(err, result);
        });
    }

    /****************************************
     * table guild_member
     * @xienanjie
     ****************************************/

    public insertOrUpdateMember(accountId:number, valueObj:any, callback):void {
        var content:any = Util.extend({accountId: accountId}, valueObj);
        var sql = "insert into guild_member set ? on duplicate key update ?";
        this.conn.execute(sql, [content, content], (err, connection, result) => {
            callback(err, result);
        });
    }

    public fetchGuildMemberList(guildId:number, callback):void {
        var sql = "select * from guild_member where ?";
        this.conn.execute(sql, {guildId: guildId}, (err, con, result) => {
            callback(err, result);
        });
    }

    public fetchMember(accountId:number, callback):void {
        var sql = "select * from guild_member where ?";
        this.conn.execute(sql, {accountId: accountId}, (err, con, result) => {
            callback(err, result);
        });
    }

    public fetchGuildContributeHistory(guildId:number, callback):void {
        var sql = "select accountId, totalContribute from guild_member where guildId = ?";
        this.conn.execute(sql, [guildId], (err, con, result) => {
            callback(err, result);
        });
    }

    /****************************************
     * table guild_petition
     * @xienanjie
     ****************************************/

    public insertPetition(accountId:number, guildId:number, callback):void {
        var sql = "insert into guild_petition values (?, ?, 0)";
        this.conn.execute(sql, [accountId, guildId], (err, con, result) => {
            callback(err, result);
        });
    }

    public insertInvitation(accountId:number, guildId:number, callback):void {
        var sql = "insert into guild_petition values (?, ?, 1)";
        this.conn.execute(sql, [accountId, guildId], (err, con, result) => {
            callback(err, result);
        });
    }

    /**
     * 删除申请或邀请 PIEntry = petition & invitation
     */
    public deleteOnePIEntry(accountId:number, guildId:number, callback):void {
        var sql = "delete from guild_petition where accountId = ? and guildId = ?";
        this.conn.execute(sql, [accountId, guildId], (err, con, result) => {
            callback(err, result);
        });
    }

    public deleteAllPIEntryByAccountId(accountId:number, callback):void {
        var sql = "delete from guild_petition where ?";
        this.conn.execute(sql, {accountId: accountId}, (err, con, result) => {
            callback(err, result);
        });
    }

    public deleteAllInvitationByAccountId(accountId:number, callback) {
        var sql = "delete from guild_petition where ? and entryType = 1";
        this.conn.execute(sql, {accountId: accountId}, (err, con, result) => {
            callback(err, result);
        });
    }

    public deleteAllPetitionByGuildId(guildId:number, callback):void {
        var sql = "delete from guild_petition where ? and entryType = 0";
        this.conn.execute(sql, {guildId: guildId}, (err, con, result) => {
            callback(err, result);
        });
    }

    public fetchPIEntryByAccountId(accountId:number, callback):void {
        var sql = "select * from guild_petition where ?";
        this.conn.execute(sql, {accountId: accountId}, (err, con, result) => {
            callback(err, result);
        });
    }

    public fetchPetitionByGuildId(guildId:number, callback):void {
        var sql = "select * from guild_petition where ? and entryType = 0";
        this.conn.execute(sql, {guildId: guildId}, (err, con, result) => {
            callback(err, result);
        });
    }
}

export = GuildDatabase;
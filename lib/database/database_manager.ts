/**
 *
 * Database Name:
 *      - db.login
 *      - db.world
 */

import async = require('async');

import EnterFile = require('../config/template/enter_file');
import Log = require('../util/log');
import DepManager = require('../server/dependence_manager');

import MysqlConnection = require('./mysql_connection');
import Database = require('./database');


// each instance for Database
import LoginDatabase = require('../handler/login/login_database');
import GameDatabase = require('../handler/game/game_database');
import ChatDatabase = require('../service/chat/chat_database');
import FriendDatabase = require('../service/friend/friend_database');
import BossDatabase = require('../service/boss/boss_database');
import ArenaDatabase = require('../service/arena/arena_database');
import GuildDatabase = require('../service/guild/guild_database');

export var Login:LoginDatabase = new LoginDatabase();
export var World:GameDatabase = new GameDatabase();
export var Chat:ChatDatabase = new ChatDatabase();
export var Friend:FriendDatabase = new FriendDatabase();
export var Boss:BossDatabase = new BossDatabase();
export var Arena:ArenaDatabase = new ArenaDatabase();
export var Guild:GuildDatabase = new GuildDatabase();

var mysqlConnections:{[name:string]:MysqlConnection} = {};
var databaseInstances:Database[] = [];

export function connectAllDatabase(databaseList:EnterFile.DatabaseList, done):void {
    async.eachSeries(
        databaseList,
        (db, next) => {
            var connection:MysqlConnection = new MysqlConnection();
            connection.startDb({
                name             : db.name,
                connectionLimit  : db.connectionLimit,
                host             : db.hostname,
                user             : db.user,
                password         : db.password,
                database         : db.database,
                charset          : 'UTF8_GENERAL_CI',
                supportBigNumbers: true
            }, (err) => {
                if (err) next(err);
                mysqlConnections[db.name] = connection;
                next();
            });
        },
        (err) => {
            if (err) return done(err);
            initAllDatabase(done);
        }
    );
}

export function disconnectAllDatabase(done):void {
    async.each(
        Object.keys(mysqlConnections),
        (name, next) => {
            Log.sInfo('Mysql', 'disconnecting database [%s]', name);
            mysqlConnections[name].closeDb((err) => {
                if (err) {
                    Log.sError('Mysql', 'close database failed, message=%s', err.message);
                } else {
                    Log.sInfo('Mysql', 'close database [%s] success', name);
                }
                delete mysqlConnections[name];
                next();
            });
        },
        (err) => {
            done(err);
        }
    );
}

export function initAllDatabase(done):void {
    databaseInstances.push(Login);
    databaseInstances.push(Chat);
    databaseInstances.push(World);
    databaseInstances.push(Friend);
    databaseInstances.push(Boss);
    databaseInstances.push(Arena);
    databaseInstances.push(Guild);

    // ... add more

    async.each(databaseInstances, (db, next) => {
        var depConn = DepManager.getDependence(db.useDatabaseName);
        if (!depConn) return next(); // try to check in Server.loadConf
        db.setConnection(depConn.connection);
        next();
    }, (err) => {
        done(err);
    });
}
import async = require('async');
import Log = require('../util/log');
import MysqlConnection = require('./mysql_connection');

class Database {
    useDatabaseName:string = '';
    conn:MysqlConnection = null;
    constructor(useDatabaseName:string) {
        this.useDatabaseName = useDatabaseName;
    }
    public setConnection(con:MysqlConnection) {
        this.conn = con;
    }
    public initTables(done):void {done();}

    public getDBTime(callback:(err, dbTime:number) => void):void {
        var sql = 'select unix_timestamp() as dbTime';
        this.conn.execute(sql, null, (err, connection, result) => {
            if (err) {
                callback(err, 0);
                return;
            }

            callback(null, result[0].dbTime);
        });
    }

    public initTCI(tables, columns, indexes, done) {
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
                if (err) return done(err);
                Log.sInfo('Mysql', 'checked all tables, columns, indexes');
                done(null);
            }
        );
    }
}

export = Database;
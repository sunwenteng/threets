//import RSortedSet = require('./builtin/sorted_set');
//import RedisMgr = require('./redis_mgr');
import RedisManager = require('./redis_manager');
//import CenterDB = require('../database/impl/center_db');

class Leaderboard {
    name:string = '';
    tableName:string = '';
    primaryKey:string = '';
    scoreField:string = '';

    constructor(name:string, table:string, primaryKey:string, field:string) {
        this.name = 'Leaderboard:' + name;
        this.tableName = table;
        this.primaryKey = primaryKey;
        this.scoreField = field;
    }

    public initAllRank(callback:(err)=>void):void {
        // TODO need limit

        var that = this;
        //CenterDB.fetchBigThanZero(this.tableName, this.primaryKey, this.scoreField, (err, result:any[]) => {
        //    if (err) {
        //        callback(err);
        //        return ;
        //    }
        //
        //    var content:string[] = [];
        //    result.forEach((res) => {
        //        content.push(res[this.primaryKey], res[this.scoreField]);
        //    });
        //
        //    if (content.length > 0) {
        //        that.zaddArray(content, (err, reply) => {
        //            callback(err);
        //        });
        //    } else {
        //        callback(null);
        //    }
        //});
    }

    public clearBoard(callback:(err, res)=>void):void {
        RedisManager.role.conn.del(this.name, callback);
    }

    public queryRank(primaryId:number, cb:(err, rank:number)=>void):void {
        RedisManager.role.conn.zrevrank(this.name, primaryId, (err, rank) => {
            cb(err, (rank || rank === 0) ? rank + 1 : 0);
        });
    }

    public queryScore(primaryId:number, cb:(err, score:number)=>void):void {
        RedisManager.role.conn.zscore(this.name, primaryId, (err, value) => {
            if (err) cb(err, 0);
            else {
                var val = parseFloat(value);
                cb(null, isNaN(val) ? 0 : val);
            }
        });
    }

    // 从0开始
    // start为0表示第一名
    public fetchRange(start:number, stop:number, cb:(err, result)=>void) {
        RedisManager.role.conn.zrevrange(this.name, start, stop, 'withscores', cb);
    }

    public setScore(primaryId:number, score:number, cb:(err)=>void):void {
        RedisManager.role.conn.zadd([this.name, score, primaryId], cb);
    }

    public setNXScore(accountId:number, score:number, cb) {
        RedisManager.role.conn.zadd([this.name, 'NX', score, accountId], cb);
    }

    public incrScore(primaryId:number, increment:number, cb:(err, score:number)=>void):void {
        RedisManager.role.conn.zincrby(this.name, increment, primaryId, (err, res) => {
            console.log('zincrby, typeof res = ' + typeof res + ', value = ' + res);
            if (typeof res === 'string') cb(err, parseInt(res));
            else cb(err, res);
        });
    }

    public fetchSize(cb:(err, size)=>void):void {
        RedisManager.role.conn.zcard(this.name, cb);
    }

    public exists(primaryId:number, cb:(err, exist:boolean)=>void):void {
        // zscore O(1)
        // zrank O(log(N))
        RedisManager.role.conn.zscore(this.name, primaryId, (err, res) => {
            cb(err, !!res);
        });
    }
}

export = Leaderboard;
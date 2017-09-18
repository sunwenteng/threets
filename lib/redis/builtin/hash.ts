import RBase = require('./base');
import redis = require('redis');
import RedisMgr = require('../redis_mgr');

class RHash extends RBase {

    constructor(key:string) {
        super(key);
    }

    public hsetall(callback?:redis.ResCallbackT<any>):void {
        //RedisMgr.client.hmset(this.key, this, (err: Error, res) => {
        //    if (callback) {
        //        callback(err, res);
        //    } else if (err) {
        //        throw err;
        //    }
        //});
    }

    protected attachRO(canLoadDB:boolean, callback:(err, exist:boolean)=>void):void {
        RedisMgr.client.hgetall(this.key, (err, res) => {
            if (err) {
                callback(err, false);
                return ;
            }

            if (res === null) {
                if (canLoadDB) {
                    console.log('res === null, find from database');
                    this.loadAllData((err, result:any[]) => {
                        if (err) {
                            callback(err, false);
                            return ;
                        }

                        if (result.length === 0) {
                            callback(new Error('not exist hash table, mysql key=' + this.key), false);
                            return ;
                        }
                        Object.keys(this).forEach((key) => {
                            if (result[0].hasOwnProperty(key)) {
                                this[key] = result[0][key];
                            }
                        });
                        this.hsetall((err, res) => {
                            callback(err, true);
                        });
                    });
                } else {
                    callback(null, false);
                }
                return ;
            }

            this.setHash(res);
            callback(null, true);
        });
    }

    public hdel(args:string[], callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.hdel([this.key].concat(args), (err, res) => {
            callback(err, res);
        });
    }

    public setHash(res:any):void {
        Object.keys(res).forEach((key) => {
            this[key] = res[key];
        });
    }

    public loadAllData(callback:(err, result)=>void):void { callback(null, []); }
    public saveAllData(callback:(err, result)=>void):void { callback(null, {}); }
}

export = RHash;
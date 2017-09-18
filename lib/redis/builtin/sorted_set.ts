import RBase = require('./base');
import redis = require('redis');
import RedisMgr = require('../redis_mgr');

class RSortedSet extends RBase {
    constructor(key:string) {
        super(key);
    }

    // O(M*log(N))， N 是有序集的基数， M 为成功添加的新成员的数量。
    public zaddObject(args:{[key:string]:number}, callback:redis.ResCallbackT<any>):void {
        var value:any[] = [this.key];
        Object.keys(args).forEach((key) => {
            value.push(args[key], key);
        });
        RedisMgr.client.zadd(value, callback);
    }

    // O(M*log(N))， N 是有序集的基数， M 为成功添加的新成员的数量。
    public zaddArray(args:string[], callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.zadd([this.key].concat(args), callback);
    }

    /*
     时间复杂度:
        O(1)
     返回值:
        当 key 存在且是有序集类型时，返回有序集的基数。
        当 key 不存在时，返回 0 。
     */
    public zcard(callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.zcard(this.key, callback);
    }

    /*
     时间复杂度:
        O(log(N))， N 为有序集的基数。
     返回值:
        score 值在[min,max]之间的成员的数量。
     */
    public zcount(min:number, max:number, callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.zcount(this.key, min, max, callback);
    }

    /*
     时间复杂度:
        O(log(N)+M)， N 为有序集的基数，而 M 为结果集的基数。
     返回值:
        指定区间内，带有 score 值(可选)的有序集成员的列表。
     */
    public zrange(start:number, stop:number, callback:redis.ResCallbackT<any>, withScore?:boolean):void {
        if (withScore) {
            RedisMgr.client.zrange(this.key, start, stop, 'withscores', callback);
        } else {
            RedisMgr.client.zrange(this.key, start, stop, callback);
        }
    }

    // O(log(N))
    public zrank(member:string, callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.zrank(this.key, member, callback);
    }

    public zrevrange(start:number, stop:number, callback:redis.ResCallbackT<any>, withScore?:boolean):void {
        if (withScore) {
            RedisMgr.client.zrevrange(this.key, start, stop, 'withscores', callback);
        } else {
            RedisMgr.client.zrevrange(this.key, start, stop, callback);
        }
    }

    public zrevrank(member:string, callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.zrevrank(this.key, member, callback);
    }

    /*
     时间复杂度:
        O(M*log(N))， N 为有序集的基数， M 为被成功移除的成员的数量。
     返回值:
        被成功移除的成员的数量，不包括被忽略的成员。
     */
    public zrem(members:string[], callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.zrem([this.key].concat(members), callback);
    }

    // O(1)
    public zscore(member:string, callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.zscore(this.key, member, callback);
    }

    /*
     时间复杂度:
        O(log(N))
     返回值:
        member 成员的新 score 值，以字符串形式表示。
     */
    public zincrby(member:string, increment:number, callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.zincrby(this.key, increment, member, callback);
    }
}

export = RSortedSet;
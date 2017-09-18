import RBase = require('./base');
import redis = require('redis');
import RedisMgr = require('../redis_mgr');

class RList extends RBase {
    constructor(key:string) {
        super(key);
    }

    /**
     * O(N)
     * @param value     number:[]
     * @param callback  (err, size:number)
     */
    public lpush(value:any[], callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.lpush([this.key].concat(value), callback);
    }

    /**
     * O(N)
     * @param value     number:[]
     * @param callback  (err, size:number)
     */
    public rpush(value:any[], callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.rpush([this.key].concat(value), callback);
    }

    /**
     * O(1)
     * @param callback  (err, value:string or null)
     */
    public lpop(callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.lpop([this.key], callback);
    }

    /**
     * O(1)
     * @param callback  (err, value:string or null)
     */
    public rpop(callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.rpop([this.key], callback);
    }

    /**
     * O(1)
     * @param callback (err, len:number)
     */
    public llen(callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.llen([this.key], callback);
    }

    /**
     * O(S+N)， S 为偏移量 start ， N 为指定区间内元素的数量。
     * @param start
     * @param stop
     * @param callback  (err, values:string[])
     */
    public lrange(start:number, stop:number, callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.lrange(this.key, start, stop, callback);
    }

    /**
     * O(N)， N 为被移除的元素的数量。
     * @param start
     * @param stop
     * @param callback
     */
    public ltrim(start:number, stop:number, callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.ltrim(this.key, start, stop, callback);
    }

    /**
     * O(N)， N 为到达下标 index 过程中经过的元素数量。
     * 因此，对列表的头元素和尾元素执行 LINDEX 命令，复杂度为O(1)。
     * @param index
     * @param callback  (err, value:string)
     */
    public lindex(index:number, callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.lindex(this.key, index, callback);
    }

    /**
     * 对头元素或尾元素进行 LSET 操作，复杂度为 O(1)。
     * 其他情况下，为 O(N)， N 为列表的长度。
     * @param index
     * @param value
     * @param callback  (err, 'OK')
     */
    public lset(index:number, value:any, callback:redis.ResCallbackT<any>):void {
        RedisMgr.client.lset(this.key, index, value, callback);
    }
}

export = RList;
import RHash = require('./builtin/hash');
import RList = require('./builtin/list');
import RSortedSet = require('./builtin/sorted_set');
import RedisMgr = require('./redis_mgr');
import async = require('async');


function print(op: string, res:any) {
    console.warn(op + ':' + res + ', type=' + typeof res);
}

RedisMgr.initRedis(6379, '127.0.0.1', (err) => {});

// RList test
var list = new RList('test');
async.waterfall([
    (next) => {
        RedisMgr.del(list, next);
    },
    (res, next) => {
        console.warn('del:' + res);
        list.rpush([3, 4, 5, 6, 7, 8, 9], next);
    },
    (res, next) => {
        console.warn('rpush:' + res + ', type=' + typeof res);
        list.lpop(next);
    },
    (res, next) => {
        console.warn('lpop:' + res + ', type=' + typeof res);
        list.lrange(0, -1, next);
    },
    (res, next) => {
        console.warn('lrange:' + res + ', type=' + typeof res + ', type in=' + typeof res[0]);
        next();
    },
    (next) => {
        list.llen((err, len) => {
            console.log('llen: ' + len + ', type=' + typeof len);
            next(err);
        });
    },
    (next) => {
        list.lset(1, 2, (err, len) => {
            console.log('lset: ' + len + ', type=' + typeof len);
            next(err);
        });
    },
    (next) => {
        RedisMgr.del(list, next);
    }
], (err) => {
    if (err) console.error(err);
});

//RHash test
//class Role extends RHash {
//    id:number = 0;
//    name:string = '';
//    level:number = 1;
//    account:string = '';
//    constructor(id_:number) {
//        super(id_.toString());
//        this.id = id_;
//    }
//
//    public loadAllData(callback:(err, result)=>void):void {
//        console.log('call Role function');
//        callback(null, [{
//            id: 101,
//            name: 'lala',
//            level: 101,
//            account: 'aaa'
//        }]);
//    }
//}
//var role = new Role(100);
//
//async.waterfall([
//    (next) => {
//        role.attachRO(next);
//    },
//    (next) => {
//        console.log(role);
//        if (role.name === '100') role.name = '200';
//        else role.name = '100';
//
//        role.hsetall(next);
//    },
//    (res, next) => {
//        console.log(res);
//        role.hdel(['account'], next);
//    },
//    (res, next) => {
//        console.log(res);
//        role.attachRO((err) => {
//            if (err) next(err);
//            else console.log(role);
//        });
//    }
//], (err) => {
//    if (err) console.log(err);
//});

// RSortedSet test
//var sortedSet = new RSortedSet('test');
//async.waterfall([
//    (next) => {
//        RedisMgr.del(sortedSet, next);
//    },
//    (res, next) => {
//        print('del', res);
//        sortedSet.zaddObject({cpp: 1, java:2, python:3, node:4}, next);
//    },
//    (res, next) => {
//        print('zaddObject', res);
//        sortedSet.zcard(next);
//    },
//    (res, next) => {
//        print('zcard', res);
//        sortedSet.zcount(2, 4, next);
//    },
//    (res, next) => {
//        print('zcount', res);
//        sortedSet.zrank('cpp', next);
//    },
//    (res, next) => {
//        print('zrank', res);
//        sortedSet.zrank('c++', next);
//    },
//    (res, next) => {
//        print('zrank', res);
//        sortedSet.zrange(0, -1, next, true);
//    },
//    (res, next) => {
//        print('zrange', res);
//        next();
//    }
//
//], (err) => {
//    if (err) console.error(err);
//});
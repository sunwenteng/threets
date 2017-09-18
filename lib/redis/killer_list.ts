//import RList = require('./builtin/list');
import RedisMgr = require('./redis_mgr');
import RedisManager = require('./redis_manager');

class KillerList {

    name:string = '';

    constructor(accountId:number) {
        this.name = 'KillerList:' + accountId;
    }

    public addKiller(killerId:number, cb:(err)=>void):void {
        RedisManager.role.conn.rpush([this.name, killerId], (err, res) => {
            if (err) {
                cb(err);
                return ;
            }

            RedisManager.role.conn.ltrim(this.name, -20, -1, (err, res) => {     // 保持最新的20个
                cb(err);
            });
        });
    }

    public pop3Killer(cb:(err, killers:number[]) => void):void {
        RedisManager.role.conn.llen(this.name, (err, len) => {
            if (err) {
                cb(err, []);
                return ;
            }

            if (len === 0) {
                cb(null, []);
                return ;
            }

            RedisManager.role.conn.lrange(this.name, 0, 2, (err, res:string[]) => {
                if (err) {
                    cb(err, []);
                    return ;
                }

                var result:number[] = [];
                res.forEach((killerId) => {
                    var id = parseInt(killerId);
                    if (!isNaN(id))
                        result.push(id);
                });

                if (len <= 3) {
                    RedisManager.role.conn.del(this.name, (err, res) => {
                        cb(err, result);
                    });
                } else {
                    RedisManager.role.conn.ltrim(this.name, 3, -1, (err, res) => {
                        cb(err, result);
                    });
                }
            });
        });
    }

}

export = KillerList;
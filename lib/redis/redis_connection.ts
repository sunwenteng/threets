import redis = require('redis');
class Redis {
    useName:string = '';
    conn:redis.RedisClient = null;
    constructor(useName:string) {
        this.useName = useName;
    }
    public setConnection(con:redis.RedisClient) {
        this.conn = con;
    }
    public quit() {
        if (this.conn) this.conn.quit();
    }
}
export = Redis;
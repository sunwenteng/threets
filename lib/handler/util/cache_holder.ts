import async = require('async');
import events = require('events');

var TIME_PERSISTENCE = 60 * 1000;   // 5 min
var TIME_CACHE = 60 * 1000;

interface Callback {
    (err, data?):void;
}

class Item {
    useCount:number = 0;
    lastUpdate:number = 0;
    data:any = null;
    cache:any = null;
    loadQueue:Callback[] = null;
}


/**
 * events:
 *  - "save:data"     (data)
 */
class CacheHolder extends events.EventEmitter {

    cacheData:{[key:number]:any} = {};

    public attach(key, loadFn, callback:(err, data?)=>void):void {
        var item:Item = this.cacheData[key];
        if (!item) {
            item = this.cacheData[key] = new Item();
        }

        item.useCount++;

        if (item.data) {
            return callback(null, item.data);
        }

        if (item.loadQueue) {
            item.loadQueue.push(callback);
            return ;
        }

        item.loadQueue = [callback];
        loadFn(key, (err, data, cache) => {
            if (data) {
                item.data = data;
                item.cache = cache;
            }

            item.loadQueue.forEach((cb) => {
                cb(err, data);
            });
            item.loadQueue = null;
        });
    }

    public detach(key, save=false):void {
        var item:Item = this.cacheData[key];
        if (!item) {
            return ;
        }

        item.useCount--;

        if (save || !item.useCount) {
            item.lastUpdate = Date.now();
            this.emit('save:data', item.data);
        }
    }

    public update():void {
        var now = Date.now();
        Object.keys(this.cacheData).forEach((key) => {
            var item:Item = this.cacheData[key];
            if (!item.useCount) {
                delete this.cacheData[key];
                return ;
            }

            if (now - item.lastUpdate > TIME_PERSISTENCE) {
                item.lastUpdate = now;
                if (item.data) this.emit('save:data', item.data);
            }

        });

    }

    public forEach(cb:(data:any, next)=>void, done):void {
        async.each(
            Object.keys(this.cacheData),
            (key, next) => {
                var item:Item = this.cacheData[key];
                if (item.data) cb(item.data, next);
                else next();
            },
            (err) => { if (done) done(err); }
        );
    }

    public clear() {
        this.cacheData = {};
    }

    public getData(key):any {
        var item:Item = this.cacheData[key];
        return item ? item.data : null;
    }

    public getCache(key):any {
        var item:Item = this.cacheData[key];
        return item ? item.cache : null;
    }

    public setCache(key, cache) {
        this.cacheData[key].cache = cache;
    }
}

export = CacheHolder;
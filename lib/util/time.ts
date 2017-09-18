/**
 * 所有时间以UTC时间为准
 */


// 存储游戏所有定时器
export var allTimer:NodeJS.Timer[] = [];

export function pushInterval(interval):void {
    allTimer.push(interval);
}
export function clearAllInterval():void {
    allTimer.forEach((interval:NodeJS.Timer) => {
        clearInterval(interval);
    });
}

var offset = 0;

export function realNow():number {
    return Math.floor(Date.now() / 1000);
}

export function gameNow():number {
    return Math.floor(Date.now() / 1000) + offset;
}

export function toSecTime(strtime:string):number {
    var temp = new Date(strtime);
    return Math.floor(temp.getTime() / 1000);
}

export function getOffset():number {
    return offset;
}

/**
 * 禁止调整服务器时间
 * 调整服务器时间危害大于好处，会引发奇怪的bug
 *
 * 通过其他方式来调试时间上的功能：GM指令，修改配表等
 */
export function setOffset(os:number) {
    //offset = os;
}

export function isSameDay(time1:number, time2:number):boolean {
    var d1 = new Date(time1 * 1000),
        d2 = new Date(time2 * 1000);
    return d1.getUTCDate() === d2.getUTCDate() && d1.getUTCMonth() === d2.getUTCMonth() && d1.getUTCFullYear() === d2.getUTCFullYear();
}

export function isToday(time:number):boolean {
    var d1 = new Date(time * 1000), d2 = new Date();
    return d1.getUTCDate() === d2.getUTCDate() && d1.getUTCMonth() === d2.getUTCMonth() && d1.getUTCFullYear() === d2.getUTCFullYear();
}

export function isYesterday(time:number):boolean {
    return isToday(time + 86400);
}

export function getDaySeconds(time:number):number {
    var date = new Date(time * 1000);
    return date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds();
}

export function getDateDiff(time1:number, time2:number):number {
    return Math.floor(time2 / 86400000) - Math.floor(time1 / 86400000);
}

export function calcLeftSecond(last:number, interval:number):number {
    var now = gameNow();
    return last + interval > now ? last + interval - now : 0;
}

// 适合主推类型的定时器判断
export class RoundCounter{
    private _interval:number;
    private _start:number;
    constructor(interval){
        this._interval = interval;
        this._start = 0;
    }

    public setStart(now:number):void {
        this._start = now;
    }

    public getStart():number {
        return this._start;
    }

    public roundCount(now:number):number {
        if (now <= this._start) {
            return 0;
        } else {
            var count = Math.floor((now - this._start) / this._interval);
            this._start += count * this._interval;
            return count;
        }
    }

    public leftSecondForCount(now:number, count:number):number {
        if (now <= this._start) {
            return count * this._interval;
        }
        return this._interval * count - (now - this._start) % this._interval;
    }
}

export class IntervalTimer{
    private _interval:number = 1;
    private _lastUpdate:number = 0;

    constructor(interval:number, start=0){
        this._interval = interval;
        this._lastUpdate = start;
    }

    public passed(now:number):boolean{
        return now >= this._lastUpdate + this._interval;
    }

    public update(now:number):void{
        this._lastUpdate = now;
    }
}

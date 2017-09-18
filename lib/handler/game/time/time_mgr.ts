import TimeDef = require('./defines');

import pb = require('node-protobuf-stream');

class TimeMgr {
    timestamps:{[id:number]:number} = {};

    public setTime(type:TimeDef.TIME_STAMP, value:number):void {
        this.timestamps[type] = value;
    }

    public getTime(type:TimeDef.TIME_STAMP):number {
        return this.timestamps[type] || 0;
    }

    public delKey(type:TimeDef.TIME_STAMP):void {
        delete this.timestamps[type];
    }

    public buildDBMsg():any {
        var time_control = pb.get('.DB.time_control');
        var pck = new time_control();
        Object.keys(this.timestamps).forEach((id) => {
            pck.timestamps.push({
                key: parseInt(id),
                value: this.timestamps[id]
            });
        });
        return pck;
    }

    public loadDBMsg(msg:any):void {
        if (msg.timestamps) {
            msg.timestamps.forEach((pair:{key:number; value:number}) => {
                this.timestamps[pair.key] = pair.value;
            });
        }
    }
}

export = TimeMgr;
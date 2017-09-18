import pb = require('node-protobuf-stream');

class chanceMgr {
    counters:{ [i:number]: number } = {};

    public initMgr() {
        this.counters = {};
    }

    public addCounter(index:number):void {

        if (this.counters[index]) {
            this.counters[index] += 1;
        }
        else {
            this.counters[index] = 1;
        }
    }

    public getCounter(index:number):number {
        return this.counters[index] || 0;
    }

    public buildDBMsg():any {
        var chanceCounter = pb.get('.DB.chanceCounter');
        var pck = new chanceCounter();
        Object.keys(this.counters).forEach((key) => {
            pck.counters.push({
                ID: parseInt(key),
                counter: this.counters[key]
            })
        });
        return pck;
    }

    public loadDBMsg(msg:any) {
        this.initMgr();
        var i, item;

        for (i = 0; i < msg.counters.length; i += 1) {
            item = msg.counters[i];
            this.counters[item.ID] = item.counter;
        }
    }
}

export = chanceMgr;
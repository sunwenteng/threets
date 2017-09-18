import Universal = require('../universal');

class Loot {
    resource:Universal.Resource = {};

    constructor() {
        this.resource = {};
    }

    public addRes(resId:number, count:number):void{
        if (!this.resource[resId]) {
            this.resource[resId] = count;
        } else {
            this.resource[resId] += count;
        }
    }

    public addResObj(resource:Universal.Resource):void {
        Object.keys(resource).forEach((resId) => {
            if (!this.resource[resId]) {
                this.resource[resId] = resource[resId];
            } else {
                this.resource[resId] += resource[resId];
            }
        });
    }

    public addLoot(loot:Loot):void {
        Object.keys(loot.resource).forEach((key) => {
            if (!this.resource[key]) {
                this.resource[key] = loot.resource[key];
            } else {
                this.resource[key] += loot.resource[key];
            }
        });
    }

    public toString():string {
        return JSON.stringify(this.resource);
    }

    public getLootResource() {
        return this.resource;
    }

    public buildDBMsg():any {
        var pck = { resource: []};
        Object.keys(this.resource).forEach((key) => {
            var keyId = parseInt(key);
            if (!isNaN(keyId))
            pck.resource.push({
                key: keyId,
                value: this.resource[key]
            });
        });
        return pck;
    }

    public loadDBMsg(msg:any):void {
        if (msg.resource) {
            msg.resource.forEach((pair) => {
                this.resource[pair.key] = pair.value;
            });
        }
    }

    public buildInitNetMsg():any {
        var pck = {resource: []};
        Object.keys(this.resource).forEach((key) => {
            var keyId = parseInt(key);
            if (!isNaN(keyId))
                pck.resource.push({
                    key: keyId,
                    value: this.resource[key]
                });
        });
        return pck;
    }

}

export = Loot;
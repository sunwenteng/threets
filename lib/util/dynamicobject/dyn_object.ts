class DynObject {
    objectType:number = 0;
    objectTypeId:number = 0;
    objectUpdated:boolean = false;

    indexValue:{[uid:string]:any} = {};
    updateMask:{[uid:string]:any} = {};

    public setValue(index:string, value:any) {
        if (this.indexValue[index] !== value) {
            this.indexValue[index] = value;
            this.updateMask[index] = value;
            this.objectUpdated = true;
        }
    }

    public getValue(index:string):any {
        return this.indexValue[index];
    }

    public needUpdate():boolean {
        return this.objectUpdated;
    }

    public clearUpdateMask() {
        this.objectUpdated = false;
        this.updateMask = {};
    }

    public buildInitArray():{key:number;value:any}[] {
        var array = [], key, keyID;
        for (key in this.indexValue) {
            keyID = parseInt(key);
            if (isNaN(keyID) || isNaN(parseInt(this.indexValue[keyID]))) {
                continue;
            }
            array.push({
                key: keyID,
                value: this.indexValue[key]
            });
        }
        this.clearUpdateMask();
        return array;
    }

    public buildUpdateArray():{key:number;value:any}[] {
        var array = [], key, keyID;
        for (key in this.updateMask) {
            keyID = parseInt(key);
            if (isNaN(keyID) || isNaN(parseInt(this.indexValue[key]))) {
                continue;
            }
            array.push({
                key: keyID,
                value: this.updateMask[key]
            });
        }
        this.clearUpdateMask();
        return array;
    }

    public clearAllValue() {
        this.indexValue = {};
        this.updateMask = {};
    }

    public getInitObject():{[uid:string]:any} {
        return this.indexValue;
    }

    public getUpdateObject():{[uid:string]:any} {
        return this.updateMask;
    }

    public exportData():any {
        return this.indexValue;
    }
}

export = DynObject;
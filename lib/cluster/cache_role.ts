
import Time = require('../util/time');

class CacheData {
    originValue:string = '';
    updateValue:string = '';
    constructor(origin) {
        this.originValue = origin;
    }
}

class CacheRole {

    data:{[key:string]:CacheData} = {};

    loadData(obj) {
        this.data = {};
        Object.keys(obj).forEach((key) => {
            this.data[key] = new CacheData(obj[key]);
        });
    }

    getOriginValue(key):string {
        return this.data[key] ? this.data[key].originValue : null;
    }

    setUpdateValue(key:string, value:string, insertIfNotExistKey=true):void {
        if (!this.data[key]) {
            if (insertIfNotExistKey) {
                this.data[key] = new CacheData('');
                this.data[key].updateValue = value;
            }
            return ;
        }
        this.data[key].updateValue = value;
    }

    buildUpdateObject():any {
        var result:any = {};
        Object.keys(this.data).forEach((key) => {
            var data = this.data[key];
            if (data.updateValue && data.originValue !== data.updateValue) {
                result[key] = data.updateValue;
            }
        });

        if (Object.keys(result).length) {
            result._updateTime = Time.gameNow();
        }

        return result;
    }

}

export = CacheRole;
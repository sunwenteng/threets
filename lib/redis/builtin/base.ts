class RBase {
    key:string = null;
    constructor(key:string) {
        this.key = this.constructor['shortName'] + ':' + key;
        //console.log(this.key);
    }
}
export = RBase;
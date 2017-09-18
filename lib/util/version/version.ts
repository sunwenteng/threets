
var VERSION_COUNT = 3;

class Version {

    v:number[] = [0,0,0];

    constructor(versionString?:string) {
        if (versionString) {
            this.loadString(versionString);
        }
    }

    public loadString(versionString:string):void {
        var value, list:string[] = versionString.split('.');
        for (var i = 0; i < VERSION_COUNT && i < list.length; i += 1) {
            if (list[i] === 'x') {
                value = -1;
            } else {
                value = parseInt(list[i]);
                if (isNaN(value)) {
                    throw new Error('invalid version, pos[' + i + '] is NaN, content=[' + versionString + ']');
                }
            }
            this.v[i] = value;
        }
    }

    public toString():string {
        return this.v.join('.');
    }

}

export = Version;
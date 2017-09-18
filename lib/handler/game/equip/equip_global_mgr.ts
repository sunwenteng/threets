
var cm = require('../../../config').configMgr;

var sumExp:{[maxlv:number]:number[]} = {};

export function reloadConfig():void {
    sumExp = {};
    [1, 30, 50, 70, 99].forEach((level) => {
        var expField = 'LV' + level + 'Exp';
        var sum = sumExp[level] = [0, 0];   // 0级0，1级0
        for (var i = 1; i < level; ++i) {
            sum[i+1] = sum[i] + cm.equipexpdb.get(i)[expField];
        }
    });
}

export function getTotalExp(level:number, maxlv:number):number {
    return sumExp[maxlv][level];
}
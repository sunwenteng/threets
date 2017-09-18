
import Common = require('../server_share/common');

export function parseRegionName(name):any {
    var match = /^([a-z0-9-]+)(\.(a|b|c))?$/.exec(name);
    if (!match) return null;
    return {
        regionName: match[1],
        testType: match[3]
    };
}
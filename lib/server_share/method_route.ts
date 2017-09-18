import path = require('path');
import pbstream = require('node-protobuf-stream');

import Log = require('../util/log');

interface GetModuleFile {
    (module:string):string;
}

class MethodRoute {

    moduleMap:{[nameSpace:string]:{[module:string]:any}} = {};

    public loadModule(nameSpace:string, module:string, getModule:GetModuleFile):void {
        var Package = pbstream.get(['', nameSpace, module].join('.'));
        if (!Package) return;

        if (!this.moduleMap[nameSpace]) this.moduleMap[nameSpace] = {};
        this.moduleMap[nameSpace][module] = getModule(module);
    }

    public getHandler(fqn:string):any {
        var tmp = fqn.split('.');
        try {
            return this.moduleMap[tmp[1]][tmp[2]][tmp[3]];
        } catch (e) {
            return null;
        }
    }

}

export = MethodRoute;
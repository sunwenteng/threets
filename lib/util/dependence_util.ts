import fs = require('fs');
import path = require('path');
import yaml = require('js-yaml');

import Algorithm = require('./algorithm');
import Util = require('./game_util');

var dependencies:{[name:string]:string[]} = {};
var regDeps = {};
var indeps = {};    // 独立模块
export var startupSort:string[] = [];
export var shutdownSort:string[] = [];

function splitDep(value) {
    return value.split(',').map((val) => {return val.trim();});
}

export function loadFile():void {
    var content = fs.readFileSync(path.join(__dirname, '../../module.dependence.yml')).toString();
    var deps = yaml.safeLoad(content);
    deps.forEach((item:any) => {
        if (typeof item.dependencies === 'string')
            Util.pushArrayInMap(dependencies, item.name, splitDep(item.dependencies));
        else if (Array.isArray(item.dependencies))
            item.dependencies.forEach((dep) => {Util.pushArrayInMap(dependencies, item.name, splitDep(dep));});
    });

    var dag:{[name:string]:string[]} = {};
    Object.keys(dependencies).forEach((v) => {
        if (!dependencies[v]) return ;
        dependencies[v].forEach((u) => {
            Util.pushArrayInMap(dag, u, v);
        });
    });

    startupSort = Algorithm.topologicalSort(dag);
    console.log(startupSort.join(' => '));

    for (var i = startupSort.length - 1; i >= 0; i--) {
        shutdownSort.push(startupSort[i]);
    }
}

export function calcExternalDependencies(nameList:string[]):{indeps:string[]; deps:string[]} {
    var result = {indeps:{}, deps:{}};

    return {
        indeps: Object.keys(result.indeps),
        deps: Object.keys(result.deps)
    };
}

export function getAllOf(regex?:RegExp):string[] {
    if (!regex) return Object.keys(dependencies);
    return Object.keys(dependencies).filter((value) => { return regex.test(value); });
}

export function getDependencies(name:string):string[] {
    return dependencies[name];
}
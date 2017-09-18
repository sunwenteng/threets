/**
 * 只存储全局变量，不实现函数
 */

import url = require('url');

export var shortTitle = 'dh';
export var fullTitle = 'dragon-hunter';

class Package {
    name:string = '';
    version:string = '';
}

export var pkg:Package = new Package();

class RunInfo {
    mode:string = '';
    component:string[] = [];
}
export var run:RunInfo = new RunInfo();


class Host {
    hostname:string = '';
    port:number = 0;
    toString() {
        return this.hostname + ':' + this.port;
    }
}
export var bind:Host = new Host();


class Work {
    rootPath:string = '';
    configPath:string = '';
    logLevel:string = 'INFO';
}
export var work:Work = new Work();

class Region {
    name:string;
    test:boolean;
}

export var region:Region = new Region();

export var consul:url.Url = null;

export var useDocker:boolean = false;

export var eth = null;
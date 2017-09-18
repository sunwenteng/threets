
export class Region {
    name:string;
    test:boolean;
}

export class Work {
    rootPath:string;
    configPath:string;
    logLevel:string;
}

export type ServiceList = string[];
export type HandlerList = string[];

export class Mode {
    type:ModeType;
    handler:HandlerList = [];
    service:ServiceList = [];
}

export enum ModeType {
    STANDALONE = <any>"Standalone",
    PSEUDO_DISTRIBUTED = <any>"Pseudo-Distributed",
    FULLY_DISTRIBUTED = <any>"Fully-Distributed"
}

export class Database {
    name: string;
    hostname:string;
    user:string;
    password:string;
    database:string;
    connectionLimit:number;
}

export type DatabaseList = Database[];

export class Redis {
    name:string;
    hostname:string;
    port:number;
}

export type RedisList = Redis[];

export class Tcp {
    hostname:string;
    intranet:string;
    port:number;
}

export class EnterFile {
    region:Region = new Region();
    work:Work = new Work();
    mode:Mode = new Mode();
    database:DatabaseList = [];
    redis:RedisList = [];
    tcp:{api:Tcp; rpc:Tcp} = {api:new Tcp(), rpc:new Tcp()};
}
module Elements {

    export class WorkCfg {
        serverId: number;
        serverType: ServerType;
        workPath: string;
        test: boolean;
        configPath: string;
        logLevel: string;
    }

    export class MysqlDatabaseCfg {
        intranet: string;
        user: string;
        password: string;
        database: string;
        connectionLimit: number;
    }

    export class NetCfg {
        hostname: string;
        port: number;
        intranet: string;
    }

    export enum ServerType {
        LOGIN  = 1,
        GAME   = 2,
        CENTER = 3,
    }

    export class RedisCfg {
        host: string;
        port: number;
    }

}

export module Collection {

    export class GameConfig {
        work: Elements.WorkCfg;
        database: Elements.MysqlDatabaseCfg;
        net: Elements.NetCfg;
    }

    export class CenterConfig {
        work: Elements.WorkCfg;
        net: Elements.NetCfg;
        database: Elements.MysqlDatabaseCfg;
        redis: Elements.RedisCfg;
    }

    export class LoginConfig {
        work: Elements.WorkCfg;
        database: Elements.MysqlDatabaseCfg;
        net: Elements.NetCfg;
    }

}
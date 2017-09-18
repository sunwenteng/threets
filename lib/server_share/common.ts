export class LevelUp {
    originLevel:number = 1;
    resultLevel:number = 1;
    originExp:number = 0;
    resultExp:number = 0;
    growCount:number = 0;   // 上涨数量
}

export class Level {
    level:number = 1;
    exp:number = 0;
}

export class Passport {
    passportId:number = 0;
    passport:string = '';
    privilegeLevel:number = 0;
}

export class DHClient {
    platformId:number = 0;
    clientVersion:string = '';
    resourceVersion:number = 0;
}

export class Device {
    OS:string = '';  // operating system
    type:string = '';
    uid:string = '';
}

export class Region {
    code: string;
    name: string;
    description: string;
}

/**
 * 大区运行信息
 */
export class RegionActive {
    region: Region;
    testType: string;
}

export enum ExitCode {
    SUCCESS                         = 0,
    CREATE_PID_FILE_FAILED          = 1,
    INIT_PROTOCOL_AND_ROUTER_FAILED = 2,
    UNHANDLED_ERROR                 = 3,
    NO_VALID_ETH                    = 4,
    UNCAUGHT_EXCEPTION              = 9
}
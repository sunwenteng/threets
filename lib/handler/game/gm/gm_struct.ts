import Role = require('../role');

export enum GM_TYPE {
    NORMAL = 0,	// 普通权限，注册默认，消耗钻石计入数据统计，不可使用外网指令，只在服务器正常情况下可登录
    TEST_NORMAL = 1,	// 普通权限，注册默认，消耗钻石计入数据统计，不可使用外网指令，服务器维护状态下，可登录
    TYPE_ = 2,	// not use
    TASTE = 3,	// 普通权限，充值，消耗钻石不计入数据统计，不可使用外网指令，只在服务器正常情况下可登录
    GM = 4      	// GM权限，充值，消耗钻石不计入数据统计，可使用外网指令，服务器维护状态下，可登录
}

export enum GM_STATE {
    NEW = 0,
    PENDING = 1,
    RUNNING = 2,
    COMPLETE = 3,
    CANCEL = 4,
    CANCELED = 5,
    ERROR = 6,
    DO_VALIDATE = 7,
    DO_TRIGGER = 8,
    DO_TICK = 9,
    DO_COMPLETE = 10
}

export enum GM_COMMAND_TARGET_TYPE {
    SERVER = 1,
    ROLE = 2,
    PASSPORT = 3
}

export class GmCommand {
    auto_id:number = 0;
    target_id = 0;
    opr:string = "";
    target_type:number = GM_COMMAND_TARGET_TYPE.SERVER;
    start_time:number = 0;
    end_time:number = 0;
    backup_value:string = "";
    status:number = GM_STATE.NEW;
    params:string = "";
    bDirty:boolean = false;
    errMsg:string = "";
    paramArr:string[] = [];

    constructor() {
    }

    assertParamNum(paramNum):boolean {
        this.paramArr = this.params.split('|');
        if (this.paramArr.length >= paramNum) {
            return true;
        }
        return false;
    }

    tick(cb:(ret:boolean)=>void) {
        cb(true);
    }

    validate(cb:(ret:boolean)=>void) {
        cb(true);
    }

    trigger(cb:(ret:boolean)=>void) {
        cb(true);
    }

    complete(cb:(ret:boolean)=>void) {
        cb(true);
    }

    handlerRole(role:Role, cb:(ret:boolean)=>void) {
        cb(null);
    }

    cancel(cb:(ret:boolean)=>void) {
        if (this.status === GM_STATE.NEW || this.status === GM_STATE.PENDING) {
            this.status = GM_STATE.CANCELED;
            this.bDirty = true;
            cb(true);
        }
        else if (this.status === GM_STATE.RUNNING) {
            this.complete((ret:boolean)=> {
                if (ret) {
                    this.status = GM_STATE.CANCELED;
                    this.bDirty = true;
                    cb(true);
                }
                else
                    cb(false);
            });
        }
        else {
            cb(false);
        }
    }

    dirty():boolean {
        return this.bDirty;
    }

    reset():void {
        this.bDirty = false;
    }
}
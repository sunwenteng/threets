import sourceMap = require('source-map-support');

class ErrorClass implements Error {
    name: string;
    message: string;
    constructor(message: string) {
        this.message = message;
    }
}

export class UserError extends ErrorClass {
    errorId:number = 0;
    param:number[];

    constructor(errorId:number, message:{msg:string; param?:number[]}) {
        super(message.msg);
        this.errorId = errorId;
        if (message.param) {
            this.param = message.param;
        }
        var v8Handler = Error['prepareStackTrace'];
        Error['prepareStackTrace'] = (t, v8StackTrace:any[]) => {
            return [sourceMap.wrapCallSite(v8StackTrace[0])];
        };
        Error['captureStackTrace'](this, UserError);
        Error['prepareStackTrace'] = v8Handler;
    }
}
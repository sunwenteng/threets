import Log = require('./log');
import CE = require('./errors');
import ERRC = require('./error_code');

var codeMap:{[error:string]:number} = {};

export var CENTER_RPC_SOCKET_NOT_READY:string = 'CENTER_RPC_SOCKET_NOT_READY';
export var GIFT_CODE_ID_NOT_FOUND:string = 'GIFT_CODE_ID_NOT_FOUND';

export var RPC_TIME_OUT = 'RPC_TIME_OUT';
codeMap[RPC_TIME_OUT] = ERRC.RPC.TIMEOUT;

export var RPC_SESSION_NOT_FOUND = 'RPC_SESSION_NOT_FOUND';
codeMap[RPC_SESSION_NOT_FOUND] = ERRC.RPC.SESSION_NOT_FOUND;

export var RPC_SOCKET_CLOSED = 'RPC_SOCKET_CLOSED';
codeMap[RPC_SOCKET_CLOSED] = ERRC.RPC.SOCKET_CLOSED;

export function convertErrorMsg(message:string):number {
    var code = codeMap[message];
    if (code) return code;
    return 0;
}

export function handlerError(err:any) {
    var error = {code: ERRC.COMMON.UNKNOWN, param: []};

    if (err instanceof CE.UserError) {
        error.code = err.errorId;
        error.param = err.param;

    } else if (err instanceof Error) {

        if (err.hasOwnProperty('code')) {   // SystemError like
            var code = convertErrorMsg(err.code);
            if (code) {
                error.code = code;
            }
            else {
            }
        } else {    // no code property

            var code = convertErrorMsg(err.message);
            if (code) {
                error.code = code;
            }
        }

    } else {    // not a Error class

        // err which is propagated by caller
        if (err.hasOwnProperty('code') && typeof err.code === 'number') {
            error.code = err.code;
            if (err.hasOwnProperty('param')) {
                error.param = err.param;
            }
        } else {
        }

    }

    return error;
}
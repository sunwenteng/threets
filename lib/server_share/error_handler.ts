import CE = require('../util/errors');
import ERRC = require('../util/error_code');
import ErrorMsg = require('../util/error_msg');
import Log = require('../util/log');

import Tcp = require('../net/tcp');

interface NetError {
    code: number;
    param: number[];
    message?: string;
}

type ErrorCollection = Error | CE.UserError | NetError;

function HandleError(err:ErrorCollection, session:Tcp.Session):any {
    var error:{code:number;param:number[];message?:string} = {code: ERRC.COMMON.UNKNOWN, param: []};
    var code, errorText;
    if (err instanceof CE.UserError) {
        error.code = err.errorId;
        error.param = err.param;

        Log.userError(err, session.sessionId, 'HandleError',
            'error_code=' + error.code + ', message=' + (err.message||'!!Forget to write message!!'));

    } else if (err instanceof Error) {
        errorText = err.hasOwnProperty('code') ? err['code'] : err.message;
        code = ErrorMsg.convertErrorMsg(errorText);
        if (code) error.code = code;
        else error.message = errorText; // error.code == ERRC.COMMON.UNKNOWN

        Log.userError(err, session.sessionId, 'HandleError',
            'code=' + code + ', errorText=' + errorText +  ', message=' + err.message);

    } else {    // not a Error class
        if (err['code'] && typeof err['code'] === 'number') {
            error.code = err['code'];
            if (err.hasOwnProperty('param') && Array.isArray(err['param']) && err['param'].length > 0) {
                error.param = err['param'];
            }
            if (err.message) {
                error.message = err.message;
            }

            Log.uError(session.sessionId, 'HandleError',
                'error_code=' + error.code + ', message=' + error.message + ', param=' + JSON.stringify(error.param));

        } else {
            Log.uError(session.sessionId, 'HandleError', '[Couldn\'t Handle Error] type=' + (typeof err) + ', message=' + JSON.stringify(err));
        }
    }

    return {error: error};
}

export = HandleError;
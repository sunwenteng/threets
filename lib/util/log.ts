import log4js = require('log4js');
import sourceMap = require('source-map-support');
import util = require('util');
import mkdirp = require('mkdirp');
import path = require('path');
import index = require('../../index');
import CustomError = require('./errors');

/*
 日志等级说明

 TRACE：非常细节的调试日志，如战斗回合数据。特征：在单独一个操作下的日志输出的量的上限很高

 DEBUG：调试日志，如回包数据内容。特征：在单独一个操作下的日志输出的量的为一个常数级别，并且这个常数不高

 INFO：普通日志，如玩家的操作日志（发包数据内容）

 WARN：警告日志，特征：不会立即引起崩溃，也不会对当前结果造成影响，但是可能会产生严重后果的日志

 ERROR：分为
    1. 玩家错误日志
        玩家操作错误的日志，如金币不足等错误；
    2. 系统错误日志
        没有立即引起宕机，但是已经产生非正常结果的日志，如网络错误

 FATAL: 宕机日志，或者非常严重的日志
 */

function StringifyCollection(obj:Object):string {
    var result = '';
    Object.keys(obj).forEach((key, index) => {
        var value = obj[key];
        if (index > 0) result += '|';
        result += key + '=';

        if (typeof value === 'object') result += StringifyCollectionValue(value);
        else result += value;
    });
    return result;
}

function StringifyCollectionValue(obj:Object):string {
    var result = '{';

    Object.keys(obj).forEach((key, index) => {
        var value = obj[key];
        if (index > 0) result += ';';
        result += key + ':';

        if (typeof value === 'object') result += StringifyCollectionValue(value);
        else result += value;
    });

    result += '}';
    return result;
}

function LineInfoDefault():string {
    //var oldLimit = Error['stackTraceLimit'];
    //Error['stackTraceLimit'] = Infinity;

    var dummyObject:any = {};
    var v8Handler = Error['prepareStackTrace'];
    Error['prepareStackTrace'] = (error, stack:any[]) => {
        /* 使用9是因为要跳过 log4j 本身的堆栈 */
        return [sourceMap.wrapCallSite(stack[1])];
    };
    Error['captureStackTrace'](dummyObject, arguments.callee);

    var frame:any = dummyObject.stack[0];
    Error['prepareStackTrace'] = v8Handler;
    //Error['stackTraceLimit'] = oldLimit;

    return /([^\/]*)$/.exec(frame.getFileName())[1] + ":" + frame.getFunctionName() + ":" + frame.getLineNumber();
}

interface FrameMatch {
    func:string;
    file:string;
    line:number;
    column:number;
}

function parseFrame(line):FrameMatch {
    function namedFrame(line) {
        var match = /    at ([^(]+) \((.+):(\d+):(\d+)\)/i.exec(line);
        return match ? {
            func: match[1],
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4])
        } : {
            func: '<native>',
            file: '<native>',
            line: 0,
            column: 0
        };
    }

    function unnamedFrame(line) {
        var match = /    at (.+):(\d+):(\d+)/i.exec(line);
        return match ? {
            func: '<anonymous>',
            file: match[1],
            line: parseInt(match[2], 10),
            column: parseInt(match[3], 10)
        } : null;
    }

    return line.indexOf('(') !== -1 ? namedFrame(line) : unnamedFrame(line);
}

function LineInfoFromStack(stack) {
    var lines = stack ? stack.split('\n') : [''];
    var firstFrame = parseFrame(lines[1]);
    return /([^\/]*)$/.exec(firstFrame.file)[1] + ":" + firstFrame.func + ":" + firstFrame.line;
}

class Log {
    private static m_logger:log4js.Logger[];
    private static m_haveInit:boolean = false;

    public static isInit():boolean {
        return this.m_haveInit;
    }

    public static init(dirName:any, logLevel?:string):void {
        var logDir = dirName;
        mkdirp.sync(logDir);

        var consoleAppender:any = {
            type: "console",
            layout: {
                type: "pattern",
                /* 多加了颜色 */
                pattern: "%[%d{yyyy-MM-dd hh:mm:ss},%p,%x{roleId},%x{operation},%x{line},%x{content}%]",
                tokens: {
                    line: (log) => {
                        return log.data[0];
                    },
                    roleId: (log) => {
                        return log.data[1];
                    },
                    operation: (log) => {
                        return log.data[2];
                    },
                    /* 此处 pattern 中使用 %x{content} 代替 %m 是为了支持 roleId */
                    content: (log) => {
                        return util.format.apply(util, log.data.slice(3));
                    }
                }
            },
            category: ["static-console"]
        };

        var fatalFileAppender:any = {
            type: "dateFile",
            filename: logDir + "/fatal.log",
            pattern: ".yyyy-MM-dd",
            layout: {
                type: "pattern",
                pattern: "%d{yyyy-MM-dd hh:mm:ss},%p,%x{roleId},%x{operation},%x{line},%x{content}",
                tokens: {
                    line: (log) => {
                        return log.data[0];
                    },
                    roleId: (log) => {
                        return log.data[1];
                    },
                    operation: (log) => {
                        return log.data[2];
                    },
                    /* 此处 pattern 中使用 %x{content} 代替 %m 是为了支持 roleId */
                    content: (log) => {
                        return util.format.apply(util, log.data.slice(3));
                    }
                }
            },
            category: ["static-fatal"]
        };

        var logFileAppender:any = {
            type: "dateFile",
            filename: logDir + "/dragon-hunter.log",
            pattern: ".yyyy-MM-dd",
            layout: {
                type: "pattern",
                pattern: "%d{yyyy-MM-dd hh:mm:ss},%x{level},%x{roleId},%x{operation},%x{line},%x{content}",
                tokens: {
                    line: (log) => {
                        return log.data[0];
                    },
                    roleId: (log) => {
                        return log.data[1];
                    },
                    operation: (log) => {
                        return log.data[2];
                    },
                    /* 此处 pattern 中使用 %x{content} 代替 %m 是为了支持 roleId */
                    content: (log) => {
                        return util.format.apply(util, log.data.slice(3));
                    },
                    level: (log) => {
                        switch (log.level.level) {
                            case 5000   :
                                return 1;   /* trace */
                            case 10000  :
                                return 1;   /* debug */
                            case 20000  :
                                return 2;   /* info */
                            case 30000  :
                                return 3;   /* warning */
                            case 40000  :
                                return 4;   /* error */
                            case 50000  :
                                return 4;   /* fatal */
                        }
                        return 0;
                    }
                }
            },
            category: ["dynamic-log"]
        };

        log4js.configure({
            appenders: [
                fatalFileAppender,
                logFileAppender,
                consoleAppender
            ]
            //replaceConsole: true
        });

        this.m_logger = [];

        var logger;
        logger = log4js.getLogger('static-console');
        logger.setLevel(log4js.levels.TRACE);
        this.m_logger.push(logger);

        logger = log4js.getLogger('static-fatal');
        logger.setLevel(log4js.levels.FATAL);
        this.m_logger.push(logger);

        logger = log4js.getLogger('dynamic-log');
        if (logLevel) logger.setLevel(log4js.levels.toLevel(logLevel, log4js.levels.INFO));
        else logger.setLevel(log4js.levels.INFO);
        this.m_logger.push(logger);

        this.m_haveInit = true;

    }

    public static setLevel(level:string):boolean {
        var logger = log4js.getLogger('dynamic-log');
        if (logger) {
            logger.setLevel(level);
            return true;
        }
        return false;
    }

    // user
    public static uTrace(roleId:number, operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoDefault()].concat(Array.prototype.slice.call(arguments));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].trace.apply(this.m_logger[i], arg);
        }
    }

    public static uDebug(roleId:number, operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoDefault()].concat(Array.prototype.slice.call(arguments));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].debug.apply(this.m_logger[i], arg);
        }
    }

    public static uInfo(roleId:number, operation:string, message:any, ...args:any[]):void {
        var i, arg = [LineInfoDefault()].concat(Array.prototype.slice.call(arguments));
        for (i = 3; i < arg.length; i += 1) {
            if (typeof arg[i] === 'object') {
                arg[i] = StringifyCollection(arg[i]);
            }
        }
        for (i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].info.apply(this.m_logger[i], arg);
        }
    }

    public static uWarn(roleId:number, operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoDefault()].concat(Array.prototype.slice.call(arguments));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].warn.apply(this.m_logger[i], arg);
        }
    }

    public static uError(roleId:number, operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoDefault()].concat(Array.prototype.slice.call(arguments));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].error.apply(this.m_logger[i], arg);
        }
    }

    // system
    public static sTrace(operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoDefault(), 0].concat(Array.prototype.slice.call(arguments));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].trace.apply(this.m_logger[i], arg);
        }
    }

    public static sDebug(operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoDefault(), 0].concat(Array.prototype.slice.call(arguments));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].debug.apply(this.m_logger[i], arg);
        }
    }

    public static sInfo(operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoDefault(), 0].concat(Array.prototype.slice.call(arguments));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].info.apply(this.m_logger[i], arg);
        }
    }

    public static sWarn(operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoDefault(), 0].concat(Array.prototype.slice.call(arguments));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].warn.apply(this.m_logger[i], arg);
        }
    }

    public static sError(operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoDefault(), 0].concat(Array.prototype.slice.call(arguments));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].error.apply(this.m_logger[i], arg);
        }
    }

    public static sFatal(operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoDefault(), 0].concat(Array.prototype.slice.call(arguments));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].fatal.apply(this.m_logger[i], arg);
        }
    }

    public static sFatalError(err:Error, operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoFromStack(err['stack']), 0].concat(Array.prototype.slice.call(arguments, 1));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].fatal.apply(this.m_logger[i], arg);
        }
    }

    public static userError(err:Error, roleId:number, operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoFromStack(err['stack'])].concat(Array.prototype.slice.call(arguments, 1));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].error.apply(this.m_logger[i], arg);
        }
    }

    public static stackError(err:Error, operation:string, message:string, ...args:any[]):void {
        var arg = [LineInfoFromStack(err['stack']), 0].concat(Array.prototype.slice.call(arguments, 1));
        for (var i = 0; i < this.m_logger.length; i += 1) {
            this.m_logger[i].error.apply(this.m_logger[i], arg);
        }
    }
}

export = Log;
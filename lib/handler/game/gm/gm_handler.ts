
import GmList = require('./gm_list');

import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Util = require('../../../util/game_util');

class Node {
    next = {};
    gmCmd = null;
}

var root = new Node();

export function addPattern(pattern, command) {
    var node = root, patternArray = pattern.split(' ');
    for (var i = 0; i < patternArray.length; i += 1) {
        if (!node.next[patternArray[i]]) {
            node.next[patternArray[i]] = new Node();
        }
        node = node.next[patternArray[i]];
    }
    if (!node.gmCmd && node !== root) {
        node.gmCmd = command;
    }
}

export function preProcess() {
    var cmd, gmCmd, gmList = GmList.gmList;
    for (cmd in gmList) {
        gmCmd = gmList[cmd];
        addPattern(cmd, gmCmd);

        if (gmCmd.alias) {
            for (var i = 0; i < gmCmd.alias.length; i += 1) {
                addPattern(gmCmd.alias[i], gmCmd);
            }
        }
    }
}

export function buildGMCommandList():any {
    var gmCommands = [];
    Object.keys(GmList.gmList).forEach((cmd) => {
        var gm = GmList.gmList[cmd];
        var command:any = {};

        command.cmd = cmd;
        command.alias = gm.alias.length ? gm.alias[0] : '';
        command.description = gm.description;
        command.fixed = gm.fixed;
        command.ext = gm.ext;

        gmCommands.push(command);
    });
    return gmCommands;
}

export function findCommand(cmdArray) {
    var i, node = root, depth = 0;
    for (i = 0; i < cmdArray.length; i += 1) {
        if (!node.next[cmdArray[i]]) {
            break;
        }
        ++depth;
        node = node.next[cmdArray[i]];
    }
    return {
        gmCmd: node.gmCmd,
        depth: depth
    };
}

export function parseField(field, cmdParam, container) {
    var value;
    switch (field.type) {
        case "number" : {
            value = parseInt(cmdParam);
            if (isNaN(value)) {
                throw new CustomError.UserError(ERRC.COMMON.GM_COMMAND_ERROR, {
                    msg: 'COMMON.GM_COMMAND_ERROR, TypeError, field=' + JSON.stringify(field) + ', param=' + cmdParam
                });
            }
            if (field.max && field.max < value) {
                throw new CustomError.UserError(ERRC.COMMON.GM_COMMAND_ERROR, {
                    msg: 'COMMON.GM_COMMAND_ERROR, TooMax, field=' + JSON.stringify(field) + ', param=' + cmdParam
                });
            }
            break;
        }
        case "string" : {
            value = cmdParam;
            break;
        }
        default : {
            throw new CustomError.UserError(ERRC.COMMON.GM_COMMAND_ERROR, {
                msg: 'COMMON.GM_COMMAND_ERROR, FieldError, TypeNotFound, field=' + JSON.stringify(field)
            });
        }
    }
    container[field.name] = value;
}

export function handlerCommand(role, command, done:(err)=>void) {
    var cmdArray = command.split(/\s+/).filter((value) => {
            return value !== "";
        });
    var findResult = findCommand(cmdArray);
    if (!findResult.gmCmd) {
        throw new CustomError.UserError(ERRC.COMMON.GM_COMMAND_NOT_FOUND, {
            msg: 'COMMON.GM_COMMAND_NOT_FOUND'
        });
    }

    var gmCmd = findResult.gmCmd;

    // TODO check role gm level

    var i, start = findResult.depth,
        param = { fixed: {}, ext: [] };

    // fixed
    var field, fixedSize = start + (gmCmd.fixed ? gmCmd.fixed.length : 0);
    for (i = start; i < fixedSize; i += 1) {
        if (i >= cmdArray.length) {
            throw new CustomError.UserError(ERRC.COMMON.GM_COMMAND_ERROR, {
                msg: 'COMMON.GM_COMMAND_ERROR'
            });
        }
        field = gmCmd.fixed[i - start];
        parseField(field, cmdArray[i], param.fixed);
    }

    // ext
    var extLength = gmCmd.ext.length, j = extLength, item;
    if (extLength > 0) {
        for (i = fixedSize; i < cmdArray.length; i += 1) {
            if (j === extLength) {
                if (cmdArray.length - i < extLength) {
                    break;
                }
                j = 0;
                item = {};
                param.ext.push(item);
            }
            field = gmCmd.ext[j];
            parseField(field, cmdArray[i], item);
            ++j;
        }
    }

    gmCmd.func(role, param, done);
}
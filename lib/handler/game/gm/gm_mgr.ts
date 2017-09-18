import async = require('async');

//import LoginDB = require('../../../database/impl/login_db');
import log = require('../../../util/log');
import GameUtil = require('../../../util/game_util');
import Role = require('../role');
import GmModule = require('./gm_module');
import GmStruct = require('./gm_struct');
import ActivityGlobalMgr = require('../activity/activity_global_mgr');
import ActivitySystem = require('../api/activity_system');

var curMaxReadCommandAutoId:number = 0; // 当前读取的最大gm auto_id
var maxRunningGmCommandTime = 0; // gm最大运行时间
var allGmCommand:{[auto_id:number]:GmStruct.GmCommand} = {}; // 所有GM指令

export function createGmCommand(gmInfo:any):GmStruct.GmCommand {
    var ret:GmStruct.GmCommand = null;

    if (GmModule[gmInfo.opr]) {
        ret = new GmModule[gmInfo.opr]();
    }

    if (ret) {
        Object.keys(gmInfo).forEach((obj)=> {
            ret[obj] = gmInfo[obj];
        });
    }

    return ret;
}

function checkTargetType(targetType:number, targetId:number, cb:(ret:boolean)=>void) {
    switch (targetType) {
        case GmStruct.GM_COMMAND_TARGET_TYPE.SERVER:
            cb(targetId === 1);
            break;
        case GmStruct.GM_COMMAND_TARGET_TYPE.ROLE:
            //LoginDB.getRoleServerId(targetId, (err, serverId) => {
            //    if (err) {
            //        log.sError('GmCommand', 'getRoleServerId error, targetId=' + targetId);
            //        cb(false);
            //    }
            //    else {
            //        cb(serverId === 1);
            //    }
            //});
            break;
        case GmStruct.GM_COMMAND_TARGET_TYPE.PASSPORT:
            cb(false);
            break;
        default:
            cb(false);
            break;
    }
}

function readCommands(cmds:any[], cb:(err)=>void) {
    async.eachSeries(cmds,
        (cmd, next:(err)=>void) => {
            curMaxReadCommandAutoId = Math.max(curMaxReadCommandAutoId, cmd.auto_id);
            checkTargetType(cmd.target_type, cmd.target_id, (bTargetType:boolean) => {
                if (bTargetType) {
                    var gmCmd = createGmCommand(cmd);
                    if (!gmCmd) {
                        var errMsg = 'operation not support, opr=' + cmd.opr;
                        log.sError('GmCommand', errMsg);
                        //LoginDB.updateGmCmdError(cmd.auto_id, errMsg, (err)=> {
                        //    next(err);
                        //});
                    }
                    else {
                        appendGmCommand(gmCmd);
                        next(null);
                    }
                }
                else {
                    next(null);
                }
            });
        }, (err) => {
            cb(err);
        }
    );
}

function appendGmCommand(gmCmd:GmStruct.GmCommand):boolean {
    log.sInfo('GmCommand', 'Append GM Command, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    allGmCommand[gmCmd.auto_id] = gmCmd;
    return true;
}

function removeGmCommand(gmCmd:GmStruct.GmCommand):boolean {
    log.sInfo('GmCommand', 'Remove GM Command, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    delete allGmCommand[gmCmd.auto_id];
    return true;
}

export function cancelGmCommand(gmCommandId, cb:(ret:boolean)=>void) {
    if (allGmCommand.hasOwnProperty(gmCommandId)) {
        allGmCommand[gmCommandId].cancel(cb);
    }
    else {
        cb(false);
    }
}

export function hasGmCommand(gmAutoId:number):boolean {
    return allGmCommand.hasOwnProperty(gmAutoId.toString());
}

export function readNewGmCommand(cb:(err)=>void) {
    //LoginDB.getNewGmCommand(curMaxReadCommandAutoId, GmStruct.GM_STATE.NEW, (err, ret) => {
    //    if (err) {
    //        log.sError('GmCommand', 'LoginDB.getNewGmCommand Error, curMaxReadCommandAutoId=' + curMaxReadCommandAutoId +
    //            ', message=' + err.message);
    //        cb(err);
    //        return;
    //    }
    //
    //    readCommands(ret, (err) => {
    //        if (err) {
    //            log.sError('GmCommand', 'readCommands Error, command.length=' + ret.length);
    //        }
    //        cb(err);
    //    });
    //});
}

export function initGmCommand(cb:(err)=>void) {
    //LoginDB.getInitGmCommand((err, ret) => {
    //    if (err) {
    //        log.sError('GmCommand', 'initGmCommand error');
    //        return;
    //    }
    //
    //    readCommands(ret, (err) => {
    //        if (!err) {
    //            log.sInfo('GmCommand', 'initGmCommand success');
    //        }
    //        cb(err);
    //    });
    //});
}

export function updateGmCommand(cb:(ret:boolean)=>void) {
    //LoginDB.getDBTime((err, dbTime)=> {
    //    if (err) {
    //        log.sError('GmCommand', 'get dbTime error');
    //        cb(false);
    //    }
    //
    //    if (dbTime < maxRunningGmCommandTime) {
    //        log.sError('GmCommand', 'updateGmCommand, invalid update, max=%d, cur=%d', maxRunningGmCommandTime, dbTime);
    //        cb(false);
    //    }
    //
    //    var arr = GameUtil.objectToArray(allGmCommand);
    //    async.eachSeries(arr,
    //        (gmCmd:GmStruct.GmCommand, next:(err)=>void)=> {
    //            async.series(
    //                [
    //                    (step:(err)=>void) => {
    //                        if (gmCmd.status === GmStruct.GM_STATE.NEW) {
    //                            log.sInfo('GmCommand', 'valid gm command, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                            gmCmd.status = GmStruct.GM_STATE.DO_VALIDATE;
    //                            if (gmCmd.start_time === 0) {
    //                                gmCmd.start_time = dbTime;
    //                            }
    //                            gmCmd.validate((ret:boolean)=> {
    //                                if (!ret) {
    //                                    log.sError('GmCommand', 'valid error, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                                    gmCmd.status = GmStruct.GM_STATE.ERROR;
    //                                    gmCmd.bDirty = true;
    //                                }
    //                                else {
    //                                    log.sInfo('GmCommand', 'gm command pending, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                                    gmCmd.status = GmStruct.GM_STATE.PENDING;
    //                                    gmCmd.bDirty = true;
    //                                }
    //                                step(null);
    //                            });
    //                        }
    //                        else {
    //                            step(null);
    //                        }
    //                    },
    //                    (step:(err)=>void) => {
    //                        if (gmCmd.status === GmStruct.GM_STATE.PENDING) {
    //                            if (gmCmd.start_time === 0 || gmCmd.start_time < dbTime) {
    //                                log.sInfo('GmCommand', 'trigger gm command, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //
    //                                gmCmd.status = GmStruct.GM_STATE.DO_TRIGGER;
    //                                gmCmd.trigger((ret:boolean) => {
    //                                    if (!ret) {
    //                                        log.sError('GmCommand', 'trigger error, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                                        gmCmd.status = GmStruct.GM_STATE.ERROR;
    //                                        gmCmd.bDirty = true;
    //                                    }
    //                                    else {
    //                                        log.sInfo('GmCommand', 'gm command running, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                                        gmCmd.start_time = dbTime;
    //                                        gmCmd.status = GmStruct.GM_STATE.RUNNING;
    //                                        gmCmd.bDirty = true;
    //                                    }
    //                                    step(null);
    //                                });
    //                            }
    //                            else {
    //                                step(null);
    //                            }
    //                        }
    //                        else {
    //                            step(null);
    //                        }
    //                    },
    //                    (step:(err)=>void) => {
    //                        if (gmCmd.status === GmStruct.GM_STATE.RUNNING) {
    //                            gmCmd.status = GmStruct.GM_STATE.DO_TICK;
    //                            gmCmd.tick((ret:boolean) => {
    //                                if (!ret) {
    //                                    log.sError('GmCommand', 'tick error, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                                }
    //                                gmCmd.status = GmStruct.GM_STATE.RUNNING;
    //
    //                                if (gmCmd.end_time === 0 || gmCmd.end_time < dbTime) {
    //                                    log.sInfo('GmCommand', 'finish gm command, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                                    gmCmd.status = GmStruct.GM_STATE.DO_COMPLETE;
    //                                    gmCmd.complete((retInner:boolean)=> {
    //                                            if (!retInner) {
    //                                                log.sError('GmCommand', 'run error, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                                                gmCmd.status = GmStruct.GM_STATE.ERROR;
    //                                                gmCmd.bDirty = true;
    //                                            }
    //                                            else {
    //                                                log.sInfo('GmCommand', 'complete gm command, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                                                gmCmd.status = GmStruct.GM_STATE.COMPLETE;
    //                                                gmCmd.bDirty = true;
    //                                            }
    //                                            step(null);
    //                                        }
    //                                    );
    //                                }
    //                                else {
    //                                    step(null);
    //                                }
    //                            });
    //                        }
    //                        else {
    //                            step(null);
    //                        }
    //                    }
    //                ], (err)=> {
    //                    if (err) {
    //                        log.sError('GmCommand', 'updateGmCommand, invalid update')
    //                    }
    //
    //                    async.eachSeries(arr,
    //                        (gmCmd:GmStruct.GmCommand, step:(err)=>void)=> {
    //                            if (gmCmd.dirty() && gmCmd.status <= GmStruct.GM_STATE.ERROR) {
    //                                LoginDB.updateGmCmdDirtyInfo(gmCmd.auto_id, gmCmd.opr, gmCmd.target_type, gmCmd.target_id, gmCmd.start_time, gmCmd.end_time, gmCmd.backup_value, gmCmd.status, gmCmd.errMsg, (err)=> {
    //                                    if (err) {
    //                                        log.sError('GmCommand', 'updateGmCmdDirtyInfo error, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                                    }
    //                                    else {
    //                                        log.sInfo('GmCommand', 'updateGmCmdDirtyInfo success, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
    //                                    }
    //
    //                                    if (gmCmd.status === GmStruct.GM_STATE.COMPLETE || gmCmd.status === GmStruct.GM_STATE.ERROR || gmCmd.status === GmStruct.GM_STATE.CANCELED) {
    //                                        removeGmCommand(gmCmd);
    //
    //                                        if (gmCmd.status === GmStruct.GM_STATE.CANCELED) {
    //                                            ActivityGlobalMgr.cancelActivity(gmCmd.auto_id, (err)=>{
    //                                                ActivitySystem.onDelActivity(gmCmd.auto_id);
    //                                            });
    //                                        }
    //                                    }
    //                                    gmCmd.reset();
    //                                    step(null);
    //                                });
    //                            }
    //                            else {
    //                                step(null);
    //                            }
    //                        }, (err)=>{
    //                            next(err);
    //                        }
    //                    );
    //                }
    //            );
    //        }, (err)=> {
    //            if (err) {
    //                log.sError('GmCommand', 'updateGmCommand, invalid update');
    //            }
    //            maxRunningGmCommandTime = dbTime;
    //            cb(true);
    //        }
    //    );
    //});
}

export function handlerGmCommandRole(role:Role, cb:(lastGmTime:number)=>void) {
    if (maxRunningGmCommandTime <= role.lastGmCmdTime) {
        cb(role.lastGmCmdTime);
    }
    else {
        var arr = GameUtil.objectToArray(allGmCommand);
        async.eachSeries(arr,
            (gmCmd:GmStruct.GmCommand, next:(err)=>void)=> {
                if (gmCmd.status === GmStruct.GM_STATE.RUNNING && role.lastGmCmdTime < gmCmd.start_time) {
                    log.uInfo(role.accountId, 'GmCommand', 'handlerGmCommandRole, id=%d, opr=%s', gmCmd.auto_id, gmCmd.opr);
                    gmCmd.handlerRole(role, next);
                } else {
                    next(null);
                }
            }, (err)=> {
                if (err) {
                    log.uInfo(role.accountId, 'GmCommand', 'handlerGmCommandRole error');
                }
                cb(maxRunningGmCommandTime);
            }
        );
    }
}
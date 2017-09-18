import fs = require('fs');
import log = require('../../../util/log');
import Enum = require('../../../util/enum');
import GameUtil = require('../../../util/game_util');
import Role = require('../role');
import async = require('async');
import GmMgr = require('./gm_mgr');
import GmStruct = require('./gm_struct');
import index = require('../../../../index');
import ResourceMgr = require('../resource/resource_mgr');

import Universal = require('../universal');
import Config = require('../../../config');

import ActivityDef = require('../activity/defines');
import Activity = require('../activity/activity');
import ActivityGlobalMgr = require('../activity/activity_global_mgr');
import ActivitySystem = require('../api/activity_system');

import MailSystem = require('../api/mail_system');

import DB = require('../../../database/database_manager');

export class set_server_name extends GmStruct.GmCommand {
    serverName:string;

    constructor() {
        super();
    }

    validate(cb:(ret:boolean)=>void) {
        this.assertParamNum(1);
        this.serverName = this.paramArr[0];
        cb(true);
    }

    trigger(cb:(ret:boolean)=>void) {
        //GameWorld.serverName = this.serverName;
        cb(true);
    }

    complete(cb:(ret:boolean)=>void) {
        cb(true);
    }
}

export class set_server_state extends GmStruct.GmCommand {
    serverState:number;

    validate(cb:(ret:boolean)=>void) {
        this.assertParamNum(1);
        if (this.serverState >= Enum.SERVER_STATE.COUNT + 1) {
            this.errMsg = "invalid state";
            cb(false);
        }
        else {
            this.serverState = parseInt(this.paramArr[0]);
            cb(true);
        }
    }

    trigger(cb:(ret:boolean)=>void) {
        //if (this.serverState === 0) {
        //    GameWorld.canLoginIn = false;
        //} else if (this.serverState === 4) {
        //    GameWorld.canLoginIn = false;
        //    GameWorld.status = this.serverState - 1;
        //} else {
        //    GameWorld.canLoginIn = true;
        //    GameWorld.status = this.serverState - 1;
        //}
        cb(true);
    }
}

export class set_login_strategy extends GmStruct.GmCommand {
    loginStrategy:number;

    validate(cb:(ret:boolean)=>void) {
        this.assertParamNum(1);
        this.loginStrategy = parseInt(this.paramArr[0]);
        cb(true);
    }

    trigger(cb:(ret:boolean)=>void) {
        //LoginDB.hasLoginStrategy(this.loginStrategy, (ret:boolean)=> {
        //    if (ret) {
        //        //GameWorld.loginStrategy = this.loginStrategy;
        //    }
        //    else {
        //        this.errMsg = 'loginStrategy not exist, id=' + this.loginStrategy;
        //    }
        //    cb(ret);
        //});
    }
}

export class set_res_version extends GmStruct.GmCommand {
    resVersion:string;

    validate(cb:(ret:boolean)=>void) {
        this.assertParamNum(1);
        this.resVersion = this.paramArr[0];
        cb(true);
    }

    trigger(cb:(ret:boolean)=>void) {
        //GameWorld.resVersion = this.resVersion;
        cb(true);
    }
}

export class reload extends GmStruct.GmCommand {

}

export class set_gm_auth extends GmStruct.GmCommand {
    gmAuth:number;

    validate(cb:(ret:boolean)=>void) {
        this.assertParamNum(1);
        this.gmAuth = parseInt(this.paramArr[0]);
        //WorldDB.isNewRole(this.target_id, (err, ret:boolean)=> {
        //    if (err) {
        //        cb(false);
        //    }
        //    else {
        //        cb(!ret);
        //    }
        //});
    }

    trigger(cb:(ret:boolean)=>void) {
        //LoginDB.updatePassportGmAuth(this.target_id, this.gmAuth, (ret:boolean)=> {
        //    if (ret) {
        //        CacheMgr.attachRole(this.target_id, (err, role:Role) => {
        //            role.gmAuth = this.gmAuth;
        //            CacheMgr.detachRole(this.target_id, true);
        //            CacheMgr.flush(this.target_id);
        //            cb(true);
        //        });
        //    }
        //    else {
        //        cb(false);
        //    }
        //});
    }
}

export class cancel_gm_command extends GmStruct.GmCommand {
    gmAutoId:number = 0;

    validate(cb:(ret:boolean)=>void) {
        this.assertParamNum(1);
        this.gmAutoId = parseInt(this.paramArr[0]);
        if (!GmMgr.hasGmCommand(this.gmAutoId)) {
            this.errMsg = 'command not found, autoId=' + this.gmAutoId;
            cb(false);
            return ;
        }
        cb(true);
    }

    trigger(cb:(ret:boolean)=>void) {
        GmMgr.cancelGmCommand(this.gmAutoId, cb);
    }
}

export class set_role_status extends GmStruct.GmCommand {
    roleSt:number = 0;

    validate(cb:(ret:boolean)=>void) {
        this.assertParamNum(1);
        this.roleSt = parseInt(this.paramArr[0]);
        if (this.roleSt >= Enum.ROLE_ST.COUNT) {
            this.errMsg = 'roleSt error, roleSt=' + this.roleSt;
            cb(false);
        }
        else
            cb(true);

    }

    trigger(cb:(ret:boolean)=>void) {
        //CacheMgr.attachRole(this.target_id, (err, role:Role)=> {
        //    CacheMgr.detachRole(this.target_id, true);
        //    role.roleSt = this.roleSt;
        //
        //    if (this.roleSt === Enum.ROLE_ST.FORBID && CacheMgr.isRoleOnline(this.target_id)) {
        //        log.sWarn('GmCommand', 'roleId=%d is online, then kick', this.target_id);
        //        CacheMgr.kick(this.target_id, (err) => {
        //            if (err) {
        //                cb(false);
        //            }
        //            else {
        //                cb(true);
        //            }
        //        });
        //    }
        //    else {
        //        cb(true);
        //    }
        //});
    }
}

export class set_res_server_addr extends GmStruct.GmCommand {
    resServerAddr:string;

    validate(cb:(ret:boolean)=>void) {
        this.assertParamNum(1);
        this.resServerAddr = this.paramArr[0];
        cb(true);
    }

    trigger(cb:(ret:boolean)=>void) {
        //GameWorld.resServerAddr = this.resServerAddr;
        cb(true);
    }
}

export class set_server_recommend extends GmStruct.GmCommand {
    validate(cb:(ret:boolean)=>void) {
        cb(true);
    }

    trigger(cb:(ret:boolean)=>void) {
        //LoginDB.resetServerRecommend((err)=> {
        //    if (err) {
        //        return cb(false);
        //    }
        //    //GameWorld.bRecommend = true;
        //    cb(true);
        //});
    }
}

function saveActivity(activity:Activity.Activity, done:(ok:boolean)=>void):void {
    ActivityGlobalMgr.addActivity(activity);
    ActivityGlobalMgr.saveActivity(activity, (err) => {
        if (err) {
            this.errMsg = 'Error In Save Activity: ' + err.message;
            return done(false);
        }
        done(true);
    });
}

export class create_login_gift extends GmStruct.GmCommand {

    public validate(callback:(ret:boolean)=>void) {
        if (this.start_time >= this.end_time) {
            this.errMsg = 'start_time must small than end_time';
            callback(false);
            return;
        }

        var loginGiftAct:Activity.LoginGiftActivity = new Activity.LoginGiftActivity(this.auto_id, this.start_time, this.end_time);
        try {
            loginGiftAct.loadParams(this.params);
        } catch (err) {
            this.errMsg = err.message;
            callback(false);
            return;
        }

        saveActivity(loginGiftAct, callback);
    }
}

function lineIntersect(a1:number, a2:number, b1:number, b2:number):boolean {
    if (a1 === b1) {
        return true;
    } else if (a1 < b1) {
        return (a1 - b1) * (a2 - b1) < 0;
    } else {
        return (b1 - a1) * (b2 - a1) < 0;
    }
}

export class create_diamond_consume extends GmStruct.GmCommand {

    public validate(callback:(ret:boolean)=>void) {
        if (this.start_time >= this.end_time) {
            this.errMsg = 'start_time must small than end_time';
            callback(false);
            return;
        }

        var consumeAct:Activity.ConsumeActivity = new Activity.ConsumeActivity(this.auto_id, this.start_time, this.end_time);
        try {
            consumeAct.loadParams(this.params);
        } catch (err) {
            this.errMsg = err.message;
            callback(false);
            return;
        }

        var conflictList:number[] = [];
        var activities:Activity.Activity[] = ActivityGlobalMgr.getActivityByType(ActivityDef.ACTIVITY_TYPE.DIAMOND_CONSUME);
        activities.forEach((activity) => {
            if (lineIntersect(activity.startTime, activity.endTime, this.start_time, this.end_time)) {
                conflictList.push(activity.activityId);
            }
        });
        if (conflictList.length > 0) {
            this.errMsg = 'time conflict with those activities ' + JSON.stringify(conflictList);
            callback(false);
            return;
        }

        saveActivity(consumeAct, callback);
    }

}

export class create_shadow_chest extends GmStruct.GmCommand {

    public validate(callback:(ret:boolean)=>void) {
        if (this.start_time >= this.end_time) {
            this.errMsg = 'start_time must small than end_time';
            callback(false);
            return;
        }

        var chestActivity:Activity.ShadowChestActivity = new Activity.ShadowChestActivity(this.auto_id, this.start_time, this.end_time);
        try {
            chestActivity.loadParams(this.params);
        } catch (err) {
            this.errMsg = err.message;
            callback(false);
            return;
        }

        saveActivity(chestActivity, callback);
    }
}

export class create_flourishing_chest extends GmStruct.GmCommand {

    public validate(callback:(ret:boolean)=>void) {

        if (this.start_time >= this.end_time) {
            this.errMsg = 'start_time must small than end_time';
            callback(false);
            return;
        }

        var chestActivity:Activity.FlourishingChestActivity = new Activity.FlourishingChestActivity(this.auto_id, this.start_time, this.end_time);
        try {
            chestActivity.loadParams(this.params);
        } catch (err) {
            this.errMsg = err.message;
            callback(false);
            return;
        }

        saveActivity(chestActivity, callback);
    }

}

export class create_craft_activity extends GmStruct.GmCommand {

    public validate(callback:(ret:boolean)=>void) {

        if (this.start_time >= this.end_time) {
            this.errMsg = 'start_time must small than end_time';
            callback(false);
            return;
        }

        var craftActivity:Activity.CraftActivity = new Activity.CraftActivity(this.auto_id, this.start_time, this.end_time);
        try {
            craftActivity.loadParams(this.params);
        } catch (err) {
            this.errMsg = err.message;
            callback(false);
            return;
        }

        saveActivity(craftActivity, callback);
    }

}

export class add_resource extends GmStruct.GmCommand {

    reward:Universal.Resource = {};

    public validate(callback:(ret:boolean)=>void) {
        this.assertParamNum(1);

        var content = this.paramArr[0].match(/\d+/g);

        if (content) {
            var hasReward = false;
            var length = Math.floor(content.length / 2);
            for (var i = 0; i < length; i += 1) {
                hasReward = true;
                Universal.addResource(this.reward, parseInt(content[i * 2]), parseInt(content[i * 2 + 1]));
            }

            if (!hasReward) {
                this.errMsg = 'no valid reward';
                callback(false);
                return ;
            }

            callback(true);
        } else {
            this.errMsg = 'no valid reward';
            callback(false);
        }

    }

    public trigger(callback:(ret:boolean)=>void) {
        //CacheMgr.attachRole(this.target_id, (err, role:Role)=> {
        //    if (err) {
        //        this.errMsg = err['stack'];
        //        callback(false);
        //        return;
        //    }
        //
        //    ResourceMgr.applyReward(role, Enum.USE_TYPE.SYSTEM_GM, this.reward);
        //
        //    if (CacheMgr.isRoleOnline(this.target_id)) {
        //        role.sendUpdatePacket(true);
        //    }
        //
        //    CacheMgr.detachRole(this.target_id, true);
        //    callback(true);
        //});
    }

}

export class update_revision extends GmStruct.GmCommand {

    revision:number = 0;

    public validate(callback:(ret:boolean)=>void) {
        this.assertParamNum(1);

        this.revision = parseInt(this.paramArr[0]);

        if (isNaN(this.revision)) {
            this.errMsg = 'parseInt NaN, content=' + this.paramArr[0];
            callback(false);
        } else {
            callback(true);
        }
    }

    public trigger(callback:(ret:boolean)=>void) {
        try {
            var content = fs.readFileSync(index.sourceRoot + '/src/config/untrack/gameserver.json');
            var config = JSON.parse(content.toString());
        } catch (err) {
            this.errMsg = err.message;
            callback(false);
            return ;
        }
        Config.updateConfigRevision(Enum.SERVER_TYPE.GAME_SERVER, config.config_url, this.revision, (err) => {
            if (err) {
                this.errMsg = err.message;
                callback(false);
            } else {
                callback(true);
            }
        });
    }

}

export class send_mail extends GmStruct.GmCommand {

    mailInfo:MailSystem.MailBuildInfo = new MailSystem.MailBuildInfo();

    public validate(callback:(ret:boolean)=>void) {
        this.assertParamNum(3);

        this.mailInfo.title = this.paramArr[0];
        this.mailInfo.content = this.paramArr[1];
        var attachment = this.paramArr[2].match(/\d+/g);

        this.mailInfo.sender = this.paramArr[3] || 'system';

        if (attachment) {
            var hasReward = false;
            var length = Math.floor(attachment.length / 2);
            for (var i = 0; i < length; i += 1) {
                hasReward = true;
                Universal.addResource(this.mailInfo.attachment, parseInt(attachment[i * 2]), parseInt(attachment[i * 2 + 1]));
            }

            if (!hasReward) {
                this.errMsg = 'no valid attachment';
                callback(false);
                return ;
            }

            callback(true);
        } else {
            callback(true);
        }

    }

    public trigger(callback:(ret:boolean)=>void) {
        if (this.target_type === GmStruct.GM_COMMAND_TARGET_TYPE.ROLE) {
            MailSystem.sendMail(this.target_id, this.mailInfo, (err) => {
                if (err) {
                    this.errMsg = 'sendMail Error: ' + err.message;
                    callback(false);
                    return ;
                }

                callback(true);
            });
        } else {
            callback(true);
        }
    }

    public handlerRole(role:Role, callback:(ret:boolean)=>void):void {
        if (this.target_type === GmStruct.GM_COMMAND_TARGET_TYPE.SERVER) {
            MailSystem.sendMail(role.accountId, this.mailInfo, (err) => {
                if (err) {
                    this.errMsg = 'sendMail Error: ' + err.message;
                    callback(false);
                    return ;
                }

                callback(true);
            });
        } else {
            callback(true);
        }
    }
}

export class set_log_level extends GmStruct.GmCommand {

    logLevel:string = '';

    public validate(callback:(ret:boolean)=>void) {
        this.assertParamNum(1);
        switch (this.paramArr[0]) {
            case 'TRACE':
            case 'DEBUG':
            case 'INFO':
                this.logLevel = this.paramArr[0];
                callback(true);
                return ;
            default:
                this.errMsg = 'invalid log level= ' + this.paramArr[0] + ', (TRACE, DEBUG, INFO)';
                callback(false);
                return ;
        }
    }

    public trigger(callback:(ret:boolean)=>void) {
        if (!log.setLevel(this.logLevel)) {
            this.errMsg = 'logger not exist';
            callback(false);
            return ;
        }
        callback(true);
    }

}

export class create_discount extends GmStruct.GmCommand {

    public validate(callback:(ret:boolean)=>void) {
        if (this.start_time >= this.end_time) {
            this.errMsg = 'start_time must small than end_time';
            callback(false);
            return;
        }

        var discountActivity:Activity.DiscountActivity = new Activity.DiscountActivity(this.auto_id, this.start_time, this.end_time);
        try {
            discountActivity.loadParams(this.params);
        } catch (err) {
            this.errMsg = err.message;
            callback(false);
            return;
        }

        var conflictList:number[] = [];
        var activities:Activity.Activity[] = ActivityGlobalMgr.getActivityByType(ActivityDef.ACTIVITY_TYPE.DISCOUNT);
        activities.forEach((activity:Activity.DiscountActivity) => {
            if (activity.discountType === discountActivity.discountType) {
                if (lineIntersect(activity.startTime, activity.endTime, this.start_time, this.end_time)) {
                    conflictList.push(activity.activityId);
                }
            }
        });
        if (conflictList.length > 0) {
            this.errMsg = 'time conflict with those activities ' + JSON.stringify(conflictList);
            callback(false);
            return;
        }

        saveActivity(discountActivity, callback);
    }

}

export class create_redirect extends GmStruct.GmCommand {

    public validate(callback:(ret:boolean)=>void) {
        if (this.start_time >= this.end_time) {
            this.errMsg = 'start_time must small than end_time';
            callback(false);
            return;
        }

        var redirectActivity:Activity.RedirectActivity = new Activity.RedirectActivity(this.auto_id, this.start_time, this.end_time);
        try {
            redirectActivity.loadParams(this.params);
        } catch (err) {
            this.errMsg = err.message;
            callback(false);
            return;
        }

        saveActivity(redirectActivity, callback);
    }

}

export class create_flourishing_shop extends GmStruct.GmCommand {

    public validate(callback:(ret:boolean)=>void) {
        if (this.start_time >= this.end_time) {
            this.errMsg = 'start_time must small than end_time';
            callback(false);
            return;
        }

        var shopActivity:Activity.FlourishingShopActivity = new Activity.FlourishingShopActivity(this.auto_id, this.start_time, this.end_time);
        try {
            shopActivity.loadParams(this.params);
        } catch (err) {
            this.errMsg = err.message;
            callback(false);
            return;
        }

        var conflictList:number[] = [];
        var activities:Activity.Activity[] = ActivityGlobalMgr.getActivityByType(ActivityDef.ACTIVITY_TYPE.FLOURISHING_SHOP);
        activities.forEach((activity:Activity.FlourishingShopActivity) => {
            if (lineIntersect(activity.startTime, activity.endTime, this.start_time, this.end_time)) {
                conflictList.push(activity.activityId);
            }
        });
        if (conflictList.length > 0) {
            this.errMsg = 'time conflict with those activities ' + JSON.stringify(conflictList);
            callback(false);
            return;
        }

        saveActivity(shopActivity, callback);
    }

}
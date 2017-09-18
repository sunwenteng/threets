import pb = require('node-protobuf-stream');

// src/util
import log = require('../../../util/log');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Time = require('../../../util/time');
import Enum = require('../../../util/enum');

// src/gameserver
import Role = require('../role');
import Universal = require('../universal');
import QuestDef = require('../quest/defines');
import ResourceMgr = require('../resource/resource_mgr');
import MailDef = require('./../mail/defines');

var cm = require('../../../config').configMgr;

export function sendOnlinePacket(role:Role):void {
    var M = pb.get('.Api.mail.onlineInfo.Notify');
    role.sendPacket(new M({
        newMailCount: role.mails.newMailCount
    }));
}

export function initList(role:Role, packet:any, done):void {
    role.mails.initList();
    var totalLength = role.mails.mailList.length;
    var mailList = [];
    for (var i = 0; i < Enum.MAIL_COUNT_IN_ONE_PAGE && i < totalLength; i += 1) {
        mailList.push(role.mails.mailList[i].buildNetMsg());
    }
    done(null, {
        totalPage: Math.ceil(totalLength / Enum.MAIL_COUNT_IN_ONE_PAGE),
        mailList: mailList
    });
}

export function queryPage(role:Role, packet:any, done):void {
    var page = packet.page;
    var totalLength = role.mails.mailList.length;
    var totalPage = Math.ceil(totalLength / Enum.MAIL_COUNT_IN_ONE_PAGE);
    if (page < 1 || page > totalPage) {
        throw new CustomError.UserError(ERRC.MAIL.PAGE_NOT_FOUND, {
            msg: 'MAIL.PAGE_NOT_FOUND, page=' + page + ', totalPage=' + totalPage
        });
    }
    var mailList = [];
    for (var i = Enum.MAIL_COUNT_IN_ONE_PAGE * (page-1);
         i < Enum.MAIL_COUNT_IN_ONE_PAGE * page && i < totalLength; i += 1) {
        mailList.push(role.mails.mailList[i].buildNetMsg());
    }
    done(null, {
        mailList: mailList
    });
}

export function receiveAttachment(role:Role, packet:any, done):void {
    var mailUid = packet.mailUid;

    var mail = role.mails.findMail(mailUid);
    ResourceMgr.applyReward(role, Enum.USE_TYPE.MAIL_ATTACHMENT, mail.attachment);
    mail.status = MailDef.MailStatus.RECEIVED;

    role.sendUpdatePacket(true);
    done(null, {
        mailUid: mail.uid
    });
}

export function readMail(role:Role, packet:any, done):void {
    var mailUid = packet.mailUid;

    role.mails.readMail(mailUid);
    //role.sendPacket(new cmd['cmd_sc_mail_updateInfo']({
    //    newMailCount: role.mails.newMailCount
    //}));
    done();
}

export class MailBuildInfo {
    title:string = '';
    sender:string = '';
    content:string = '';
    attachment:Universal.Resource = {};
}

export function sendMail(accountId:number, info:MailBuildInfo, callback:(err)=>void):void {
    //CacheMgr.attachRole(accountId, (err, role) => {
    //    if (err) {
    //        callback(err);
    //        return ;
    //    }
    //    var mail = role.mails.createMail();
    //    mail.title = info.title;
    //    mail.sender = info.sender;
    //    mail.content = info.content;
    //    mail.attachment = info.attachment;
    //
    //    if (CacheMgr.isRoleOnline(accountId)) {
    //        var M = pb.getMessageType('.Api.mail.updateInfo.Notify');
    //        role.sendPacket(new M({
    //            newMailCount: role.mails.newMailCount
    //        }));
    //        CacheMgr.detachRole(accountId, false);
    //    } else {
    //        CacheMgr.detachRole(accountId, true);
    //    }
    //    callback(null);
    //});
}
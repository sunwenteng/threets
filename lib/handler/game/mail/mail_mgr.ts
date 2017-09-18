import pb = require('node-protobuf-stream');
import Time = require('../../../util/time');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Enum = require('../../../util/enum');

import Mail = require('./mail');
import MailDef = require('./defines');

class MailMgr {
    mailMap:{[uid:number]:Mail} = {};

    // memory
    maxuid:number = 0;
    newMailCount:number = 0;
    mailList:Mail[] = [];

    constructor() {
    }

    public createMail():Mail {
        var mail = new Mail();
        mail.uid = this.getNextUid();
        mail.status = MailDef.MailStatus.NEW;
        mail.sendTime = Time.gameNow();
        this.mailMap[mail.uid] = mail;
        this.newMailCount += 1;
        return mail;
    }

    public getMail(uid:number):Mail {
        return this.mailMap[uid];
    }

    public findMail(uid:number):Mail {
        var mail = this.mailMap[uid];
        if (!mail) {
            throw new CustomError.UserError(ERRC.MAIL.NOT_FOUND, {
                msg: 'MAIL.NOT_FOUND'
            });
        }
        return mail;
    }

    public initList():void {
        var now = Time.gameNow();
        this.newMailCount = 0;
        this.mailList = [];
        Object.keys(this.mailMap).forEach((key) => {
            var mail = this.mailMap[key];
            if (mail.isExpired(now) || mail.isUseless()) {
                delete this.mailMap[key];
                return ;
            }

            this.mailList.push(mail);
            if (mail.status === MailDef.MailStatus.NEW) {
                this.newMailCount += 1;
            }
        });

        this.mailList.sort(Mail.cmp);
    }

    public readMail(mailUid:number):void {
        var mail = this.findMail(mailUid);
        if (mail.status < MailDef.MailStatus.READ) {
            mail.status = MailDef.MailStatus.READ;
        }
        this.newMailCount -= 1;
    }

    public buildDBMsg():any {
        var mails = pb.get('.DB.mails');
        var pck = new mails();
        Object.keys(this.mailMap).forEach((key) => {
            pck.mailList.push(this.mailMap[key].buildDBMsg());
        });
        return pck;
    }

    public loadDBMsg(msg:any):void {
        this.mailMap = {};
        if (msg.mailList) {
            msg.mailList.forEach((info) => {
                var mail = new Mail();
                mail.loadDBMsg(info);
                this.mailMap[mail.uid] = mail;
            });
            this.maxuid = this.getMaxUid();
            this.initList();
        }
    }

    private getMaxUid():number {
        var maxUid = 0;
        Object.keys(this.mailMap).forEach((key) => {
            if (maxUid < parseInt(key)) {
                maxUid = parseInt(key);
            }
        });
        return maxUid;
    }

    private getNextUid():number {
        if (this.mailMap[this.maxuid + 1]) {
            this.maxuid = this.getMaxUid();
        }
        return this.maxuid + 1;
    }
}

export = MailMgr;
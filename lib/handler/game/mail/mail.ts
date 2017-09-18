import Universal = require('../universal');
import MailDef = require('./defines');
import Enum = require('../../../util/enum');

class Mail {
    uid:number = 0;                     // uid，MailMgr自动填充
    title:string = '';                  // 标题
    sender:string = '';                 // 发送者
    sendTime:number = 0;                // 发送时间
    content:string = '';                // 内容
    attachment:Universal.Resource = {}; // 附件
    status:MailDef.MailStatus = MailDef.MailStatus.NULL;

    public isExpired(now:number):boolean {
        return this.sendTime + Enum.MAIL_EXPIRED_SECOND <= now;
    }

    public isUseless():boolean {
        switch (this.status) {
            case MailDef.MailStatus.READ:
                return Object.keys(this.attachment).length === 0;
            case MailDef.MailStatus.RECEIVED:
                return true;
            default :
                return false;
        }
    }

    public buildNetMsg():any {
        return {
            uid: this.uid,
            title: this.title,
            sender: this.sender,
            sendTime: this.sendTime,
            content: this.content,
            attachment: Universal.tranResourceToRewardList(this.attachment),
            status: this.status
        };
    }

    public buildDBMsg():any {
        return {
            uid: this.uid,
            title: this.title,
            sender: this.sender,
            sendTime: this.sendTime,
            content: this.content,
            attachment: Universal.tranResourceToRewardList(this.attachment),
            status: this.status
        };
    }

    public loadDBMsg(msg:any):void {
        this.uid = msg.uid;
        this.title = msg.title;
        this.sender = msg.sender;
        this.sendTime = msg.sendTime;
        this.content = msg.content;
        this.status = msg.status;

        if (msg.attachment && msg.attachment.length > 0) {
            msg.attachment.forEach((reward:Universal.Reward) => {
                Universal.addResource(this.attachment, reward.id, reward.count);
            });
        }
    }

    static cmp(a:Mail, b:Mail):number {
        return b.sendTime - a.sendTime;
    }
}

export = Mail;
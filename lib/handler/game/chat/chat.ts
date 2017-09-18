import Enum = require('../../../util/enum');
import Universal = require('../universal');
import Role = require('../role');

export enum ChatSenderType {
    NULL = 0,
    SYSTEM = 1,
    PLAYER = 2
}

export enum ChatType {
    NULL = 0,
    WORLD = 1,
    WHISPER = 2,
    GUILD = 3
}

export class ChatSender {
    accountId:number = 0;
    username:string = '';
    level:number = 0;
    avatar:Universal.Avatar = null;
    achievementID:number = 0;
    guildId:number = 0;

    constructor(role?) {
        if (role) this.loadRole(role);
    }

    public loadRole(role):void {
        this.accountId = role.accountId;
        this.username = role.username;
        this.level = role.level;
        this.achievementID = role.getSundryValue(Enum.SUNDRY.ACHIEVEMENT_TITLE);
        this.avatar = role.buildDungeonAvatar();
    }

    public buildNetObj():any {
        var obj:any = {
            accountId: this.accountId,
            username: this.username,
            level: this.level,
            avatar: this.avatar
        };
        if (this.guildId) {
            obj.guildId = this.guildId;
        }
        if (this.achievementID) {
            obj.achievementID = this.achievementID;
        }
        return  obj;
    }
}

export class Chat {

    // chat info
    chatType:ChatType = ChatType.NULL;
    chatText:string = '';
    timestamp:number = 0;

    // sender info
    sender:ChatSender = null;

    // target info
    targetId:number = 0;

    constructor(type:ChatType, role:Role, chatText:string, timestamp:number, targetId?:number) {
        this.chatType = type;
        this.sender = new ChatSender(role);
        this.chatText = chatText;
        this.timestamp = timestamp;
        if (this.chatType === ChatType.WHISPER && targetId) {
            this.targetId = targetId;
        }
    }

    public buildNetObj():any {
        var obj:any = {
            chatType: this.chatType,
            chatText: this.chatText,
            timestamp: this.timestamp,
        };
        obj.sender = this.sender.buildNetObj();
        return obj;
    }
}

export class ShieldRole {
    accountId:number = 0;
    level:number = 0;
    username:string = '';
}
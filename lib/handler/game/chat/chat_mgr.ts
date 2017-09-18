import pb = require('node-protobuf-stream');

// src/util
import Time = require('../../../util/time');
import Util = require('../../../util/game_util');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');

// src/gameserver
import Role = require('../role');
import Chat = require('./chat');
import Universal = require('../universal');

class ChatMgr {
    latestSendTime:number = 0;
    isForbidden:boolean = false;
    shieldList:{[accountId:number]:Chat.ShieldRole} = {};

    constructor() {
    }

    public checkSendNewWorldMessage():void {
        if (this.isForbidden) {
            throw new CustomError.UserError(ERRC.CHAT.SEND_MESSAGE_FORBIDDEN, {
                msg: 'CHAT.SEND_MESSAGE_FORBIDDEN'
            });
        }
        var leftSecond = this.getLeftSendSecond();
        if (leftSecond > 0) {
            throw new CustomError.UserError(ERRC.CHAT.TOO_SHORT_BETWEEN_LAST_MESSAGE, {
                msg: 'CHAT.TOO_SHORT_BETWEEN_LAST_MESSAGE, left_second=' + leftSecond,
                param: [leftSecond]
            });
        }
    }

    public checkSendNewWhisperMessage():void {
        if (this.isForbidden) {
            throw new CustomError.UserError(ERRC.CHAT.SEND_MESSAGE_FORBIDDEN, {
                msg: 'CHAT.SEND_MESSAGE_FORBIDDEN'
            });
        }
    }

    public setLatestSendTime(sendTime:number):void {
        this.latestSendTime = sendTime;
    }

    public static handleChatText(text:string):string {
        var value = Universal.replaceForbiddenWorld(text);
        return value === '' ? text : value.slice(0, Universal.GLB_CHAT_MESSAGE_LIMIT);
    }

    public getLeftSendSecond():number {
        var now = Time.gameNow(), cd = Universal.GLB_WORLD_CHAT_COOLDOWN;
        return this.latestSendTime + cd > now ? this.latestSendTime + cd - now : 0;
    }

    public addShield(shield:Chat.ShieldRole):void {
        if (Object.keys(this.shieldList).length >= Universal.GLB_CHAT_SHIELD_LIMIT) {
            throw new CustomError.UserError(ERRC.CHAT.SHIELD_LIST_LENGTH_TOO_LONG, {
                msg: 'CHAT.SHIELD_LIST_LENGTH_TOO_LONG'
            })
        }
        this.shieldList[shield.accountId] = shield;
    }

    public delShield(accountId:number):void {
        delete this.shieldList[accountId];
    }

    public buildInitOnlineMsg():any {
        var M = pb.get('.Api.chat.initOnline.Notify');
        return new M({
            shieldList: Object.keys(this.shieldList).map((key) => {
                return this.shieldList[key];
            }),
            leftSendSecond: this.getLeftSendSecond()
        });
    }

    public buildDBMsg():any {
        var chats = pb.get('.DB.chats');
        return new chats({
            latestSendTime: this.latestSendTime,
            shieldList: Object.keys(this.shieldList).map((key) => {
                return this.shieldList[key];
            }),
            isForbidden: this.isForbidden
        });
    }

    public loadDBMsg(msg:any):void {
        this.latestSendTime = msg.latestSendTime;
        this.isForbidden = msg.isForbidden;
        this.shieldList = {};
        msg.shieldList.forEach((shield:Chat.ShieldRole) => {
            this.shieldList[shield.accountId] = shield;
        });
    }

}

export = ChatMgr;
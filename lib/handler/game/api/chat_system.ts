// src/util
import log = require('../../../util/log');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Time = require('../../../util/time');
import Enum = require('../../../util/enum');

// src/database
//import WorldDB = require('../../../database/impl/world_db');
//import CenterDB = require('../../../database/impl/center_db');

// src/gameserver
import Role = require('../role');
import Universal = require('../universal');
//import CenterClient = require('../center_client');
//import GameWorld = require('../game_world');
import ServiceManager = require('../../../service/service_manager');
import RoleManager = require('../role_manager');

// src/handler/api/chat
import Chat = require('./../chat/chat');
import ChatMgr = require('./../chat/chat_mgr');

//var cm = require('../../../config').configMgr;

export function sendOnlinePacket(role:Role):void {
    role.sendPacket(role.chats.buildInitOnlineMsg());
}

export function initChat(role:Role, packet:any, done):void {
    ServiceManager.callRemote('chat:fetchLatestWorldMessages', {}, (err, res) => {
        if (err) return done(err);
        if (res.error) return done(res.error);
        done(null, {
            chatMessages: res.chatMessages
        });
    });
}

export function sayWorld(role:Role, packet:any, done):void {
    var chatText = packet.chatText;

    role.chats.checkSendNewWorldMessage();
    var text = ChatMgr.handleChatText(chatText);

    var chat = new Chat.Chat(Chat.ChatType.WORLD, role, text, Time.gameNow());
    var req = {
        chatMessage: chat.buildNetObj()
    };
    ServiceManager.callRemote('chat:roleSayWorld', req, (err, res) => {
        if (err) return done(err);
        if (res.error) return done(res.error);

        role.chats.setLatestSendTime(Time.gameNow());
        done();
    });

}

export function sayGuild(role:Role, packet:any, done):void {
    var chatText = packet.chatText;

    //role.chats.checkSendNewWorldMessage();
    var text = ChatMgr.handleChatText(chatText);

    var chat = new Chat.Chat(Chat.ChatType.GUILD, role, text, Time.gameNow());
    var req = {
        accountId: role.accountId,
        chatMessage: chat.buildNetObj()
    };
    ServiceManager.callRemote('guild:sayWords', req, (err, res) => {
        if (err) return done(err);
        if (res.error) return done(res.error);

        done();
    });

}

export function updateForbidList(role:Role, packet:any, done):void {
    var shieldAdd:Chat.ShieldRole[] = packet.shieldAdd,
        shieldDel:number[] = packet.shieldDel;

    shieldAdd.forEach((shield) => {
        role.chats.addShield(shield);
    });
    shieldDel.forEach((accountId) => {
        role.chats.delShield(accountId);
    });
    done();
}

export function broadcastChatMessage(chatMessage):void {
    //GameWorld.sendToWorld(chatMessage);
    RoleManager.broadcast(chatMessage);
}
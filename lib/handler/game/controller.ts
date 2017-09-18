import pb = require('node-protobuf-stream');

import Role = require('./role');
import RoleManager = require('./role_manager');
import ChatSystem = require('./api/chat_system');

export function roleSayWorld(packet):void {
    var M = pb.get('.Api.chat.newMessage.Notify');
    ChatSystem.broadcastChatMessage(new M({
        chatMessage: packet.chatMessage
    }));
}

export function sendGuildNotify(packet) {
    var accountId = packet.accountId;
    var notifyData = packet.notifyData;
    RoleManager.isOnline(accountId, (err, online, local) => {
        if (err) return ;

        if (online && local) {
            RoleManager.attach(accountId, (err, role) => {
                if (err) return ;

                var Type = pb.get('.Api.guild.newNotify.Notify');
                role.sendPacket(new Type({
                    notifyData: notifyData
                }));
                RoleManager.detach(accountId);
            });
        }
    });
}

export function roleSayGuild(packet):void {
    var guildId = packet.guildId;
    var chatMessage = packet.chatMessage;

    if (!guildId) return ;

    RoleManager.forEachRole((role:Role, next) => {
        if (role.guilds.guildId == guildId) {
            var Type = pb.get('.Api.chat.newMessage.Notify');
            role.sendPacket(new Type({
                chatMessage: chatMessage
            }));
        } else {
            next();
        }
    });
}

export function roleHasNewApplication(packet:any):void {
    var accountId = packet.accountId,
        applicationCount = packet.applicationCount;

    RoleManager.isOnline(accountId, (err, online, local) => {
        if (err) return ;

        if (online && local) {
            RoleManager.attach(accountId, (err, role) => {
                if (err) return ;

                var Type = pb.get('.Api.friend.newFriendApplication.Notify');
                role.sendPacket(new Type({
                    applicationCount: applicationCount
                }));
                RoleManager.detach(accountId);
            });
        }
    });
}
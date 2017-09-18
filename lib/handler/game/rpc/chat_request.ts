import pb = require('node-protobuf-stream');

import log = require('../../../util/log');
import ErrorMsg = require('../../../util/error_msg');

import Chat = require('../chat/chat');
import RoleManager = require('../role_manager');

export function roleSayWorld(session, request:any, done:(err, res)=>void) {
    var M = pb.get('.Api.chat.newMessage.Notify');
    RoleManager.broadcast(new M({
        chatMessage: request.chatMessage
    }));
    done(null, {});
}
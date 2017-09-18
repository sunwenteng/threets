import pb = require('node-protobuf-stream');
import Service = require('../service');
import DB = require('../../database/database_manager');
import Redis = require('../../redis/redis_manager');
import Dep = require('../../server/dependence_manager');
import DepConn = require('../../server/dependence_connection');
import NetManager = require('../../server/net_manager');

class ChatService extends Service {
    chatHistory:any[] = [];

    constructor() {
        super('chat');
    }

    //public startupService(param:any):void {
    //    super.startupService(param);
    //}

    //public shutdownService(done):void {
    //    this.running = false;
    //    done();
    //}

    public roleSayWorld(request:any, done):void {
        var chatMessage = request.chatMessage;
        // check valid text content
        this.chatHistory.push(chatMessage);
        // broadcast world chat message
        var RoleSayWorld = pb.get('.Rpc.controller.roleSayWorld');
        Redis.pub.publishWorld(new RoleSayWorld({
            chatMessage: request.chatMessage
        }));

        done();
    }

    public fetchLatestWorldMessages(request:any, done):void {
        done(null, {
            chatMessages: this.chatHistory
        });
    }
}

export = ChatService;
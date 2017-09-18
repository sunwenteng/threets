import pb = require('node-protobuf-stream');
import Enum = require('../../../util/enum');
import Universal = require('../universal');

//import GameWorld = require('../game_world');
// system
import HeroSystem = require('./hero_system');
import ResourceMgr = require('../resource/resource_mgr');
import Role = require('../role');

import GmHandler = require('./../gm/gm_handler');

export function initSystem() {
    GmHandler.preProcess();
}

export function sendGMCommandList(role:Role):void {
    //if (GameWorld.bIsTest || role.passportGmAuth !== 0) {
        var M = pb.get('.Api.gm.gmCommandList.Notify');
        role.sendPacket(new M({
            gmCommands: GmHandler.buildGMCommandList()
        }));
    //}
}

export function useCommand(role:Role, packet:any, done) {
    var command = packet.command;

    //if (!GameWorld.bIsTest && role.passportGmAuth < 1) {
    //    throw new Error('GM_AUTH_NOT_ENOUGH');
    //}

    try {
        GmHandler.handlerCommand(role, command, (err) => {
            if (err) return done(err);

            role.sendAllUpdatePacket();
            return done(null, {});
        });
    } catch (err) {
        return done(err);
    }
}
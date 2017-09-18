import Tcp = require('../../net/tcp');
import LoginCharacter = require('./login_character');

var characterMap:{[passport:string]:LoginCharacter} = {};

export function getLoginCharacter(passport:string):LoginCharacter {
    return characterMap[passport];
}

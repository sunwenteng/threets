import RedisStruct = require('./struct');

var playerROTable:{[accountId:number]:RedisStruct.PlayerRO} = {};
var playerROLoadQueue:{[accountId:number]:Function[]} = {};

export function fetchPlayerRO(accountId:number, cb:(err, player:RedisStruct.PlayerRO) => void) {
    if (!playerROTable[accountId]) {
        playerROTable[accountId] = new RedisStruct.PlayerRO(accountId);
    }
    if (!playerROLoadQueue[accountId]) {
        playerROLoadQueue[accountId] = [];
    }

    var player = playerROTable[accountId],
        queue = playerROLoadQueue[accountId];

    if (queue.length === 0) {
        console.log('attack player, ' + accountId);
        player.attach((err) => {
            queue.forEach((callback) => {
                callback(err, player);
            });

            delete playerROLoadQueue[accountId];
            delete playerROTable[accountId];
        });
    }
    queue.push(cb);
}

class GuildMgr {
    guildId:number = 0;
    hierarchy:number = 0;
    techLevels:{[id:number]:number} = {};

    buildOnlineDataObj():any {
        return {
            guildId: this.guildId,
            hierarchy: this.hierarchy,
            techLevels: this.techLevels
        };
    }
}

export  = GuildMgr;
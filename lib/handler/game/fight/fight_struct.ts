import Loot = require('../loot/loot');

export interface OptionalLoot {
    normalLoot:Loot;
    specialLoot:Loot;
}

export class FightTeam {
    heros:number[] = [];
    hires: number[] = [];
}

export class BossEntry {
    bossID:number = 0;
    leftHp:number = 0;
    level:number = 0;
}
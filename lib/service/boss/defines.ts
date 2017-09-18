/**
 * Created by nigel on 15-7-20.
 */

export enum PROGRESS {
    NOT_START = 0,
    START = 1,
    RESULT_SORTING = 2,
    BOSS_END = 3
}

export class WorldBoss {

    bossID:number = undefined;  // 默认为未定义的，0表示没有竞技场联赛
    startTime:number = 0;
    endTime:number = 0;
    progress:number = 0;

}

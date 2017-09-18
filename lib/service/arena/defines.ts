export enum TOURNAMENT_PROGRESS {
    NOT_START = 0,
    PVP_START = 1,
    RESULT_SORTING = 2,
    TOURNAMENT_END = 3
}

export enum TOURNAMENT_PROGRESS2 {
    NULL = 0,
    INITIALIZING = 10,
    INITIALIZED = 11,
    PVPING = 20,
    PVP_END = 21,
    RESULT_SORTING = 30,
    RESULT_SORTED = 31,
    TOURNAMENT_END = 90
}

export class ArenaTournament {
    tournamentId:number = undefined; // 默认为未定义的，0表示没有竞技场联赛
    startTime:number = 0;
    endTime:number = 0;
    progress:number = 0;
}

export enum ROBOT_TYPE {
    NULL = 0,
    TYPE1 = 1,
    TYPE2 = 2,
    TYPE3 = 3
}
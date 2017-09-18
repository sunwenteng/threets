import Time = require('../../util/time');

export enum EventType {
    PLAYER_JOIN               = 1,
    PLAYER_LEAVE              = 2,
    UPDATE_JOIN_LEVEL_SETTING = 3,
    UPDATE_JOIN_TYPE_SETTING  = 4,
    KICK_MEMBER               = 5,
    MODIFY_NAME               = 6,
    APPOINT_HIERARCHY         = 7,
    GUILD_UPGRADE             = 8,
    TECH_UPGRADE              = 9,
    CONTRIBUTE                = 10
}

export class EventMsg {
    eventId:number;
    eventType:EventType;
    createDate:number;
    players:number[];
    numArgs:number[];       // 适合数字 & 随语言改变的文本
    strArgs:string[];       // 适合固定文本，不随语言改变的

    constructor(eventId:number, eventType:EventType, createDate:number) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.createDate = createDate;
        this.players = [];
        this.numArgs = [];
        this.strArgs = [];
    }
}

export class Event {
    eventId:number = 0;
    eventType:EventType;
    createDate:number;

    constructor(eventType:EventType) {
        this.eventType = eventType;
        this.createDate = Time.gameNow();
    }

    public buildEventObj():EventMsg {
        return new EventMsg(this.eventId, this.eventType, this.createDate);
    }
}

export class PlayerJoinEvent extends Event {
    private joinId:number = 0;

    constructor(joinId:number) {
        super(EventType.PLAYER_JOIN);
        this.joinId = joinId;
    }

    public buildEventObj():EventMsg {
        var eventMsg:EventMsg = super.buildEventObj();
        eventMsg.players.push(this.joinId);
        return eventMsg;
    }
}

export class PlayerLeaveEvent extends Event {
    private memberId:number = 0;

    constructor(memberId:number) {
        super(EventType.PLAYER_LEAVE);
        this.memberId = memberId;
    }

    public buildEventObj():EventMsg {
        var eventMsg:EventMsg = super.buildEventObj();
        eventMsg.players.push(this.memberId);
        return eventMsg;
    }
}

export class UpdateJoinLevelSetting extends Event {
    private operatorId:number = 0;
    private joinLevel:number = 0;

    constructor(operatorId:number, joinLevel:number) {
        super(EventType.UPDATE_JOIN_LEVEL_SETTING);
        this.operatorId = operatorId;
        this.joinLevel = joinLevel;
    }

    public buildEventObj():EventMsg {
        var eventMsg:EventMsg = super.buildEventObj();
        eventMsg.players.push(this.operatorId);
        eventMsg.numArgs.push(this.joinLevel);
        return eventMsg;
    }
}

export class UpdateJoinTypeSetting extends Event {
    private operatorId:number = 0;
    private joinType:number = 0;

    constructor(operatorId:number, joinType:number) {
        super(EventType.UPDATE_JOIN_TYPE_SETTING);
        this.operatorId = operatorId;
        this.joinType = joinType;
    }

    public buildEventObj():EventMsg {
        var eventMsg:EventMsg = super.buildEventObj();
        eventMsg.players.push(this.operatorId);
        eventMsg.numArgs.push(this.joinType);
        return eventMsg;
    }
}

export class KickMember extends Event {
    private kickerId:number = 0;
    private kickedId:number = 0;

    constructor(kickerId:number, kickedId:number) {
        super(EventType.KICK_MEMBER);
        this.kickerId = kickerId;
        this.kickedId = kickedId;
    }

    public buildEventObj():EventMsg {
        var eventMsg:EventMsg = super.buildEventObj();
        eventMsg.players.push(this.kickerId, this.kickedId);
        return eventMsg;
    }
}

export class ModifyName extends Event {
    private operatorId:number = 0;
    private originName:string = '';
    private resultName:string = '';

    constructor(operatorId:number, originName:string, resultName:string) {
        super(EventType.MODIFY_NAME);
        this.operatorId = operatorId;
        this.originName = originName;
        this.resultName = resultName;
    }

    public buildEventObj():EventMsg {
        var eventMsg:EventMsg = super.buildEventObj();
        eventMsg.players.push(this.operatorId);
        eventMsg.strArgs.push(this.originName, this.resultName);
        return eventMsg;
    }
}

export class AppointHierarchy extends Event {
    private operatorId:number = 0;
    private memberId:number = 0;
    private originHie:number = 0;
    private hierarchy:number = 0;

    constructor(operatorId:number, memberId:number, originHie, hierarchy:number) {
        super(EventType.APPOINT_HIERARCHY);
        this.operatorId = operatorId;
        this.memberId = memberId;
        this.originHie = originHie;
        this.hierarchy = hierarchy;
    }

    public buildEventObj():EventMsg {
        var eventMsg:EventMsg = super.buildEventObj();
        eventMsg.players.push(this.operatorId, this.memberId);
        eventMsg.numArgs.push(this.originHie, this.hierarchy);
        return eventMsg;
    }
}

export class GuildUpgrade extends Event {
    private lastGuildLevel:number = 0;
    private currentGuildLevel:number = 0;

    constructor(lastGuildLevel:number, currentGuildLevel:number) {
        super(EventType.GUILD_UPGRADE);
        this.lastGuildLevel = lastGuildLevel;
        this.currentGuildLevel = currentGuildLevel;
    }

    public buildEventObj():EventMsg {
        var eventMsg:EventMsg = super.buildEventObj();
        eventMsg.numArgs.push(this.lastGuildLevel, this.currentGuildLevel);
        return eventMsg;
    }
}

export class TechUpgrade extends Event {
    private operatorId:number = 0;
    private elementID:number = 0;
    private lastTechLevel:number = 0;
    private currentTechLevel:number = 0;

    constructor(operatorId:number, elementID:number, lastTechLevel:number, currentTechLevel:number) {
        super(EventType.TECH_UPGRADE);
        this.operatorId = operatorId;
        this.elementID = elementID;
        this.lastTechLevel = lastTechLevel;
        this.currentTechLevel = currentTechLevel;
    }

    public buildEventObj():EventMsg {
        var eventMsg:EventMsg = super.buildEventObj();
        eventMsg.players.push(this.operatorId);
        eventMsg.numArgs.push(this.elementID, this.lastTechLevel, this.currentTechLevel);
        return eventMsg;
    }
}

export class Contribute extends Event {
    private operatorId:number = 0;
    private money:number = 0;

    constructor(operatorId:number, money:number) {
        super(EventType.CONTRIBUTE);
        this.operatorId = operatorId;
        this.money = money;
    }

    public buildEventObj():EventMsg {
        var eventMsg:EventMsg = super.buildEventObj();
        eventMsg.players.push(this.operatorId);
        eventMsg.numArgs.push(this.money);
        return eventMsg;
    }
}
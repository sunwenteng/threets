//********** header **********//
import fs = require('fs');
import CustomError = require('../../util/errors');
import ERRC = require('../../util/error_code');


//********** body **********//
// achievementdb
export class achievementDB {
	ID:any;					//ID
	Text_name:any;			//成就名称
	icon:any;				//成就icon
	Text_description:any;	//成就描述
	requiredType:any;		//成就类型
	param:any;				//限定要求
	count:any;				//达成目标
	pvebossmail_id:any;		//剧情ID
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.icon = data.icon;
		this.Text_description = data.Text_description;
		this.requiredType = data.requiredType;
		this.param = data.param;
		this.count = data.count;
		this.pvebossmail_id = data.pvebossmail_id;
	}
}
class achievementDBMgr {
    achievementDBConfig : {[ID:number]: achievementDB} = {};
    constructor(data) {
        this.achievementDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.achievementDBConfig[data[key].ID] = new achievementDB(data[key]);
        });
    }
    public get(ID:number):achievementDB {
        var config = this.achievementDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, achievementdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: achievementDB} {
        return this.achievementDBConfig;
    }
}

// arena_infodb
export class arena_infoDB {
	ID:any;			//ID
	Text_name:any;	//联赛分组名
	min:any;		//联赛排名上限
	max:any;		//联赛排名下限
	factork:any;	//K值
	icon:any;		//图标样式
	item1:any;		//奖励物品1
	item_num1:any;	//奖励数量1
	item2:any;		//奖励物品2
	item_num2:any;	//奖励数量2
	item3:any;		//奖励物品3
	item_num3:any;	//奖励数量3
	item4:any;		//奖励物品4
	item_num4:any;	//奖励数量4
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.min = data.min;
		this.max = data.max;
		this.factork = data.factork;
		this.icon = data.icon;
		this.item1 = data.item1;
		this.item_num1 = data.item_num1;
		this.item2 = data.item2;
		this.item_num2 = data.item_num2;
		this.item3 = data.item3;
		this.item_num3 = data.item_num3;
		this.item4 = data.item4;
		this.item_num4 = data.item_num4;
	}
}
class arena_infoDBMgr {
    arena_infoDBConfig : {[ID:number]: arena_infoDB} = {};
    constructor(data) {
        this.arena_infoDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.arena_infoDBConfig[data[key].ID] = new arena_infoDB(data[key]);
        });
    }
    public get(ID:number):arena_infoDB {
        var config = this.arena_infoDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, arena_infodb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: arena_infoDB} {
        return this.arena_infoDBConfig;
    }
}

// arena_tournamentdb
export class arena_tournamentDB {
	ID:any;				//ID
	Text_name:any;		//联赛名称
	start:any;			//开始时间
	finish:any;			//结束时间
	milestoneid:any;	//里程碑奖励组ID
	rankequip:any;		//奖励ID
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.start = data.start;
		this.finish = data.finish;
		this.milestoneid = data.milestoneid;
		this.rankequip = data.rankequip;
	}
}
class arena_tournamentDBMgr {
    arena_tournamentDBConfig : {[ID:number]: arena_tournamentDB} = {};
    constructor(data) {
        this.arena_tournamentDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.arena_tournamentDBConfig[data[key].ID] = new arena_tournamentDB(data[key]);
        });
    }
    public get(ID:number):arena_tournamentDB {
        var config = this.arena_tournamentDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, arena_tournamentdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: arena_tournamentDB} {
        return this.arena_tournamentDBConfig;
    }
}

// boss_infodb
export class boss_infoDB {
	ID:any;				//ID
	Text_name:any;		//boss名称
	start:any;			//开始时间
	finish:any;			//结束时间
	Text_showtime:any;	//显示时间
	nemesis:any;		//天罚装备
	nemesisrate:any;	//天罚伤害加成
	milestoneid:any;	//里程碑奖励组ID
	rankid:any;			//结算奖励组ID
	rate:any;			//触发概率
	craftid:any;		//craftid
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.start = data.start;
		this.finish = data.finish;
		this.Text_showtime = data.Text_showtime;
		this.nemesis = data.nemesis;
		this.nemesisrate = data.nemesisrate;
		this.milestoneid = data.milestoneid;
		this.rankid = data.rankid;
		this.rate = data.rate;
		this.craftid = data.craftid;
	}
}
class boss_infoDBMgr {
    boss_infoDBConfig : {[ID:number]: boss_infoDB} = {};
    constructor(data) {
        this.boss_infoDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.boss_infoDBConfig[data[key].ID] = new boss_infoDB(data[key]);
        });
    }
    public get(ID:number):boss_infoDB {
        var config = this.boss_infoDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, boss_infodb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: boss_infoDB} {
        return this.boss_infoDBConfig;
    }
}

// build_basicdb
export class build_basicDB {
	ID:any;				//编号
	Text_name:any;		//建筑名称
	type:any;			//建筑类型
	grid:any;			//占格
	buildTime:any;		//建造耗时
	maxLevel:any;		//最大等级
	Text_describe:any;	//建筑说明ID
	maxCount:any;		//数量上限
	frameRate:any;		//动画帧间隔时间
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.type = data.type;
		this.grid = data.grid;
		this.buildTime = data.buildTime;
		this.maxLevel = data.maxLevel;
		this.Text_describe = data.Text_describe;
		this.maxCount = data.maxCount;
		this.frameRate = data.frameRate;
	}
}
class build_basicDBMgr {
    build_basicDBConfig : {[ID:number]: build_basicDB} = {};
    constructor(data) {
        this.build_basicDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.build_basicDBConfig[data[key].ID] = new build_basicDB(data[key]);
        });
    }
    public get(ID:number):build_basicDB {
        var config = this.build_basicDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, build_basicdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: build_basicDB} {
        return this.build_basicDBConfig;
    }
}

// chapterdb
export class chapterDB {
	ID:any;			//章节ID
	type:any;		//入口类型
	Text_name:any;	//章节中文名
	modelID:any;	//modelID
	constructor(data) {
		this.ID = data.ID;
		this.type = data.type;
		this.Text_name = data.Text_name;
		this.modelID = data.modelID;
	}
}
class chapterDBMgr {
    chapterDBConfig : {[ID:number]: chapterDB} = {};
    constructor(data) {
        this.chapterDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.chapterDBConfig[data[key].ID] = new chapterDB(data[key]);
        });
    }
    public get(ID:number):chapterDB {
        var config = this.chapterDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, chapterdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: chapterDB} {
        return this.chapterDBConfig;
    }
}

// equipdb
export class equipDB {
	ID:any;				//ID
	Text_name:any;		//装备名字
	groupID:any;		//组ID
	JSON_attribute:any;	//属性组
	plus:any;			//是否进阶
	attribute1:any;		//属性1
	attribute2:any;		//属性2
	maxlv:any;			//最大等级
	raity:any;			//稀有度
	atkbasic:any;		//0级攻击
	atkgrow:any;		//成长攻击
	defbasic:any;		//0级防御
	defgrow:any;		//成长防御
	icon:any;			//图标
	matchexp:any;		//匹配升级经验
	nomatchexp:any;		//非匹配升级经验
	atkid:any;			//Atkid
	skillid:any;		//SkillId
	modelid:any;		//modelid
	LooksLv1:any;		//变装等级1
	Looks1ID:any;		//avatar1
	LooksLv2:any;		//变装等级2
	Looks2ID:any;		//avatar2
	LooksLv3:any;		//变装等级3
	Looks3ID:any;		//avatar3
	precious:any;		//是否
	Text_des:any;		//描述
	albumDisplay:any;	//显示在图鉴
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.groupID = data.groupID;
		this.JSON_attribute = data.JSON_attribute;
		this.plus = data.plus;
		this.attribute1 = data.attribute1;
		this.attribute2 = data.attribute2;
		this.maxlv = data.maxlv;
		this.raity = data.raity;
		this.atkbasic = data.atkbasic;
		this.atkgrow = data.atkgrow;
		this.defbasic = data.defbasic;
		this.defgrow = data.defgrow;
		this.icon = data.icon;
		this.matchexp = data.matchexp;
		this.nomatchexp = data.nomatchexp;
		this.atkid = data.atkid;
		this.skillid = data.skillid;
		this.modelid = data.modelid;
		this.LooksLv1 = data.LooksLv1;
		this.Looks1ID = data.Looks1ID;
		this.LooksLv2 = data.LooksLv2;
		this.Looks2ID = data.Looks2ID;
		this.LooksLv3 = data.LooksLv3;
		this.Looks3ID = data.Looks3ID;
		this.precious = data.precious;
		this.Text_des = data.Text_des;
		this.albumDisplay = data.albumDisplay;
	}
}
class equipDBMgr {
    equipDBConfig : {[ID:number]: equipDB} = {};
    constructor(data) {
        this.equipDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.equipDBConfig[data[key].ID] = new equipDB(data[key]);
        });
    }
    public get(ID:number):equipDB {
        var config = this.equipDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, equipdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: equipDB} {
        return this.equipDBConfig;
    }
}

// fashiondb
export class fashionDB {
	ID:any;			//编号
	Text_name:any;	//时装名
	Wing:any;		//翅膀
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.Wing = data.Wing;
	}
}
class fashionDBMgr {
    fashionDBConfig : {[ID:number]: fashionDB} = {};
    constructor(data) {
        this.fashionDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.fashionDBConfig[data[key].ID] = new fashionDB(data[key]);
        });
    }
    public get(ID:number):fashionDB {
        var config = this.fashionDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, fashiondb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: fashionDB} {
        return this.fashionDBConfig;
    }
}

// initialskindb
export class initialskinDB {
	ID:any;					//ID
	Text_hairname:any;		//发型名字
	hair:any;				//发型
	Text_hairconame:any;	//发色名字
	hair_color:any;			//发色
	Text_facename:any;		//脸名字
	face:any;				//换脸
	Text_skinname:any;		//肤色名字
	JSON_skin_color:any;	//肤色
	constructor(data) {
		this.ID = data.ID;
		this.Text_hairname = data.Text_hairname;
		this.hair = data.hair;
		this.Text_hairconame = data.Text_hairconame;
		this.hair_color = data.hair_color;
		this.Text_facename = data.Text_facename;
		this.face = data.face;
		this.Text_skinname = data.Text_skinname;
		this.JSON_skin_color = data.JSON_skin_color;
	}
}
class initialskinDBMgr {
    initialskinDBConfig : {[ID:number]: initialskinDB} = {};
    constructor(data) {
        this.initialskinDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.initialskinDBConfig[data[key].ID] = new initialskinDB(data[key]);
        });
    }
    public get(ID:number):initialskinDB {
        var config = this.initialskinDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, initialskindb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: initialskinDB} {
        return this.initialskinDBConfig;
    }
}

// itemdb
export class itemDB {
	ID:any;					//ID
	Text_name:any;			//名字
	type:any;				//物品类型
	raity:any;				//物品品质
	maxnum:any;				//堆叠上限
	price:any;				//出售价格
	Text_description:any;	//描述
	icon:any;				//大图标
	icon1:any;				//小图标
	precious:any;			//是否提示
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.type = data.type;
		this.raity = data.raity;
		this.maxnum = data.maxnum;
		this.price = data.price;
		this.Text_description = data.Text_description;
		this.icon = data.icon;
		this.icon1 = data.icon1;
		this.precious = data.precious;
	}
}
class itemDBMgr {
    itemDBConfig : {[ID:number]: itemDB} = {};
    constructor(data) {
        this.itemDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.itemDBConfig[data[key].ID] = new itemDB(data[key]);
        });
    }
    public get(ID:number):itemDB {
        var config = this.itemDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, itemdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: itemDB} {
        return this.itemDBConfig;
    }
}

// monstertypedb
export class monstertypeDB {
	ID:any;			//monstertypeid
	Text_name:any;	//名字
	attribute1:any;	//属性1
	attribute2:any;	//属性2
	atkid:any;		//atkid
	skillid:any;	//skillid
	modelid:any;	//modelid
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.attribute1 = data.attribute1;
		this.attribute2 = data.attribute2;
		this.atkid = data.atkid;
		this.skillid = data.skillid;
		this.modelid = data.modelid;
	}
}
class monstertypeDBMgr {
    monstertypeDBConfig : {[ID:number]: monstertypeDB} = {};
    constructor(data) {
        this.monstertypeDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.monstertypeDBConfig[data[key].ID] = new monstertypeDB(data[key]);
        });
    }
    public get(ID:number):monstertypeDB {
        var config = this.monstertypeDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, monstertypedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: monstertypeDB} {
        return this.monstertypeDBConfig;
    }
}

// npc_infodb
export class npc_infoDB {
	ID:any;				//ID
	Text_npcName:any;	//NPC名称
	npcPic:any;			//NPCcsd名
	npcPlist:any;		//NPCplist
	constructor(data) {
		this.ID = data.ID;
		this.Text_npcName = data.Text_npcName;
		this.npcPic = data.npcPic;
		this.npcPlist = data.npcPlist;
	}
}
class npc_infoDBMgr {
    npc_infoDBConfig : {[ID:number]: npc_infoDB} = {};
    constructor(data) {
        this.npc_infoDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.npc_infoDBConfig[data[key].ID] = new npc_infoDB(data[key]);
        });
    }
    public get(ID:number):npc_infoDB {
        var config = this.npc_infoDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, npc_infodb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: npc_infoDB} {
        return this.npc_infoDBConfig;
    }
}

// quest_talkdb
export class quest_talkDB {
	ID:any;				//ID
	npcID:any;			//对话NPC
	npcFace:any;		//NPC表情
	npcLocal:any;		//NPC位置
	Text_speak1:any;	//NPC语句
	SoundName:any;		//语音文件名
	constructor(data) {
		this.ID = data.ID;
		this.npcID = data.npcID;
		this.npcFace = data.npcFace;
		this.npcLocal = data.npcLocal;
		this.Text_speak1 = data.Text_speak1;
		this.SoundName = data.SoundName;
	}
}
class quest_talkDBMgr {
    quest_talkDBConfig : {[ID:number]: quest_talkDB} = {};
    constructor(data) {
        this.quest_talkDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.quest_talkDBConfig[data[key].ID] = new quest_talkDB(data[key]);
        });
    }
    public get(ID:number):quest_talkDB {
        var config = this.quest_talkDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, quest_talkdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: quest_talkDB} {
        return this.quest_talkDBConfig;
    }
}

// random_namedb
export class random_nameDB {
	ID:any;			//ID
	Text_male:any;	//男名
	constructor(data) {
		this.ID = data.ID;
		this.Text_male = data.Text_male;
	}
}
class random_nameDBMgr {
    random_nameDBConfig : {[ID:number]: random_nameDB} = {};
    constructor(data) {
        this.random_nameDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.random_nameDBConfig[data[key].ID] = new random_nameDB(data[key]);
        });
    }
    public get(ID:number):random_nameDB {
        var config = this.random_nameDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, random_namedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: random_nameDB} {
        return this.random_nameDBConfig;
    }
}

// boss_summondb
export class boss_summonDB {
	ID:any;			//ID
	Text_name:any;	//名称
	type:any;		//怪物类型
	ischarge:any;	//是否打折
	cost:any;		//召唤花费
	showloot:any;	//显示LOOT
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.type = data.type;
		this.ischarge = data.ischarge;
		this.cost = data.cost;
		this.showloot = data.showloot;
	}
}
class boss_summonDBMgr {
    boss_summonDBConfig : {[ID:number]: boss_summonDB} = {};
    constructor(data) {
        this.boss_summonDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.boss_summonDBConfig[data[key].ID] = new boss_summonDB(data[key]);
        });
    }
    public get(ID:number):boss_summonDB {
        var config = this.boss_summonDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, boss_summondb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: boss_summonDB} {
        return this.boss_summonDBConfig;
    }
}

// languagedb
export class languageDB {
	ID:any;			//ID
	Text_name:any;	//名称
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
	}
}
class languageDBMgr {
    languageDBConfig : {[ID:number]: languageDB} = {};
    constructor(data) {
        this.languageDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.languageDBConfig[data[key].ID] = new languageDB(data[key]);
        });
    }
    public get(ID:number):languageDB {
        var config = this.languageDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, languagedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: languageDB} {
        return this.languageDBConfig;
    }
}

// build_upgradedb
export class build_upgradeDB {
	ID:any;					//编号
	build_ID:any;			//建筑ID
	buildLevel:any;			//建筑等级
	coinMax:any;			//金币容量
	coinPerHour:any;		//每小时产生金币
	upType:any;				//升级费用类型
	upPrice:any;			//升级费用
	upEffect:any;			//额外效果
	price:any;				//出售价格
	icon:any;				//建筑icon
	Text_upDescribe:any;	//升级描述
	constructor(data) {
		this.ID = data.ID;
		this.build_ID = data.build_ID;
		this.buildLevel = data.buildLevel;
		this.coinMax = data.coinMax;
		this.coinPerHour = data.coinPerHour;
		this.upType = data.upType;
		this.upPrice = data.upPrice;
		this.upEffect = data.upEffect;
		this.price = data.price;
		this.icon = data.icon;
		this.Text_upDescribe = data.Text_upDescribe;
	}
}
class build_upgradeDBMgr {
    build_upgradeDBConfig : {[ID:number]: build_upgradeDB} = {};
    constructor(data) {
        this.build_upgradeDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.build_upgradeDBConfig[data[key].ID] = new build_upgradeDB(data[key]);
        });
    }
    public get(ID:number):build_upgradeDB {
        var config = this.build_upgradeDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, build_upgradedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: build_upgradeDB} {
        return this.build_upgradeDBConfig;
    }
}

// subtaskdb
export class subtaskDB {
	ID:any;					//ID
	type:any;				//条件类型
	JSON_param:any;			//条件
	count:any;				//达成目标
	guideType:any;			//跳转界面
	JSON_guidePara:any;		//参数
	Text_subDescribe:any;	//子任务描述
	constructor(data) {
		this.ID = data.ID;
		this.type = data.type;
		this.JSON_param = data.JSON_param;
		this.count = data.count;
		this.guideType = data.guideType;
		this.JSON_guidePara = data.JSON_guidePara;
		this.Text_subDescribe = data.Text_subDescribe;
	}
}
class subtaskDBMgr {
    subtaskDBConfig : {[ID:number]: subtaskDB} = {};
    constructor(data) {
        this.subtaskDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.subtaskDBConfig[data[key].ID] = new subtaskDB(data[key]);
        });
    }
    public get(ID:number):subtaskDB {
        var config = this.subtaskDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, subtaskdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: subtaskDB} {
        return this.subtaskDBConfig;
    }
}

// chance_chestdb
export class chance_chestDB {
	ID:any;				//宝箱ID
	key:any;			//钥匙
	keyLoot:any;		//钥匙掉落组
	gemPrice:any;		//单开定价
	gemLoot:any;		//钻石掉落组
	totalTimes:any;		//特殊组进入累计次数
	specialLoot:any;	//特殊组ID
	JSON_EXP:any;		//展示
	Text_DES:any;		//奖品描述
	FirstLoot:any;		//首抽组
	ChestIcon:any;		//宝箱Icon
	constructor(data) {
		this.ID = data.ID;
		this.key = data.key;
		this.keyLoot = data.keyLoot;
		this.gemPrice = data.gemPrice;
		this.gemLoot = data.gemLoot;
		this.totalTimes = data.totalTimes;
		this.specialLoot = data.specialLoot;
		this.JSON_EXP = data.JSON_EXP;
		this.Text_DES = data.Text_DES;
		this.FirstLoot = data.FirstLoot;
		this.ChestIcon = data.ChestIcon;
	}
}
class chance_chestDBMgr {
    chance_chestDBConfig : {[ID:number]: chance_chestDB} = {};
    constructor(data) {
        this.chance_chestDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.chance_chestDBConfig[data[key].ID] = new chance_chestDB(data[key]);
        });
    }
    public get(ID:number):chance_chestDB {
        var config = this.chance_chestDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, chance_chestdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: chance_chestDB} {
        return this.chance_chestDBConfig;
    }
}

// error_messagedb
export class error_messageDB {
	ID:any;				//ID
	Text_Content:any;	//弹窗文字
	JSON_paraType:any;	//参数类型
	constructor(data) {
		this.ID = data.ID;
		this.Text_Content = data.Text_Content;
		this.JSON_paraType = data.JSON_paraType;
	}
}
class error_messageDBMgr {
    error_messageDBConfig : {[ID:number]: error_messageDB} = {};
    constructor(data) {
        this.error_messageDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.error_messageDBConfig[data[key].ID] = new error_messageDB(data[key]);
        });
    }
    public get(ID:number):error_messageDB {
        var config = this.error_messageDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, error_messagedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: error_messageDB} {
        return this.error_messageDBConfig;
    }
}

// notificationdb
export class notificationDB {
	ID:any;					//ID
	Text_notification:any;	//推送内容
	constructor(data) {
		this.ID = data.ID;
		this.Text_notification = data.Text_notification;
	}
}
class notificationDBMgr {
    notificationDBConfig : {[ID:number]: notificationDB} = {};
    constructor(data) {
        this.notificationDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.notificationDBConfig[data[key].ID] = new notificationDB(data[key]);
        });
    }
    public get(ID:number):notificationDB {
        var config = this.notificationDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, notificationdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: notificationDB} {
        return this.notificationDBConfig;
    }
}

// questdb
export class questDB {
	ID:any;				//ID
	Text_questName:any;	//任务名
	Text_questInfo:any;	//描述
	questType:any;		//类型
	arenaTourID:any;	//活动ID
	icon_type:any;		//ICON
	unlockLV:any;		//等级要求
	preQuestID:any;		//前置任务ID
	JSON_reward:any;	//奖励
	JSON_achiParam:any;	//完成条件
	JSON_startTalk:any;	//接取任务对话
	JSON_overTalk:any;	//完成任务对话
	constructor(data) {
		this.ID = data.ID;
		this.Text_questName = data.Text_questName;
		this.Text_questInfo = data.Text_questInfo;
		this.questType = data.questType;
		this.arenaTourID = data.arenaTourID;
		this.icon_type = data.icon_type;
		this.unlockLV = data.unlockLV;
		this.preQuestID = data.preQuestID;
		this.JSON_reward = data.JSON_reward;
		this.JSON_achiParam = data.JSON_achiParam;
		this.JSON_startTalk = data.JSON_startTalk;
		this.JSON_overTalk = data.JSON_overTalk;
	}
}
class questDBMgr {
    questDBConfig : {[ID:number]: questDB} = {};
    constructor(data) {
        this.questDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.questDBConfig[data[key].ID] = new questDB(data[key]);
        });
    }
    public get(ID:number):questDB {
        var config = this.questDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, questdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: questDB} {
        return this.questDBConfig;
    }
}

// guidedb
export class guideDB {
	ID:any;				//id
	groupid:any;		//groupid
	stepid:any;			//步骤ID
	Gudie_ButtonId:any;	//Gudie_ButtonId
	table_type:any;		//弹版类型
	Text_npcname:any;	//NPC说话名字
	npc_pic:any;		//NPCId
	Text_npctalk:any;	//NPC说话文字
	isleft:any;			//NPC左右
	tableposy:any;		//文本坐标Y轴
	donetable:any;		//结束步骤弹出时弹出面板
	lock:any;			//是否锁定界面
	constructor(data) {
		this.ID = data.ID;
		this.groupid = data.groupid;
		this.stepid = data.stepid;
		this.Gudie_ButtonId = data.Gudie_ButtonId;
		this.table_type = data.table_type;
		this.Text_npcname = data.Text_npcname;
		this.npc_pic = data.npc_pic;
		this.Text_npctalk = data.Text_npctalk;
		this.isleft = data.isleft;
		this.tableposy = data.tableposy;
		this.donetable = data.donetable;
		this.lock = data.lock;
	}
}
class guideDBMgr {
    guideDBConfig : {[ID:number]: guideDB} = {};
    constructor(data) {
        this.guideDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guideDBConfig[data[key].ID] = new guideDB(data[key]);
        });
    }
    public get(ID:number):guideDB {
        var config = this.guideDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guidedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guideDB} {
        return this.guideDBConfig;
    }
}

// guide_funcopendb
export class guide_funcopenDB {
	ID:any;				//id
	Text_lock:any;		//未解锁文字描述
	Text_unlock:any;	//解锁文字提示
	trigger_type:any;	//触发类型
	triggerpara:any;	//触发参数
	constructor(data) {
		this.ID = data.ID;
		this.Text_lock = data.Text_lock;
		this.Text_unlock = data.Text_unlock;
		this.trigger_type = data.trigger_type;
		this.triggerpara = data.triggerpara;
	}
}
class guide_funcopenDBMgr {
    guide_funcopenDBConfig : {[ID:number]: guide_funcopenDB} = {};
    constructor(data) {
        this.guide_funcopenDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guide_funcopenDBConfig[data[key].ID] = new guide_funcopenDB(data[key]);
        });
    }
    public get(ID:number):guide_funcopenDB {
        var config = this.guide_funcopenDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guide_funcopendb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guide_funcopenDB} {
        return this.guide_funcopenDBConfig;
    }
}

// paydb
export class payDB {
	ID:any;					//编号
	DescName:any;			//备注
	productID:any;			//商品ID
	Text_proName:any;		//商品名
	platform:any;			//客户端平台id
	payplatformID:any;		//支付渠道ID
	Price:any;				//价格
	discount:any;			//折扣价
	JSON_Item:any;			//购买道具
	JSON_giftItem:any;		//赠送道具
	goodstype:any;			//商品类型
	paixu:any;				//排序值
	Text_desc:any;			//描述
	icon:any;				//icon
	goodsID:any;			//IOS商品号
	android_goodsID:any;	//安卓商品号
	Text_tips:any;			//渠道描述
	type:any;				//货币类型
	appear:any;				//是否可见
	constructor(data) {
		this.ID = data.ID;
		this.DescName = data.DescName;
		this.productID = data.productID;
		this.Text_proName = data.Text_proName;
		this.platform = data.platform;
		this.payplatformID = data.payplatformID;
		this.Price = data.Price;
		this.discount = data.discount;
		this.JSON_Item = data.JSON_Item;
		this.JSON_giftItem = data.JSON_giftItem;
		this.goodstype = data.goodstype;
		this.paixu = data.paixu;
		this.Text_desc = data.Text_desc;
		this.icon = data.icon;
		this.goodsID = data.goodsID;
		this.android_goodsID = data.android_goodsID;
		this.Text_tips = data.Text_tips;
		this.type = data.type;
		this.appear = data.appear;
	}
}
class payDBMgr {
    payDBConfig : {[ID:number]: payDB} = {};
    constructor(data) {
        this.payDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.payDBConfig[data[key].ID] = new payDB(data[key]);
        });
    }
    public get(ID:number):payDB {
        var config = this.payDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, paydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: payDB} {
        return this.payDBConfig;
    }
}

// guidefightdb
export class guidefightDB {
	ID:any;			//ID
	type:any;		//类型
	position:any;	//站位id
	modelid:any;	//monster_modelid
	knightid:any;	//骑士ID
	equipid:any;	//装备ID
	lv:any;			//骑士等级
	HP:any;			//生命
	atk:any;		//攻击
	def:any;		//防御
	crit:any;		//暴击
	hit:any;		//命中
	Text_name:any;	//名字
	attribute1:any;	//元素1
	attribute2:any;	//元素2
	constructor(data) {
		this.ID = data.ID;
		this.type = data.type;
		this.position = data.position;
		this.modelid = data.modelid;
		this.knightid = data.knightid;
		this.equipid = data.equipid;
		this.lv = data.lv;
		this.HP = data.HP;
		this.atk = data.atk;
		this.def = data.def;
		this.crit = data.crit;
		this.hit = data.hit;
		this.Text_name = data.Text_name;
		this.attribute1 = data.attribute1;
		this.attribute2 = data.attribute2;
	}
}
class guidefightDBMgr {
    guidefightDBConfig : {[ID:number]: guidefightDB} = {};
    constructor(data) {
        this.guidefightDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guidefightDBConfig[data[key].ID] = new guidefightDB(data[key]);
        });
    }
    public get(ID:number):guidefightDB {
        var config = this.guidefightDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guidefightdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guidefightDB} {
        return this.guidefightDBConfig;
    }
}

// SpecialIcondb
export class SpecialIconDB {
	ID:any;			//ID
	Icon:any;		//显示ICON路径
	Text_Des:any;	//装备星级
	constructor(data) {
		this.ID = data.ID;
		this.Icon = data.Icon;
		this.Text_Des = data.Text_Des;
	}
}
class SpecialIconDBMgr {
    SpecialIconDBConfig : {[ID:number]: SpecialIconDB} = {};
    constructor(data) {
        this.SpecialIconDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.SpecialIconDBConfig[data[key].ID] = new SpecialIconDB(data[key]);
        });
    }
    public get(ID:number):SpecialIconDB {
        var config = this.SpecialIconDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, SpecialIcondb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: SpecialIconDB} {
        return this.SpecialIconDBConfig;
    }
}

// shop_itemdb
export class shop_itemDB {
	ID:any;				//ID
	itemID:any;			//物品ID
	count:any;			//数量
	resID:any;			//价格类型
	originPrice:any;	//原价
	salePercent:any;	//折扣百分比
	tab:any;			//标签
	feature:any;		//是否在feature中出现
	feaType:any;		//角标类型
	sort:any;			//排序值
	maxCount:any;		//最大拥有件数
	icon:any;			//Icon
	Text_title:any;		//名称
	constructor(data) {
		this.ID = data.ID;
		this.itemID = data.itemID;
		this.count = data.count;
		this.resID = data.resID;
		this.originPrice = data.originPrice;
		this.salePercent = data.salePercent;
		this.tab = data.tab;
		this.feature = data.feature;
		this.feaType = data.feaType;
		this.sort = data.sort;
		this.maxCount = data.maxCount;
		this.icon = data.icon;
		this.Text_title = data.Text_title;
	}
}
class shop_itemDBMgr {
    shop_itemDBConfig : {[ID:number]: shop_itemDB} = {};
    constructor(data) {
        this.shop_itemDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.shop_itemDBConfig[data[key].ID] = new shop_itemDB(data[key]);
        });
    }
    public get(ID:number):shop_itemDB {
        var config = this.shop_itemDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, shop_itemdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: shop_itemDB} {
        return this.shop_itemDBConfig;
    }
}

// Hierarchydb
export class HierarchyDB {
	ID:any;					//ID
	Text_title:any;			//职称
	power:any;				//权限大小
	approvePrivilege:any;	//批准入会
	kickPrivilege:any;		//踢人
	appointPrivilege:any;	//任命hierarcy
	skillPrivilege:any;		//升级科技
	bonuseProperty:any;		//属性加成
	settingPrivilege:any;	//公会设置
	constructor(data) {
		this.ID = data.ID;
		this.Text_title = data.Text_title;
		this.power = data.power;
		this.approvePrivilege = data.approvePrivilege;
		this.kickPrivilege = data.kickPrivilege;
		this.appointPrivilege = data.appointPrivilege;
		this.skillPrivilege = data.skillPrivilege;
		this.bonuseProperty = data.bonuseProperty;
		this.settingPrivilege = data.settingPrivilege;
	}
}
class HierarchyDBMgr {
    HierarchyDBConfig : {[ID:number]: HierarchyDB} = {};
    constructor(data) {
        this.HierarchyDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.HierarchyDBConfig[data[key].ID] = new HierarchyDB(data[key]);
        });
    }
    public get(ID:number):HierarchyDB {
        var config = this.HierarchyDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, Hierarchydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: HierarchyDB} {
        return this.HierarchyDBConfig;
    }
}

// guild_elementdb
export class guild_elementDB {
	ID:any;				//ID
	Text_element:any;	//元素
	icon:any;			//图片
	constructor(data) {
		this.ID = data.ID;
		this.Text_element = data.Text_element;
		this.icon = data.icon;
	}
}
class guild_elementDBMgr {
    guild_elementDBConfig : {[ID:number]: guild_elementDB} = {};
    constructor(data) {
        this.guild_elementDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guild_elementDBConfig[data[key].ID] = new guild_elementDB(data[key]);
        });
    }
    public get(ID:number):guild_elementDB {
        var config = this.guild_elementDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guild_elementdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guild_elementDB} {
        return this.guild_elementDBConfig;
    }
}

// guild_taskdb
export class guild_taskDB {
	ID:any;					//ID
	type:any;				//条件类型
	JSON_param:any;			//条件
	count:any;				//达成目标
	guideType:any;			//跳转界面
	JSON_guidePara:any;		//参数
	unlockLv:any;			//解锁等级
	preQuestID:any;			//前置ID
	guildEXP:any;			//公会经验
	Text_subDescribe:any;	//描述
	constructor(data) {
		this.ID = data.ID;
		this.type = data.type;
		this.JSON_param = data.JSON_param;
		this.count = data.count;
		this.guideType = data.guideType;
		this.JSON_guidePara = data.JSON_guidePara;
		this.unlockLv = data.unlockLv;
		this.preQuestID = data.preQuestID;
		this.guildEXP = data.guildEXP;
		this.Text_subDescribe = data.Text_subDescribe;
	}
}
class guild_taskDBMgr {
    guild_taskDBConfig : {[ID:number]: guild_taskDB} = {};
    constructor(data) {
        this.guild_taskDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guild_taskDBConfig[data[key].ID] = new guild_taskDB(data[key]);
        });
    }
    public get(ID:number):guild_taskDB {
        var config = this.guild_taskDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guild_taskdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guild_taskDB} {
        return this.guild_taskDBConfig;
    }
}

// boss_rankdb
export class boss_rankDB {
	ID:any;			//ID
	Text_name:any;	//联赛分组名
	sort:any;		//排序值
	min:any;		//名次下限
	max:any;		//名次上限
	icon:any;		//组图标ICON
	constructor(data) {
		this.ID = data.ID;
		this.Text_name = data.Text_name;
		this.sort = data.sort;
		this.min = data.min;
		this.max = data.max;
		this.icon = data.icon;
	}
}
class boss_rankDBMgr {
    boss_rankDBConfig : {[ID:number]: boss_rankDB} = {};
    constructor(data) {
        this.boss_rankDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.boss_rankDBConfig[data[key].ID] = new boss_rankDB(data[key]);
        });
    }
    public get(ID:number):boss_rankDB {
        var config = this.boss_rankDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, boss_rankdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: boss_rankDB} {
        return this.boss_rankDBConfig;
    }
}

// lvunlockdb
export class lvunlockDB {
	ID:any;				//ID
	type:any;			//类型
	lv:any;				//等级
	icon:any;			//icon路径
	image1:any;			//图片名字
	image2:any;			//
	Text_describe:any;	//文字描述
	constructor(data) {
		this.ID = data.ID;
		this.type = data.type;
		this.lv = data.lv;
		this.icon = data.icon;
		this.image1 = data.image1;
		this.image2 = data.image2;
		this.Text_describe = data.Text_describe;
	}
}
class lvunlockDBMgr {
    lvunlockDBConfig : {[ID:number]: lvunlockDB} = {};
    constructor(data) {
        this.lvunlockDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.lvunlockDBConfig[data[key].ID] = new lvunlockDB(data[key]);
        });
    }
    public get(ID:number):lvunlockDB {
        var config = this.lvunlockDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, lvunlockdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: lvunlockDB} {
        return this.lvunlockDBConfig;
    }
}

// pvebossmailtextdb
export class pvebossmailtextDB {
	ID:any;				//编号
	icon:any;			//BOSS头像
	Text_name:any;		//BOSS名称
	Text_content:any;	//信件内容
	constructor(data) {
		this.ID = data.ID;
		this.icon = data.icon;
		this.Text_name = data.Text_name;
		this.Text_content = data.Text_content;
	}
}
class pvebossmailtextDBMgr {
    pvebossmailtextDBConfig : {[ID:number]: pvebossmailtextDB} = {};
    constructor(data) {
        this.pvebossmailtextDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.pvebossmailtextDBConfig[data[key].ID] = new pvebossmailtextDB(data[key]);
        });
    }
    public get(ID:number):pvebossmailtextDB {
        var config = this.pvebossmailtextDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, pvebossmailtextdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: pvebossmailtextDB} {
        return this.pvebossmailtextDBConfig;
    }
}

// actiondb
export class actionDB {
	ID:any;				//ID
	Action_Type:any;	//类别
	constructor(data) {
		this.ID = data.ID;
		this.Action_Type = data.Action_Type;
	}
}
class actionDBMgr {
    actionDBConfig : {[ID:number]: actionDB} = {};
    constructor(data) {
        this.actionDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.actionDBConfig[data[key].ID] = new actionDB(data[key]);
        });
    }
    public get(ID:number):actionDB {
        var config = this.actionDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, actiondb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: actionDB} {
        return this.actionDBConfig;
    }
}

// arena_milestonedb
export class arena_milestoneDB {
	ID:any;			//奖励ID
	gourp_id:any;	//奖励组ID
	sort:any;		//组别
	milestone:any;	//达到积分可领取
	icon:any;		//图标底纹样式
	item1:any;		//奖励ID1
	item_num1:any;	//奖励数量1
	item2:any;		//奖励ID2
	item_num2:any;	//奖励数量2
	item3:any;		//奖励ID3
	item_num3:any;	//奖励数量3
	constructor(data) {
		this.ID = data.ID;
		this.gourp_id = data.gourp_id;
		this.sort = data.sort;
		this.milestone = data.milestone;
		this.icon = data.icon;
		this.item1 = data.item1;
		this.item_num1 = data.item_num1;
		this.item2 = data.item2;
		this.item_num2 = data.item_num2;
		this.item3 = data.item3;
		this.item_num3 = data.item_num3;
	}
}
class arena_milestoneDBMgr {
    arena_milestoneDBConfig : {[ID:number]: arena_milestoneDB} = {};
    constructor(data) {
        this.arena_milestoneDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.arena_milestoneDBConfig[data[key].ID] = new arena_milestoneDB(data[key]);
        });
    }
    public get(ID:number):arena_milestoneDB {
        var config = this.arena_milestoneDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, arena_milestonedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: arena_milestoneDB} {
        return this.arena_milestoneDBConfig;
    }
}

// arena_winstreakdb
export class arena_winstreakDB {
	ID:any;			//ID
	name:any;		//连胜条件
	addition:any;	//积分加成系数
	lootid:any;		//itemloot
	rankreward:any;	//显示图标
	num:any;		//显示数量
	constructor(data) {
		this.ID = data.ID;
		this.name = data.name;
		this.addition = data.addition;
		this.lootid = data.lootid;
		this.rankreward = data.rankreward;
		this.num = data.num;
	}
}
class arena_winstreakDBMgr {
    arena_winstreakDBConfig : {[ID:number]: arena_winstreakDB} = {};
    constructor(data) {
        this.arena_winstreakDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.arena_winstreakDBConfig[data[key].ID] = new arena_winstreakDB(data[key]);
        });
    }
    public get(ID:number):arena_winstreakDB {
        var config = this.arena_winstreakDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, arena_winstreakdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: arena_winstreakDB} {
        return this.arena_winstreakDBConfig;
    }
}

// boss_abilitydb
export class boss_abilityDB {
	ID:any;			//等级
	level:any;		//等级
	monsterid:any;	//ID
	hp:any;			//生命
	atk:any;		//攻击力
	def:any;		//防御力
	constructor(data) {
		this.ID = data.ID;
		this.level = data.level;
		this.monsterid = data.monsterid;
		this.hp = data.hp;
		this.atk = data.atk;
		this.def = data.def;
	}
}
class boss_abilityDBMgr {
    boss_abilityDBConfig : {[ID:number]: boss_abilityDB} = {};
    constructor(data) {
        this.boss_abilityDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.boss_abilityDBConfig[data[key].ID] = new boss_abilityDB(data[key]);
        });
    }
    public get(ID:number):boss_abilityDB {
        var config = this.boss_abilityDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, boss_abilitydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: boss_abilityDB} {
        return this.boss_abilityDBConfig;
    }
}

// boss_energydb
export class boss_energyDB {
	ID:any;				//骑士个数
	energy:any;			//消耗能量
	damagebonus:any;	//提升伤害
	constructor(data) {
		this.ID = data.ID;
		this.energy = data.energy;
		this.damagebonus = data.damagebonus;
	}
}
class boss_energyDBMgr {
    boss_energyDBConfig : {[ID:number]: boss_energyDB} = {};
    constructor(data) {
        this.boss_energyDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.boss_energyDBConfig[data[key].ID] = new boss_energyDB(data[key]);
        });
    }
    public get(ID:number):boss_energyDB {
        var config = this.boss_energyDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, boss_energydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: boss_energyDB} {
        return this.boss_energyDBConfig;
    }
}

// boss_milestonedb
export class boss_milestoneDB {
	ID:any;			//奖励ID
	gourp_id:any;	//奖励组ID
	sort:any;		//组别
	milestone:any;	//达到胜利数可领取
	icon:any;		//图标底纹样式
	equipid:any;	//本组内需要特殊显示装备
	item1:any;		//奖励ID1
	item_num1:any;	//奖励数量1
	item2:any;		//奖励ID2
	item_num2:any;	//奖励数量2
	item3:any;		//奖励ID3
	item_num3:any;	//奖励数量3
	item4:any;		//奖励ID4
	item_num4:any;	//奖励数量4
	constructor(data) {
		this.ID = data.ID;
		this.gourp_id = data.gourp_id;
		this.sort = data.sort;
		this.milestone = data.milestone;
		this.icon = data.icon;
		this.equipid = data.equipid;
		this.item1 = data.item1;
		this.item_num1 = data.item_num1;
		this.item2 = data.item2;
		this.item_num2 = data.item_num2;
		this.item3 = data.item3;
		this.item_num3 = data.item_num3;
		this.item4 = data.item4;
		this.item_num4 = data.item_num4;
	}
}
class boss_milestoneDBMgr {
    boss_milestoneDBConfig : {[ID:number]: boss_milestoneDB} = {};
    constructor(data) {
        this.boss_milestoneDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.boss_milestoneDBConfig[data[key].ID] = new boss_milestoneDB(data[key]);
        });
    }
    public get(ID:number):boss_milestoneDB {
        var config = this.boss_milestoneDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, boss_milestonedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: boss_milestoneDB} {
        return this.boss_milestoneDBConfig;
    }
}

// boss_rewarddb
export class boss_rewardDB {
	ID:any;			//ID
	groupid:any;	//组ID
	rankgroup:any;	//排名组
	item1:any;		//奖励物品1
	item_num1:any;	//奖励数量1
	item2:any;		//奖励物品2
	item_num2:any;	//奖励数量2
	item3:any;		//奖励物品3
	item_num3:any;	//奖励数量3
	item4:any;		//奖励物品4
	item_num4:any;	//奖励数量4
	constructor(data) {
		this.ID = data.ID;
		this.groupid = data.groupid;
		this.rankgroup = data.rankgroup;
		this.item1 = data.item1;
		this.item_num1 = data.item_num1;
		this.item2 = data.item2;
		this.item_num2 = data.item_num2;
		this.item3 = data.item3;
		this.item_num3 = data.item_num3;
		this.item4 = data.item4;
		this.item_num4 = data.item_num4;
	}
}
class boss_rewardDBMgr {
    boss_rewardDBConfig : {[ID:number]: boss_rewardDB} = {};
    constructor(data) {
        this.boss_rewardDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.boss_rewardDBConfig[data[key].ID] = new boss_rewardDB(data[key]);
        });
    }
    public get(ID:number):boss_rewardDB {
        var config = this.boss_rewardDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, boss_rewarddb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: boss_rewardDB} {
        return this.boss_rewardDBConfig;
    }
}

// Build_initialdb
export class Build_initialDB {
	ID:any;			//ID
	BuildID:any;	//建筑ID
	PX:any;			//位置X坐标
	PY:any;			//位置Y坐标
	Direction:any;	//方向
	constructor(data) {
		this.ID = data.ID;
		this.BuildID = data.BuildID;
		this.PX = data.PX;
		this.PY = data.PY;
		this.Direction = data.Direction;
	}
}
class Build_initialDBMgr {
    Build_initialDBConfig : {[ID:number]: Build_initialDB} = {};
    constructor(data) {
        this.Build_initialDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.Build_initialDBConfig[data[key].ID] = new Build_initialDB(data[key]);
        });
    }
    public get(ID:number):Build_initialDB {
        var config = this.Build_initialDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, Build_initialdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: Build_initialDB} {
        return this.Build_initialDBConfig;
    }
}

// build_localdb
export class build_localDB {
	ID:any;		//ID
	pointX:any;	//初始点X坐标
	pointY:any;	//初始点Y坐标
	sizeX:any;	//X长
	sizeY:any;	//Y长
	pic:any;	//图片路径
	constructor(data) {
		this.ID = data.ID;
		this.pointX = data.pointX;
		this.pointY = data.pointY;
		this.sizeX = data.sizeX;
		this.sizeY = data.sizeY;
		this.pic = data.pic;
	}
}
class build_localDBMgr {
    build_localDBConfig : {[ID:number]: build_localDB} = {};
    constructor(data) {
        this.build_localDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.build_localDBConfig[data[key].ID] = new build_localDB(data[key]);
        });
    }
    public get(ID:number):build_localDB {
        var config = this.build_localDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, build_localdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: build_localDB} {
        return this.build_localDBConfig;
    }
}

// build_tmxdb
export class build_tmxDB {
	ID:any;			//ID
	JSON_data:any;	//data
	height:any;		//height
	width:any;		//width
	tileheight:any;	//tileheight
	tilewidth:any;	//tilewidth
	constructor(data) {
		this.ID = data.ID;
		this.JSON_data = data.JSON_data;
		this.height = data.height;
		this.width = data.width;
		this.tileheight = data.tileheight;
		this.tilewidth = data.tilewidth;
	}
}
class build_tmxDBMgr {
    build_tmxDBConfig : {[ID:number]: build_tmxDB} = {};
    constructor(data) {
        this.build_tmxDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.build_tmxDBConfig[data[key].ID] = new build_tmxDB(data[key]);
        });
    }
    public get(ID:number):build_tmxDB {
        var config = this.build_tmxDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, build_tmxdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: build_tmxDB} {
        return this.build_tmxDBConfig;
    }
}

// craftskilldb
export class craftskillDB {
	ID:any;				//打造技能ID
	item1ID:any;		//解锁道具1ID
	item2ID:any;		//解锁道具2ID
	DesItemID:any;		//目标道具ID
	DesItemLV:any;		//目标道具等级
	ChaLV:any;			//等级解锁
	questID:any;		//解锁任务ID
	shardID:any;		//需求材料ID
	shardQu:any;		//需求材料数
	coinCost:any;		//消耗金币
	timeCost:any;		//消耗时间
	craftID:any;		//合成装备ID
	guideType:any;		//掉落类型
	JSON_guidePara:any;	//掉落点
	timeLimit:any;		//存在时效
	bossID:any;			//世界BOSSID
	bossLV:any;			//世界BOSS里程碑
	priorityID:any;		//替换ID
	monHead:any;		//怪物头像
	isnew:any;			//是否提示新装备
	bossnextLV:any;		//世界BOSS解锁+版所需Lv
	constructor(data) {
		this.ID = data.ID;
		this.item1ID = data.item1ID;
		this.item2ID = data.item2ID;
		this.DesItemID = data.DesItemID;
		this.DesItemLV = data.DesItemLV;
		this.ChaLV = data.ChaLV;
		this.questID = data.questID;
		this.shardID = data.shardID;
		this.shardQu = data.shardQu;
		this.coinCost = data.coinCost;
		this.timeCost = data.timeCost;
		this.craftID = data.craftID;
		this.guideType = data.guideType;
		this.JSON_guidePara = data.JSON_guidePara;
		this.timeLimit = data.timeLimit;
		this.bossID = data.bossID;
		this.bossLV = data.bossLV;
		this.priorityID = data.priorityID;
		this.monHead = data.monHead;
		this.isnew = data.isnew;
		this.bossnextLV = data.bossnextLV;
	}
}
class craftskillDBMgr {
    craftskillDBConfig : {[ID:number]: craftskillDB} = {};
    constructor(data) {
        this.craftskillDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.craftskillDBConfig[data[key].ID] = new craftskillDB(data[key]);
        });
    }
    public get(ID:number):craftskillDB {
        var config = this.craftskillDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, craftskilldb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: craftskillDB} {
        return this.craftskillDBConfig;
    }
}

// currencydb
export class currencyDB {
	ID:any;			//ID
	Currency:any;	//货币简写
	CurrSym:any;	//货币符号
	constructor(data) {
		this.ID = data.ID;
		this.Currency = data.Currency;
		this.CurrSym = data.CurrSym;
	}
}
class currencyDBMgr {
    currencyDBConfig : {[ID:number]: currencyDB} = {};
    constructor(data) {
        this.currencyDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.currencyDBConfig[data[key].ID] = new currencyDB(data[key]);
        });
    }
    public get(ID:number):currencyDB {
        var config = this.currencyDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, currencydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: currencyDB} {
        return this.currencyDBConfig;
    }
}

// damagecaldb
export class damagecalDB {
	ID:any;			//ID
	level:any;		//等级
	advanture:any;	//推图
	epicBoss:any;	//史诗BOSS
	PVP:any;		//PVP
	constructor(data) {
		this.ID = data.ID;
		this.level = data.level;
		this.advanture = data.advanture;
		this.epicBoss = data.epicBoss;
		this.PVP = data.PVP;
	}
}
class damagecalDBMgr {
    damagecalDBConfig : {[ID:number]: damagecalDB} = {};
    constructor(data) {
        this.damagecalDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.damagecalDBConfig[data[key].ID] = new damagecalDB(data[key]);
        });
    }
    public get(ID:number):damagecalDB {
        var config = this.damagecalDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, damagecaldb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: damagecalDB} {
        return this.damagecalDBConfig;
    }
}

// equipexpdb
export class equipexpDB {
	ID:any;				//ID
	LV1Exp:any;			//1升级经验
	LV30Exp:any;		//30升级经验
	LV50Exp:any;		//50升级经验
	LV70Exp:any;		//70升级经验
	LV99Exp:any;		//990升级经验
	coinPerSlot:any;	//单孔消耗金币
	constructor(data) {
		this.ID = data.ID;
		this.LV1Exp = data.LV1Exp;
		this.LV30Exp = data.LV30Exp;
		this.LV50Exp = data.LV50Exp;
		this.LV70Exp = data.LV70Exp;
		this.LV99Exp = data.LV99Exp;
		this.coinPerSlot = data.coinPerSlot;
	}
}
class equipexpDBMgr {
    equipexpDBConfig : {[ID:number]: equipexpDB} = {};
    constructor(data) {
        this.equipexpDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.equipexpDBConfig[data[key].ID] = new equipexpDB(data[key]);
        });
    }
    public get(ID:number):equipexpDB {
        var config = this.equipexpDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, equipexpdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: equipexpDB} {
        return this.equipexpDBConfig;
    }
}

// expansiondb
export class expansionDB {
	ID:any;			//ID
	coinCost:any;	//每次解锁金币消耗
	timeCost:any;	//每次解锁时间消耗
	constructor(data) {
		this.ID = data.ID;
		this.coinCost = data.coinCost;
		this.timeCost = data.timeCost;
	}
}
class expansionDBMgr {
    expansionDBConfig : {[ID:number]: expansionDB} = {};
    constructor(data) {
        this.expansionDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.expansionDBConfig[data[key].ID] = new expansionDB(data[key]);
        });
    }
    public get(ID:number):expansionDB {
        var config = this.expansionDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, expansiondb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: expansionDB} {
        return this.expansionDBConfig;
    }
}

// experimentdb
export class experimentDB {
	ID:any;					//ID
	JSON_MonsterGroup:any;	//波次怪物
	JSON_reward:any;		//奖励
	constructor(data) {
		this.ID = data.ID;
		this.JSON_MonsterGroup = data.JSON_MonsterGroup;
		this.JSON_reward = data.JSON_reward;
	}
}
class experimentDBMgr {
    experimentDBConfig : {[ID:number]: experimentDB} = {};
    constructor(data) {
        this.experimentDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.experimentDBConfig[data[key].ID] = new experimentDB(data[key]);
        });
    }
    public get(ID:number):experimentDB {
        var config = this.experimentDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, experimentdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: experimentDB} {
        return this.experimentDBConfig;
    }
}

// fixedrewarddb
export class fixedrewardDB {
	ID:any;				//ID
	JSON_reward:any;	//奖励
	constructor(data) {
		this.ID = data.ID;
		this.JSON_reward = data.JSON_reward;
	}
}
class fixedrewardDBMgr {
    fixedrewardDBConfig : {[ID:number]: fixedrewardDB} = {};
    constructor(data) {
        this.fixedrewardDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.fixedrewardDBConfig[data[key].ID] = new fixedrewardDB(data[key]);
        });
    }
    public get(ID:number):fixedrewardDB {
        var config = this.fixedrewardDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, fixedrewarddb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: fixedrewardDB} {
        return this.fixedrewardDBConfig;
    }
}

// forbiddendb
export class forbiddenDB {
	ID:any;				//ID
	forbiddenWord:any;	//屏蔽字
	constructor(data) {
		this.ID = data.ID;
		this.forbiddenWord = data.forbiddenWord;
	}
}
class forbiddenDBMgr {
    forbiddenDBConfig : {[ID:number]: forbiddenDB} = {};
    constructor(data) {
        this.forbiddenDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.forbiddenDBConfig[data[key].ID] = new forbiddenDB(data[key]);
        });
    }
    public get(ID:number):forbiddenDB {
        var config = this.forbiddenDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, forbiddendb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: forbiddenDB} {
        return this.forbiddenDBConfig;
    }
}

// friendhirecostdb
export class friendhirecostDB {
	ID:any;			//ID
	hireCost:any;	//雇佣花费
	time:any;		//剩余次数
	constructor(data) {
		this.ID = data.ID;
		this.hireCost = data.hireCost;
		this.time = data.time;
	}
}
class friendhirecostDBMgr {
    friendhirecostDBConfig : {[ID:number]: friendhirecostDB} = {};
    constructor(data) {
        this.friendhirecostDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.friendhirecostDBConfig[data[key].ID] = new friendhirecostDB(data[key]);
        });
    }
    public get(ID:number):friendhirecostDB {
        var config = this.friendhirecostDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, friendhirecostdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: friendhirecostDB} {
        return this.friendhirecostDBConfig;
    }
}

// friend_referdb
export class friend_referDB {
	ID:any;			//ID
	refer_num:any;	//邀请好友数量
	item:any;		//奖励物品
	itemnum:any;	//物品数量
	constructor(data) {
		this.ID = data.ID;
		this.refer_num = data.refer_num;
		this.item = data.item;
		this.itemnum = data.itemnum;
	}
}
class friend_referDBMgr {
    friend_referDBConfig : {[ID:number]: friend_referDB} = {};
    constructor(data) {
        this.friend_referDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.friend_referDBConfig[data[key].ID] = new friend_referDB(data[key]);
        });
    }
    public get(ID:number):friend_referDB {
        var config = this.friend_referDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, friend_referdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: friend_referDB} {
        return this.friend_referDBConfig;
    }
}

// funcontroldb
export class funcontrolDB {
	ID:any;			//渠道号
	shareType:any;	//分享类型
	constructor(data) {
		this.ID = data.ID;
		this.shareType = data.shareType;
	}
}
class funcontrolDBMgr {
    funcontrolDBConfig : {[ID:number]: funcontrolDB} = {};
    constructor(data) {
        this.funcontrolDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.funcontrolDBConfig[data[key].ID] = new funcontrolDB(data[key]);
        });
    }
    public get(ID:number):funcontrolDB {
        var config = this.funcontrolDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, funcontroldb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: funcontrolDB} {
        return this.funcontrolDBConfig;
    }
}

// fuse_definitedb
export class fuse_definiteDB {
	ID:any;				//ID
	equip1ID:any;		//原料1装备
	equip2ID:any;		//原料2装备
	JSON_equip3ID:any;	//必选组及其概率权重
	constructor(data) {
		this.ID = data.ID;
		this.equip1ID = data.equip1ID;
		this.equip2ID = data.equip2ID;
		this.JSON_equip3ID = data.JSON_equip3ID;
	}
}
class fuse_definiteDBMgr {
    fuse_definiteDBConfig : {[ID:number]: fuse_definiteDB} = {};
    constructor(data) {
        this.fuse_definiteDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.fuse_definiteDBConfig[data[key].ID] = new fuse_definiteDB(data[key]);
        });
    }
    public get(ID:number):fuse_definiteDB {
        var config = this.fuse_definiteDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, fuse_definitedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: fuse_definiteDB} {
        return this.fuse_definiteDBConfig;
    }
}

// fuse_nonedb
export class fuse_noneDB {
	ID:any;			//ID
	equipID:any;	//装备ID
	constructor(data) {
		this.ID = data.ID;
		this.equipID = data.equipID;
	}
}
class fuse_noneDBMgr {
    fuse_noneDBConfig : {[ID:number]: fuse_noneDB} = {};
    constructor(data) {
        this.fuse_noneDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.fuse_noneDBConfig[data[key].ID] = new fuse_noneDB(data[key]);
        });
    }
    public get(ID:number):fuse_noneDB {
        var config = this.fuse_noneDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, fuse_nonedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: fuse_noneDB} {
        return this.fuse_noneDBConfig;
    }
}

// fuse_raritydb
export class fuse_rarityDB {
	ID:any;		//ID(最低星级)
	rare1:any;	//1星权重
	rare2:any;	//2星权重
	rare3:any;	//3星权重
	rare4:any;	//4星权重
	rare5:any;	//5星权重
	rare6:any;	//6星权重
	rare7:any;	//7星权重
	constructor(data) {
		this.ID = data.ID;
		this.rare1 = data.rare1;
		this.rare2 = data.rare2;
		this.rare3 = data.rare3;
		this.rare4 = data.rare4;
		this.rare5 = data.rare5;
		this.rare6 = data.rare6;
		this.rare7 = data.rare7;
	}
}
class fuse_rarityDBMgr {
    fuse_rarityDBConfig : {[ID:number]: fuse_rarityDB} = {};
    constructor(data) {
        this.fuse_rarityDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.fuse_rarityDBConfig[data[key].ID] = new fuse_rarityDB(data[key]);
        });
    }
    public get(ID:number):fuse_rarityDB {
        var config = this.fuse_rarityDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, fuse_raritydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: fuse_rarityDB} {
        return this.fuse_rarityDBConfig;
    }
}

// globaldb
export class globalDB {
	ID:any;		//ID
	value:any;	//值
	constructor(data) {
		this.ID = data.ID;
		this.value = data.value;
	}
}
class globalDBMgr {
    globalDBConfig : {[ID:number]: globalDB} = {};
    constructor(data) {
        this.globalDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.globalDBConfig[data[key].ID] = new globalDB(data[key]);
        });
    }
    public get(ID:number):globalDB {
        var config = this.globalDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, globaldb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: globalDB} {
        return this.globalDBConfig;
    }
}

// guideconfigdb
export class guideconfigDB {
	ID:any;					//
	next:any;				//下一个引导ID
	JSON_step:any;			//引导步骤
	JSON_triggercond:any;	//启动条件
	constructor(data) {
		this.ID = data.ID;
		this.next = data.next;
		this.JSON_step = data.JSON_step;
		this.JSON_triggercond = data.JSON_triggercond;
	}
}
class guideconfigDBMgr {
    guideconfigDBConfig : {[ID:number]: guideconfigDB} = {};
    constructor(data) {
        this.guideconfigDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guideconfigDBConfig[data[key].ID] = new guideconfigDB(data[key]);
        });
    }
    public get(ID:number):guideconfigDB {
        var config = this.guideconfigDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guideconfigdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guideconfigDB} {
        return this.guideconfigDBConfig;
    }
}

// guideConfigItemdb
export class guideConfigItemDB {
	ID:any;				//ID
	name:any;			//中文（不输出）
	com:any;			//命令
	JSON_comParm:any;	//命令使用的参数
	flag:any;			// 标签
	JSON_hide:any;		//隐藏控件
	ishl:any;			//是否高亮
	skipStrp:any;		//waitstep
	scale:any;			//触摸缩放
	event:any;			//事件
	constructor(data) {
		this.ID = data.ID;
		this.name = data.name;
		this.com = data.com;
		this.JSON_comParm = data.JSON_comParm;
		this.flag = data.flag;
		this.JSON_hide = data.JSON_hide;
		this.ishl = data.ishl;
		this.skipStrp = data.skipStrp;
		this.scale = data.scale;
		this.event = data.event;
	}
}
class guideConfigItemDBMgr {
    guideConfigItemDBConfig : {[ID:number]: guideConfigItemDB} = {};
    constructor(data) {
        this.guideConfigItemDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guideConfigItemDBConfig[data[key].ID] = new guideConfigItemDB(data[key]);
        });
    }
    public get(ID:number):guideConfigItemDB {
        var config = this.guideConfigItemDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guideConfigItemdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guideConfigItemDB} {
        return this.guideConfigItemDBConfig;
    }
}

// guild_contributiondb
export class guild_contributionDB {
	ID:any;				//ID
	Amount:any;			//捐献金币上限
	JSON_reward:any;	//奖励
	constructor(data) {
		this.ID = data.ID;
		this.Amount = data.Amount;
		this.JSON_reward = data.JSON_reward;
	}
}
class guild_contributionDBMgr {
    guild_contributionDBConfig : {[ID:number]: guild_contributionDB} = {};
    constructor(data) {
        this.guild_contributionDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guild_contributionDBConfig[data[key].ID] = new guild_contributionDB(data[key]);
        });
    }
    public get(ID:number):guild_contributionDB {
        var config = this.guild_contributionDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guild_contributiondb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guild_contributionDB} {
        return this.guild_contributionDBConfig;
    }
}

// guild_icondb
export class guild_iconDB {
	ID:any;		//ID
	Icon:any;	//icon路径
	constructor(data) {
		this.ID = data.ID;
		this.Icon = data.Icon;
	}
}
class guild_iconDBMgr {
    guild_iconDBConfig : {[ID:number]: guild_iconDB} = {};
    constructor(data) {
        this.guild_iconDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guild_iconDBConfig[data[key].ID] = new guild_iconDB(data[key]);
        });
    }
    public get(ID:number):guild_iconDB {
        var config = this.guild_iconDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guild_icondb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guild_iconDB} {
        return this.guild_iconDBConfig;
    }
}

// guild_leveldb
export class guild_levelDB {
	ID:any;				//等级
	EXP:any;			//升级经验
	memberLimit:any;	//全员人数
	officerLimit:any;	//精英人数
	constructor(data) {
		this.ID = data.ID;
		this.EXP = data.EXP;
		this.memberLimit = data.memberLimit;
		this.officerLimit = data.officerLimit;
	}
}
class guild_levelDBMgr {
    guild_levelDBConfig : {[ID:number]: guild_levelDB} = {};
    constructor(data) {
        this.guild_levelDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guild_levelDBConfig[data[key].ID] = new guild_levelDB(data[key]);
        });
    }
    public get(ID:number):guild_levelDB {
        var config = this.guild_levelDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guild_leveldb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guild_levelDB} {
        return this.guild_levelDBConfig;
    }
}

// guild_operatedb
export class guild_operateDB {
	ID:any;		//ID
	Icon:any;	//图片路径
	constructor(data) {
		this.ID = data.ID;
		this.Icon = data.Icon;
	}
}
class guild_operateDBMgr {
    guild_operateDBConfig : {[ID:number]: guild_operateDB} = {};
    constructor(data) {
        this.guild_operateDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guild_operateDBConfig[data[key].ID] = new guild_operateDB(data[key]);
        });
    }
    public get(ID:number):guild_operateDB {
        var config = this.guild_operateDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guild_operatedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guild_operateDB} {
        return this.guild_operateDBConfig;
    }
}

// guild_technologydb
export class guild_technologyDB {
	ID:any;			//ID
	Element:any;	//元素
	LV:any;			//等级
	Gold:any;		//消耗金币
	Boost:any;		//科技加成(百分比）
	constructor(data) {
		this.ID = data.ID;
		this.Element = data.Element;
		this.LV = data.LV;
		this.Gold = data.Gold;
		this.Boost = data.Boost;
	}
}
class guild_technologyDBMgr {
    guild_technologyDBConfig : {[ID:number]: guild_technologyDB} = {};
    constructor(data) {
        this.guild_technologyDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.guild_technologyDBConfig[data[key].ID] = new guild_technologyDB(data[key]);
        });
    }
    public get(ID:number):guild_technologyDB {
        var config = this.guild_technologyDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, guild_technologydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: guild_technologyDB} {
        return this.guild_technologyDBConfig;
    }
}

// interplaydb
export class interplayDB {
	ID:any;	//属性
	p1:any;	//水
	p2:any;	//火
	p3:any;	//土
	p4:any;	//雷
	p5:any;	//风
	p6:any;	//特殊
	constructor(data) {
		this.ID = data.ID;
		this.p1 = data.p1;
		this.p2 = data.p2;
		this.p3 = data.p3;
		this.p4 = data.p4;
		this.p5 = data.p5;
		this.p6 = data.p6;
	}
}
class interplayDBMgr {
    interplayDBConfig : {[ID:number]: interplayDB} = {};
    constructor(data) {
        this.interplayDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.interplayDBConfig[data[key].ID] = new interplayDB(data[key]);
        });
    }
    public get(ID:number):interplayDB {
        var config = this.interplayDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, interplaydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: interplayDB} {
        return this.interplayDBConfig;
    }
}

// itemlootdb
export class itemlootDB {
	ID:any;			//ID
	lootGroup:any;	//组ID
	itemid:any;		//资源ID
	rate:any;		//资源权重
	min:any;		//资源最小数量
	max:any;		//资源最大数量
	amount:any;		//抽取次数
	constructor(data) {
		this.ID = data.ID;
		this.lootGroup = data.lootGroup;
		this.itemid = data.itemid;
		this.rate = data.rate;
		this.min = data.min;
		this.max = data.max;
		this.amount = data.amount;
	}
}
class itemlootDBMgr {
    itemlootDBConfig : {[ID:number]: itemlootDB} = {};
    constructor(data) {
        this.itemlootDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.itemlootDBConfig[data[key].ID] = new itemlootDB(data[key]);
        });
    }
    public get(ID:number):itemlootDB {
        var config = this.itemlootDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, itemlootdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: itemlootDB} {
        return this.itemlootDBConfig;
    }
}

// knightdb
export class knightDB {
	ID:any;				//ID
	knighttype:any;		//骑士类型
	attributetype:any;	//属性限制
	unlock:any;			//解锁等级
	iniequip:any;		//初始装备
	initialskin:any;	//初始外貌id
	icon:any;			//暂用头像
	constructor(data) {
		this.ID = data.ID;
		this.knighttype = data.knighttype;
		this.attributetype = data.attributetype;
		this.unlock = data.unlock;
		this.iniequip = data.iniequip;
		this.initialskin = data.initialskin;
		this.icon = data.icon;
	}
}
class knightDBMgr {
    knightDBConfig : {[ID:number]: knightDB} = {};
    constructor(data) {
        this.knightDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.knightDBConfig[data[key].ID] = new knightDB(data[key]);
        });
    }
    public get(ID:number):knightDB {
        var config = this.knightDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, knightdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: knightDB} {
        return this.knightDBConfig;
    }
}

// knightexpdb
export class knightexpDB {
	ID:any;			//等级
	EXP:any;		//升级经验
	DOMHP:any;		//主角血量
	DOATK:any;		//主角攻击
	DODEF:any;		//主角防御
	DOCRI:any;		//主角暴击
	DOACC:any;		//主角命中
	DODOD:any;		//主角闪避
	FELHP:any;		//伙伴血量
	FELATK:any;		//伙伴攻击
	FELDEF:any;		//伙伴防御
	FELCRI:any;		//伙伴暴击
	FELACC:any;		//伙伴命中
	FELDOD:any;		//伙伴闪避
	maxBag:any;		//装备包裹
	maxFriend:any;	//好友上限
	itemID1:any;	//资源奖励1
	count1:any;		//数量1
	itemID2:any;	//资源奖励2
	count2:any;		//数量2
	itemID3:any;	//资源奖励3
	count3:any;		//数量3
	constructor(data) {
		this.ID = data.ID;
		this.EXP = data.EXP;
		this.DOMHP = data.DOMHP;
		this.DOATK = data.DOATK;
		this.DODEF = data.DODEF;
		this.DOCRI = data.DOCRI;
		this.DOACC = data.DOACC;
		this.DODOD = data.DODOD;
		this.FELHP = data.FELHP;
		this.FELATK = data.FELATK;
		this.FELDEF = data.FELDEF;
		this.FELCRI = data.FELCRI;
		this.FELACC = data.FELACC;
		this.FELDOD = data.FELDOD;
		this.maxBag = data.maxBag;
		this.maxFriend = data.maxFriend;
		this.itemID1 = data.itemID1;
		this.count1 = data.count1;
		this.itemID2 = data.itemID2;
		this.count2 = data.count2;
		this.itemID3 = data.itemID3;
		this.count3 = data.count3;
	}
}
class knightexpDBMgr {
    knightexpDBConfig : {[ID:number]: knightexpDB} = {};
    constructor(data) {
        this.knightexpDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.knightexpDBConfig[data[key].ID] = new knightexpDB(data[key]);
        });
    }
    public get(ID:number):knightexpDB {
        var config = this.knightexpDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, knightexpdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: knightexpDB} {
        return this.knightexpDBConfig;
    }
}

// languageconfigdb
export class languageconfigDB {
	ID:any;			//ID
	TextLan:any;	//语言包
	LanName:any;	//游戏内菜单
	constructor(data) {
		this.ID = data.ID;
		this.TextLan = data.TextLan;
		this.LanName = data.LanName;
	}
}
class languageconfigDBMgr {
    languageconfigDBConfig : {[ID:number]: languageconfigDB} = {};
    constructor(data) {
        this.languageconfigDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.languageconfigDBConfig[data[key].ID] = new languageconfigDB(data[key]);
        });
    }
    public get(ID:number):languageconfigDB {
        var config = this.languageconfigDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, languageconfigdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: languageconfigDB} {
        return this.languageconfigDBConfig;
    }
}

// LoadingResourcedb
export class LoadingResourceDB {
	ID:any;					//ID
	viewName:any;			//界面名称
	path_1:any;				//路径1
	JSON_imageInfo_1:any;	//加载信息1
	path_2:any;				//路径2
	JSON_imageInfo_2:any;	//加载信息2
	path_3:any;				//路径3
	JSON_imageInfo_3:any;	//加载信息3
	path_4:any;				//路径4
	JSON_imageInfo_4:any;	//加载信息4
	path_5:any;				//路径5
	JSON_imageInfo_5:any;	//加载信息5
	constructor(data) {
		this.ID = data.ID;
		this.viewName = data.viewName;
		this.path_1 = data.path_1;
		this.JSON_imageInfo_1 = data.JSON_imageInfo_1;
		this.path_2 = data.path_2;
		this.JSON_imageInfo_2 = data.JSON_imageInfo_2;
		this.path_3 = data.path_3;
		this.JSON_imageInfo_3 = data.JSON_imageInfo_3;
		this.path_4 = data.path_4;
		this.JSON_imageInfo_4 = data.JSON_imageInfo_4;
		this.path_5 = data.path_5;
		this.JSON_imageInfo_5 = data.JSON_imageInfo_5;
	}
}
class LoadingResourceDBMgr {
    LoadingResourceDBConfig : {[ID:number]: LoadingResourceDB} = {};
    constructor(data) {
        this.LoadingResourceDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.LoadingResourceDBConfig[data[key].ID] = new LoadingResourceDB(data[key]);
        });
    }
    public get(ID:number):LoadingResourceDB {
        var config = this.LoadingResourceDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, LoadingResourcedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: LoadingResourceDB} {
        return this.LoadingResourceDBConfig;
    }
}

// modeldisplaydb
export class modeldisplayDB {
	ID:any;					//ID
	modeldisplay:any;		//modeldisplay
	actionid:any;			//攻击ID
	ultactionid:any;		//必杀攻击id
	effectlist1:any;		//普通攻击1
	ulteffectlist1:any;		//必杀攻击1
	bystrikeffectlist:any;	//普通受击1
	ultstrikeffectlist:any;	//必杀受击1
	model_height:any;		//模型高度
	stop_inval:any;			//僵直时间间隔
	ult_stop_inval:any;		//必杀僵直时间间隔
	atk_back:any;			//攻击击退距离
	ult_atk_back:any;		//必杀击退距离
	shoot:any;				//普通弹道
	ult_shoot:any;			//必杀弹道
	atk_dis:any;			//攻击距离
	MonsterIcon:any;		//怪物ICON
	constructor(data) {
		this.ID = data.ID;
		this.modeldisplay = data.modeldisplay;
		this.actionid = data.actionid;
		this.ultactionid = data.ultactionid;
		this.effectlist1 = data.effectlist1;
		this.ulteffectlist1 = data.ulteffectlist1;
		this.bystrikeffectlist = data.bystrikeffectlist;
		this.ultstrikeffectlist = data.ultstrikeffectlist;
		this.model_height = data.model_height;
		this.stop_inval = data.stop_inval;
		this.ult_stop_inval = data.ult_stop_inval;
		this.atk_back = data.atk_back;
		this.ult_atk_back = data.ult_atk_back;
		this.shoot = data.shoot;
		this.ult_shoot = data.ult_shoot;
		this.atk_dis = data.atk_dis;
		this.MonsterIcon = data.MonsterIcon;
	}
}
class modeldisplayDBMgr {
    modeldisplayDBConfig : {[ID:number]: modeldisplayDB} = {};
    constructor(data) {
        this.modeldisplayDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.modeldisplayDBConfig[data[key].ID] = new modeldisplayDB(data[key]);
        });
    }
    public get(ID:number):modeldisplayDB {
        var config = this.modeldisplayDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, modeldisplaydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: modeldisplayDB} {
        return this.modeldisplayDBConfig;
    }
}

// monsterdb
export class monsterDB {
	ID:any;				//monsterid
	monstertypeid:any;	//模型ID
	IsBoss:any;			//是否BOSS
	level:any;			//等级
	hp:any;				//生命
	atk:any;			//攻击
	def:any;			//防御
	hit:any;			//命中
	crt:any;			//暴击
	exploot:any;		//掉落经验
	loot:any;			//普通掉落组
	specialloot:any;	//大招掉落组
	summonid:any;		//触发monsterid
	constructor(data) {
		this.ID = data.ID;
		this.monstertypeid = data.monstertypeid;
		this.IsBoss = data.IsBoss;
		this.level = data.level;
		this.hp = data.hp;
		this.atk = data.atk;
		this.def = data.def;
		this.hit = data.hit;
		this.crt = data.crt;
		this.exploot = data.exploot;
		this.loot = data.loot;
		this.specialloot = data.specialloot;
		this.summonid = data.summonid;
	}
}
class monsterDBMgr {
    monsterDBConfig : {[ID:number]: monsterDB} = {};
    constructor(data) {
        this.monsterDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.monsterDBConfig[data[key].ID] = new monsterDB(data[key]);
        });
    }
    public get(ID:number):monsterDB {
        var config = this.monsterDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, monsterdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: monsterDB} {
        return this.monsterDBConfig;
    }
}

// neweffectdisplaydb
export class neweffectdisplayDB {
	ID:any;					//特效ID
	DescName:any;			//名字
	resID:any;				//美术资源
	loops:any;				//循环
	inval:any;				//间隔
	zlayer:any;				//层级
	rdmode:any;				//渲染模式
	effect_coverage:any;	//特效范围
	combine_effct:any;		//组合特效
	scale:any;				//特效缩放
	isOffset:any;			//偏移
	sound:any;				//音效
	constructor(data) {
		this.ID = data.ID;
		this.DescName = data.DescName;
		this.resID = data.resID;
		this.loops = data.loops;
		this.inval = data.inval;
		this.zlayer = data.zlayer;
		this.rdmode = data.rdmode;
		this.effect_coverage = data.effect_coverage;
		this.combine_effct = data.combine_effct;
		this.scale = data.scale;
		this.isOffset = data.isOffset;
		this.sound = data.sound;
	}
}
class neweffectdisplayDBMgr {
    neweffectdisplayDBConfig : {[ID:number]: neweffectdisplayDB} = {};
    constructor(data) {
        this.neweffectdisplayDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.neweffectdisplayDBConfig[data[key].ID] = new neweffectdisplayDB(data[key]);
        });
    }
    public get(ID:number):neweffectdisplayDB {
        var config = this.neweffectdisplayDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, neweffectdisplaydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: neweffectdisplayDB} {
        return this.neweffectdisplayDBConfig;
    }
}

// npc_animationdb
export class npc_animationDB {
	ID:any;				//ID
	NPC_name:any;		//NPC文件名
	act_idle:any;		//动作1
	act_walk:any;		//动作2
	act_attack:any;		//动作3
	JSON_beginID:any;	//起始ID
	Rate:any;			//速度
	Type:any;			//动作类型
	MaxNum:any;			//最大数量
	Driection:any;		//方向
	constructor(data) {
		this.ID = data.ID;
		this.NPC_name = data.NPC_name;
		this.act_idle = data.act_idle;
		this.act_walk = data.act_walk;
		this.act_attack = data.act_attack;
		this.JSON_beginID = data.JSON_beginID;
		this.Rate = data.Rate;
		this.Type = data.Type;
		this.MaxNum = data.MaxNum;
		this.Driection = data.Driection;
	}
}
class npc_animationDBMgr {
    npc_animationDBConfig : {[ID:number]: npc_animationDB} = {};
    constructor(data) {
        this.npc_animationDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.npc_animationDBConfig[data[key].ID] = new npc_animationDB(data[key]);
        });
    }
    public get(ID:number):npc_animationDB {
        var config = this.npc_animationDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, npc_animationdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: npc_animationDB} {
        return this.npc_animationDBConfig;
    }
}

// npc_pathdb
export class npc_pathDB {
	ID:any;				//ID
	srcNode:any;		//起始节点
	JSON_destId:any;	//结束节点
	visible:any;		//是否可见
	constructor(data) {
		this.ID = data.ID;
		this.srcNode = data.srcNode;
		this.JSON_destId = data.JSON_destId;
		this.visible = data.visible;
	}
}
class npc_pathDBMgr {
    npc_pathDBConfig : {[ID:number]: npc_pathDB} = {};
    constructor(data) {
        this.npc_pathDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.npc_pathDBConfig[data[key].ID] = new npc_pathDB(data[key]);
        });
    }
    public get(ID:number):npc_pathDB {
        var config = this.npc_pathDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, npc_pathdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: npc_pathDB} {
        return this.npc_pathDBConfig;
    }
}

// platformdb
export class platformDB {
	ID:any;	//ID
	constructor(data) {
		this.ID = data.ID;
	}
}
class platformDBMgr {
    platformDBConfig : {[ID:number]: platformDB} = {};
    constructor(data) {
        this.platformDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.platformDBConfig[data[key].ID] = new platformDB(data[key]);
        });
    }
    public get(ID:number):platformDB {
        var config = this.platformDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, platformdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: platformDB} {
        return this.platformDBConfig;
    }
}

// Raid_Golddb
export class Raid_GoldDB {
	ID:any;			//ID
	Json_count:any;	//消耗的金币
	Gold_cut:any;	//金币被抢夺的衰减百分比
	constructor(data) {
		this.ID = data.ID;
		this.Json_count = data.Json_count;
		this.Gold_cut = data.Gold_cut;
	}
}
class Raid_GoldDBMgr {
    Raid_GoldDBConfig : {[ID:number]: Raid_GoldDB} = {};
    constructor(data) {
        this.Raid_GoldDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.Raid_GoldDBConfig[data[key].ID] = new Raid_GoldDB(data[key]);
        });
    }
    public get(ID:number):Raid_GoldDB {
        var config = this.Raid_GoldDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, Raid_Golddb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: Raid_GoldDB} {
        return this.Raid_GoldDBConfig;
    }
}

// Raid_worlddb
export class Raid_worldDB {
	ID:any;			//ID
	Image_path:any;	//图片路径
	type:any;		//图片类型
	constructor(data) {
		this.ID = data.ID;
		this.Image_path = data.Image_path;
		this.type = data.type;
	}
}
class Raid_worldDBMgr {
    Raid_worldDBConfig : {[ID:number]: Raid_worldDB} = {};
    constructor(data) {
        this.Raid_worldDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.Raid_worldDBConfig[data[key].ID] = new Raid_worldDB(data[key]);
        });
    }
    public get(ID:number):Raid_worldDB {
        var config = this.Raid_worldDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, Raid_worlddb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: Raid_worldDB} {
        return this.Raid_worldDBConfig;
    }
}

// res_patchdb
export class res_patchDB {
	ID:any;		//ID
	res:any;	//资源路径
	type:any;	//类型
	constructor(data) {
		this.ID = data.ID;
		this.res = data.res;
		this.type = data.type;
	}
}
class res_patchDBMgr {
    res_patchDBConfig : {[ID:number]: res_patchDB} = {};
    constructor(data) {
        this.res_patchDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.res_patchDBConfig[data[key].ID] = new res_patchDB(data[key]);
        });
    }
    public get(ID:number):res_patchDB {
        var config = this.res_patchDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, res_patchdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: res_patchDB} {
        return this.res_patchDBConfig;
    }
}

// ReturnRewsrdsdb
export class ReturnRewsrdsDB {
	ID:any;				//天数
	JSON_reward:any;	//奖励
	constructor(data) {
		this.ID = data.ID;
		this.JSON_reward = data.JSON_reward;
	}
}
class ReturnRewsrdsDBMgr {
    ReturnRewsrdsDBConfig : {[ID:number]: ReturnRewsrdsDB} = {};
    constructor(data) {
        this.ReturnRewsrdsDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.ReturnRewsrdsDBConfig[data[key].ID] = new ReturnRewsrdsDB(data[key]);
        });
    }
    public get(ID:number):ReturnRewsrdsDB {
        var config = this.ReturnRewsrdsDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, ReturnRewsrdsdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: ReturnRewsrdsDB} {
        return this.ReturnRewsrdsDBConfig;
    }
}

// robotdb
export class robotDB {
	ID:any;				//ID
	robotCount:any;		//个数
	robotType:any;		//类型
	robotLv:any;		//等级
	achiLoot:any;		//成就组
	equip1Loot:any;		//装备1随机组
	equip1LVmin:any;	//装备1等级下限
	equip1LVmax:any;	//装备1等级上限
	equip2Loot:any;		//装备2随机组
	equip2LVmin:any;	//装备2等级下限
	equip2LVmax:any;	//装备2等级上限
	equip3Loot:any;		//装备3随机组
	equip3LVmin:any;	//装备3等级下限
	equip3LVmax:any;	//装备3等级上限
	constructor(data) {
		this.ID = data.ID;
		this.robotCount = data.robotCount;
		this.robotType = data.robotType;
		this.robotLv = data.robotLv;
		this.achiLoot = data.achiLoot;
		this.equip1Loot = data.equip1Loot;
		this.equip1LVmin = data.equip1LVmin;
		this.equip1LVmax = data.equip1LVmax;
		this.equip2Loot = data.equip2Loot;
		this.equip2LVmin = data.equip2LVmin;
		this.equip2LVmax = data.equip2LVmax;
		this.equip3Loot = data.equip3Loot;
		this.equip3LVmin = data.equip3LVmin;
		this.equip3LVmax = data.equip3LVmax;
	}
}
class robotDBMgr {
    robotDBConfig : {[ID:number]: robotDB} = {};
    constructor(data) {
        this.robotDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.robotDBConfig[data[key].ID] = new robotDB(data[key]);
        });
    }
    public get(ID:number):robotDB {
        var config = this.robotDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, robotdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: robotDB} {
        return this.robotDBConfig;
    }
}

// Rule_Tipsdb
export class Rule_TipsDB {
	ID:any;		//ID
	view:any;	//界面
	layer:any;	//相对应的图层
	constructor(data) {
		this.ID = data.ID;
		this.view = data.view;
		this.layer = data.layer;
	}
}
class Rule_TipsDBMgr {
    Rule_TipsDBConfig : {[ID:number]: Rule_TipsDB} = {};
    constructor(data) {
        this.Rule_TipsDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.Rule_TipsDBConfig[data[key].ID] = new Rule_TipsDB(data[key]);
        });
    }
    public get(ID:number):Rule_TipsDB {
        var config = this.Rule_TipsDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, Rule_Tipsdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: Rule_TipsDB} {
        return this.Rule_TipsDBConfig;
    }
}

// Runedb
export class RuneDB {
	ID:any;				//ID
	Level:any;			//开启等级
	Attack_add:any;		//攻击加成
	Defence_add:any;	//防御加成
	Hp_add:any;			//生命加成
	JSON_cost:any;		//花费
	constructor(data) {
		this.ID = data.ID;
		this.Level = data.Level;
		this.Attack_add = data.Attack_add;
		this.Defence_add = data.Defence_add;
		this.Hp_add = data.Hp_add;
		this.JSON_cost = data.JSON_cost;
	}
}
class RuneDBMgr {
    RuneDBConfig : {[ID:number]: RuneDB} = {};
    constructor(data) {
        this.RuneDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.RuneDBConfig[data[key].ID] = new RuneDB(data[key]);
        });
    }
    public get(ID:number):RuneDB {
        var config = this.RuneDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, Runedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: RuneDB} {
        return this.RuneDBConfig;
    }
}

// shop_specialpricedb
export class shop_specialpriceDB {
	ID:any;			//ID
	refID:any;		//引用ID
	ownCount:any;	//拥有数量
	type:any;		//价格类型
	price:any;		//价格
	constructor(data) {
		this.ID = data.ID;
		this.refID = data.refID;
		this.ownCount = data.ownCount;
		this.type = data.type;
		this.price = data.price;
	}
}
class shop_specialpriceDBMgr {
    shop_specialpriceDBConfig : {[ID:number]: shop_specialpriceDB} = {};
    constructor(data) {
        this.shop_specialpriceDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.shop_specialpriceDBConfig[data[key].ID] = new shop_specialpriceDB(data[key]);
        });
    }
    public get(ID:number):shop_specialpriceDB {
        var config = this.shop_specialpriceDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, shop_specialpricedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: shop_specialpriceDB} {
        return this.shop_specialpriceDBConfig;
    }
}

// signin_monthdb
export class signin_monthDB {
	ID:any;		//ID
	Month:any;	//月份
	Day:any;	//登陆天数
	Reward:any;	//奖励
	Count:any;	//数量
	constructor(data) {
		this.ID = data.ID;
		this.Month = data.Month;
		this.Day = data.Day;
		this.Reward = data.Reward;
		this.Count = data.Count;
	}
}
class signin_monthDBMgr {
    signin_monthDBConfig : {[ID:number]: signin_monthDB} = {};
    constructor(data) {
        this.signin_monthDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.signin_monthDBConfig[data[key].ID] = new signin_monthDB(data[key]);
        });
    }
    public get(ID:number):signin_monthDB {
        var config = this.signin_monthDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, signin_monthdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: signin_monthDB} {
        return this.signin_monthDBConfig;
    }
}

// sign_in_rewarddb
export class sign_in_rewardDB {
	ID:any;				//ID
	day:any;			//天数
	reward1Item:any;	//奖励物品1
	reward1Count:any;	//物品1数量
	reward1Type:any;	//物品1类型
	reward1Chance:any;	//物品1概率
	reward2Item:any;	//奖励物品2
	reward2Count:any;	//物品2数量
	reward2Type:any;	//物品2类型
	reward2Chance:any;	//物品2概率
	key:any;			//获得钥匙
	constructor(data) {
		this.ID = data.ID;
		this.day = data.day;
		this.reward1Item = data.reward1Item;
		this.reward1Count = data.reward1Count;
		this.reward1Type = data.reward1Type;
		this.reward1Chance = data.reward1Chance;
		this.reward2Item = data.reward2Item;
		this.reward2Count = data.reward2Count;
		this.reward2Type = data.reward2Type;
		this.reward2Chance = data.reward2Chance;
		this.key = data.key;
	}
}
class sign_in_rewardDBMgr {
    sign_in_rewardDBConfig : {[ID:number]: sign_in_rewardDB} = {};
    constructor(data) {
        this.sign_in_rewardDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.sign_in_rewardDBConfig[data[key].ID] = new sign_in_rewardDB(data[key]);
        });
    }
    public get(ID:number):sign_in_rewardDB {
        var config = this.sign_in_rewardDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, sign_in_rewarddb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: sign_in_rewardDB} {
        return this.sign_in_rewardDBConfig;
    }
}

// skilldb
export class skillDB {
	ID:any;		//ID
	damge:any;	//伤害
	constructor(data) {
		this.ID = data.ID;
		this.damge = data.damge;
	}
}
class skillDBMgr {
    skillDBConfig : {[ID:number]: skillDB} = {};
    constructor(data) {
        this.skillDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.skillDBConfig[data[key].ID] = new skillDB(data[key]);
        });
    }
    public get(ID:number):skillDB {
        var config = this.skillDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, skilldb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: skillDB} {
        return this.skillDBConfig;
    }
}

// skilldisplaydb
export class skilldisplayDB {
	ID:any;		//ID
	name:any;	//文件名
	fps:any;	//帧频
	constructor(data) {
		this.ID = data.ID;
		this.name = data.name;
		this.fps = data.fps;
	}
}
class skilldisplayDBMgr {
    skilldisplayDBConfig : {[ID:number]: skilldisplayDB} = {};
    constructor(data) {
        this.skilldisplayDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.skilldisplayDBConfig[data[key].ID] = new skilldisplayDB(data[key]);
        });
    }
    public get(ID:number):skilldisplayDB {
        var config = this.skilldisplayDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, skilldisplaydb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: skilldisplayDB} {
        return this.skilldisplayDBConfig;
    }
}

// stagedb
export class stageDB {
	ID:any;					//编号
	chapter:any;			//章节ID
	stageid:any;			//关卡ID
	degree:any;				//关卡难度
	exp:any;				//关卡经验
	battlenum:any;			//战斗波次
	JSON_battleid:any;		//战斗波次ID
	param:any;				//信息预留字段
	battlebgm:any;			//战斗BGM
	bossbgm:any;			//BOSS战斗Bgm
	scene:any;				//调用场景
	nextStageID:any;		//后置关卡
	JSON_attribute1:any;	//关卡属性
	JSON_attribute2:any;	//对抗属性
	constructor(data) {
		this.ID = data.ID;
		this.chapter = data.chapter;
		this.stageid = data.stageid;
		this.degree = data.degree;
		this.exp = data.exp;
		this.battlenum = data.battlenum;
		this.JSON_battleid = data.JSON_battleid;
		this.param = data.param;
		this.battlebgm = data.battlebgm;
		this.bossbgm = data.bossbgm;
		this.scene = data.scene;
		this.nextStageID = data.nextStageID;
		this.JSON_attribute1 = data.JSON_attribute1;
		this.JSON_attribute2 = data.JSON_attribute2;
	}
}
class stageDBMgr {
    stageDBConfig : {[ID:number]: stageDB} = {};
    constructor(data) {
        this.stageDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.stageDBConfig[data[key].ID] = new stageDB(data[key]);
        });
    }
    public get(ID:number):stageDB {
        var config = this.stageDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, stagedb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: stageDB} {
        return this.stageDBConfig;
    }
}

// stage_battledb
export class stage_battleDB {
	ID:any;						//波次ID
	JSON_MonsterGroupid:any;	//怪物组
	constructor(data) {
		this.ID = data.ID;
		this.JSON_MonsterGroupid = data.JSON_MonsterGroupid;
	}
}
class stage_battleDBMgr {
    stage_battleDBConfig : {[ID:number]: stage_battleDB} = {};
    constructor(data) {
        this.stage_battleDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.stage_battleDBConfig[data[key].ID] = new stage_battleDB(data[key]);
        });
    }
    public get(ID:number):stage_battleDB {
        var config = this.stage_battleDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, stage_battledb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: stage_battleDB} {
        return this.stage_battleDBConfig;
    }
}

// stage_monstergroupdb
export class stage_monstergroupDB {
	ID:any;				//编号
	JSON_monster:any;	//怪物组
	constructor(data) {
		this.ID = data.ID;
		this.JSON_monster = data.JSON_monster;
	}
}
class stage_monstergroupDBMgr {
    stage_monstergroupDBConfig : {[ID:number]: stage_monstergroupDB} = {};
    constructor(data) {
        this.stage_monstergroupDBConfig = {};
        Object.keys(data).forEach((key) => {
            this.stage_monstergroupDBConfig[data[key].ID] = new stage_monstergroupDB(data[key]);
        });
    }
    public get(ID:number):stage_monstergroupDB {
        var config = this.stage_monstergroupDBConfig[ID];
        if (!config) {
            throw new CustomError.UserError(ERRC.COMMON.CONFIG_NOT_FOUND, {
                msg: 'COMMON.CONFIG_NOT_FOUND, stage_monstergroupdb, ID=' + ID
            })
        }
        return config;
    }
    public all():{[ID:number]: stage_monstergroupDB} {
        return this.stage_monstergroupDBConfig;
    }
}

//********** footer **********//
export class ConfigMgr {
	achievementdb:achievementDBMgr = null;
	arena_infodb:arena_infoDBMgr = null;
	arena_tournamentdb:arena_tournamentDBMgr = null;
	boss_infodb:boss_infoDBMgr = null;
	build_basicdb:build_basicDBMgr = null;
	chapterdb:chapterDBMgr = null;
	equipdb:equipDBMgr = null;
	fashiondb:fashionDBMgr = null;
	initialskindb:initialskinDBMgr = null;
	itemdb:itemDBMgr = null;
	monstertypedb:monstertypeDBMgr = null;
	npc_infodb:npc_infoDBMgr = null;
	quest_talkdb:quest_talkDBMgr = null;
	random_namedb:random_nameDBMgr = null;
	boss_summondb:boss_summonDBMgr = null;
	languagedb:languageDBMgr = null;
	build_upgradedb:build_upgradeDBMgr = null;
	subtaskdb:subtaskDBMgr = null;
	chance_chestdb:chance_chestDBMgr = null;
	error_messagedb:error_messageDBMgr = null;
	notificationdb:notificationDBMgr = null;
	questdb:questDBMgr = null;
	guidedb:guideDBMgr = null;
	guide_funcopendb:guide_funcopenDBMgr = null;
	paydb:payDBMgr = null;
	guidefightdb:guidefightDBMgr = null;
	SpecialIcondb:SpecialIconDBMgr = null;
	shop_itemdb:shop_itemDBMgr = null;
	Hierarchydb:HierarchyDBMgr = null;
	guild_elementdb:guild_elementDBMgr = null;
	guild_taskdb:guild_taskDBMgr = null;
	boss_rankdb:boss_rankDBMgr = null;
	lvunlockdb:lvunlockDBMgr = null;
	pvebossmailtextdb:pvebossmailtextDBMgr = null;
	actiondb:actionDBMgr = null;
	arena_milestonedb:arena_milestoneDBMgr = null;
	arena_winstreakdb:arena_winstreakDBMgr = null;
	boss_abilitydb:boss_abilityDBMgr = null;
	boss_energydb:boss_energyDBMgr = null;
	boss_milestonedb:boss_milestoneDBMgr = null;
	boss_rewarddb:boss_rewardDBMgr = null;
	Build_initialdb:Build_initialDBMgr = null;
	build_localdb:build_localDBMgr = null;
	build_tmxdb:build_tmxDBMgr = null;
	craftskilldb:craftskillDBMgr = null;
	currencydb:currencyDBMgr = null;
	damagecaldb:damagecalDBMgr = null;
	equipexpdb:equipexpDBMgr = null;
	expansiondb:expansionDBMgr = null;
	experimentdb:experimentDBMgr = null;
	fixedrewarddb:fixedrewardDBMgr = null;
	forbiddendb:forbiddenDBMgr = null;
	friendhirecostdb:friendhirecostDBMgr = null;
	friend_referdb:friend_referDBMgr = null;
	funcontroldb:funcontrolDBMgr = null;
	fuse_definitedb:fuse_definiteDBMgr = null;
	fuse_nonedb:fuse_noneDBMgr = null;
	fuse_raritydb:fuse_rarityDBMgr = null;
	globaldb:globalDBMgr = null;
	guideconfigdb:guideconfigDBMgr = null;
	guideConfigItemdb:guideConfigItemDBMgr = null;
	guild_contributiondb:guild_contributionDBMgr = null;
	guild_icondb:guild_iconDBMgr = null;
	guild_leveldb:guild_levelDBMgr = null;
	guild_operatedb:guild_operateDBMgr = null;
	guild_technologydb:guild_technologyDBMgr = null;
	interplaydb:interplayDBMgr = null;
	itemlootdb:itemlootDBMgr = null;
	knightdb:knightDBMgr = null;
	knightexpdb:knightexpDBMgr = null;
	languageconfigdb:languageconfigDBMgr = null;
	LoadingResourcedb:LoadingResourceDBMgr = null;
	modeldisplaydb:modeldisplayDBMgr = null;
	monsterdb:monsterDBMgr = null;
	neweffectdisplaydb:neweffectdisplayDBMgr = null;
	npc_animationdb:npc_animationDBMgr = null;
	npc_pathdb:npc_pathDBMgr = null;
	platformdb:platformDBMgr = null;
	Raid_Golddb:Raid_GoldDBMgr = null;
	Raid_worlddb:Raid_worldDBMgr = null;
	res_patchdb:res_patchDBMgr = null;
	ReturnRewsrdsdb:ReturnRewsrdsDBMgr = null;
	robotdb:robotDBMgr = null;
	Rule_Tipsdb:Rule_TipsDBMgr = null;
	Runedb:RuneDBMgr = null;
	shop_specialpricedb:shop_specialpriceDBMgr = null;
	signin_monthdb:signin_monthDBMgr = null;
	sign_in_rewarddb:sign_in_rewardDBMgr = null;
	skilldb:skillDBMgr = null;
	skilldisplaydb:skilldisplayDBMgr = null;
	stagedb:stageDBMgr = null;
	stage_battledb:stage_battleDBMgr = null;
	stage_monstergroupdb:stage_monstergroupDBMgr = null;

	public loadAllConfig(jsonDir) {
		var contents, json;

		/// achievementdb
        try {
            contents = fs.readFileSync(jsonDir + 'achievementdb.json');
            json = JSON.parse(contents);
            this.achievementdb = new achievementDBMgr(json);
        } catch (err) {
            throw new Error('achievementdb.json read failed');
        }
		/// arena_infodb
        try {
            contents = fs.readFileSync(jsonDir + 'arena_infodb.json');
            json = JSON.parse(contents);
            this.arena_infodb = new arena_infoDBMgr(json);
        } catch (err) {
            throw new Error('arena_infodb.json read failed');
        }
		/// arena_tournamentdb
        try {
            contents = fs.readFileSync(jsonDir + 'arena_tournamentdb.json');
            json = JSON.parse(contents);
            this.arena_tournamentdb = new arena_tournamentDBMgr(json);
        } catch (err) {
            throw new Error('arena_tournamentdb.json read failed');
        }
		/// boss_infodb
        try {
            contents = fs.readFileSync(jsonDir + 'boss_infodb.json');
            json = JSON.parse(contents);
            this.boss_infodb = new boss_infoDBMgr(json);
        } catch (err) {
            throw new Error('boss_infodb.json read failed');
        }
		/// build_basicdb
        try {
            contents = fs.readFileSync(jsonDir + 'build_basicdb.json');
            json = JSON.parse(contents);
            this.build_basicdb = new build_basicDBMgr(json);
        } catch (err) {
            throw new Error('build_basicdb.json read failed');
        }
		/// chapterdb
        try {
            contents = fs.readFileSync(jsonDir + 'chapterdb.json');
            json = JSON.parse(contents);
            this.chapterdb = new chapterDBMgr(json);
        } catch (err) {
            throw new Error('chapterdb.json read failed');
        }
		/// equipdb
        try {
            contents = fs.readFileSync(jsonDir + 'equipdb.json');
            json = JSON.parse(contents);
            this.equipdb = new equipDBMgr(json);
        } catch (err) {
            throw new Error('equipdb.json read failed');
        }
		/// fashiondb
        try {
            contents = fs.readFileSync(jsonDir + 'fashiondb.json');
            json = JSON.parse(contents);
            this.fashiondb = new fashionDBMgr(json);
        } catch (err) {
            throw new Error('fashiondb.json read failed');
        }
		/// initialskindb
        try {
            contents = fs.readFileSync(jsonDir + 'initialskindb.json');
            json = JSON.parse(contents);
            this.initialskindb = new initialskinDBMgr(json);
        } catch (err) {
            throw new Error('initialskindb.json read failed');
        }
		/// itemdb
        try {
            contents = fs.readFileSync(jsonDir + 'itemdb.json');
            json = JSON.parse(contents);
            this.itemdb = new itemDBMgr(json);
        } catch (err) {
            throw new Error('itemdb.json read failed');
        }
		/// monstertypedb
        try {
            contents = fs.readFileSync(jsonDir + 'monstertypedb.json');
            json = JSON.parse(contents);
            this.monstertypedb = new monstertypeDBMgr(json);
        } catch (err) {
            throw new Error('monstertypedb.json read failed');
        }
		/// npc_infodb
        try {
            contents = fs.readFileSync(jsonDir + 'npc_infodb.json');
            json = JSON.parse(contents);
            this.npc_infodb = new npc_infoDBMgr(json);
        } catch (err) {
            throw new Error('npc_infodb.json read failed');
        }
		/// quest_talkdb
        try {
            contents = fs.readFileSync(jsonDir + 'quest_talkdb.json');
            json = JSON.parse(contents);
            this.quest_talkdb = new quest_talkDBMgr(json);
        } catch (err) {
            throw new Error('quest_talkdb.json read failed');
        }
		/// random_namedb
        try {
            contents = fs.readFileSync(jsonDir + 'random_namedb.json');
            json = JSON.parse(contents);
            this.random_namedb = new random_nameDBMgr(json);
        } catch (err) {
            throw new Error('random_namedb.json read failed');
        }
		/// boss_summondb
        try {
            contents = fs.readFileSync(jsonDir + 'boss_summondb.json');
            json = JSON.parse(contents);
            this.boss_summondb = new boss_summonDBMgr(json);
        } catch (err) {
            throw new Error('boss_summondb.json read failed');
        }
		/// languagedb
        try {
            contents = fs.readFileSync(jsonDir + 'languagedb.json');
            json = JSON.parse(contents);
            this.languagedb = new languageDBMgr(json);
        } catch (err) {
            throw new Error('languagedb.json read failed');
        }
		/// build_upgradedb
        try {
            contents = fs.readFileSync(jsonDir + 'build_upgradedb.json');
            json = JSON.parse(contents);
            this.build_upgradedb = new build_upgradeDBMgr(json);
        } catch (err) {
            throw new Error('build_upgradedb.json read failed');
        }
		/// subtaskdb
        try {
            contents = fs.readFileSync(jsonDir + 'subtaskdb.json');
            json = JSON.parse(contents);
            this.subtaskdb = new subtaskDBMgr(json);
        } catch (err) {
            throw new Error('subtaskdb.json read failed');
        }
		/// chance_chestdb
        try {
            contents = fs.readFileSync(jsonDir + 'chance_chestdb.json');
            json = JSON.parse(contents);
            this.chance_chestdb = new chance_chestDBMgr(json);
        } catch (err) {
            throw new Error('chance_chestdb.json read failed');
        }
		/// error_messagedb
        try {
            contents = fs.readFileSync(jsonDir + 'error_messagedb.json');
            json = JSON.parse(contents);
            this.error_messagedb = new error_messageDBMgr(json);
        } catch (err) {
            throw new Error('error_messagedb.json read failed');
        }
		/// notificationdb
        try {
            contents = fs.readFileSync(jsonDir + 'notificationdb.json');
            json = JSON.parse(contents);
            this.notificationdb = new notificationDBMgr(json);
        } catch (err) {
            throw new Error('notificationdb.json read failed');
        }
		/// questdb
        try {
            contents = fs.readFileSync(jsonDir + 'questdb.json');
            json = JSON.parse(contents);
            this.questdb = new questDBMgr(json);
        } catch (err) {
            throw new Error('questdb.json read failed');
        }
		/// guidedb
        try {
            contents = fs.readFileSync(jsonDir + 'guidedb.json');
            json = JSON.parse(contents);
            this.guidedb = new guideDBMgr(json);
        } catch (err) {
            throw new Error('guidedb.json read failed');
        }
		/// guide_funcopendb
        try {
            contents = fs.readFileSync(jsonDir + 'guide_funcopendb.json');
            json = JSON.parse(contents);
            this.guide_funcopendb = new guide_funcopenDBMgr(json);
        } catch (err) {
            throw new Error('guide_funcopendb.json read failed');
        }
		/// paydb
        try {
            contents = fs.readFileSync(jsonDir + 'paydb.json');
            json = JSON.parse(contents);
            this.paydb = new payDBMgr(json);
        } catch (err) {
            throw new Error('paydb.json read failed');
        }
		/// guidefightdb
        try {
            contents = fs.readFileSync(jsonDir + 'guidefightdb.json');
            json = JSON.parse(contents);
            this.guidefightdb = new guidefightDBMgr(json);
        } catch (err) {
            throw new Error('guidefightdb.json read failed');
        }
		/// SpecialIcondb
        try {
            contents = fs.readFileSync(jsonDir + 'SpecialIcondb.json');
            json = JSON.parse(contents);
            this.SpecialIcondb = new SpecialIconDBMgr(json);
        } catch (err) {
            throw new Error('SpecialIcondb.json read failed');
        }
		/// shop_itemdb
        try {
            contents = fs.readFileSync(jsonDir + 'shop_itemdb.json');
            json = JSON.parse(contents);
            this.shop_itemdb = new shop_itemDBMgr(json);
        } catch (err) {
            throw new Error('shop_itemdb.json read failed');
        }
		/// Hierarchydb
        try {
            contents = fs.readFileSync(jsonDir + 'Hierarchydb.json');
            json = JSON.parse(contents);
            this.Hierarchydb = new HierarchyDBMgr(json);
        } catch (err) {
            throw new Error('Hierarchydb.json read failed');
        }
		/// guild_elementdb
        try {
            contents = fs.readFileSync(jsonDir + 'guild_elementdb.json');
            json = JSON.parse(contents);
            this.guild_elementdb = new guild_elementDBMgr(json);
        } catch (err) {
            throw new Error('guild_elementdb.json read failed');
        }
		/// guild_taskdb
        try {
            contents = fs.readFileSync(jsonDir + 'guild_taskdb.json');
            json = JSON.parse(contents);
            this.guild_taskdb = new guild_taskDBMgr(json);
        } catch (err) {
            throw new Error('guild_taskdb.json read failed');
        }
		/// boss_rankdb
        try {
            contents = fs.readFileSync(jsonDir + 'boss_rankdb.json');
            json = JSON.parse(contents);
            this.boss_rankdb = new boss_rankDBMgr(json);
        } catch (err) {
            throw new Error('boss_rankdb.json read failed');
        }
		/// lvunlockdb
        try {
            contents = fs.readFileSync(jsonDir + 'lvunlockdb.json');
            json = JSON.parse(contents);
            this.lvunlockdb = new lvunlockDBMgr(json);
        } catch (err) {
            throw new Error('lvunlockdb.json read failed');
        }
		/// pvebossmailtextdb
        try {
            contents = fs.readFileSync(jsonDir + 'pvebossmailtextdb.json');
            json = JSON.parse(contents);
            this.pvebossmailtextdb = new pvebossmailtextDBMgr(json);
        } catch (err) {
            throw new Error('pvebossmailtextdb.json read failed');
        }
		/// actiondb
        try {
            contents = fs.readFileSync(jsonDir + 'actiondb.json');
            json = JSON.parse(contents);
            this.actiondb = new actionDBMgr(json);
        } catch (err) {
            throw new Error('actiondb.json read failed');
        }
		/// arena_milestonedb
        try {
            contents = fs.readFileSync(jsonDir + 'arena_milestonedb.json');
            json = JSON.parse(contents);
            this.arena_milestonedb = new arena_milestoneDBMgr(json);
        } catch (err) {
            throw new Error('arena_milestonedb.json read failed');
        }
		/// arena_winstreakdb
        try {
            contents = fs.readFileSync(jsonDir + 'arena_winstreakdb.json');
            json = JSON.parse(contents);
            this.arena_winstreakdb = new arena_winstreakDBMgr(json);
        } catch (err) {
            throw new Error('arena_winstreakdb.json read failed');
        }
		/// boss_abilitydb
        try {
            contents = fs.readFileSync(jsonDir + 'boss_abilitydb.json');
            json = JSON.parse(contents);
            this.boss_abilitydb = new boss_abilityDBMgr(json);
        } catch (err) {
            throw new Error('boss_abilitydb.json read failed');
        }
		/// boss_energydb
        try {
            contents = fs.readFileSync(jsonDir + 'boss_energydb.json');
            json = JSON.parse(contents);
            this.boss_energydb = new boss_energyDBMgr(json);
        } catch (err) {
            throw new Error('boss_energydb.json read failed');
        }
		/// boss_milestonedb
        try {
            contents = fs.readFileSync(jsonDir + 'boss_milestonedb.json');
            json = JSON.parse(contents);
            this.boss_milestonedb = new boss_milestoneDBMgr(json);
        } catch (err) {
            throw new Error('boss_milestonedb.json read failed');
        }
		/// boss_rewarddb
        try {
            contents = fs.readFileSync(jsonDir + 'boss_rewarddb.json');
            json = JSON.parse(contents);
            this.boss_rewarddb = new boss_rewardDBMgr(json);
        } catch (err) {
            throw new Error('boss_rewarddb.json read failed');
        }
		/// Build_initialdb
        try {
            contents = fs.readFileSync(jsonDir + 'Build_initialdb.json');
            json = JSON.parse(contents);
            this.Build_initialdb = new Build_initialDBMgr(json);
        } catch (err) {
            throw new Error('Build_initialdb.json read failed');
        }
		/// build_localdb
        try {
            contents = fs.readFileSync(jsonDir + 'build_localdb.json');
            json = JSON.parse(contents);
            this.build_localdb = new build_localDBMgr(json);
        } catch (err) {
            throw new Error('build_localdb.json read failed');
        }
		/// build_tmxdb
        try {
            contents = fs.readFileSync(jsonDir + 'build_tmxdb.json');
            json = JSON.parse(contents);
            this.build_tmxdb = new build_tmxDBMgr(json);
        } catch (err) {
            throw new Error('build_tmxdb.json read failed');
        }
		/// craftskilldb
        try {
            contents = fs.readFileSync(jsonDir + 'craftskilldb.json');
            json = JSON.parse(contents);
            this.craftskilldb = new craftskillDBMgr(json);
        } catch (err) {
            throw new Error('craftskilldb.json read failed');
        }
		/// currencydb
        try {
            contents = fs.readFileSync(jsonDir + 'currencydb.json');
            json = JSON.parse(contents);
            this.currencydb = new currencyDBMgr(json);
        } catch (err) {
            throw new Error('currencydb.json read failed');
        }
		/// damagecaldb
        try {
            contents = fs.readFileSync(jsonDir + 'damagecaldb.json');
            json = JSON.parse(contents);
            this.damagecaldb = new damagecalDBMgr(json);
        } catch (err) {
            throw new Error('damagecaldb.json read failed');
        }
		/// equipexpdb
        try {
            contents = fs.readFileSync(jsonDir + 'equipexpdb.json');
            json = JSON.parse(contents);
            this.equipexpdb = new equipexpDBMgr(json);
        } catch (err) {
            throw new Error('equipexpdb.json read failed');
        }
		/// expansiondb
        try {
            contents = fs.readFileSync(jsonDir + 'expansiondb.json');
            json = JSON.parse(contents);
            this.expansiondb = new expansionDBMgr(json);
        } catch (err) {
            throw new Error('expansiondb.json read failed');
        }
		/// experimentdb
        try {
            contents = fs.readFileSync(jsonDir + 'experimentdb.json');
            json = JSON.parse(contents);
            this.experimentdb = new experimentDBMgr(json);
        } catch (err) {
            throw new Error('experimentdb.json read failed');
        }
		/// fixedrewarddb
        try {
            contents = fs.readFileSync(jsonDir + 'fixedrewarddb.json');
            json = JSON.parse(contents);
            this.fixedrewarddb = new fixedrewardDBMgr(json);
        } catch (err) {
            throw new Error('fixedrewarddb.json read failed');
        }
		/// forbiddendb
        try {
            contents = fs.readFileSync(jsonDir + 'forbiddendb.json');
            json = JSON.parse(contents);
            this.forbiddendb = new forbiddenDBMgr(json);
        } catch (err) {
            throw new Error('forbiddendb.json read failed');
        }
		/// friendhirecostdb
        try {
            contents = fs.readFileSync(jsonDir + 'friendhirecostdb.json');
            json = JSON.parse(contents);
            this.friendhirecostdb = new friendhirecostDBMgr(json);
        } catch (err) {
            throw new Error('friendhirecostdb.json read failed');
        }
		/// friend_referdb
        try {
            contents = fs.readFileSync(jsonDir + 'friend_referdb.json');
            json = JSON.parse(contents);
            this.friend_referdb = new friend_referDBMgr(json);
        } catch (err) {
            throw new Error('friend_referdb.json read failed');
        }
		/// funcontroldb
        try {
            contents = fs.readFileSync(jsonDir + 'funcontroldb.json');
            json = JSON.parse(contents);
            this.funcontroldb = new funcontrolDBMgr(json);
        } catch (err) {
            throw new Error('funcontroldb.json read failed');
        }
		/// fuse_definitedb
        try {
            contents = fs.readFileSync(jsonDir + 'fuse_definitedb.json');
            json = JSON.parse(contents);
            this.fuse_definitedb = new fuse_definiteDBMgr(json);
        } catch (err) {
            throw new Error('fuse_definitedb.json read failed');
        }
		/// fuse_nonedb
        try {
            contents = fs.readFileSync(jsonDir + 'fuse_nonedb.json');
            json = JSON.parse(contents);
            this.fuse_nonedb = new fuse_noneDBMgr(json);
        } catch (err) {
            throw new Error('fuse_nonedb.json read failed');
        }
		/// fuse_raritydb
        try {
            contents = fs.readFileSync(jsonDir + 'fuse_raritydb.json');
            json = JSON.parse(contents);
            this.fuse_raritydb = new fuse_rarityDBMgr(json);
        } catch (err) {
            throw new Error('fuse_raritydb.json read failed');
        }
		/// globaldb
        try {
            contents = fs.readFileSync(jsonDir + 'globaldb.json');
            json = JSON.parse(contents);
            this.globaldb = new globalDBMgr(json);
        } catch (err) {
            throw new Error('globaldb.json read failed');
        }
		/// guideconfigdb
        try {
            contents = fs.readFileSync(jsonDir + 'guideconfigdb.json');
            json = JSON.parse(contents);
            this.guideconfigdb = new guideconfigDBMgr(json);
        } catch (err) {
            throw new Error('guideconfigdb.json read failed');
        }
		/// guideConfigItemdb
        try {
            contents = fs.readFileSync(jsonDir + 'guideConfigItemdb.json');
            json = JSON.parse(contents);
            this.guideConfigItemdb = new guideConfigItemDBMgr(json);
        } catch (err) {
            throw new Error('guideConfigItemdb.json read failed');
        }
		/// guild_contributiondb
        try {
            contents = fs.readFileSync(jsonDir + 'guild_contributiondb.json');
            json = JSON.parse(contents);
            this.guild_contributiondb = new guild_contributionDBMgr(json);
        } catch (err) {
            throw new Error('guild_contributiondb.json read failed');
        }
		/// guild_icondb
        try {
            contents = fs.readFileSync(jsonDir + 'guild_icondb.json');
            json = JSON.parse(contents);
            this.guild_icondb = new guild_iconDBMgr(json);
        } catch (err) {
            throw new Error('guild_icondb.json read failed');
        }
		/// guild_leveldb
        try {
            contents = fs.readFileSync(jsonDir + 'guild_leveldb.json');
            json = JSON.parse(contents);
            this.guild_leveldb = new guild_levelDBMgr(json);
        } catch (err) {
            throw new Error('guild_leveldb.json read failed');
        }
		/// guild_operatedb
        try {
            contents = fs.readFileSync(jsonDir + 'guild_operatedb.json');
            json = JSON.parse(contents);
            this.guild_operatedb = new guild_operateDBMgr(json);
        } catch (err) {
            throw new Error('guild_operatedb.json read failed');
        }
		/// guild_technologydb
        try {
            contents = fs.readFileSync(jsonDir + 'guild_technologydb.json');
            json = JSON.parse(contents);
            this.guild_technologydb = new guild_technologyDBMgr(json);
        } catch (err) {
            throw new Error('guild_technologydb.json read failed');
        }
		/// interplaydb
        try {
            contents = fs.readFileSync(jsonDir + 'interplaydb.json');
            json = JSON.parse(contents);
            this.interplaydb = new interplayDBMgr(json);
        } catch (err) {
            throw new Error('interplaydb.json read failed');
        }
		/// itemlootdb
        try {
            contents = fs.readFileSync(jsonDir + 'itemlootdb.json');
            json = JSON.parse(contents);
            this.itemlootdb = new itemlootDBMgr(json);
        } catch (err) {
            throw new Error('itemlootdb.json read failed');
        }
		/// knightdb
        try {
            contents = fs.readFileSync(jsonDir + 'knightdb.json');
            json = JSON.parse(contents);
            this.knightdb = new knightDBMgr(json);
        } catch (err) {
            throw new Error('knightdb.json read failed');
        }
		/// knightexpdb
        try {
            contents = fs.readFileSync(jsonDir + 'knightexpdb.json');
            json = JSON.parse(contents);
            this.knightexpdb = new knightexpDBMgr(json);
        } catch (err) {
            throw new Error('knightexpdb.json read failed');
        }
		/// languageconfigdb
        try {
            contents = fs.readFileSync(jsonDir + 'languageconfigdb.json');
            json = JSON.parse(contents);
            this.languageconfigdb = new languageconfigDBMgr(json);
        } catch (err) {
            throw new Error('languageconfigdb.json read failed');
        }
		/// LoadingResourcedb
        try {
            contents = fs.readFileSync(jsonDir + 'LoadingResourcedb.json');
            json = JSON.parse(contents);
            this.LoadingResourcedb = new LoadingResourceDBMgr(json);
        } catch (err) {
            throw new Error('LoadingResourcedb.json read failed');
        }
		/// modeldisplaydb
        try {
            contents = fs.readFileSync(jsonDir + 'modeldisplaydb.json');
            json = JSON.parse(contents);
            this.modeldisplaydb = new modeldisplayDBMgr(json);
        } catch (err) {
            throw new Error('modeldisplaydb.json read failed');
        }
		/// monsterdb
        try {
            contents = fs.readFileSync(jsonDir + 'monsterdb.json');
            json = JSON.parse(contents);
            this.monsterdb = new monsterDBMgr(json);
        } catch (err) {
            throw new Error('monsterdb.json read failed');
        }
		/// neweffectdisplaydb
        try {
            contents = fs.readFileSync(jsonDir + 'neweffectdisplaydb.json');
            json = JSON.parse(contents);
            this.neweffectdisplaydb = new neweffectdisplayDBMgr(json);
        } catch (err) {
            throw new Error('neweffectdisplaydb.json read failed');
        }
		/// npc_animationdb
        try {
            contents = fs.readFileSync(jsonDir + 'npc_animationdb.json');
            json = JSON.parse(contents);
            this.npc_animationdb = new npc_animationDBMgr(json);
        } catch (err) {
            throw new Error('npc_animationdb.json read failed');
        }
		/// npc_pathdb
        try {
            contents = fs.readFileSync(jsonDir + 'npc_pathdb.json');
            json = JSON.parse(contents);
            this.npc_pathdb = new npc_pathDBMgr(json);
        } catch (err) {
            throw new Error('npc_pathdb.json read failed');
        }
		/// platformdb
        try {
            contents = fs.readFileSync(jsonDir + 'platformdb.json');
            json = JSON.parse(contents);
            this.platformdb = new platformDBMgr(json);
        } catch (err) {
            throw new Error('platformdb.json read failed');
        }
		/// Raid_Golddb
        try {
            contents = fs.readFileSync(jsonDir + 'Raid_Golddb.json');
            json = JSON.parse(contents);
            this.Raid_Golddb = new Raid_GoldDBMgr(json);
        } catch (err) {
            throw new Error('Raid_Golddb.json read failed');
        }
		/// Raid_worlddb
        try {
            contents = fs.readFileSync(jsonDir + 'Raid_worlddb.json');
            json = JSON.parse(contents);
            this.Raid_worlddb = new Raid_worldDBMgr(json);
        } catch (err) {
            throw new Error('Raid_worlddb.json read failed');
        }
		/// res_patchdb
        try {
            contents = fs.readFileSync(jsonDir + 'res_patchdb.json');
            json = JSON.parse(contents);
            this.res_patchdb = new res_patchDBMgr(json);
        } catch (err) {
            throw new Error('res_patchdb.json read failed');
        }
		/// ReturnRewsrdsdb
        try {
            contents = fs.readFileSync(jsonDir + 'ReturnRewsrdsdb.json');
            json = JSON.parse(contents);
            this.ReturnRewsrdsdb = new ReturnRewsrdsDBMgr(json);
        } catch (err) {
            throw new Error('ReturnRewsrdsdb.json read failed');
        }
		/// robotdb
        try {
            contents = fs.readFileSync(jsonDir + 'robotdb.json');
            json = JSON.parse(contents);
            this.robotdb = new robotDBMgr(json);
        } catch (err) {
            throw new Error('robotdb.json read failed');
        }
		/// Rule_Tipsdb
        try {
            contents = fs.readFileSync(jsonDir + 'Rule_Tipsdb.json');
            json = JSON.parse(contents);
            this.Rule_Tipsdb = new Rule_TipsDBMgr(json);
        } catch (err) {
            throw new Error('Rule_Tipsdb.json read failed');
        }
		/// Runedb
        try {
            contents = fs.readFileSync(jsonDir + 'Runedb.json');
            json = JSON.parse(contents);
            this.Runedb = new RuneDBMgr(json);
        } catch (err) {
            throw new Error('Runedb.json read failed');
        }
		/// shop_specialpricedb
        try {
            contents = fs.readFileSync(jsonDir + 'shop_specialpricedb.json');
            json = JSON.parse(contents);
            this.shop_specialpricedb = new shop_specialpriceDBMgr(json);
        } catch (err) {
            throw new Error('shop_specialpricedb.json read failed');
        }
		/// signin_monthdb
        try {
            contents = fs.readFileSync(jsonDir + 'signin_monthdb.json');
            json = JSON.parse(contents);
            this.signin_monthdb = new signin_monthDBMgr(json);
        } catch (err) {
            throw new Error('signin_monthdb.json read failed');
        }
		/// sign_in_rewarddb
        try {
            contents = fs.readFileSync(jsonDir + 'sign_in_rewarddb.json');
            json = JSON.parse(contents);
            this.sign_in_rewarddb = new sign_in_rewardDBMgr(json);
        } catch (err) {
            throw new Error('sign_in_rewarddb.json read failed');
        }
		/// skilldb
        try {
            contents = fs.readFileSync(jsonDir + 'skilldb.json');
            json = JSON.parse(contents);
            this.skilldb = new skillDBMgr(json);
        } catch (err) {
            throw new Error('skilldb.json read failed');
        }
		/// skilldisplaydb
        try {
            contents = fs.readFileSync(jsonDir + 'skilldisplaydb.json');
            json = JSON.parse(contents);
            this.skilldisplaydb = new skilldisplayDBMgr(json);
        } catch (err) {
            throw new Error('skilldisplaydb.json read failed');
        }
		/// stagedb
        try {
            contents = fs.readFileSync(jsonDir + 'stagedb.json');
            json = JSON.parse(contents);
            this.stagedb = new stageDBMgr(json);
        } catch (err) {
            throw new Error('stagedb.json read failed');
        }
		/// stage_battledb
        try {
            contents = fs.readFileSync(jsonDir + 'stage_battledb.json');
            json = JSON.parse(contents);
            this.stage_battledb = new stage_battleDBMgr(json);
        } catch (err) {
            throw new Error('stage_battledb.json read failed');
        }
		/// stage_monstergroupdb
        try {
            contents = fs.readFileSync(jsonDir + 'stage_monstergroupdb.json');
            json = JSON.parse(contents);
            this.stage_monstergroupdb = new stage_monstergroupDBMgr(json);
        } catch (err) {
            throw new Error('stage_monstergroupdb.json read failed');
        }
	}
}

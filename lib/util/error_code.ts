var ErrorCode = {
    COMMON      : {
        UNKNOWN                    : 1,     // 未知错误
        PROTOCOL_ERROR             : 2,     // 协议错误（内容出错，指发送了非法内容，即与约定内容不符合）
        CONFIG_NOT_FOUND           : 3,     // 配表未找到
        CONFIG_FIELD_ERROR         : 4,     // 配表字段错误
        RECONNECT_ERROR            : 5,     // 重连错误
        GM_COMMAND_ERROR           : 10,    // GM命令错误
        GM_COMMAND_NOT_FOUND       : 11,    // GM命令不存在
        RPC_REQUEST_PARSE_ERROR    : 101,
        CENTER_RPC_SOCKET_NOT_READY: 102,   // 无法连接center服务器
        ROLE_NOT_FOUND             : 1001,  // 角色未找到
        DUPLICATE_ROLEID           : 1002,  // 重复的Role ID
        ROLE_NOT_INIT              : 1003,  // 角色未初始化
        MAX_CODE                   : 1099
    },
    RESOURCE    : {
        NOT_ENOUGH: 1101,           // 资源不足 ["resID"]
        MAX_CODE  : 1199
    },
    SHOP        : {
        ID_NOT_FOUND: 1201,         // 商品ID未找到
        MAX_CODE    : 1299
    },
    HERO        : {
        UID_NOT_FOUND            : 1301,    // 英雄未找到
        PROPERTY_NOT_EXIST       : 1302,    // 属性不存在
        SET_ARMOR_WHEN_IN_DUNGEON: 1303,    // 副本战斗中不能换装
        HERO_NAME_FORBIDDEN      : 1304,    // 不合法的英雄名字
        ROLE_LEVEL_NOT_SATISFY   : 1305,    // 角色等级不足
        MAX_CODE                 : 1399
    },
    EQUIP       : {
        UID_NOT_FOUND                   : 1401,     // 装备未找到
        HAS_EQUIP_BY_OTHERS             : 1402,     // 该装备已经被其他英雄装备
        NATURE_PROPERTY_NOT_SATISFY     : 1403,     // 自然熟悉不匹配
        HAS_CRAFT_TASK_IN_BUILD         : 1404,     // 该建筑已有装备在打造
        NOT_HAS_CRAFT_TASK_IN_BUILD     : 1405,     // 该建筑没有装备在打造
        CRAFT_TASK_NOT_FINISHED         : 1406,     // 装备打造未结束
        ENHANCE_LENGTH_SMALL_THAN_2     : 1407,     // enhance缺少［装备材料］
        COMBINE_LENGTH_NOT_EQ_2         : 1408,     // 合成装备需要2件
        COMBINE_TWO_RARE_NOT_EQUAL      : 1409,     // 合成稀有度不一致
        COMBINE_TWO_SAME_ATTRIBUTE_EQUIP: 1410,     // 合成2件有相同属性的装备
        COMBINE_NO_AVAILABLE_LIST       : 1411,     // 合成装备没有可选列表
        MAX_CODE                        : 1499
    },
    BUILD       : {
        UID_NOT_FOUND          : 1501,
        ANOTHER_AREA_IS_OPENING: 1502,      // 另一个空地正在开放
        AREA_NOT_FOUND         : 1503,      // 区域未找到
        AREA_HAS_OPEN          : 1504,      // 区域已经开放
        BUILD_LEVEL_MAX        : 1505,      // 建筑等级已经满级
        BUILD_OWN_MAX_COUNT    : 1506,      // 建筑数量上限已满
        INVALID_LAND_RECTANGLE : 1507,      // 无效的土地区域
        MAX_CODE               : 1599
    },
    DUNGEON     : {
        TEAM_ERROR             : 1601,      // 队伍配置出错
        HAS_ANOTHER_PROCESS    : 1602,      // 已经有另一个战斗进程
        STAGE_ID_CAN_NOT_BATTLE: 1603,      // 该关卡不可以进入战斗
        MAX_CODE               : 1699
    },
    CHANCE      : {
        BOXID_ERROR: 1701,                  // 宝箱ID出错
        MAX_CODE   : 1799
    },
    FIGHT       : {
        FIGHT_NOT_FINISHED          : 1801,     // 战斗未结束
        FIGHT_HAS_FINISHED          : 1802,     // 战斗已结束
        FIGHT_NOT_EXIST             : 1803,     // 战斗不存在
        DAMAGE_CALCULATE_ERROR      : 1804,     // 伤害计算错误
        ROUND_COUNT_ERROR           : 1805,     // 回合数错误
        LEFT_SLAY_ENOUGH_BUT_NOT_USE: 1806,     // 怪物怒气足够，但是没有释放技能
        RIGHT_SLAY_NOT_ENOUGH       : 1807,     // 骑士怒气不足
        RESULT_ERROR                : 1808,     // 战斗结果错误
        TRY_RESTORE_BUT_NOT_ALL_DEAD: 1809,     // 复活但没有全部死亡
        TEAM_ERROR                  : 1810,     // 队伍配置出错
        OTHER_SIDE_TEAM_ERROR       : 1811,     // 对面的队伍配置出错
        MAX_CODE                    : 1899
    },
    QUEST       : {
        ID_NOT_FOUND: 1901,                     // 任务未找到
        MAX_CODE    : 1999
    },
    WORLD_BOSS  : {
        BOSS_NOT_ACTIVE : 2001,                 // boss未激活
        BOSS_HAS_EXPIRED: 2002,                 // boss已过期
        BOSS_ID_ERROR   : 2003,                 // bossID错误
        MAX_CODE        : 2099
    },
    ACHIEVEMENT : {
        ID_NOT_FOUND: 2100,                 // 成就ID未找到
        NOT_COMPLETE: 2101
    },
    REDIS       : {
        FETCH_LEADERBOARD_ERROR     : 2201, // 获取排行榜出错
        CAN_NOT_FETCH_SCORE_AND_RANK: 2202, // 无法获取积分和排名
    },
    SUMMON_BOSS : {
        BOSS_ID_NOT_FOUND: 2301,            // boss不存在
        LEVEL_NOT_ENOUGH : 2302,            // 等级不足
        MAX_CODE         : 2399
    },
    FRIEND      : {
        FRIEND_INFO_NOT_FOUND         : 2401,   // 好友信息不存在
        DUPLICATE_APPLICATION         : 2402,   // 重复的申请
        ALREADY_IS_FRIEND             : 2403,   // 已经是好友了
        MAX_FRIEND_COUNT              : 2404,   // 达到最大好友上限
        CAN_NOT_APPLY_SELF            : 2405,   // 不可以加自己为好友
        IS_NOT_FRIEND                 : 2406,   // 不是好友
        BATTLE_IN_CD                  : 2407,   // 好友切磋已在cd
        REFER_FRIEND_COUNT_NOT_ENOUGH : 2408,   // refer好友数量不足
        REWARD_HAVE_GAINED            : 2409,   // 奖励已经领取
        HIRE_FRIEND_COUNT_NOT_ENOUGH  : 2410,   // 好友帮助次数不足
        HIRE_FRIEND_IN_CD             : 2411,   // 该好友帮助cd中
        PURCHASE_HIRE_COUNT_NOT_ENOUGH: 1412,   // 购买好友帮助次数不足
        MAX_CODE                      : 2499
    },
    ARENA       : {
        NOT_OPEN            : 2501,         // 竞技场未开启
        LEVEL_NOT_ENOUGH    : 2502,         // 等级不足
        FIGHT_TYPE_NOT_EXIST: 2503          // 战斗类型错误 (neither attack nor power attack)
    },
    GIFT_CODE   : {
        CODE_INVALID                  : 2601,
        NOT_FOUND                     : 2602,
        FORMAT_ERROR                  : 2603,   // 格式不对
        IS_USED                       : 2604,
        REQUIRE_SERVER_ID_ERROR       : 2605,
        REQUIRE_PLATFORM_ID_ERROR     : 2606,
        USED_MAX                      : 2607,
        REWARD_INVALID                : 2608,
        VERIFY_FAILED                 : 2609,
        LAST_VERIFICATION_NOT_FINISHED: 2610,   // 上个礼品码检验还在进行中
        CODE_EXPIRED                  : 2611    // 礼品码已过期
    },
    ACTIVITY    : {
        NOT_FOUND                    : 2701,
        TYPE_ERROR                   : 2702,
        CHEST_NOT_FOUND              : 2703,
        NOT_START                    : 2704,    // 活动未开始
        HAS_FINISHED                 : 2705,    // 活动已结束
        FLOURISHING_CHEST_ID_ERROR   : 2706,    // 阶梯宝箱ID错误
        CRAFT_EQUIP_NOT_SATISFY      : 2707,    // 打造任务：装备未满足数量要求
        CRAFT_REWARD_HAS_GAIN        : 2708,    // 打造任务活动奖励已经领取
        CAN_NOT_GAIN_FLOURISHING_SHOP: 2709,    // 无法领取当前阶梯活动商店奖励
    },
    MAIL        : {
        NOT_FOUND     : 2801,
        PAGE_NOT_FOUND: 2802,
    },
    CHAT        : {
        TOO_SHORT_BETWEEN_LAST_MESSAGE: 2901,   // 距离上次发送时间过短
        SEND_MESSAGE_FORBIDDEN        : 2902,   // 禁止发送聊天信息
        SEND_TARGET_NOT_ONLINE        : 2903,   // 对方不在线
        SEND_TARGET_NOT_EXIST         : 2904,
        SHIELD_LIST_LENGTH_TOO_LONG   : 2905    // 屏蔽列表过长
    },
    RPC         : {
        TIMEOUT            : 3001,    // rpc请求超时
        SESSION_NOT_FOUND  : 3002,    //
        SOCKET_CLOSED      : 3003,    // 与中心服务器的连接被关闭
        SERVICE_NOT_RUNNING: 3004,
        CANNOT_FIND_METHOD : 3005,
        CANNOT_FIND_SERVICE: 3006,
    },
    FIRST_CHARGE: {
        NOT_CHARGE        : 3101,   // 尚未进行过一次充值
        HAVE_GAINED_REWARD: 3102,   // 已领取首次充值奖励
    },
    SHARE_GAME  : {
        NOT_SHARE_TODAY   : 3201,    // 今天没有分享过
        HAVE_GAINED_REWARD: 3202,    // 已经领取分享奖励了
    },
    MONTH_SIGN  : {
        HAS_SIGN_TODAY: 3301
    },
    TRIAL       : {
        TEAM_ERROR             : 3401,      // 队伍配置出错
        HAS_ANOTHER_PROCESS    : 3402,      // 已经有另一个战斗进程
        TRIAL_ID_CAN_NOT_BATTLE: 3403,      // 该关卡不可以进入战斗
        IS_IN_COOLDOWN         : 3404,
        MAX_CODE               : 3499
    },
    GUILD       : {
        CANNOT_CREATE_GUILD_WITH_GUILD_ID: 3501,    // 已有公会，不可以再创建公会
        DO_NOT_JOIN_GUILD                : 3502,    // 尚未加入任何公会
        ALREADY_HAS_GUILD                : 3503,    // 已经有公会了
        GUILD_NEED_APPROVAL              : 3504,    // 公会需要申请才能加入
        GUILD_IS_OPEN                    : 3505,    // 公会加入为open
        YOU_ARE_NOT_GUILD_MEMBER         : 3506,    // 你已经不是该公会的成员
        NOT_EXIST_PETITION               : 3507,    // 不存在该申请
        CAN_NOT_KICK_SELF                : 3508,    // 不能剔除自己
        CAN_NOT_FIND_TARGET_MEMBER       : 3509,    //
        CAN_NOT_KICK_HIGH_LEVEL_MEMBER   : 3510,    //
        DUP_PETITION                     : 3511,    // 重复的申请,
        NO_PRIVILEGE                     : 3512,    // 无相关权限,
        GUILD_MASTER_CAN_NOT_LEAVE       : 3513,    // 公会会长无法离开，必须先任命其他人为会长
        NOT_SAME_GUILD                   : 3514,    // 不是同一个公会
        DUP_GUILD_NAME                   : 3515,    // 重复的公会名字
        CLIENT_TECH_LEVEL_IS_NOT_LATEST  : 3516,    // 客户端科技等级未更新
        BANK_MONEY_NOT_ENOUGH            : 3517,    // 公会资金不足
        TECH_LEVEL_IS_MAX                : 3518,    // 科技等级已达最大值
        TECH_UPGRADE_PERMISSION_DENIED   : 3519,    // 没有科技升级权限
        TECH_ELEMENT_LACK                : 3520,    // blob 中公会科技元素数据少于5条
        TECH_BOOST_NULL                  : 3521,    // 科技加成表数据未加载
        GUILD_MEMBER_MAX                 : 3522,    // 公会成员人数已达上限
        GUILD_OFFICER_MAX                : 3523,    // 公会精英人数已达上限
        LOWER_THAN_REQUIRED_LEVEL        : 3524,    // 玩家等级低于入会等级
        TRANSFOR_LEADER_TO_SELF          : 3525,    // 会长将会长职位移交给自己
        GUILD_QUEST_NOT_FINISH           : 3526,    // 公会人物未未完成
        QUEST_NOT_EXISIT                 : 3527,    // 该任务不存在
        QUEST_TYPE_NOT_EXISIT            : 3527,    // 任务类型不存在
        QUEST_PARAM_NOT_MATCH            : 3528,    // 公会任务条件错误
        JOIN_GUILD_NOT_COOL_DOWN         : 3529,    // 加入公会在CD中
        GUILD_NAME_INVALID               : 3530,    // 公会名称无效(非法字符\全为空格)
        GUILD_NAME_TOO_LONG              : 3531,    // 公会名称过长
        NOT_EXIST_INVITATION             : 3532     // 不存在该邀请
    }
};

export = ErrorCode;
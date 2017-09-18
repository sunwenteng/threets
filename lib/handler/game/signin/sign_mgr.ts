import pb = require('node-protobuf-stream');

import Enum = require('../../../util/enum');
import Util = require('../../../util/game_util');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Time = require('../../../util/time');

import Universal = require('../universal');

// config
import ConfigStruct = require('../../../config/struct/config_struct');
var cm = require('../../../config').configMgr;

function getSignInReward(signInItem:ConfigStruct.sign_in_rewardDB):Universal.Reward {
    var chance = Util.randChance();
    if (chance <= signInItem.reward1Chance) {
        // use reward1
        return {
            id: signInItem.reward1Item,
            count: signInItem.reward1Count
        };
    } else {
        // use reward2
        return {
            id: signInItem.reward2Item,
            count: signInItem.reward2Count
        };
    }
}

class MonthSign {

    monthId:number = 0;
    hasSignDays:number = 0;
    lastSignTime:number = 0;
}

class ReturnSign {
    returnDays:number = 0;
    notLoginDays:number = 0;
}


class SignMgr {
    loginDays:number = 0;
    firstLogin:boolean = false;
    reward:Universal.Reward[] = [];

    monthSign:MonthSign = new MonthSign();

    returnSign:ReturnSign = new ReturnSign();

    public pushNewSign(reward:Universal.Reward) {
        if (this.loginDays >= Enum.GLOBAL.SIGN_IN_ROLL_DAYS) {
            this.loginDays = 1;
            this.reward = [reward];
        } else {
            this.loginDays += 1;
            this.reward.push(reward);
        }
    }

    public resetLoginDays():void {
        this.loginDays = 0;
        this.firstLogin = false;
        this.reward = [];
    }

    public getNextDays() {
        return this.loginDays >= Enum.GLOBAL.SIGN_IN_ROLL_DAYS ? 1 : this.loginDays + 1;
    }

    public rollNewReward():Universal.Reward {
        var nextDays = this.getNextDays();
        var item = cm.sign_in_rewarddb.get(nextDays);
        return getSignInReward(item);
    }

    // month sign

    public clearMonth() {
        this.monthSign.monthId = 0;
        this.monthSign.hasSignDays = 0;
        this.monthSign.lastSignTime = 0;
    }

    public hasSignMonth():boolean {
        return Time.isToday(this.monthSign.lastSignTime);
    }

    public getNextMonthReward():Universal.Resource {
        return Universal.getMonthSignReward(this.monthSign.monthId, this.monthSign.hasSignDays + 1);
    }

    public signMonth() {
        this.monthSign.lastSignTime = Time.gameNow();
        this.monthSign.hasSignDays += 1;
    }

    public buildNetObj():any {
        return {
            loginDays: this.loginDays,
            firstLogin: this.firstLogin,
            reward: this.reward
        };
    }

    public buildDBMsg():any {
        var signIn = pb.get('.DB.signIn');
        return new signIn({
            loginDays: this.loginDays,
            firstLogin: this.firstLogin,
            reward: this.reward,
            monthSign: this.monthSign,
            returnSign: this.returnSign
        });
    }

    public loadDBMsg(msg:any) {
        this.loginDays = msg.loginDays;
        this.firstLogin = msg.firstLogin;
        for (var i = 0; i < msg.reward.length; i += 1) {
            this.reward.push(msg.reward[i]);
        }
        if (msg.monthSign) this.monthSign = msg.monthSign;
        if (msg.returnSign) this.returnSign = msg.returnSign;
    }
}

export = SignMgr;
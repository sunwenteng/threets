import pb = require('node-protobuf-stream');

import log = require('../../../util/log');
import Util = require('../../../util/game_util');
import Time = require('../../../util/time');
import CustomError = require('../../../util/errors');
import ERRC = require('../../../util/error_code');
import Universal = require('../universal');


import Role = require('../role');
import Build = require('./build');
import BuildDef = require('./defines');
import QuestDef = require('../quest/defines');

import Config = require('../../../config');

class Area {
    ID:number = 0;
    open:boolean = false;
    grid:number[] = [];
    openTime:number = 0;

    public getLeftTime(now:number):number {
        return this.openTime > now ? this.openTime - now : 0;
    }

    public checkFinishOpen(now:number) {
        if (!this.open) {
            if (this.openTime > 0 && now >= this.openTime) {
                this.open = true;
                this.openTime = 0;
            }
        }
    }

    public accelerate(now):void {
        this.openTime = now;
    }

    public buildInitNetMsg():any {
        return {
            ID: this.ID,
            open: this.open,
            grid: this.grid,
            leftTime: this.getLeftTime(Time.gameNow())
        };
    }
}

class Block {
    color:number = 0;
    count:number = 0;

    constructor(color:number, count:number) {
        this.color = color;
        this.count = count;
    }
}

function pushBlock(blockArray:Block[], color:number, count:number) {
    if (blockArray.length === 0) {
        blockArray.push(new Block(color, count));
    } else {
        var lastBlock = blockArray[blockArray.length - 1];
        if (lastBlock.color === color) lastBlock.count += count;
        else blockArray.push(new Block(color, count));
    }
}

class Land {
    height:number = 0;
    width:number = 0;
    blockArray:Block[] = [];
    openTime:number = 0;

    public tranXYtoZ(x, y):number {
        return y * this.width + x + 1;  // (0,0) 对应第1个格子
    }

    public initLand(height:number, width:number):void {
        this.height = height;
        this.width = width;
        this.blockArray = [new Block(0, height * width)];
    }

    public getLeftTime(now:number):number {
        return this.openTime > now ? this.openTime - now : 0;
    }

    public accelerate(now:number):void {
        this.openTime = now;
    }

    public checkFinishOpen(now:number) {
        if (this.openTime > 0 && now >= this.openTime) {
            this.openTime = 0;
            this.replaceColor(BuildDef.LandColor.OPENING, BuildDef.LandColor.OPEN);
        }
    }

    public buildInitNetMsg():any {
        return {
            height: this.height,
            width: this.width,
            leftTime: this.getLeftTime(Time.gameNow()),
            blockArray: this.blockArray
        };
    }

    public coloringBlock(x1, y1, x2, y2, color):void {
        var count = x2 - x1 + 1;
        for (var y = y1; y <= y2; y++) {
            this.coloringLine(this.tranXYtoZ(x1, y), count, color);
        }
        this.mergeBlock();
    }

    public loadRawData(height:number, width:number, data:number[]):void {
        this.height = height;
        this.width = width;
        this.blockArray = [];
        data.forEach((color) => {
            pushBlock(this.blockArray, color, 1);
        });
    }

    public getColorCount(color:number):number {
        var sum = 0;
        this.blockArray.forEach((block) => {
            if (block.color === color) sum += block.count;
        });
        return sum;
    }

    public loadDBMsg(msg:any) {
        this.height = msg.height;
        this.width = msg.width;
        this.blockArray = msg.blockArray;
        this.openTime = msg.openTime;
    }

    public buildDBMsg():any {
        return {
            height: this.height,
            width: this.width,
            blockArray: this.blockArray,
            openTime: this.openTime
        };
    }

    public printLand():void {
        var pos = 0, self = this;
        this.blockArray.forEach(function (block) {
            for (var i = 0; i < block.count; i++) {
                process.stdout.write(block.color.toString());
                pos += 1;
                if (pos >= self.width) {
                    pos = 0;
                    process.stdout.write('\n');
                }
            }
        });
        process.stdout.write('\n');
    }

    // 将从第z个格子开始的cnt个格子染成color颜色
    private coloringLine(z, cnt, color):void {
        var sum = 0, block, i,
            start = -1, end = -1;

        var list = [], preSize = 0, sufSize = 0;

        for (i = 0; i < this.blockArray.length; i++) {
            block = this.blockArray[i];
            if (sum + block.count >= z) {
                start = i;
                preSize = z - 1 - sum;
                if (preSize > 0) {
                    pushBlock(list, block.color, preSize);
                }
                break;
            }
            sum += block.count;
        }

        if (start === -1)
            return;

        if (sum + preSize + cnt > this.height * this.width) {   // 大于总和
            cnt = this.height * this.width - sum - preSize;
        }

        sum = 0;
        for (i = start; i < this.blockArray.length; i++) {
            block = this.blockArray[i];
            if (preSize + cnt <= sum + block.count) {
                end = i;
                sufSize = sum + block.count - cnt - preSize;
                break;
            }
            sum += block.count;
        }

        if (end === -1) {
            end = this.blockArray.length - 1;
            sufSize = 0;
        }

        pushBlock(list, color, cnt);
        if (sufSize > 0) {
            pushBlock(list, this.blockArray[end].color, sufSize);
        }
        var deleteCnt = end - start + 1;
        Array.prototype.splice.apply(this.blockArray, [start, deleteCnt].concat(list));

    }

    public getColorTypeInRectangle(x1, y1, x2, y2):number[] {
        var result = {}, list;
        var count = x2 - x1 + 1;
        for (var y = y1; y <= y2; y++) {
            list = this.getColorTypeInLine(this.tranXYtoZ(x1, y), count);
            list.forEach((key) => {
                result[key] = true;
            });
        }
        return Object.keys(result).map((key) => {return parseInt(key);});
    }

    private getColorTypeInLine(z, cnt):number[] {
        var obj = {};
        var sum = 0, block, i;

        for (i = 0; i < this.blockArray.length; i++) {
            block = this.blockArray[i];
            if (sum + 1 >= z + cnt) break;

            if (sum + block.count >= z) {
                obj[block.color] = true;
            }

            sum += block.count;
        }

        return Object.keys(obj).map((key) => { return parseInt(key); });
    }

    private replaceColor(color1:number, color2:number):void {
        var replaceList = [], sum = 0;
        this.blockArray.forEach(function (block) {
            if (block.color === color1) {
                replaceList.push({
                    z: sum + 1,
                    cnt: block.count
                });
            }
            sum += block.count;
        });

        var self = this;
        replaceList.forEach(function (obj) {
            self.coloringLine(obj.z, obj.cnt, color2);
        });
        this.mergeBlock();
    }

    private mergeBlock():void {
        var result = [];
        this.blockArray.forEach(function (block) {
            if (result.length > 0) {
                if (result[result.length - 1].color === block.color) {
                    result[result.length - 1].count += block.count;
                } else {
                    result.push(block);
                }
            } else {
                result.push(block);
            }
        });
        this.blockArray = result;

        this.printLand();
    }

}

class BuildMgr {
    container:{[ID:number]:Build} = {};
    maxuid:number = 0;
    areas:{[ID:number]:Area} = {};
    land:Land = new Land();
    isInit:boolean = false;

    public initMgr() {
        this.container = {};
        this.maxuid = this.getMaxUid();

        // area
        this.areas = {};
        var config = Config.configMgr.build_tmxdb.get(1);
        this.land.loadRawData(config.height, config.width, config.JSON_data);
    }

    public checkAllFinishBuilding(role:Role, uidArray:number[]) {
        var buildUids = [];
        if (uidArray === null) {
            buildUids = Object.keys(this.container);
        } else {
            buildUids = uidArray;
        }
        var now = Time.gameNow();
        buildUids.forEach((uid) => {
            var build = this.container[uid];
            if (build && build.status === BuildDef.Status.BUILDING && build.openTime <= now) {
                build.status = BuildDef.Status.FINISHED;
                build.lastCollectTime = now;
                role.quests.updateQuest(role, QuestDef.CriteriaType.OWN_N_BUILD, [build.ID]);
            }
        });
    }

    public getMaxUid():number {
        var maxUid = 0, key;
        for (key in this.container) {
            if (maxUid < parseInt(key)) {
                maxUid = parseInt(key);
            }
        }
        return maxUid;
    }

    public getNextUid():number {
        if (this.container[this.maxuid + 1]) {
            this.maxuid = this.getMaxUid();
        }
        return this.maxuid + 1;
    }

    public createBuild(ID:number):Build {
        var config = Config.configMgr.build_basicdb.get(ID);
        if (!config) {
            return null;
        }
        var nextUid = this.getNextUid();
        var build = new Build();
        build.assignUid(nextUid);
        build.initObject(ID);
        build.openTime = Time.gameNow() + config.buildTime;
        build.status = BuildDef.Status.BUILDING;
        this.container[nextUid] = build;
        return build;
    }

    public hasBuild(uid:number):boolean {
        return !this.container[uid];
    }

    public getBuildCount(buildID:number):number {
        var count = 0;
        Object.keys(this.container).forEach((uid) => {
            var build = this.container[uid];
            if (build.ID === buildID) {
                ++count;
            }
        });
        return count;
    }

    public getHasBuiltCount(buildID:number):number {
        var count = 0;
        Object.keys(this.container).forEach((uid) => {
            var build = this.container[uid];
            if (build.ID === buildID && build.isBuilt()) {
                ++count;
            }
        });
        return count;
    }

    public getBuildCountOverLevel(buildID:number, minLevel:number):number {
        var count = 0;
        Object.keys(this.container).forEach((uid) => {
            var build = this.container[uid];
            if (build.ID === buildID && build.level >= minLevel) {
                ++count;
            }
        });
        return count;
    }

    public deleteBuild(uid:number) {
        if (this.container[uid]) {
            for (var key in this.areas) {
                for (var i = 0; i < this.areas[key].grid.length; i += 1) {
                    if (this.areas[key].grid[i] === uid) {
                        this.areas[key].grid[i] = 0;
                    }
                }
            }
            delete this.container[uid];
        }
    }

    public getBuild(uid:number):Build {
        return this.container[uid];
    }

    public getArea(ID:number):Area {
        return this.areas[ID];
    }

    public getOpeningArea():number {
        for (var key in this.areas) {
            if (!this.areas[key].open && this.areas[key].openTime) {
                return parseInt(key);
            }
        }
        return 0;
    }

    public getOpenAreaCost():{goldCost:number; timeCost:number} {
        var config = Config.configMgr.expansiondb.get(this.getHaveOpenAreaCount());
        return {
            goldCost: config.coinCost,
            timeCost: config.timeCost
        }
    }

    public getHaveOpenAreaCount():number {
        return this.land.getColorCount(BuildDef.LandColor.OPEN);
    }

    public openArea(ID:number, timeCost:number) {
        var config = Config.configMgr.build_localdb.get(ID);
        if (this.areas[ID].open) {
            return;
        }
        this.areas[ID].openTime = Time.gameNow() + timeCost;
    }

    public openLand(p1:Universal.Point, p2:Universal.Point, timeCost:number):void {
        var land = this.land;
        if (land.openTime) {
            throw new CustomError.UserError(ERRC.BUILD.ANOTHER_AREA_IS_OPENING, {
                msg: 'BUILD.ANOTHER_AREA_IS_OPENING, openTime=' + (new Date(land.openTime * 1000)).toString()
            });
        }

        var colorList = land.getColorTypeInRectangle(p1.x, p1.y, p2.x, p2.y);
        if (colorList.length !== 1 || colorList[0] !== BuildDef.LandColor.NOT_OPEN) {
            throw new CustomError.UserError(ERRC.BUILD.INVALID_LAND_RECTANGLE, {
                msg: 'BUILD.INVALID_LAND_RECTANGLE, colorList=' + JSON.stringify(colorList)
            });
        }

        land.coloringBlock(p1.x, p1.y, p2.x, p2.y, BuildDef.LandColor.OPENING);
        land.openTime = Time.gameNow() + timeCost;
    }

    public buildInitNetMsg():any {
        var key, pck:any = { builds: [] };
        for (key in this.container) {
            pck.builds.push(this.container[key].buildInitNetMsg());
        }
        pck.land = this.land.buildInitNetMsg();
        var M = pb.get('.Api.build.init.Response');  // TODO change to Notify
        return new M(pck);
    }

    public buildDBMsg():any {
        var builds = pb.get('.DB.builds');
        var key, pck = new builds();
        for (key in this.container) {
            pck.builds.push(this.container[key].buildDBMsg());
        }
        pck.land = this.land.buildDBMsg();
        pck.isInit = this.isInit;
        return pck;
    }

    public loadDBMsg(msg:any) {
        var i, buildMsg, build, area;
        this.initMgr();

        // build
        for (i = 0; i < msg.builds.length; i += 1) {
            buildMsg = msg.builds[i];
            build = new Build();
            build.loadDBMsg(buildMsg);
            this.container[build.uid] = build;
        }
        this.maxuid = this.getMaxUid();

        this.isInit = !!msg.isInit;

        if (msg.land) {
            this.land.loadDBMsg(msg.land);
        }
    }

    public checkCanOpenNewLand(now:number):void {
        this.land.checkFinishOpen(now);
        if (this.land.openTime) {
            throw new CustomError.UserError(ERRC.BUILD.ANOTHER_AREA_IS_OPENING, {
                msg: 'BUILD.ANOTHER_AREA_IS_OPENING, openTime=' + (new Date(this.land.openTime * 1000)).toString()
            });
        }
    }

    public checkAreaData() {
        var self = this;
        if (!self.isInit) {
            Object.keys(Config.configMgr.Build_initialdb.all()).forEach((key) => {
                var config = Config.configMgr.Build_initialdb.get(parseInt(key));
                var build = self.createBuild(config.BuildID);
                build.direction = config.Direction;
                build.point = {
                    x: config.PX,
                    y: config.PY
                };
            });

            self.isInit = true;
        }

        self.land.checkFinishOpen(Time.gameNow());
    }
}

export = BuildMgr;


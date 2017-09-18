import zlib = require('zlib');
import fs = require('fs');
import tar = require('tar');
import async = require('async');
import ncp = require('ncp');
import path = require('path');

import ConfigStruct = require('./config/struct/config_struct');
import index = require('../index');
import log = require('./util/log');
import Util = require('./util/game_util');
import Enum = require('./util/enum');

import VerifyMgr = require('./config/check/verify_mgr');

export class SVNInfo {
    branch:string = '';
    revision:number = 0;
    last_revision:number = 0;
    last_author:string = '';
    last_date:string = '';
}

export var configMgr = new ConfigStruct.ConfigMgr();
export var svnInfo:SVNInfo = new SVNInfo();

var configPath:string = '';

export function reloadAllConfig(configDir:string) {
    configPath = configDir + '/';
    log.sInfo('LoadConfig', 'configPath=' + configPath);
    configMgr.loadAllConfig(configPath);
    try {
        var contents = fs.readFileSync(path.join(configPath, '_svn_info.json'));
        var info = JSON.parse(contents.toString());
        svnInfo.branch = info.branch;
        svnInfo.revision = parseInt(info.revision);
        svnInfo.last_revision = parseInt(info.last_revision);
        svnInfo.last_author = info.last_author;
        svnInfo.last_date = info.last_date;
    } catch (err) {
        log.sWarn('Config', 'load config data svn info Error: ' + err.message);
    }
    log.sInfo('Config', 'config all load, svn_info=' + JSON.stringify(svnInfo));
}

export function updateConfigRevision(serverType:Enum.SERVER_TYPE, baseUrl:string, revision:number, callback:(err)=>void):void {
    async.waterfall([
        (next) => {
            switch (serverType) {
                case Enum.SERVER_TYPE.LOGIN_SERVER:
                    next(new Error('LoginServer dosen\'t need update config'));
                    return ;
                case Enum.SERVER_TYPE.CENTER_SERVER:
                case Enum.SERVER_TYPE.GAME_SERVER:
                    if (svnInfo.revision === revision) {
                        next(new Error('Server Revision is already ' + revision));
                        return ;
                    }
                    break;
                default :
                    next(new Error('serverType Error: type=' + serverType));
                    return ;
            }

            if (!baseUrl || baseUrl === '') {
                next(new Error('config base url Error: baseUrl=' + baseUrl));
                return ;
            }
            downloadConfigData(baseUrl, revision, next);
        },
        (next) => {
            targzConfigData(revision, next);
        },
        (next) => {
            try {
                checkTmpConfig();
            } catch (err) {
                next(err);
                return ;
            }
            next(null);
        },
        (next) => {
            // TODO check tmp and current data config diff

            // do update config data
            var configPath = index.sourceRoot + '/src/config/';
            Util.deleteFileInDir(configPath + 'data', /.*\.json/, (err) => {
                if (err) {
                    log.sError('Config', 'deleteFileInDir Error: ', err.message);
                }
                ncp.ncp(configPath + 'tmp', configPath + 'data', {
                    filter: /^.*(tmp|\.json)$/,
                    clobber: true       //  if set to false, ncp will not overwrite destination files that already exist.
                }, (err) => {
                    if (err) {
                        log.sError('Config', 'ncp Error: configPath=' + configPath);
                    }
                    next(err);
                });
            });
        },

        (next) => {
            reloadAllConfig(configPath);

            switch (serverType) {
                case Enum.SERVER_TYPE.LOGIN_SERVER:
                    next(null);
                    return ;
                case Enum.SERVER_TYPE.CENTER_SERVER:
                    //var CenterWorld = require('./centerserver/center_world');
                    //CenterWorld.reloadAllConfig();
                    next(null);
                    return ;
                case Enum.SERVER_TYPE.GAME_SERVER:
                    //var GameWorld = require('./gameserver/game_world');
                    //GameWorld.reloadAllConfig();
                    next(null);
                    return ;
                default :
                    next(new Error('serverType Error: type=' + serverType));
                    break;
            }

        }
    ], (err) =>{
        if (err) {
            console.log(err.message);
        }
        callback(err);
    });
}

function downloadConfigData(baseUrl:string, revision:number, callback:(err)=>void):void {
    var configPath = index.sourceRoot + '/src/config/';

    var fileName = 'dh-config-' + revision + '.tar.gz';
    var url = baseUrl + fileName;
    var dest = configPath + "archive/" + fileName;

    var archivePath = configPath + 'archive/';
    if (!fs.existsSync(archivePath)) {
        console.log('mkdir ' + archivePath);
        fs.mkdirSync(archivePath);
    }
    Util.httpDownload(url, dest, (err) => {
        if (err) {
            log.sError('Config', 'Download ' + url + ' Failed, ' + err.message);
            callback(err);
        } else {
            log.sInfo('Config', 'Download ' + url + ' Successfully, Destination=' + dest);
            callback(null);
        }
    });
}

function targzConfigData(revision, callback:(err)=>void):void {
    var configPath = index.sourceRoot + '/src/config/';
    var fileName = 'dh-config-' + revision + '.tar.gz';
    var src = configPath + "archive/" + fileName;

    var streamZlib = zlib.createGunzip();
    var streamRead = fs.createReadStream(src);
    var streamTar = tar.Extract({
        path: configPath + 'tmp',
        strip: 0
    });

    streamRead.pipe(streamZlib).pipe(streamTar);

    streamTar.on('finish', function () {
        console.log('streamTar done');
        callback(null);
    });
    streamTar.on('error', function (err) {
        console.log('streamTar Error: ' + err.stack);
        callback(err);
    });

    streamZlib.on('finish', function () {
        console.log('streamZlib done');
    });
    streamZlib.on('error', function (err) {
        console.log('streamZlib Error: ' + err.stack);
        callback(err);
    });

    streamRead.on('error', function (err) {
        console.log('streamRead Error: ' + err.stack);
    });
}

function checkTmpConfig():void {
    var configPath = index.sourceRoot + '/src/config/';
    VerifyMgr.verifyConfig(configPath + 'tmp/');

    if (VerifyMgr.getErrorList().length > 0) {
        throw new Error('there\'s has Errors in Config, please check with tools');
    }
}
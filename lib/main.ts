import path = require('path');
import url = require('url');
import fs = require('fs');
import sourceMap = require('source-map-support');

import App = require('./server/app');
import EnterFile = require('./config/template/enter_file');
import RegionUtil = require('./util/region_util');
import DepUtil = require('./util/dependence_util');

import DH = require('./global');

sourceMap.install();

var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')).toString());
DH.pkg.name = pkg.name;
DH.pkg.version = pkg.version;

DepUtil.loadFile();

var DH_REGION_NAME = process.env.DH_REGION_NAME;
var DH_SERVICE_LIST = process.env.DH_SERVICE_LIST;
var DH_HANDLER_LIST = process.env.DH_HANDLER_LIST;
var DH_RUN_MODE = process.env.DH_RUN_MODE;
var DH_ROOT_PATH = process.env.DH_ROOT_PATH;
var DH_CONFIG = process.env.DH_CONFIG;
var DH_BIND_IP = process.env.DH_BIND_IP;
var DH_CONSUL = process.env.DH_CONSUL;
var DH_USE_DOCKER = process.env.DH_USE_DOCKER;

var region = RegionUtil.parseRegionName(DH_REGION_NAME);

if (!region) {
    console.log('region name error, name=%s', DH_REGION_NAME);
    process.exit(1);
}

// region
DH.region.name = region.regionName;
DH.region.test = !!region.testType;

// work
DH.work.rootPath = DH_ROOT_PATH;
DH.work.configPath = DH_CONFIG;
DH.work.logLevel = 'INFO';

if (DH_BIND_IP) {
    var tmp = DH_BIND_IP.split(':');
    DH.bind.hostname = tmp[0];
    DH.bind.port = parseInt(tmp[1]);
}

// mode
DH.run.mode = DH_RUN_MODE;

switch (DH_RUN_MODE) {
    case 'local':
        DH.run.component = DepUtil.getAllOf();
        DH.consul = url.parse(DH_CONSUL);
        break;

    case 'dev':
        DH.run.component = DepUtil.getAllOf();
        DH.consul = url.parse(DH_CONSUL || 'consul://localhost:8500');
        break;

    case 'product':

        if (DH_HANDLER_LIST) {
            DH_HANDLER_LIST.split(',').forEach((value) => {
                var name = value.trim();
                DH.run.component.push('handler.' + name);
            });
        }

        if (DH_SERVICE_LIST) {
            DH_SERVICE_LIST.split(',').forEach((value) => {
                var name = value.trim();
                DH.run.component.push('service.' + name);
            });
        }

        DH.consul = url.parse(DH_CONSUL);
        break;
}

DH.useDocker = !!DH_USE_DOCKER;

App.startup();
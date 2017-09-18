import fs = require('fs');
import path = require('path');
import VerifyMgr = require('./verify_mgr');

var dir:string = path.resolve(__dirname);
var config_path = '';

if (process.argv.length > 2) {
    config_path = process.argv[2];
} else {
    try {
        var contents = fs.readFileSync('./check_config.json');
        var config = JSON.parse(contents.toString());
        config_path = config.path;
    } catch (err) {
        config_path = dir + '/../data';
        console.log("can't read check_config.json file, use path='../data/'");
    }
}

if (config_path[config_path.length - 1] !== '/') {
    config_path = config_path + '/';
}

console.log('config_path=' + config_path + '\n');
VerifyMgr.verifyConfig(config_path);

VerifyMgr.getErrorList().forEach((err) => {
    console.log(err.toString());
});
console.log('结束');
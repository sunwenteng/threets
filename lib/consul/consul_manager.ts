import async = require('async');
import consul = require('consul');

import Time = require('../util/time');
import Log = require('../util/log');

import DH = require('../global');

var cli:consul.Consul = null;

var sessionID:string = null;
var checkList:string[] = [];
var checkInterval:any = 0;

export function connectConsul(options) {
    if (DH.run.mode === 'dev') return ;
    cli = consul(options);
}

export function createSession(done) {
    if (DH.run.mode === 'dev') return done();

    cli.session.create({
        ttl: '30s'
    }, (err, result:any) => {
        if (err) return done(err);
        sessionID = result.ID;

        Time.pushInterval(setInterval(function () {
            if (sessionID) {
                cli.session.renew(sessionID, (err) => {
                    if (err) {
                        Log.sError('Consul', 'Session Renew failed, message=' + err.message);
                    }
                });
            }
        }, 15000));

        done();
    });
}

export function destroySession(done) {
    if (DH.run.mode === 'dev') return done();

    cli.session.destroy(sessionID, (err) => {
        sessionID = '';
        done(err);
    });
}

export function getServiceInfo(name:string, done:(err, data)=>void) {
    if (DH.run.mode === 'dev') return done(null, []);

    cli.catalog.service.nodes({
        service: name,
        tag: DH.shortTitle
    }, (err, data, res) => {
        done(err, data);
    });
}

export function watchService(name:string):consul.Watch {
    var options:any = {
        service: name,
        tag: [DH.shortTitle, DH.region.name]
    };
    var watch = cli.watch({
        method : cli.health.service,
        options: options
    });

    return watch;
}

export function registerService(options:consul.Agent.Service.RegisterOptions, done) {
    if (DH.run.mode === 'dev') return done();

    options.name = DH.region.name + ':' + options.name;
    if (!options.id) options.id = options.name;
    var key = [DH.fullTitle, 'service', options.name, 'lock'].join('/');
    var lock = cli.lock({
        key: key,
        session: sessionID
    });

    lock.on('acquire', () => {
        Log.sInfo('Consul', 'lock for [%s] acquired', key);
        cli.agent.service.register(options, function (err) {
            lock.release();
            done(err, options.id);
        })
    });

    lock.on('release', () => {
        Log.sInfo('Consul', 'lock for [%s] released', key);
    });

    lock.acquire();
}

export function getConsul():consul.Consul {
    return cli;
}

export function passNewCheck(checkName:string) {
    if (DH.run.mode === 'dev') return ;

    checkList.push(checkName);
    cli.agent.check.pass(checkName, (err) => {
        if (err) {
            Log.sError('Consul', 'Check Pass Error: ' + err.message);
        }
    });

    if (!checkInterval) {
        checkInterval = setInterval(() => {
            var dateString = (new Date()).toLocaleString();
            async.each(checkList, (key, next) => {
                cli.agent.check.pass({
                    id: key,
                    note: dateString
                }, (err) => {
                    if (err) {
                        Log.sError('Consul', 'Check Pass Error: ' + err.message);
                    }
                    next();
                });
            }, (err) => {
                //Log.sDebug('Consul', 'passing ' + checkList.join(','));
            });
        }, 15000);
    }
}
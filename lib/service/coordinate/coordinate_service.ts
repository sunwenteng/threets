import uuid = require('uuid');
import Tcp = require('../../net/tcp');
import Service = require('../service');

enum StatusType {
    OFFLINE = 0,
    LOGIN = 1,
    ONLINE = 2
}

class Status {
    accountId:number = 0;
    status:StatusType = StatusType.OFFLINE;
    sessionUUID:string = '';
    uuid:string = '';
}

class CoordinateService extends Service {
    sessions:{[key:string]:Tcp.RPCSession} = {};
    accountIdStoreByUUID:{[uuid:string]:{[id:number]:boolean}} = {};
    statusStoreByAccountId:{[id:number]:Status} = {};

    inMaintain:boolean = false;

    constructor() {
        super('coordinate');
    }

    public register(request, done, session) {
        if (!request.uuid) return done(new Error(''));
        if (this.sessions[request.uuid]) return done(new Error(''));

        var UUID = request.uuid;

        this.sessions[UUID] = session;
        this.accountIdStoreByUUID[UUID] = {};

        request.onlineId.forEach((accountId:number) => {
            var status = this.statusStoreByAccountId[accountId] = new Status();
            status.accountId = accountId;
            status.status = StatusType.ONLINE;
            status.sessionUUID = UUID;
            status.uuid = '';

            this.accountIdStoreByUUID[UUID][accountId] = true;
        });

        session.on('close', () => {
            delete this.sessions[UUID];
            Object.keys(this.accountIdStoreByUUID[UUID]).forEach((accountId) => {
                delete this.statusStoreByAccountId[accountId];
            });
            delete this.accountIdStoreByUUID[UUID];
        });
        session.setBindingData(UUID);
        done();
    }

    /**
     * remote acquire role online lock
     *      {accountId} want online
     * @param request {accountId}
     * @param done
     * @param session
     * @returns {any}
     */
    public acquireOnlineLock(request, done, session) {
        var UUID = session.getBindingData();
        if (!UUID || !this.sessions[UUID]) return done();

        if (this.inMaintain) return done(new Error(''));

        var accountId = request.accountId;
        var status:Status = this.statusStoreByAccountId[accountId];
        if (status) {
            if (status.status === StatusType.LOGIN) {

            } else if (status.status === StatusType.ONLINE) {

                // kick player
            }
        }

        status = this.statusStoreByAccountId[accountId] = new Status();
        status.accountId = accountId;
        status.status = StatusType.LOGIN;
        status.sessionUUID = UUID;
        status.uuid = uuid.v1();

        this.accountIdStoreByUUID[UUID][accountId] = true;

        done(null, { uuid: status.uuid });
    }

    /**
     * remote release role online lock
     *      {accountId} has online or online failed
     * @param request {accountId}
     * @param done
     * @param session
     * @returns {any}
     */
    public releaseOnlineLock(request, done) {
        var accountId = request.accountId,
            UUID = request.uuid;
        var status:Status = this.statusStoreByAccountId[accountId];
        if (!status || status.uuid !== UUID) return done();

        status.status = StatusType.ONLINE;
        status.uuid = '';
        done();
    }

    public offline(request, done) {
        var accountId = request.accountId,
            UUID = request.uuid;
        var status:Status = this.statusStoreByAccountId[accountId];
        if (!status || status.uuid !== UUID) return done();
        delete this.accountIdStoreByUUID[status.sessionUUID][accountId];
        delete this.statusStoreByAccountId[accountId];
        done();
    }
}
export = CoordinateService;
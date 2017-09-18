import Common = require('../../server_share/common');
import Tcp = require('../../net/tcp');

class LoginCharacter implements Tcp.BindingData {
    session:Tcp.SyncSession = null;

    passport:Common.Passport = new Common.Passport();
    dhClient:Common.DHClient = new Common.DHClient();
    device:Common.Device = new Common.Device();

    public onSessionClosed(done):void {
    }
}

export = LoginCharacter;
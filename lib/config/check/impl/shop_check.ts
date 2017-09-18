import VerifyMgr = require('../verify_mgr');

export function verify():void {
    checkShopItemDB();
    checkShopSpecialPriceDB();
}

function checkShopItemDB():void {
    VerifyMgr.setTableName('shop_item');
    Object.keys(VerifyMgr.cm.shop_itemdb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.shop_itemdb.get(ID);

        VerifyMgr.checkResourceIdValid('resID', config.resID);
        VerifyMgr.checkResourceIdValid('itemID', config.itemID);
    });
}

function checkShopSpecialPriceDB():void {
    VerifyMgr.setTableName('shop_specialprice');
    Object.keys(VerifyMgr.cm.shop_specialpricedb.all()).forEach((key) => {
        var ID = parseInt(key);
        VerifyMgr.setID(ID);
        var config = VerifyMgr.cm.shop_specialpricedb.get(ID);

        VerifyMgr.checkTableRef('refID', config.refID, 'shop_item');
        VerifyMgr.checkResourceIdValid('type', config.type);
    });
}

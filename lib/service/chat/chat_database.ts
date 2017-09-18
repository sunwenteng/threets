import Database = require('../../database/database');

class ChatDatabase extends Database {
    constructor() {
        super('mysql.world');
    }
}

export = ChatDatabase;
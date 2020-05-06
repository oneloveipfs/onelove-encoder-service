const MongoClient = require('mongodb').MongoClient;
module.exports = async (databaseInfo) => {
    var url = `mongodb://${databaseInfo.user}:${databaseInfo.password}@${databaseInfo.host}?authMechanism=DEFAULT&authSource=${databaseInfo.database}`;
    var client = await MongoClient.connect(url);
    return client.db(databaseInfo.database);
}
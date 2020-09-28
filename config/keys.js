dbPassword = 'mongodb+srv://quydv:'+ encodeURIComponent('123Vietnam') + '@cluster0.zcspb.mongodb.net/<dbname>?retryWrites=true&w=majority';
csvFilePath = './info.csv'
localDB = 'mongodb://127.0.0.1:27017/so6'
module.exports = {
    mongoURI: dbPassword,
    localURI: localDB,
    csvFilePath: csvFilePath
};

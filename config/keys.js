dbPassword = 'mongodb+srv://quydv:'+ encodeURIComponent('123Vietnam') + '@cluster0.zcspb.mongodb.net/<dbname>?retryWrites=true&w=majority';
csvFilePath = './info.csv'

module.exports = {
    mongoURI: dbPassword,
    csvFilePath: csvFilePath
};

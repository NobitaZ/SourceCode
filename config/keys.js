dbPassword = 'mongodb+srv://quydv:'+ encodeURIComponent('123Vietnam') + '@cluster0.zcspb.mongodb.net/<dbname>?retryWrites=true&w=majority';
const publicIp = require('public-ip');
const ip_adds = (async () => {
    const ip =  await publicIp.v4();
    return ip;
    //console.log(await publicIp.v4());
})();
module.exports = {
    mongoURI: dbPassword,
    ip_address: ip_adds
};

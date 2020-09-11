const mongoose = require('mongoose');

const LogsSchema = new mongoose.Schema({
    ip_address: {
        type: String,
        required: true
    },
    last_login: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('Logs', LogsSchema);

module.exports = User;

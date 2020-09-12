const mongoose = require('mongoose');

const LogsSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true
    },
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

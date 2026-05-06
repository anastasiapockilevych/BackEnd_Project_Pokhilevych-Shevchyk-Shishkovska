const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
    voterId: { type: String, required: true, unique: true },
    fullName: String,
});

module.exports = mongoose.model('Voter', voterSchema);

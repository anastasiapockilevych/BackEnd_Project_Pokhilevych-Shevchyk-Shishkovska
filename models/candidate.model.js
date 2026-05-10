const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    party: String,
    votesCount: { type: Number, default: 0 },
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll' },
});

module.exports = mongoose.model('Candidate', candidateSchema);

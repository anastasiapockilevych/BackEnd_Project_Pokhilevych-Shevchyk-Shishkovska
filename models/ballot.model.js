const mongoose = require('mongoose');

const ballotSchema = new mongoose.Schema({
  voter: { type: mongoose.Schema.Types.ObjectId, ref: 'Voter', required: true },
  poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  votedAt: { type: Date, default: Date.now }
});

ballotSchema.index({ voter: 1, poll: 1 }, { unique: true });

module.exports = mongoose.model('Ballot', ballotSchema);
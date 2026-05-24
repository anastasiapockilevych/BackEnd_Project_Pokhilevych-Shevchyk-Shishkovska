const Ballot = require('../models/ballot.model');
const Candidate = require('../models/candidate.model');
const Voter = require('../models/voter.model');
const Poll = require('../models/poll.model');
const {
    validateVoteStatusQuery,
    validateCandidateBelongsToPoll,
    validatePollIsActive,
} = require('../helpers/vote.helpers');

/**
 * POST /votes
 * Голосування. voterId береться з JWT токену (req.user.voterId).
 * Анонімність: в Ballot зберігається лише ObjectId Voter, без email/імені.
 */
const castVote = async (req, res, next) => {
    try {
        const { pollId, candidateId } = req.body;

        if (!pollId || !candidateId) {
            return res.status(400).json({ error: 'Необхідні поля: pollId, candidateId.' });
        }

        // voterId з JWT — не з тіла запиту
        const { voterId } = req.user;

        const voter = await Voter.findOne({ voterId });
        if (!voter) {
            return res.status(404).json({
                error: 'Виборця не знайдено. Зверніться до адміністратора.',
            });
        }

        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        const pollActiveValidation = validatePollIsActive(poll);
        if (!pollActiveValidation.valid) {
            return res.status(400).json({ error: pollActiveValidation.error });
        }

        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ error: 'Кандидата не знайдено.' });
        }

        const candidatePollValidation = validateCandidateBelongsToPoll(candidate, poll);
        if (!candidatePollValidation.valid) {
            return res.status(400).json({ error: candidatePollValidation.error });
        }

        const existingBallot = await Ballot.findOne({ voter: voter._id, poll: poll._id });
        if (existingBallot) {
            return res.status(409).json({
                error: `Ви вже проголосували в опитуванні "${poll.title}". Повторне голосування заборонено.`,
            });
        }

        const ballot = await Ballot.create({
            voter: voter._id,
            poll: poll._id,
            candidate: candidate._id,
        });

        await Candidate.findByIdAndUpdate(candidate._id, { $inc: { votesCount: 1 } });

        return res.status(201).json({
            message: `Ваш голос за "${candidate.name}" успішно зараховано!`,
            ballot: {
                id: ballot._id,
                poll: poll.title,
                candidate: candidate.name,
                submittedAt: ballot.votedAt || ballot.createdAt,
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                error: 'Повторне голосування заборонено. Ви вже проголосували в цьому опитуванні.',
            });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат одного з ID.' });
        }
        return next(error);
    }
};

const checkVoteStatus = async (req, res, next) => {
    try {
        const { voterId, pollId } = req.query;

        const queryValidation = validateVoteStatusQuery(voterId, pollId);
        if (!queryValidation.valid) {
            return res.status(400).json({ error: queryValidation.error });
        }

        const voter = await Voter.findOne({ voterId: voterId.trim() });
        if (!voter) {
            return res.status(404).json({ error: 'Виборця не знайдено.' });
        }

        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        const ballot = await Ballot.findOne({
            voter: voter._id,
            poll: poll._id,
        }).populate('candidate', 'name party');

        if (!ballot) {
            return res.status(200).json({
                hasVoted: false,
                message: 'Виборець ще не голосував у цьому опитуванні.',
            });
        }

        return res.status(200).json({
            hasVoted: true,
            message: 'Виборець вже проголосував.',
            // Анонімність: не повертаємо ім'я кандидата (не показуємо хто за кого)
            votedFor: {
                submittedAt: ballot.votedAt || ballot.createdAt,
            },
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID.' });
        }
        return next(error);
    }
};

const getPollResults = async (req, res, next) => {
    try {
        const poll = await Poll.findById(req.params.pollId);
        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        const candidates = await Candidate.find({ poll: poll._id })
            .select('name party votesCount')
            .sort({ votesCount: -1 });

        const totalVotes = candidates.reduce((sum, c) => sum + c.votesCount, 0);

        const results = candidates.map(c => ({
            id: c._id,
            name: c.name,
            party: c.party || '—',
            votes: c.votesCount,
            percentage:
                totalVotes > 0 ? `${((c.votesCount / totalVotes) * 100).toFixed(2)}%` : '0.00%',
        }));

        return res.status(200).json({
            poll: {
                id: poll._id,
                title: poll.title,
                status: poll.status,
                createdAt: poll.createdAt,
            },
            totalVotes,
            results,
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID опитування.' });
        }
        return next(error);
    }
};

/**
 * DELETE /votes
 * voterId береться з JWT (req.user.voterId).
 */
const deleteVote = async (req, res, next) => {
    try {
        const { pollId } = req.body;
        const { voterId } = req.user;

        if (!pollId) {
            return res.status(400).json({ error: 'Необхідне поле: pollId.' });
        }

        const voter = await Voter.findOne({ voterId });
        if (!voter) {
            return res.status(404).json({ error: 'Виборця не знайдено.' });
        }

        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        const pollActiveValidation = validatePollIsActive(poll);
        if (!pollActiveValidation.valid) {
            return res.status(400).json({
                error: `Неможливо скасувати голос: опитування "${poll.title}" вже завершено.`,
            });
        }

        const ballot = await Ballot.findOne({ voter: voter._id, poll: poll._id });
        if (!ballot) {
            return res.status(404).json({ error: 'Ви не голосували у цьому опитуванні.' });
        }

        await Candidate.findByIdAndUpdate(ballot.candidate, { $inc: { votesCount: -1 } });
        await Ballot.findByIdAndDelete(ballot._id);

        return res.status(200).json({
            message: `Голос в опитуванні "${poll.title}" успішно скасовано.`,
            cancelled: { pollId: poll._id, voterId },
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID.' });
        }
        return next(error);
    }
};

module.exports = {
    castVote,
    checkVoteStatus,
    getPollResults,
    deleteVote,
};

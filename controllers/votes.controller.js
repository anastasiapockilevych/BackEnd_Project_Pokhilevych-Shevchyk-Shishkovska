const Ballot = require('../models/ballot.model');
const Candidate = require('../models/candidate.model');
const Voter = require('../models/voter.model');
const Poll = require('../models/poll.model');

const castVote = async (req, res, next) => {
    try {
        const { voterId, pollId, candidateId } = req.body;

        if (!voterId || !pollId || !candidateId) {
            return res.status(400).json({
                error: 'Необхідно вказати всі поля: "voterId", "pollId", "candidateId".',
            });
        }

        const voter = await Voter.findOne({ voterId: voterId.trim() });
        if (!voter) {
            return res.status(404).json({
                error: `Виборця з ID "${voterId}" не знайдено. Зверніться до адміністратора для реєстрації.`,
            });
        }

        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        if (poll.status === 'closed') {
            return res.status(400).json({
                error: `Опитування "${poll.title}" вже завершено. Голосування не приймається.`,
            });
        }

        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ error: 'Кандидата не знайдено.' });
        }

        if (candidate.poll.toString() !== poll._id.toString()) {
            return res.status(400).json({
                error: `Кандидат "${candidate.name}" не бере участі у цьому опитуванні.`,
            });
        }

        const existingBallot = await Ballot.findOne({
            voter: voter._id,
            poll: poll._id,
        });

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

        await Candidate.findByIdAndUpdate(candidate._id, {
            $inc: { votesCount: 1 },
        });

        return res.status(201).json({
            message: `Ваш голос за "${candidate.name}" успішно зараховано!`,
            ballot: {
                id: ballot._id,
                poll: poll.title,
                candidate: candidate.name,
                votedAt: ballot.votedAt,
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
        next(error);
    }
};

const checkVoteStatus = async (req, res, next) => {
    try {
        const { voterId, pollId } = req.query;

        if (!voterId || !pollId) {
            return res.status(400).json({
                error: 'Необхідно вказати query-параметри "voterId" та "pollId".',
            });
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
                message: `Виборець "${voter.fullName}" ще не голосував у цьому опитуванні.`,
            });
        }

        return res.status(200).json({
            hasVoted: true,
            message: `Виборець "${voter.fullName}" вже проголосував.`,
            votedFor: {
                candidateName: ballot.candidate.name,
                party: ballot.candidate.party || '—',
                votedAt: ballot.votedAt,
            },
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID.' });
        }
        next(error);
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
            },
            totalVotes,
            results,
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID опитування.' });
        }
        next(error);
    }
};

module.exports = {
    castVote,
    checkVoteStatus,
    getPollResults,
};

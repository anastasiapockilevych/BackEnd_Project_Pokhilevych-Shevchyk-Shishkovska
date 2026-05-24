/**
 * Analytics Controller
 * Аналітика результатів голосувань.
 */

const Poll = require('../models/poll.model');
const Candidate = require('../models/candidate.model');
const Ballot = require('../models/ballot.model');
const Voter = require('../models/voter.model');

/**
 * Допоміжна функція: будує погодинну динаміку голосування.
 * FIX: перевіряємо валідність дати перед .setMinutes()
 *
 * @param {Array} ballots — масив { createdAt | votedAt }
 * @returns {Array} [{ hour, votes, cumulative }, ...]
 */
function buildHourlyTimeline(ballots) {
    if (ballots.length === 0) return [];

    const hourMap = new Map();

    ballots.forEach(ballot => {
        // Ballot може мати createdAt (timestamps) або votedAt
        const rawDate = ballot.createdAt || ballot.votedAt;
        if (!rawDate) return;

        const d = new Date(rawDate);

        // Пропускаємо невалідні дати замість RangeError
        if (Number.isNaN(d.getTime())) return;

        d.setMinutes(0, 0, 0);
        const key = d.toISOString();
        hourMap.set(key, (hourMap.get(key) || 0) + 1);
    });

    const sorted = Array.from(hourMap.entries()).sort(([a], [b]) => new Date(a) - new Date(b));

    let cumulative = 0;
    return sorted.map(([hour, votes]) => {
        cumulative += votes;
        return { hour, votes, cumulative };
    });
}

/**
 * GET /analytics/polls/:pollId/summary
 */
const getPollAnalytics = async (req, res, next) => {
    try {
        const poll = await Poll.findById(req.params.pollId);

        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        const candidates = await Candidate.find({ poll: poll._id })
            .select('name party votesCount')
            .sort({ votesCount: -1 });

        const totalVotes = candidates.reduce((sum, c) => sum + c.votesCount, 0);
        const totalVoters = await Voter.countDocuments();

        const turnoutPercent =
            totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : '0.00';

        const breakdown = candidates.map((c, index) => ({
            rank: index + 1,
            name: c.name,
            party: c.party || '—',
            votes: c.votesCount,
            percentage:
                totalVotes > 0 ? `${((c.votesCount / totalVotes) * 100).toFixed(2)}%` : '0.00%',
        }));

        const leader = breakdown.length > 0 ? breakdown[0] : null;
        const hasWinner = poll.status === 'closed' && leader && leader.votes > 0;

        let summaryExtra;
        if (hasWinner) {
            summaryExtra = {
                winner: {
                    name: leader.name,
                    party: leader.party,
                    votes: leader.votes,
                    percentage: leader.percentage,
                },
            };
        } else if (leader && leader.votes > 0) {
            summaryExtra = {
                currentLeader: {
                    name: leader.name,
                    party: leader.party,
                    votes: leader.votes,
                    percentage: leader.percentage,
                },
            };
        } else {
            summaryExtra = { winner: null };
        }

        const ballots = await Ballot.find({ poll: poll._id })
            .select('votedAt createdAt')
            .sort({ votedAt: 1 });

        const timeline = buildHourlyTimeline(ballots);

        return res.status(200).json({
            poll: {
                id: poll._id,
                title: poll.title,
                status: poll.status,
                category: poll.category || null,
                createdAt: poll.createdAt,
            },
            summary: {
                totalVotes,
                totalRegisteredVoters: totalVoters,
                turnoutPercent: `${turnoutPercent}%`,
                ...summaryExtra,
            },
            breakdown,
            timeline,
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID опитування.' });
        }
        return next(error);
    }
};

/**
 * GET /analytics/overview
 */
const getOverviewAnalytics = async (req, res, next) => {
    try {
        const [totalPolls, activePolls, closedPolls, totalVoters] = await Promise.all([
            Poll.countDocuments(),
            Poll.countDocuments({ status: 'active' }),
            Poll.countDocuments({ status: 'closed' }),
            Voter.countDocuments(),
        ]);

        const totalBallots = await Ballot.countDocuments();

        const topPollsRaw = await Ballot.aggregate([
            { $group: { _id: '$poll', voteCount: { $sum: 1 } } },
            { $sort: { voteCount: -1 } },
            { $limit: 5 },
        ]);

        const topPolls = await Promise.all(
            topPollsRaw.map(async item => {
                const poll = await Poll.findById(item._id).select('title status');
                return {
                    pollId: item._id,
                    title: poll ? poll.title : 'Видалено',
                    status: poll ? poll.status : '—',
                    voteCount: item.voteCount,
                };
            }),
        );

        const categoryStats = await Poll.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        return res.status(200).json({
            overview: {
                totalPolls,
                activePolls,
                closedPolls,
                totalRegisteredVoters: totalVoters,
                totalVotesCast: totalBallots,
                averageVotesPerPoll:
                    totalPolls > 0 ? (totalBallots / totalPolls).toFixed(2) : '0.00',
            },
            topActivePolls: topPolls,
            categoryBreakdown: categoryStats.map(c => ({
                category: c._id || 'не вказано',
                pollCount: c.count,
            })),
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getPollAnalytics,
    getOverviewAnalytics,
};

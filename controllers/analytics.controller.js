/**
 * Analytics Controller
 * Аналітика результатів голосувань.
 *
 * Ендпоінти:
 *   GET /votes/results/:pollId          — детальні результати одного опитування
 *   GET /analytics/polls/:pollId/summary — повна аналітика: переможець, явка, динаміка
 *   GET /analytics/overview             — зведена аналітика по всіх опитуваннях
 */

const Poll = require('../models/poll.model');
const Candidate = require('../models/candidate.model');
const Ballot = require('../models/ballot.model');
const Voter = require('../models/voter.model');

/**
 * GET /analytics/polls/:pollId/summary
 * Повна аналітика конкретного опитування:
 * - переможець / лідер
 * - загальна явка
 * - розподіл голосів по кандидатах з відсотками
 * - динаміка голосування по годинах (timeline)
 */
const getPollAnalytics = async (req, res, next) => {
    try {
        const poll = await Poll.findById(req.params.pollId);

        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        // Кандидати відсортовані за кількістю голосів
        const candidates = await Candidate.find({ poll: poll._id })
            .select('name party votesCount')
            .sort({ votesCount: -1 });

        const totalVotes = candidates.reduce((sum, c) => sum + c.votesCount, 0);
        const totalVoters = await Voter.countDocuments();

        // Відсоток явки
        const turnoutPercent =
            totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : '0.00';

        // Розбивка по кандидатах
        const breakdown = candidates.map((c, index) => ({
            rank: index + 1,
            name: c.name,
            party: c.party || '—',
            votes: c.votesCount,
            percentage:
                totalVotes > 0 ? `${((c.votesCount / totalVotes) * 100).toFixed(2)}%` : '0.00%',
        }));

        // Переможець або лідер
        const leader = breakdown.length > 0 ? breakdown[0] : null;
        const hasWinner = poll.status === 'closed' && leader && leader.votes > 0;

        // Динаміка голосування: групуємо бюлетені по годинах
        const ballots = await Ballot.find({ poll: poll._id })
            .select('createdAt')
            .sort({ createdAt: 1 });

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
                ...(hasWinner
                    ? {
                          winner: {
                              name: leader.name,
                              party: leader.party,
                              votes: leader.votes,
                              percentage: leader.percentage,
                          },
                      }
                    : leader && leader.votes > 0
                    ? {
                          currentLeader: {
                              name: leader.name,
                              party: leader.party,
                              votes: leader.votes,
                              percentage: leader.percentage,
                          },
                      }
                    : { winner: null }),
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
 * Зведена аналітика по всіх опитуваннях:
 * - загальна кількість опитувань, активних/завершених
 * - загальна кількість голосів
 * - топ-3 найактивніших опитувань
 */
const getOverviewAnalytics = async (req, res, next) => {
    try {
        const [totalPolls, activePolls, closedPolls, totalVoters] = await Promise.all([
            Poll.countDocuments(),
            Poll.countDocuments({ status: 'active' }),
            Poll.countDocuments({ status: 'closed' }),
            Voter.countDocuments(),
        ]);

        // Загальна кількість бюлетенів
        const totalBallots = await Ballot.countDocuments();

        // Топ-5 опитувань за кількістю голосів
        const topPollsRaw = await Ballot.aggregate([
            { $group: { _id: '$poll', voteCount: { $sum: 1 } } },
            { $sort: { voteCount: -1 } },
            { $limit: 5 },
        ]);

        // Підтягуємо назви опитувань
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

        // Статистика категорій (якщо поле category є в моделі)
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

/**
 * Допоміжна функція: будує погодинну динаміку голосування.
 * @param {Array} ballots — масив { createdAt } відсортований по зростанню
 * @returns {Array} [{ hour: '2024-05-10T14:00', votes: 5, cumulative: 12 }, ...]
 */
function buildHourlyTimeline(ballots) {
    if (ballots.length === 0) return [];

    const hourMap = new Map();

    for (const ballot of ballots) {
        const d = new Date(ballot.createdAt);
        // Обнуляємо хвилини/секунди — групуємо по годині
        d.setMinutes(0, 0, 0);
        const key = d.toISOString();
        hourMap.set(key, (hourMap.get(key) || 0) + 1);
    }

    const sorted = Array.from(hourMap.entries()).sort(([a], [b]) => new Date(a) - new Date(b));

    let cumulative = 0;
    return sorted.map(([hour, votes]) => {
        cumulative += votes;
        return { hour, votes, cumulative };
    });
}

module.exports = {
    getPollAnalytics,
    getOverviewAnalytics,
};

/**
 * Тести для analytics.controller.js
 * Покриття: усі розгалуження getPollAnalytics та getOverviewAnalytics.
 *
 * Стратегія: юніт-тести з мок-об'єктами (без реального MongoDB).
 */

// ─── Мок моделей ───────────────────────────────────────────────────────────
jest.mock('../models/poll.model');
jest.mock('../models/candidate.model');
jest.mock('../models/ballot.model');
jest.mock('../models/voter.model');

const Poll = require('../models/poll.model');
const Candidate = require('../models/candidate.model');
const Ballot = require('../models/ballot.model');
const Voter = require('../models/voter.model');

const { getPollAnalytics, getOverviewAnalytics } = require('../controllers/analytics.controller');

// ─── Утиліти ───────────────────────────────────────────────────────────────
const fakeId = () => '507f1f77bcf86cd799439011';

const buildMocks = (params = {}) => {
    const req = { params };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
};

/** Хелпер для мокування Candidate.find().select().sort() */
const mockCandidateFind = candidates => {
    Candidate.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(candidates),
        }),
    });
};

/** Хелпер для мокування Ballot.find().select().sort() */
const mockBallotFind = ballots => {
    Ballot.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(ballots),
        }),
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. getPollAnalytics
// ─────────────────────────────────────────────────────────────────────────────
describe('getPollAnalytics', () => {
    beforeEach(() => jest.clearAllMocks());

    it('404 — опитування не знайдено', async () => {
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({ pollId: fakeId() });

        await getPollAnalytics(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування не знайдено.' });
    });

    it('400 — CastError при невалідному ID', async () => {
        Poll.findById = jest.fn().mockRejectedValue({ name: 'CastError' });
        const { req, res, next } = buildMocks({ pollId: 'bad-id' });

        await getPollAnalytics(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невалідний формат ID опитування.' });
    });

    it('200 — активне опитування без кандидатів і голосів (порожній timeline, winner: null)', async () => {
        const mockPoll = {
            _id: fakeId(),
            title: 'Empty Poll',
            status: 'active',
            category: 'president',
            createdAt: new Date(),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        mockCandidateFind([]);
        Voter.countDocuments = jest.fn().mockResolvedValue(0);
        mockBallotFind([]);

        const { req, res, next } = buildMocks({ pollId: fakeId() });
        await getPollAnalytics(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.summary.totalVotes).toBe(0);
        expect(jsonArg.summary.winner).toBeNull();
        expect(jsonArg.summary.turnoutPercent).toBe('0.00%');
        expect(jsonArg.timeline).toEqual([]);
        expect(jsonArg.breakdown).toEqual([]);
    });

    it('200 — активне опитування з голосами (currentLeader, без партії → "—")', async () => {
        const mockPoll = {
            _id: fakeId(),
            title: 'Active Election',
            status: 'active',
            category: null,
            createdAt: new Date(),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        mockCandidateFind([
            { name: 'Кандидат А', party: 'Партія А', votesCount: 10 },
            { name: 'Кандидат Б', party: undefined, votesCount: 5 },
        ]);
        Voter.countDocuments = jest.fn().mockResolvedValue(100);
        mockBallotFind([{ createdAt: new Date('2024-05-10T14:30:00Z') }]);

        const { req, res, next } = buildMocks({ pollId: fakeId() });
        await getPollAnalytics(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.summary.currentLeader).toBeDefined();
        expect(jsonArg.summary.currentLeader.name).toBe('Кандидат А');
        // кандидат без партії — поле має бути '—'
        expect(jsonArg.breakdown[1].party).toBe('—');
        // відсоток явки
        expect(jsonArg.summary.turnoutPercent).toBe('15.00%');
        // timeline має містити дані
        expect(jsonArg.timeline.length).toBeGreaterThan(0);
        expect(jsonArg.timeline[0].votes).toBe(1);
        expect(jsonArg.timeline[0].cumulative).toBe(1);
    });

    it('200 — закрите опитування з переможцем', async () => {
        const mockPoll = {
            _id: fakeId(),
            title: 'Closed Poll',
            status: 'closed',
            category: 'mayor',
            createdAt: new Date(),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        mockCandidateFind([
            { name: 'Переможець', party: 'Партія перемоги', votesCount: 20 },
            { name: 'Другий', party: 'Партія Б', votesCount: 5 },
        ]);
        Voter.countDocuments = jest.fn().mockResolvedValue(50);
        mockBallotFind([]);

        const { req, res, next } = buildMocks({ pollId: fakeId() });
        await getPollAnalytics(req, res, next);

        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.summary.winner).toBeDefined();
        expect(jsonArg.summary.winner.name).toBe('Переможець');
        expect(jsonArg.summary.turnoutPercent).toBe('50.00%');
        // Відсоток голосів
        expect(jsonArg.breakdown[0].percentage).toBe('80.00%');
        expect(jsonArg.breakdown[1].percentage).toBe('20.00%');
    });

    it('200 — закрите опитування БЕЗ голосів (winner: null, навіть є кандидати)', async () => {
        const mockPoll = {
            _id: fakeId(),
            title: 'No Votes Poll',
            status: 'closed',
            category: null,
            createdAt: new Date(),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        mockCandidateFind([{ name: 'А', party: 'PA', votesCount: 0 }]);
        Voter.countDocuments = jest.fn().mockResolvedValue(10);
        mockBallotFind([]);

        const { req, res, next } = buildMocks({ pollId: fakeId() });
        await getPollAnalytics(req, res, next);

        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.summary.winner).toBeNull();
        expect(jsonArg.breakdown[0].percentage).toBe('0.00%');
    });

    it('200 — timeline: два голоси в одну годину та один — в наступну', async () => {
        const mockPoll = {
            _id: fakeId(),
            title: 'Timeline Poll',
            status: 'active',
            category: 'parliament',
            createdAt: new Date(),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        mockCandidateFind([{ name: 'X', party: 'Y', votesCount: 3 }]);
        Voter.countDocuments = jest.fn().mockResolvedValue(10);
        mockBallotFind([
            { createdAt: new Date('2024-05-10T14:10:00Z') },
            { createdAt: new Date('2024-05-10T14:50:00Z') }, // та ж година
            { createdAt: new Date('2024-05-10T15:05:00Z') }, // наступна година
        ]);

        const { req, res, next } = buildMocks({ pollId: fakeId() });
        await getPollAnalytics(req, res, next);

        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.timeline.length).toBe(2);
        expect(jsonArg.timeline[0].votes).toBe(2);
        expect(jsonArg.timeline[1].votes).toBe(1);
        expect(jsonArg.timeline[1].cumulative).toBe(3);
    });

    it('200 — timeline: бюлетень без дати пропускається', async () => {
        const mockPoll = {
            _id: fakeId(),
            title: 'No Date Poll',
            status: 'active',
            category: null,
            createdAt: new Date(),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        mockCandidateFind([{ name: 'X', party: 'Y', votesCount: 1 }]);
        Voter.countDocuments = jest.fn().mockResolvedValue(10);
        // один бюлетень без будь-якої дати
        mockBallotFind([{ createdAt: null, votedAt: null }]);

        const { req, res, next } = buildMocks({ pollId: fakeId() });
        await getPollAnalytics(req, res, next);

        const jsonArg = res.json.mock.calls[0][0];
        // бюлетень без дати не додається до timeline
        expect(jsonArg.timeline).toEqual([]);
    });

    it('200 — timeline: невалідна дата пропускається (NaN)', async () => {
        const mockPoll = {
            _id: fakeId(),
            title: 'Bad Date Poll',
            status: 'active',
            category: null,
            createdAt: new Date(),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        mockCandidateFind([{ name: 'X', party: 'Y', votesCount: 1 }]);
        Voter.countDocuments = jest.fn().mockResolvedValue(10);
        // createdAt — невалідна дата
        mockBallotFind([{ createdAt: 'not-a-date' }]);

        const { req, res, next } = buildMocks({ pollId: fakeId() });
        await getPollAnalytics(req, res, next);

        const jsonArg = res.json.mock.calls[0][0];
        // невалідна дата пропускається — timeline порожній
        expect(jsonArg.timeline).toEqual([]);
    });

    it('200 — timeline: votedAt використовується коли немає createdAt', async () => {
        const mockPoll = {
            _id: fakeId(),
            title: 'VotedAt Poll',
            status: 'active',
            category: null,
            createdAt: new Date(),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        mockCandidateFind([{ name: 'X', party: 'Y', votesCount: 1 }]);
        Voter.countDocuments = jest.fn().mockResolvedValue(10);
        mockBallotFind([{ createdAt: undefined, votedAt: new Date('2024-06-01T10:00:00Z') }]);

        const { req, res, next } = buildMocks({ pollId: fakeId() });
        await getPollAnalytics(req, res, next);

        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.timeline.length).toBe(1);
        expect(jsonArg.timeline[0].votes).toBe(1);
    });

    it('next(error) — неочікувана помилка', async () => {
        Poll.findById = jest.fn().mockRejectedValue(new Error('DB error'));
        const { req, res, next } = buildMocks({ pollId: fakeId() });

        await getPollAnalytics(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. getOverviewAnalytics
// ─────────────────────────────────────────────────────────────────────────────
describe('getOverviewAnalytics', () => {
    beforeEach(() => jest.clearAllMocks());

    it('200 — повна зведена аналітика', async () => {
        // Promise.all викликає countDocuments тричі для Poll і раз для Voter
        Poll.countDocuments = jest
            .fn()
            .mockResolvedValueOnce(10) // totalPolls
            .mockResolvedValueOnce(6) // activePolls
            .mockResolvedValueOnce(4); // closedPolls
        Voter.countDocuments = jest.fn().mockResolvedValue(50);
        Ballot.countDocuments = jest.fn().mockResolvedValue(100);

        Ballot.aggregate = jest.fn().mockResolvedValue([{ _id: fakeId(), voteCount: 30 }]);
        Poll.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ title: 'Топ опитування', status: 'active' }),
        });
        Poll.aggregate = jest.fn().mockResolvedValue([
            { _id: 'president', count: 5 },
            { _id: null, count: 3 }, // категорія null → 'не вказано'
        ]);

        const { req, res, next } = buildMocks();
        await getOverviewAnalytics(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.overview.totalPolls).toBe(10);
        expect(jsonArg.overview.activePolls).toBe(6);
        expect(jsonArg.overview.closedPolls).toBe(4);
        expect(jsonArg.overview.totalRegisteredVoters).toBe(50);
        expect(jsonArg.overview.totalVotesCast).toBe(100);
        expect(jsonArg.overview.averageVotesPerPoll).toBe('10.00');
        expect(jsonArg.topActivePolls[0].title).toBe('Топ опитування');
        expect(jsonArg.topActivePolls[0].voteCount).toBe(30);
        // null-категорія → 'не вказано'
        expect(jsonArg.categoryBreakdown[1].category).toBe('не вказано');
    });

    it('200 — averageVotesPerPoll = "0.00" коли опитувань немає', async () => {
        Poll.countDocuments = jest.fn().mockResolvedValue(0);
        Voter.countDocuments = jest.fn().mockResolvedValue(0);
        Ballot.countDocuments = jest.fn().mockResolvedValue(0);
        Ballot.aggregate = jest.fn().mockResolvedValue([]);
        Poll.aggregate = jest.fn().mockResolvedValue([]);

        const { req, res, next } = buildMocks();
        await getOverviewAnalytics(req, res, next);

        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.overview.averageVotesPerPoll).toBe('0.00');
        expect(jsonArg.topActivePolls).toEqual([]);
        expect(jsonArg.categoryBreakdown).toEqual([]);
    });

    it('200 — топ-5 містить видалене опитування (title: "Видалено", status: "—")', async () => {
        Poll.countDocuments = jest
            .fn()
            .mockResolvedValueOnce(5)
            .mockResolvedValueOnce(3)
            .mockResolvedValueOnce(2);
        Voter.countDocuments = jest.fn().mockResolvedValue(20);
        Ballot.countDocuments = jest.fn().mockResolvedValue(15);
        Ballot.aggregate = jest.fn().mockResolvedValue([{ _id: fakeId(), voteCount: 10 }]);
        // Poll.findById().select() повертає null — опитування видалено
        Poll.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
        });
        Poll.aggregate = jest.fn().mockResolvedValue([]);

        const { req, res, next } = buildMocks();
        await getOverviewAnalytics(req, res, next);

        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.topActivePolls[0].title).toBe('Видалено');
        expect(jsonArg.topActivePolls[0].status).toBe('—');
    });

    it('next(error) — неочікувана помилка', async () => {
        Poll.countDocuments = jest.fn().mockRejectedValue(new Error('DB error'));

        const { req, res, next } = buildMocks();
        await getOverviewAnalytics(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

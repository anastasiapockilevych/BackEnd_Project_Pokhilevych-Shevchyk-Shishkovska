/**
 * Тести для votes.controller.js
 * Покриття: усі if/else розгалуження кожного ендпоінту.
 */

// ─── Мок моделей ───────────────────────────────────────────────────────────
jest.mock('../models/ballot.model');
jest.mock('../models/candidate.model');
jest.mock('../models/voter.model');
jest.mock('../models/poll.model');

// ─── Мок хелперів ──────────────────────────────────────────────────────────
jest.mock('../helpers/vote.helpers', () => ({
    validateVoteFields: jest.fn(),
    validateVoteStatusQuery: jest.fn(),
    validateDeleteVoteFields: jest.fn(),
    validateCandidateBelongsToPoll: jest.fn(),
    validatePollIsActive: jest.fn(),
}));

const Ballot = require('../models/ballot.model');
const Candidate = require('../models/candidate.model');
const Voter = require('../models/voter.model');
const Poll = require('../models/poll.model');
const {
    validateVoteFields,
    validateVoteStatusQuery,
    validateDeleteVoteFields,
    validateCandidateBelongsToPoll,
    validatePollIsActive,
} = require('../helpers/vote.helpers');

const {
    castVote,
    checkVoteStatus,
    getPollResults,
    deleteVote,
} = require('../controllers/votes.controller');

// ─── Утиліти ───────────────────────────────────────────────────────────────
const fakeId = () => '507f1f77bcf86cd799439011';

const buildMocks = (body = {}, params = {}, query = {}) => {
    const req = { body, params, query };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
};

// ─── Глобальні хуки для Jest (щоб уникнути помилки A worker process has failed) ─
afterAll(async () => {
    // На всякий випадок чистимо моки
    jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. castVote
// ─────────────────────────────────────────────────────────────────────────────
describe('castVote', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — відсутні обов\'язкові поля', async () => {
        validateVoteFields.mockReturnValue({ valid: false, error: 'Необхідні всі поля' });
        const { req, res, next } = buildMocks({ voterId: '', pollId: '', candidateId: '' });

        await castVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Необхідні всі поля' });
    });

    it('404 — виборець не знайдений', async () => {
        validateVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue(null);

        const { req, res, next } = buildMocks({
            voterId: 'UNKNOWN',
            pollId: fakeId(),
            candidateId: fakeId(),
        });

        await castVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('не знайдено') }),
        );
    });

    it('404 — опитування не знайдено', async () => {
        validateVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: fakeId(), voterId: 'STUD-001' });
        Poll.findById = jest.fn().mockResolvedValue(null);

        const { req, res, next } = buildMocks({
            voterId: 'STUD-001',
            pollId: fakeId(),
            candidateId: fakeId(),
        });

        await castVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування не знайдено.' });
    });

    it('400 — опитування закрите', async () => {
        validateVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: fakeId(), voterId: 'STUD-001' });
        Poll.findById = jest
            .fn()
            .mockResolvedValue({ _id: fakeId(), status: 'closed', title: 'X' });
        validatePollIsActive.mockReturnValue({ valid: false, error: 'Опитування закрите' });

        const { req, res, next } = buildMocks({
            voterId: 'STUD-001',
            pollId: fakeId(),
            candidateId: fakeId(),
        });

        await castVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування закрите' });
    });

    it('404 — кандидат не знайдений', async () => {
        validateVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: fakeId(), voterId: 'STUD-001' });
        Poll.findById = jest
            .fn()
            .mockResolvedValue({ _id: fakeId(), status: 'active', title: 'X' });
        validatePollIsActive.mockReturnValue({ valid: true });
        Candidate.findById = jest.fn().mockResolvedValue(null);

        const { req, res, next } = buildMocks({
            voterId: 'STUD-001',
            pollId: fakeId(),
            candidateId: fakeId(),
        });

        await castVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Кандидата не знайдено.' });
    });

    it('400 — кандидат не належить до цього опитування', async () => {
        validateVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: fakeId() });
        const mockPoll = { _id: fakeId(), status: 'active', title: 'X' };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        validatePollIsActive.mockReturnValue({ valid: true });
        const mockCandidate = { _id: fakeId(), name: 'Wrong', poll: 'other-poll-id' };
        Candidate.findById = jest.fn().mockResolvedValue(mockCandidate);
        validateCandidateBelongsToPoll.mockReturnValue({
            valid: false,
            error: 'Кандидат не в цьому опитуванні',
        });

        const { req, res, next } = buildMocks({
            voterId: 'STUD-001',
            pollId: fakeId(),
            candidateId: fakeId(),
        });

        await castVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Кандидат не в цьому опитуванні' });
    });

    it('409 — виборець вже голосував (знайдено ballot)', async () => {
        validateVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: fakeId(), voterId: 'STUD-001' });
        const mockPoll = { _id: fakeId(), status: 'active', title: 'Election' };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        validatePollIsActive.mockReturnValue({ valid: true });
        const mockCandidate = { _id: fakeId(), name: 'A', poll: mockPoll._id };
        Candidate.findById = jest.fn().mockResolvedValue(mockCandidate);
        validateCandidateBelongsToPoll.mockReturnValue({ valid: true });
        Ballot.findOne = jest.fn().mockResolvedValue({ _id: fakeId() }); // вже є бюлетень

        const { req, res, next } = buildMocks({
            voterId: 'STUD-001',
            pollId: fakeId(),
            candidateId: fakeId(),
        });

        await castVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('вже проголосували') }),
        );
    });

    it('201 — голос успішно подано', async () => {
        validateVoteFields.mockReturnValue({ valid: true });
        const mockVoter = { _id: fakeId(), voterId: 'STUD-001' };
        Voter.findOne = jest.fn().mockResolvedValue(mockVoter);
        const mockPoll = { _id: fakeId(), status: 'active', title: 'Election' };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        validatePollIsActive.mockReturnValue({ valid: true });
        const mockCandidate = { _id: fakeId(), name: 'Candidate A', poll: mockPoll._id };
        Candidate.findById = jest.fn().mockResolvedValue(mockCandidate);
        validateCandidateBelongsToPoll.mockReturnValue({ valid: true });
        Ballot.findOne = jest.fn().mockResolvedValue(null); // бюлетень відсутній
        const mockBallot = { _id: fakeId(), createdAt: new Date() };
        Ballot.create = jest.fn().mockResolvedValue(mockBallot);
        Candidate.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

        const { req, res, next } = buildMocks({
            voterId: 'STUD-001',
            pollId: fakeId(),
            candidateId: fakeId(),
        });

        await castVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('успішно'),
                ballot: expect.objectContaining({ poll: 'Election' }),
            }),
        );
        expect(Candidate.findByIdAndUpdate).toHaveBeenCalledWith(mockCandidate._id, {
            $inc: { votesCount: 1 },
        });
    });

    it('409 — унікальний індекс MongoDB (code 11000)', async () => {
        validateVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: fakeId() });
        Poll.findById = jest
            .fn()
            .mockResolvedValue({ _id: fakeId(), status: 'active', title: 'X' });
        validatePollIsActive.mockReturnValue({ valid: true });
        Candidate.findById = jest
            .fn()
            .mockResolvedValue({ _id: fakeId(), name: 'A', poll: fakeId() });
        validateCandidateBelongsToPoll.mockReturnValue({ valid: true });
        Ballot.findOne = jest.fn().mockResolvedValue(null);
        const dbError = new Error('Duplicate key');
        dbError.code = 11000;
        Ballot.create = jest.fn().mockRejectedValue(dbError);

        const { req, res, next } = buildMocks({
            voterId: 'STUD-001',
            pollId: fakeId(),
            candidateId: fakeId(),
        });

        await castVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('Повторне') }),
        );
    });

    it('400 — CastError', async () => {
        validateVoteFields.mockReturnValue({ valid: true });
        const castErr = new Error();
        castErr.name = 'CastError';
        Voter.findOne = jest.fn().mockRejectedValue(castErr);

        const { req, res, next } = buildMocks({
            voterId: 'STUD-001',
            pollId: 'bad',
            candidateId: 'bad',
        });

        await castVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невалідний формат одного з ID.' });
    });

    // ДОДАНИЙ ТЕСТ: перевірка на іншу (не CastError) помилку
    it('next(error) — інший виняток', async () => {
        validateVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockRejectedValue(new Error('Зовсім інша помилка'));

        const { req, res, next } = buildMocks({
            voterId: 'STUD-001',
            pollId: fakeId(),
            candidateId: fakeId(),
        });

        await castVote(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. checkVoteStatus
// ─────────────────────────────────────────────────────────────────────────────
describe('checkVoteStatus', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — відсутні query-параметри', async () => {
        validateVoteStatusQuery.mockReturnValue({
            valid: false,
            error: 'Потрібні voterId та pollId',
        });
        const { req, res, next } = buildMocks({}, {}, {});

        await checkVoteStatus(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Потрібні voterId та pollId' });
    });

    it('404 — виборець не знайдений', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue(null);

        const { req, res, next } = buildMocks({}, {}, { voterId: 'UNKNOWN', pollId: fakeId() });

        await checkVoteStatus(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Виборця не знайдено.' });
    });

    it('404 — опитування не знайдено', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: fakeId(), fullName: 'Іван' });
        Poll.findById = jest.fn().mockResolvedValue(null);

        const { req, res, next } = buildMocks({}, {}, { voterId: 'STUD-001', pollId: fakeId() });

        await checkVoteStatus(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування не знайдено.' });
    });

    it('200 hasVoted=false — виборець ще не голосував', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        const mockVoter = { _id: fakeId(), fullName: 'Іван' };
        Voter.findOne = jest.fn().mockResolvedValue(mockVoter);
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), title: 'Election' });
        Ballot.findOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
        });

        const { req, res, next } = buildMocks({}, {}, { voterId: 'STUD-001', pollId: fakeId() });

        await checkVoteStatus(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hasVoted: false }));
    });

    it('200 hasVoted=true — виборець вже проголосував', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        const mockVoter = { _id: fakeId(), fullName: 'Марія' };
        Voter.findOne = jest.fn().mockResolvedValue(mockVoter);
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), title: 'Election' });
        const mockBallot = {
            createdAt: new Date(),
            candidate: { name: 'Кандидат А', party: 'Партія А' },
        };
        Ballot.findOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockBallot),
        });

        const { req, res, next } = buildMocks({}, {}, { voterId: 'STUD-002', pollId: fakeId() });

        await checkVoteStatus(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                hasVoted: true,
                votedFor: expect.objectContaining({ candidateName: 'Кандидат А' }),
            }),
        );
    });

    it('200 hasVoted=true — candidate без party повертає "—"', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: fakeId(), fullName: 'Петро' });
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId() });
        const mockBallot = {
            createdAt: new Date(),
            candidate: { name: 'Безпартійний', party: undefined },
        };
        Ballot.findOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockBallot),
        });

        const { req, res, next } = buildMocks({}, {}, { voterId: 'STUD-003', pollId: fakeId() });

        await checkVoteStatus(req, res, next);

        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.votedFor.party).toBe('—');
    });

    it('400 — CastError', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        const castErr = new Error();
        castErr.name = 'CastError';
        Voter.findOne = jest.fn().mockRejectedValue(castErr);

        const { req, res, next } = buildMocks({}, {}, { voterId: 'X', pollId: 'bad' });

        await checkVoteStatus(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невалідний формат ID.' });
    });

    // ДОДАНИЙ ТЕСТ: перевірка на іншу (не CastError) помилку
    it('next(error) — інший виняток', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockRejectedValue(new Error('Unexpected db error'));

        const { req, res, next } = buildMocks({}, {}, { voterId: 'X', pollId: fakeId() });

        await checkVoteStatus(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. getPollResults
// ─────────────────────────────────────────────────────────────────────────────
describe('getPollResults', () => {
    beforeEach(() => jest.clearAllMocks());

    it('404 — опитування не знайдено', async () => {
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await getPollResults(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування не знайдено.' });
    });

    it('200 — результати з голосами', async () => {
        const mockPoll = {
            _id: fakeId(),
            title: 'Election',
            status: 'closed',
            createdAt: new Date(),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        const mockCandidates = [
            { name: 'A', party: 'PA', votesCount: 60 },
            { name: 'B', party: 'PB', votesCount: 40 },
        ];
        Candidate.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockCandidates),
            }),
        });

        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await getPollResults(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.totalVotes).toBe(100);
        expect(jsonArg.results[0].percentage).toBe('60.00%');
        expect(jsonArg.results[1].percentage).toBe('40.00%');
    });

    it('200 — результати без голосів (0 голосів)', async () => {
        const mockPoll = {
            _id: fakeId(),
            title: 'New Poll',
            status: 'active',
            createdAt: new Date(),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        const mockCandidates = [
            { name: 'A', party: null, votesCount: 0 },
            { name: 'B', party: null, votesCount: 0 },
        ];
        Candidate.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockCandidates),
            }),
        });

        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await getPollResults(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.totalVotes).toBe(0);
        expect(jsonArg.results[0].party).toBe('—');
        expect(jsonArg.results[0].percentage).toBe('0.00%');
    });

    it('400 — CastError', async () => {
        const castErr = new Error();
        castErr.name = 'CastError';
        Poll.findById = jest.fn().mockRejectedValue(castErr);
        const { req, res, next } = buildMocks({}, { pollId: 'bad' });

        await getPollResults(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невалідний формат ID опитування.' });
    });

    it('next(error) — інший виняток', async () => {
        Poll.findById = jest.fn().mockRejectedValue(new Error('Unexpected'));
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await getPollResults(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. deleteVote
// ─────────────────────────────────────────────────────────────────────────────
describe('deleteVote', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — відсутні обов\'язкові поля', async () => {
        validateDeleteVoteFields.mockReturnValue({
            valid: false,
            error: 'Потрібні voterId та pollId',
        });
        const { req, res, next } = buildMocks({ voterId: '', pollId: '' });

        await deleteVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Потрібні voterId та pollId' });
    });

    it('404 — виборець не знайдений', async () => {
        validateDeleteVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue(null);

        const { req, res, next } = buildMocks({ voterId: 'UNKNOWN', pollId: fakeId() });

        await deleteVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Виборця не знайдено.' });
    });

    it('404 — опитування не знайдено', async () => {
        validateDeleteVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: fakeId(), fullName: 'Іван' });
        Poll.findById = jest.fn().mockResolvedValue(null);

        const { req, res, next } = buildMocks({ voterId: 'STUD-001', pollId: fakeId() });

        await deleteVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування не знайдено.' });
    });

    it('400 — опитування вже закрито (не можна скасувати голос)', async () => {
        validateDeleteVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: fakeId(), fullName: 'Іван' });
        const mockPoll = { _id: fakeId(), title: 'Closed', status: 'closed' };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        validatePollIsActive.mockReturnValue({ valid: false, error: 'Опитування закрите' });

        const { req, res, next } = buildMocks({ voterId: 'STUD-001', pollId: fakeId() });

        await deleteVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('завершено') }),
        );
    });

    it('404 — бюлетень не знайдено (виборець не голосував)', async () => {
        validateDeleteVoteFields.mockReturnValue({ valid: true });
        const mockVoter = { _id: fakeId(), fullName: 'Іван', voterId: 'STUD-001' };
        Voter.findOne = jest.fn().mockResolvedValue(mockVoter);
        const mockPoll = { _id: fakeId(), title: 'Active', status: 'active' };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        validatePollIsActive.mockReturnValue({ valid: true });
        Ballot.findOne = jest.fn().mockResolvedValue(null);

        const { req, res, next } = buildMocks({ voterId: 'STUD-001', pollId: fakeId() });

        await deleteVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('не голосував') }),
        );
    });

    it('200 — голос успішно скасовано', async () => {
        validateDeleteVoteFields.mockReturnValue({ valid: true });
        const mockVoter = { _id: fakeId(), fullName: 'Іван', voterId: 'STUD-001' };
        Voter.findOne = jest.fn().mockResolvedValue(mockVoter);
        const mockPoll = { _id: fakeId(), title: 'Active Poll', status: 'active' };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        validatePollIsActive.mockReturnValue({ valid: true });
        const mockBallot = { _id: fakeId(), candidate: fakeId() };
        Ballot.findOne = jest.fn().mockResolvedValue(mockBallot);
        Candidate.findByIdAndUpdate = jest.fn().mockResolvedValue(true);
        Ballot.findByIdAndDelete = jest.fn().mockResolvedValue(true);

        const { req, res, next } = buildMocks({ voterId: 'STUD-001', pollId: fakeId() });

        await deleteVote(req, res, next);

        expect(Candidate.findByIdAndUpdate).toHaveBeenCalledWith(mockBallot.candidate, {
            $inc: { votesCount: -1 },
        });
        expect(Ballot.findByIdAndDelete).toHaveBeenCalledWith(mockBallot._id);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('скасовано'),
                cancelled: expect.objectContaining({ voterId: 'STUD-001' }),
            }),
        );
    });

    it('400 — CastError', async () => {
        validateDeleteVoteFields.mockReturnValue({ valid: true });
        const castErr = new Error();
        castErr.name = 'CastError';
        Voter.findOne = jest.fn().mockRejectedValue(castErr);

        const { req, res, next } = buildMocks({ voterId: 'X', pollId: 'bad' });

        await deleteVote(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невалідний формат ID.' });
    });

    it('next(error) — інший виняток', async () => {
        validateDeleteVoteFields.mockReturnValue({ valid: true });
        Voter.findOne = jest.fn().mockRejectedValue(new Error('Unexpected'));

        const { req, res, next } = buildMocks({ voterId: 'STUD-001', pollId: fakeId() });

        await deleteVote(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

/**
 * Тести для votes.controller.js (оновлений — voterId з req.user)
 */

jest.mock('../models/ballot.model');
jest.mock('../models/candidate.model');
jest.mock('../models/voter.model');
jest.mock('../models/poll.model');
jest.mock('../helpers/vote.helpers', () => ({
    validateVoteStatusQuery: jest.fn(),
    validateCandidateBelongsToPoll: jest.fn(),
    validatePollIsActive: jest.fn(),
}));

const Ballot = require('../models/ballot.model');
const Candidate = require('../models/candidate.model');
const Voter = require('../models/voter.model');
const Poll = require('../models/poll.model');
const {
    validateVoteStatusQuery,
    validateCandidateBelongsToPoll,
    validatePollIsActive,
} = require('../helpers/vote.helpers');

const {
    castVote,
    checkVoteStatus,
    getPollResults,
    deleteVote,
} = require('../controllers/votes.controller');

const fakeId = () => '507f1f77bcf86cd799439011';

const buildMocks = (body = {}, params = {}, query = {}, user = { voterId: 'VOTER-1' }) => {
    const req = { body, params, query, user };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
};

afterAll(() => jest.clearAllMocks());

// ─── castVote ─────────────────────────────────────────────────────────────────
describe('castVote', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — відсутні pollId або candidateId', async () => {
        const { req, res, next } = buildMocks({ pollId: '', candidateId: '' });
        await castVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 — виборець не знайдений', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId(), candidateId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue(null);
        await castVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.any(String) }),
        );
    });

    it('404 — опитування не знайдено', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId(), candidateId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        Poll.findById = jest.fn().mockResolvedValue(null);
        await castVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 — опитування закрите', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId(), candidateId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        Poll.findById = jest.fn().mockResolvedValue({ _id: 'pid', status: 'closed', title: 'T' });
        validatePollIsActive.mockReturnValue({ valid: false, error: 'Закрите' });
        await castVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 — кандидат не знайдений', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId(), candidateId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        Poll.findById = jest.fn().mockResolvedValue({ _id: 'pid', status: 'active', title: 'T' });
        validatePollIsActive.mockReturnValue({ valid: true });
        Candidate.findById = jest.fn().mockResolvedValue(null);
        await castVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 — кандидат не належить до опитування', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId(), candidateId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        const poll = { _id: 'pid', status: 'active', title: 'T' };
        Poll.findById = jest.fn().mockResolvedValue(poll);
        validatePollIsActive.mockReturnValue({ valid: true });
        const candidate = { _id: 'cid', name: 'C', poll: 'other' };
        Candidate.findById = jest.fn().mockResolvedValue(candidate);
        validateCandidateBelongsToPoll.mockReturnValue({ valid: false, error: 'Не той кандидат' });
        await castVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('409 — повторне голосування', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId(), candidateId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        const poll = { _id: 'pid', status: 'active', title: 'T' };
        Poll.findById = jest.fn().mockResolvedValue(poll);
        validatePollIsActive.mockReturnValue({ valid: true });
        const candidate = { _id: 'cid', name: 'C', poll: 'pid' };
        Candidate.findById = jest.fn().mockResolvedValue(candidate);
        validateCandidateBelongsToPoll.mockReturnValue({ valid: true });
        Ballot.findOne = jest.fn().mockResolvedValue({ _id: 'bid' });
        await castVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('201 — успішне голосування', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId(), candidateId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        const poll = { _id: 'pid', status: 'active', title: 'Poll1' };
        Poll.findById = jest.fn().mockResolvedValue(poll);
        validatePollIsActive.mockReturnValue({ valid: true });
        const candidate = { _id: 'cid', name: 'Candidate1', poll: 'pid' };
        Candidate.findById = jest.fn().mockResolvedValue(candidate);
        validateCandidateBelongsToPoll.mockReturnValue({ valid: true });
        Ballot.findOne = jest.fn().mockResolvedValue(null);
        Ballot.create = jest.fn().mockResolvedValue({ _id: 'ballotId', createdAt: new Date() });
        Candidate.findByIdAndUpdate = jest.fn().mockResolvedValue({});
        await castVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Candidate1') }),
        );
    });

    it('409 — duplicate key error (code 11000)', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId(), candidateId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        const poll = { _id: 'pid', status: 'active', title: 'Poll1' };
        Poll.findById = jest.fn().mockResolvedValue(poll);
        validatePollIsActive.mockReturnValue({ valid: true });
        const candidate = { _id: 'cid', name: 'Candidate1', poll: 'pid' };
        Candidate.findById = jest.fn().mockResolvedValue(candidate);
        validateCandidateBelongsToPoll.mockReturnValue({ valid: true });
        Ballot.findOne = jest.fn().mockResolvedValue(null);
        const dupError = new Error('dup key');
        dupError.code = 11000;
        Ballot.create = jest.fn().mockRejectedValue(dupError);
        await castVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('400 — CastError в castVote', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId(), candidateId: fakeId() });
        const castError = new Error('cast');
        castError.name = 'CastError';
        Voter.findOne = jest.fn().mockRejectedValue(castError);
        await castVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('next(error) — на DB помилку', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId(), candidateId: fakeId() });
        Voter.findOne = jest.fn().mockRejectedValue(new Error('db fail'));
        await castVote(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─── checkVoteStatus ──────────────────────────────────────────────────────────
describe('checkVoteStatus', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — невалідний query', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: false, error: 'Помилка' });
        const { req, res, next } = buildMocks({}, {}, { voterId: '', pollId: '' });
        await checkVoteStatus(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 — виборець не знайдений', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        const { req, res, next } = buildMocks({}, {}, { voterId: 'X', pollId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue(null);
        await checkVoteStatus(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('404 — опитування не знайдено в checkVoteStatus', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        const { req, res, next } = buildMocks({}, {}, { voterId: 'VOTER-1', pollId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        Poll.findById = jest.fn().mockResolvedValue(null);
        await checkVoteStatus(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('200 hasVoted=false', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        const { req, res, next } = buildMocks({}, {}, { voterId: 'VOTER-1', pollId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid', fullName: 'Test' });
        Poll.findById = jest.fn().mockResolvedValue({ _id: 'pid', title: 'T' });
        const populateMock = jest.fn().mockResolvedValue(null);
        Ballot.findOne = jest.fn().mockReturnValue({ populate: populateMock });
        await checkVoteStatus(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hasVoted: false }));
    });

    it('200 hasVoted=true', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        const { req, res, next } = buildMocks({}, {}, { voterId: 'VOTER-1', pollId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid', fullName: 'Test' });
        Poll.findById = jest.fn().mockResolvedValue({ _id: 'pid', title: 'T' });
        const populateMock = jest
            .fn()
            .mockResolvedValue({ candidate: { name: 'C', party: 'P' }, createdAt: new Date() });
        Ballot.findOne = jest.fn().mockReturnValue({ populate: populateMock });
        await checkVoteStatus(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hasVoted: true }));
    });

    it('400 — CastError в checkVoteStatus', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        const { req, res, next } = buildMocks({}, {}, { voterId: 'VOTER-1', pollId: 'bad' });
        const castError = new Error('cast');
        castError.name = 'CastError';
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        Poll.findById = jest.fn().mockRejectedValue(castError);
        await checkVoteStatus(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('next(error) — неочікувана помилка в checkVoteStatus', async () => {
        validateVoteStatusQuery.mockReturnValue({ valid: true });
        const { req, res, next } = buildMocks({}, {}, { voterId: 'VOTER-1', pollId: fakeId() });
        Voter.findOne = jest.fn().mockRejectedValue(new Error('db crash'));
        await checkVoteStatus(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─── getPollResults ───────────────────────────────────────────────────────────
describe('getPollResults', () => {
    beforeEach(() => jest.clearAllMocks());

    it('404 — опитування не знайдено', async () => {
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await getPollResults(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('200 — повертає результати', async () => {
        Poll.findById = jest
            .fn()
            .mockResolvedValue({ _id: 'pid', title: 'T', status: 'active', createdAt: new Date() });
        const sortMock = jest.fn().mockResolvedValue([
            { _id: 'c1', name: 'A', party: 'PA', votesCount: 5 },
            { _id: 'c2', name: 'B', party: 'PB', votesCount: 3 },
        ]);
        const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
        Candidate.find = jest.fn().mockReturnValue({ select: selectMock });
        const { req, res, next } = buildMocks({}, { pollId: 'pid' });
        await getPollResults(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        const resp = res.json.mock.calls[0][0];
        expect(resp.totalVotes).toBe(8);
        expect(resp.results).toHaveLength(2);
        expect(resp.results[0].percentage).toBe('62.50%');
    });

    it('200 — нуль голосів (всі 0.00%)', async () => {
        Poll.findById = jest
            .fn()
            .mockResolvedValue({ _id: 'pid', title: 'T', status: 'active', createdAt: new Date() });
        const sortMock = jest
            .fn()
            .mockResolvedValue([{ _id: 'c1', name: 'A', party: 'PA', votesCount: 0 }]);
        const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
        Candidate.find = jest.fn().mockReturnValue({ select: selectMock });
        const { req, res, next } = buildMocks({}, { pollId: 'pid' });
        await getPollResults(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        const resp = res.json.mock.calls[0][0];
        expect(resp.results[0].percentage).toBe('0.00%');
    });

    it('400 — CastError в getPollResults', async () => {
        Poll.findById = jest.fn().mockRejectedValue({ name: 'CastError' });
        const { req, res, next } = buildMocks({}, { pollId: 'bad' });
        await getPollResults(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('next(error) — неочікувана помилка в getPollResults', async () => {
        Poll.findById = jest.fn().mockRejectedValue(new Error('db crash'));
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await getPollResults(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─── deleteVote ───────────────────────────────────────────────────────────────
describe('deleteVote', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — відсутній pollId', async () => {
        const { req, res, next } = buildMocks({ pollId: '' });
        await deleteVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 — виборець не знайдений', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue(null);
        await deleteVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('404 — опитування не знайдено в deleteVote', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        Poll.findById = jest.fn().mockResolvedValue(null);
        await deleteVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 — опитування закрите', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        Poll.findById = jest.fn().mockResolvedValue({ _id: 'pid', status: 'closed', title: 'T' });
        validatePollIsActive.mockReturnValue({ valid: false, error: 'Закрите' });
        await deleteVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 — бюлетень не знайдено', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid' });
        Poll.findById = jest.fn().mockResolvedValue({ _id: 'pid', status: 'active', title: 'T' });
        validatePollIsActive.mockReturnValue({ valid: true });
        Ballot.findOne = jest.fn().mockResolvedValue(null);
        await deleteVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('200 — успішне скасування', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId() });
        Voter.findOne = jest.fn().mockResolvedValue({ _id: 'vid', voterId: 'VOTER-1' });
        Poll.findById = jest
            .fn()
            .mockResolvedValue({ _id: 'pid', status: 'active', title: 'Poll' });
        validatePollIsActive.mockReturnValue({ valid: true });
        Ballot.findOne = jest.fn().mockResolvedValue({ _id: 'bid', candidate: 'cid' });
        Candidate.findByIdAndUpdate = jest.fn().mockResolvedValue({});
        Ballot.findByIdAndDelete = jest.fn().mockResolvedValue({});
        await deleteVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 — CastError в deleteVote', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId() });
        const castError = new Error('cast');
        castError.name = 'CastError';
        Voter.findOne = jest.fn().mockRejectedValue(castError);
        await deleteVote(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('next(error) — неочікувана помилка в deleteVote', async () => {
        const { req, res, next } = buildMocks({ pollId: fakeId() });
        Voter.findOne = jest.fn().mockRejectedValue(new Error('db crash'));
        await deleteVote(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─── getPollResults party branch ──────────────────────────────────────────────
describe('getPollResults party branch', () => {
    beforeEach(() => jest.clearAllMocks());

    it('200 — кандидат без партії отримує "—"', async () => {
        Poll.findById = jest
            .fn()
            .mockResolvedValue({ _id: 'pid', title: 'T', status: 'active', createdAt: new Date() });
        const sortMock = jest
            .fn()
            .mockResolvedValue([{ _id: 'c1', name: 'A', party: undefined, votesCount: 2 }]);
        const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
        Candidate.find = jest.fn().mockReturnValue({ select: selectMock });
        const { req, res, next } = buildMocks({}, { pollId: 'pid' });
        await getPollResults(req, res, next);
        const resp = res.json.mock.calls[0][0];
        expect(resp.results[0].party).toBe('—');
    });
});

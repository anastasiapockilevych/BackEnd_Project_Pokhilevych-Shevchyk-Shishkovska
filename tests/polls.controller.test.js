/**
 * Тести для polls.controller.js
 */

jest.mock('../models/poll.model');
jest.mock('../models/candidate.model');
jest.mock('../models/ballot.model');

jest.mock('../helpers/poll.helpers', () => ({
    validatePollTitle: jest.fn(),
    validatePollCategory: jest.fn(),
    validateCandidatesList: jest.fn(),
    validateCandidateName: jest.fn(),
    validateStatusFilter: jest.fn(),
    validateCategoryFilter: jest.fn(),
}));

const Poll = require('../models/poll.model');
const Candidate = require('../models/candidate.model');
const Ballot = require('../models/ballot.model');
const {
    validatePollTitle,
    validatePollCategory,
    validateCandidatesList,
    validateCandidateName,
    validateStatusFilter,
    validateCategoryFilter,
} = require('../helpers/poll.helpers');

const {
    createPoll,
    getAllPolls,
    getPollById,
    addCandidate,
    closePoll,
    deletePoll,
} = require('../controllers/polls.controller');

const buildMocks = (body = {}, params = {}, query = {}) => {
    const req = { body, params, query };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
};

const fakeId = () => '507f1f77bcf86cd799439011';

afterAll(async () => {
    jest.clearAllMocks();
});

// --- createPoll ---
// --- createPoll ---
describe('createPoll', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — невалідний title', async () => {
        validatePollTitle.mockReturnValue({ valid: false, error: 'Помилка title' });
        const { req, res, next } = buildMocks({ title: '', category: 'president' });
        await createPoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 — невалідна category', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: false, error: 'Помилка category' });
        const { req, res, next } = buildMocks({ title: 'Valid Title', category: 'wrong' });
        await createPoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('409 — опитування вже існує', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockResolvedValue({ title: 'Existing' });
        const { req, res, next } = buildMocks({ title: 'Existing', category: 'president' });
        await createPoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('400 — невалідні кандидати', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockResolvedValue(null);
        validateCandidatesList.mockReturnValue({ valid: false, error: 'Мало кандидатів' });
        const { req, res, next } = buildMocks({
            title: 'New',
            category: 'president',
            candidates: [{ name: 'One' }],
        });
        await createPoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('201 — успішно створено (без кандидатів)', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockResolvedValue(null);
        Poll.create = jest
            .fn()
            .mockResolvedValue({ _id: fakeId(), title: 'New', status: 'active' });
        const { req, res, next } = buildMocks({ title: 'New', category: 'president' });
        await createPoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('201 — успішно створено (з порожнім масивом кандидатів)', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockResolvedValue(null);
        validateCandidatesList.mockReturnValue({ valid: true });
        Poll.create = jest
            .fn()
            .mockResolvedValue({ _id: fakeId(), title: 'New', status: 'active' });
        const { req, res, next } = buildMocks({
            title: 'New',
            category: 'president',
            candidates: [],
        });
        await createPoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('201 — успішно створено (з кандидатами, партією та описом)', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockResolvedValue(null);
        validateCandidatesList.mockReturnValue({ valid: true });
        Poll.create = jest.fn().mockResolvedValue({ _id: fakeId(), title: 'New' });

        Candidate.insertMany = jest
            .fn()
            .mockResolvedValue([{ name: 'A', party: 'Party A' }, { name: 'B' }]);

        const { req, res, next } = buildMocks({
            title: 'New',
            category: 'president',
            description: '  Test Description  ',
            candidates: [{ name: 'A', party: '  Party A  ' }, { name: 'B' }],
        });
        await createPoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    // ОЦЕЙ ТЕСТ ЗАКРИВАЄ РЯДОК 66
    it('next(error) — виняток (закриває рядок 66)', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockRejectedValue(new Error('DB error'));
        const { req, res, next } = buildMocks({ title: 'Valid', category: 'president' });
        await createPoll(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
// --- getAllPolls ---
describe('getAllPolls', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — невалідний status', async () => {
        validateStatusFilter.mockReturnValue({ valid: false, error: 'err' });
        const { req, res, next } = buildMocks({}, {}, { status: 'wrong' });
        await getAllPolls(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 — невалідна category (wrong)', async () => {
        validateStatusFilter.mockReturnValue({ valid: true });
        validateCategoryFilter.mockReturnValue({ valid: false, error: 'err' });
        const { req, res, next } = buildMocks({}, {}, { status: 'active', category: 'wrong' });
        await getAllPolls(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 — невалідна category (write)', async () => {
        validateStatusFilter.mockReturnValue({ valid: true });
        validateCategoryFilter.mockReturnValue({ valid: false, error: 'err' });
        const { req, res, next } = buildMocks({}, {}, { status: 'active', category: 'write' });
        await getAllPolls(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 — невалідна category (correct)', async () => {
        validateStatusFilter.mockReturnValue({ valid: true });
        validateCategoryFilter.mockReturnValue({ valid: false, error: 'err' });
        const { req, res, next } = buildMocks({}, {}, { status: 'active', category: 'correct' });
        await getAllPolls(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('200 — всі опитування', async () => {
        Poll.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
        const { req, res, next } = buildMocks({}, {}, {});
        await getAllPolls(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('200 — з фільтром status', async () => {
        validateStatusFilter.mockReturnValue({ valid: true });
        Poll.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
        const { req, res, next } = buildMocks({}, {}, { status: 'active' });
        await getAllPolls(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('200 — з фільтром category', async () => {
        validateCategoryFilter.mockReturnValue({ valid: true });
        Poll.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
        const { req, res, next } = buildMocks({}, {}, { category: 'president' });
        await getAllPolls(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('next(error) — виняток (закриває рядок 89)', async () => {
        Poll.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockImplementation(async () => {
                throw new Error('Safe DB Error');
            }),
        });
        const { req, res, next } = buildMocks({}, {}, {});
        await getAllPolls(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// --- getPollById ---
describe('getPollById', () => {
    beforeEach(() => jest.clearAllMocks());

    it('404 — не знайдено', async () => {
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await getPollById(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 — CastError', async () => {
        const err = new Error();
        err.name = 'CastError';
        Poll.findById = jest.fn().mockRejectedValue(err);
        const { req, res, next } = buildMocks({}, { pollId: 'bad' });
        await getPollById(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('200 — успішно', async () => {
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), title: 'Test' });
        Candidate.find = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await getPollById(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('next(error) — інший виняток', async () => {
        Poll.findById = jest.fn().mockRejectedValue(new Error('Unexpected'));
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await getPollById(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// --- addCandidate ---
describe('addCandidate', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — невалідне ім\'я', async () => {
        validateCandidateName.mockReturnValue({ valid: false, error: 'err' });
        const { req, res, next } = buildMocks({ name: '' }, { pollId: fakeId() });
        await addCandidate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 — не знайдено', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({ name: 'A' }, { pollId: fakeId() });
        await addCandidate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 — опитування закрите', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'closed' });
        const { req, res, next } = buildMocks({ name: 'A' }, { pollId: fakeId() });
        await addCandidate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('409 — вже є', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'active' });
        Candidate.findOne = jest.fn().mockResolvedValue({ name: 'A' });
        const { req, res, next } = buildMocks({ name: 'A' }, { pollId: fakeId() });
        await addCandidate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    // ТЕСТ ЯКИЙ ЗАКРИВАЄ 154 РЯДОК (передаємо party)
    it('201 — успішно (з партією)', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'active' });
        Candidate.findOne = jest.fn().mockResolvedValue(null);
        Candidate.create = jest.fn().mockResolvedValue({ name: 'A', party: 'Party A' });

        const { req, res, next } = buildMocks(
            { name: 'A', party: '  Party A  ' },
            { pollId: fakeId() },
        ); // Відпрацьовує party.trim()
        await addCandidate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('201 — успішно (без партії)', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'active' });
        Candidate.findOne = jest.fn().mockResolvedValue(null);
        Candidate.create = jest.fn().mockResolvedValue({ name: 'A' });

        const { req, res, next } = buildMocks({ name: 'A' }, { pollId: fakeId() });
        await addCandidate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('400 — CastError', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        const err = new Error();
        err.name = 'CastError';
        Poll.findById = jest.fn().mockRejectedValue(err);
        const { req, res, next } = buildMocks({ name: 'A' }, { pollId: 'bad' });
        await addCandidate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('next(error) — інший виняток', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockRejectedValue(new Error('Unexpected'));
        const { req, res, next } = buildMocks({ name: 'A' }, { pollId: fakeId() });
        await addCandidate(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// --- closePoll ---
describe('closePoll', () => {
    beforeEach(() => jest.clearAllMocks());

    it('404 — не знайдено', async () => {
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await closePoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 — вже закрито', async () => {
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'closed' });
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await closePoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('200 — успішно закрито', async () => {
        const mockPoll = {
            _id: fakeId(),
            status: 'active',
            save: jest.fn().mockResolvedValue(true),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await closePoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 — CastError', async () => {
        const err = new Error();
        err.name = 'CastError';
        Poll.findById = jest.fn().mockRejectedValue(err);
        const { req, res, next } = buildMocks({}, { pollId: 'bad' });
        await closePoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('next(error) — інший виняток', async () => {
        Poll.findById = jest.fn().mockRejectedValue(new Error('Unexpected'));
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await closePoll(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// --- deletePoll ---
describe('deletePoll', () => {
    beforeEach(() => jest.clearAllMocks());

    it('404 — не знайдено', async () => {
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await deletePoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 — неможливо видалити активне', async () => {
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'active' });
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await deletePoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('200 — успішно видалено', async () => {
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'closed' });
        Candidate.find = jest.fn().mockReturnValue({ distinct: jest.fn().mockResolvedValue([]) });
        Ballot.deleteMany = jest.fn().mockResolvedValue({});
        Candidate.deleteMany = jest.fn().mockResolvedValue({});
        Poll.findByIdAndDelete = jest.fn().mockResolvedValue(true);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await deletePoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 — CastError', async () => {
        const err = new Error();
        err.name = 'CastError';
        Poll.findById = jest.fn().mockRejectedValue(err);
        const { req, res, next } = buildMocks({}, { pollId: 'bad' });
        await deletePoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('next(error) — інший виняток', async () => {
        Poll.findById = jest.fn().mockRejectedValue(new Error('Unexpected'));
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });
        await deletePoll(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

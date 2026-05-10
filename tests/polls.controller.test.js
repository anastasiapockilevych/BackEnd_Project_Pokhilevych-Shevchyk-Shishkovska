/**
 * Тести для polls.controller.js
 * Покриття: усі if/else розгалуження кожного ендпоінту.
 *
 * Стратегія: юніт-тести з мок-об'єктами (без реального MongoDB).
 * Кожен тест ізольовано перевіряє одну умову.
 */

// ─── Мок моделей ───────────────────────────────────────────────────────────
jest.mock('../models/poll.model');
jest.mock('../models/candidate.model');
jest.mock('../models/ballot.model');

// ─── Мок хелперів ──────────────────────────────────────────────────────────
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

// ─── Утиліти для тестів ────────────────────────────────────────────────────

/**
 * Будує мок req/res/next для тестування Express-контролерів.
 */
const buildMocks = (body = {}, params = {}, query = {}) => {
    const req = { body, params, query };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
};

/** Допоміжна: повертає ObjectId-подібний рядок */
const fakeId = () => '507f1f77bcf86cd799439011';

// ─────────────────────────────────────────────────────────────────────────────
// 1. createPoll
// ─────────────────────────────────────────────────────────────────────────────
describe('createPoll', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — невалідний title', async () => {
        validatePollTitle.mockReturnValue({ valid: false, error: 'Помилка title' });
        const { req, res, next } = buildMocks({ title: '', category: 'president' });

        await createPoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Помилка title' });
    });

    it('400 — невалідна category', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: false, error: 'Помилка category' });
        const { req, res, next } = buildMocks({ title: 'Valid Title', category: 'wrong' });

        await createPoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Помилка category' });
    });

    it('409 — опитування з такою назвою вже існує', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockResolvedValue({ title: 'Existing' });

        const { req, res, next } = buildMocks({
            title: 'Existing',
            category: 'president',
        });

        await createPoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('вже існує') })
        );
    });

    it('400 — кандидати передані, але невалідні', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockResolvedValue(null);
        validateCandidatesList.mockReturnValue({ valid: false, error: 'Мало кандидатів' });

        const { req, res, next } = buildMocks({
            title: 'New Poll',
            category: 'president',
            candidates: [{ name: 'Only One' }],
        });

        await createPoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Мало кандидатів' });
    });

    it('201 — опитування без кандидатів успішно створено', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockResolvedValue(null);
        const mockPoll = { _id: fakeId(), title: 'New Poll', status: 'active' };
        Poll.create = jest.fn().mockResolvedValue(mockPoll);

        const { req, res, next } = buildMocks({ title: 'New Poll', category: 'president' });

        await createPoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('успішно'),
                poll: mockPoll,
                candidates: [],
            })
        );
    });

    it('201 — опитування з кандидатами успішно створено', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockResolvedValue(null);
        validateCandidatesList.mockReturnValue({ valid: true });
        const mockPoll = { _id: fakeId(), title: 'Poll With Candidates' };
        Poll.create = jest.fn().mockResolvedValue(mockPoll);
        const mockCandidates = [{ name: 'A' }, { name: 'B' }];
        Candidate.insertMany = jest.fn().mockResolvedValue(mockCandidates);

        const { req, res, next } = buildMocks({
            title: 'Poll With Candidates',
            category: 'president',
            candidates: [
                { name: 'Candidate A', party: 'Party A' },
                { name: 'Candidate B' },
            ],
        });

        await createPoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ candidates: mockCandidates })
        );
    });

    it('next(error) — виняток у Poll.create', async () => {
        validatePollTitle.mockReturnValue({ valid: true });
        validatePollCategory.mockReturnValue({ valid: true });
        Poll.findOne = jest.fn().mockResolvedValue(null);
        Poll.create = jest.fn().mockRejectedValue(new Error('DB error'));

        const { req, res, next } = buildMocks({ title: 'Valid Title', category: 'president' });

        await createPoll(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. getAllPolls
// ─────────────────────────────────────────────────────────────────────────────
describe('getAllPolls', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — невалідний status фільтр', async () => {
        validateStatusFilter.mockReturnValue({ valid: false, error: 'Невірний статус' });
        const { req, res, next } = buildMocks({}, {}, { status: 'wrong' });

        await getAllPolls(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невірний статус' });
    });

    it('400 — невалідний category фільтр', async () => {
        validateStatusFilter.mockReturnValue({ valid: true });
        validateCategoryFilter.mockReturnValue({ valid: false, error: 'Невірна категорія' });
        const { req, res, next } = buildMocks({}, {}, { status: 'active', category: 'wrong' });

        await getAllPolls(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невірна категорія' });
    });

    it('200 — повертає всі опитування без фільтрів', async () => {
        const mockPolls = [{ title: 'Poll 1' }, { title: 'Poll 2' }];
        Poll.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(mockPolls) });

        const { req, res, next } = buildMocks({}, {}, {});

        await getAllPolls(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockPolls);
    });

    it('200 — повертає опитування з фільтром status', async () => {
        validateStatusFilter.mockReturnValue({ valid: true });
        const mockPolls = [{ title: 'Active Poll', status: 'active' }];
        Poll.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(mockPolls) });

        const { req, res, next } = buildMocks({}, {}, { status: 'active' });

        await getAllPolls(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(Poll.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    });

    it('next(error) — виняток у Poll.find', async () => {
        Poll.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockRejectedValue(new Error('DB error')),
        });

        const { req, res, next } = buildMocks({}, {}, {});

        await getAllPolls(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. getPollById
// ─────────────────────────────────────────────────────────────────────────────
describe('getPollById', () => {
    beforeEach(() => jest.clearAllMocks());

    it('404 — опитування не знайдено', async () => {
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await getPollById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування не знайдено.' });
    });

    it('400 — CastError при невалідному ID', async () => {
        Poll.findById = jest.fn().mockRejectedValue({ name: 'CastError' });
        const { req, res, next } = buildMocks({}, { pollId: 'bad-id' });

        await getPollById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невалідний формат ID опитування.' });
    });

    it('200 — успішно повертає опитування з кандидатами', async () => {
        const mockPoll = { _id: fakeId(), title: 'Test Poll' };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        const mockCandidates = [{ name: 'A', party: 'B', votesCount: 5 }];
        Candidate.find = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockCandidates),
        });

        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await getPollById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ poll: mockPoll, candidates: mockCandidates });
    });

    it('next(error) — інший виняток', async () => {
        Poll.findById = jest.fn().mockRejectedValue(new Error('Unexpected'));
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await getPollById(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. addCandidate
// ─────────────────────────────────────────────────────────────────────────────
describe('addCandidate', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — невалідне ім\'я кандидата', async () => {
        validateCandidateName.mockReturnValue({ valid: false, error: 'Ім\'я обов\'язкове' });
        const { req, res, next } = buildMocks({ name: '' }, { pollId: fakeId() });

        await addCandidate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Ім\'я обов\'язкове' });
    });

    it('404 — опитування не знайдено', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockResolvedValue(null);

        const { req, res, next } = buildMocks({ name: 'New Candidate' }, { pollId: fakeId() });

        await addCandidate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування не знайдено.' });
    });

    it('400 — опитування закрите', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'closed' });

        const { req, res, next } = buildMocks({ name: 'New Candidate' }, { pollId: fakeId() });

        await addCandidate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('завершеного') })
        );
    });

    it('409 — кандидат з таким іменем вже є', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'active' });
        Candidate.findOne = jest.fn().mockResolvedValue({ name: 'Existing' });

        const { req, res, next } = buildMocks({ name: 'Existing' }, { pollId: fakeId() });

        await addCandidate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('вже зареєстрований') })
        );
    });

    it('201 — кандидата успішно додано (з партією)', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'active' });
        Candidate.findOne = jest.fn().mockResolvedValue(null);
        const mockCandidate = { name: 'New Candidate', party: 'Some Party' };
        Candidate.create = jest.fn().mockResolvedValue(mockCandidate);

        const { req, res, next } = buildMocks(
            { name: 'New Candidate', party: 'Some Party' },
            { pollId: fakeId() }
        );

        await addCandidate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('успішно'),
                candidate: mockCandidate,
            })
        );
    });

    it('201 — кандидата успішно додано (без партії)', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'active' });
        Candidate.findOne = jest.fn().mockResolvedValue(null);
        const mockCandidate = { name: 'No Party Candidate' };
        Candidate.create = jest.fn().mockResolvedValue(mockCandidate);

        const { req, res, next } = buildMocks(
            { name: 'No Party Candidate' },
            { pollId: fakeId() }
        );

        await addCandidate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(Candidate.create).toHaveBeenCalledWith(
            expect.objectContaining({ party: undefined })
        );
    });

    it('400 — CastError', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockRejectedValue({ name: 'CastError' });

        const { req, res, next } = buildMocks({ name: 'X' }, { pollId: 'bad' });

        await addCandidate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невалідний формат ID.' });
    });

    it('next(error) — інший виняток', async () => {
        validateCandidateName.mockReturnValue({ valid: true });
        Poll.findById = jest.fn().mockRejectedValue(new Error('DB error'));

        const { req, res, next } = buildMocks({ name: 'X' }, { pollId: fakeId() });

        await addCandidate(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. closePoll
// ─────────────────────────────────────────────────────────────────────────────
describe('closePoll', () => {
    beforeEach(() => jest.clearAllMocks());

    it('404 — опитування не знайдено', async () => {
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await closePoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування не знайдено.' });
    });

    it('400 — опитування вже закрито', async () => {
        Poll.findById = jest.fn().mockResolvedValue({ _id: fakeId(), status: 'closed' });
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await closePoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування вже закрито.' });
    });

    it('200 — опитування успішно закрито', async () => {
        const mockPoll = {
            _id: fakeId(),
            status: 'active',
            title: 'Active Poll',
            save: jest.fn().mockResolvedValue(true),
        };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);

        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await closePoll(req, res, next);

        expect(mockPoll.status).toBe('closed');
        expect(mockPoll.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('закрито') })
        );
    });

    it('400 — CastError', async () => {
        Poll.findById = jest.fn().mockRejectedValue({ name: 'CastError' });
        const { req, res, next } = buildMocks({}, { pollId: 'bad' });

        await closePoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невалідний формат ID опитування.' });
    });

    it('next(error) — інший виняток', async () => {
        Poll.findById = jest.fn().mockRejectedValue(new Error('Unexpected'));
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await closePoll(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. deletePoll
// ─────────────────────────────────────────────────────────────────────────────
describe('deletePoll', () => {
    beforeEach(() => jest.clearAllMocks());

    it('404 — опитування не знайдено', async () => {
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await deletePoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування не знайдено.' });
    });

    it('400 — неможливо видалити активне опитування', async () => {
        Poll.findById = jest.fn().mockResolvedValue({
            _id: fakeId(),
            title: 'Active Poll',
            status: 'active',
        });

        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await deletePoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('активне') })
        );
    });

    it('200 — закрите опитування успішно видалено (каскадно)', async () => {
        const pollId = fakeId();
        const candidateIds = [fakeId(), fakeId()];
        Poll.findById = jest.fn().mockResolvedValue({
            _id: pollId,
            title: 'Closed Poll',
            status: 'closed',
        });
        Candidate.find = jest.fn().mockReturnValue({
            distinct: jest.fn().mockResolvedValue(candidateIds),
        });
        Ballot.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 3 });
        Candidate.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 2 });
        Poll.findByIdAndDelete = jest.fn().mockResolvedValue(true);

        const { req, res, next } = buildMocks({}, { pollId });

        await deletePoll(req, res, next);

        expect(Ballot.deleteMany).toHaveBeenCalledWith({ poll: pollId });
        expect(Candidate.deleteMany).toHaveBeenCalledWith({ poll: pollId });
        expect(Poll.findByIdAndDelete).toHaveBeenCalledWith(pollId);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                deleted: expect.objectContaining({
                    pollId,
                    candidatesRemoved: candidateIds.length,
                }),
            })
        );
    });

    it('400 — CastError', async () => {
        Poll.findById = jest.fn().mockRejectedValue({ name: 'CastError' });
        const { req, res, next } = buildMocks({}, { pollId: 'bad' });

        await deletePoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невалідний формат ID опитування.' });
    });

    it('next(error) — інший виняток', async () => {
        Poll.findById = jest.fn().mockRejectedValue(new Error('Unexpected'));
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await deletePoll(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
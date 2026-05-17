/**
 * Тести для auth.middleware.js
 * Покриття: requireAdmin та requireActivePoll — усі розгалуження.
 */

// Мок для моделі Poll — потрібен для requireActivePoll
jest.mock('../models/poll.model');
const Poll = require('../models/poll.model');

const { requireAdmin, requireActivePoll } = require('../middleware/auth.middleware');

// ─── Утиліти ───────────────────────────────────────────────────────────────
const buildMocks = (headers = {}, params = {}) => {
    const req = { headers, params };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
};

const fakeId = () => '507f1f77bcf86cd799439011';

// ─────────────────────────────────────────────────────────────────────────────
// requireAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe('requireAdmin', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = { ...originalEnv };
        jest.clearAllMocks();
    });

    it('next() — якщо ADMIN_KEY не налаштований (dev-режим)', () => {
        delete process.env.ADMIN_KEY;
        const { req, res, next } = buildMocks({});

        requireAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('401 — заголовок X-Admin-Key відсутній', () => {
        process.env.ADMIN_KEY = 'secret123';
        const { req, res, next } = buildMocks({}); // без заголовка

        requireAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('X-Admin-Key') }),
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('403 — невірний X-Admin-Key', () => {
        process.env.ADMIN_KEY = 'secret123';
        const { req, res, next } = buildMocks({ 'x-admin-key': 'wrong-key' });

        requireAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('Недійсний') }),
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('next() — вірний X-Admin-Key', () => {
        process.env.ADMIN_KEY = 'secret123';
        const { req, res, next } = buildMocks({ 'x-admin-key': 'secret123' });

        requireAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireActivePoll
// ─────────────────────────────────────────────────────────────────────────────
describe('requireActivePoll', () => {
    beforeEach(() => jest.clearAllMocks());

    it('next() — pollId відсутній у params', async () => {
        const { req, res, next } = buildMocks({}, {});

        await requireActivePoll(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('404 — опитування не знайдено', async () => {
        Poll.findById = jest.fn().mockResolvedValue(null);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await requireActivePoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Опитування не знайдено.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('400 — опитування закрите', async () => {
        Poll.findById = jest.fn().mockResolvedValue({
            _id: fakeId(),
            status: 'closed',
            title: 'Ended Poll',
        });
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await requireActivePoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('завершено') }),
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('next() — опитування активне, poll прикріплюється до req', async () => {
        const mockPoll = { _id: fakeId(), status: 'active', title: 'Active Poll' };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await requireActivePoll(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.poll).toBe(mockPoll);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('400 — CastError (невалідний ID)', async () => {
        Poll.findById = jest.fn().mockRejectedValue({ name: 'CastError' });
        const { req, res, next } = buildMocks({}, { pollId: 'bad-id' });

        await requireActivePoll(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Невалідний формат ID опитування.' });
    });

    it('next(error) — інший виняток', async () => {
        Poll.findById = jest.fn().mockRejectedValue(new Error('DB error'));
        const { req, res, next } = buildMocks({}, { pollId: fakeId() });

        await requireActivePoll(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

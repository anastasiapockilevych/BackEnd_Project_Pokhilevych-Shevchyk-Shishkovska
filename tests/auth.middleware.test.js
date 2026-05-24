/**
 * Тести для auth.middleware.js (оновлений з JWT)
 */

jest.mock('../models/user.model');
jest.mock('../models/poll.model');
jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Poll = require('../models/poll.model');
const { requireAuth, requireAdmin, requireActivePoll } = require('../middleware/auth.middleware');

const buildReq = (headers = {}, params = {}, user = null) => ({
    headers,
    params,
    user,
    poll: null,
});
const buildRes = () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    return res;
};

afterAll(() => jest.clearAllMocks());

// ─── requireAuth ──────────────────────────────────────────────────────────────
describe('requireAuth', () => {
    beforeEach(() => jest.clearAllMocks());

    it('401 — відсутній заголовок Authorization', async () => {
        const req = buildReq({});
        const res = buildRes();
        const next = jest.fn();
        await requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('401 — невірний формат (без Bearer)', async () => {
        const req = buildReq({ authorization: 'Token abc' });
        const res = buildRes();
        const next = jest.fn();
        await requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('401 — JsonWebTokenError', async () => {
        const req = buildReq({ authorization: 'Bearer bad-token' });
        const res = buildRes();
        const next = jest.fn();
        jwt.verify = jest.fn().mockImplementation(() => {
            const e = new Error('bad');
            e.name = 'JsonWebTokenError';
            throw e;
        });
        await requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('401 — TokenExpiredError', async () => {
        const req = buildReq({ authorization: 'Bearer expired' });
        const res = buildRes();
        const next = jest.fn();
        jwt.verify = jest.fn().mockImplementation(() => {
            const e = new Error('exp');
            e.name = 'TokenExpiredError';
            throw e;
        });
        await requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('401 — користувача не знайдено в базі', async () => {
        const req = buildReq({ authorization: 'Bearer good' });
        const res = buildRes();
        const next = jest.fn();
        jwt.verify = jest.fn().mockReturnValue({ id: 'uid1' });
        const selectMock = jest.fn().mockResolvedValue(null);
        User.findById = jest.fn().mockReturnValue({ select: selectMock });
        await requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('next() — валідний токен та користувач', async () => {
        const req = buildReq({ authorization: 'Bearer good' });
        const res = buildRes();
        const next = jest.fn();
        jwt.verify = jest.fn().mockReturnValue({ id: 'uid1' });
        const mockUser = { _id: 'uid1', role: 'voter', voterId: 'VOTER-1' };
        const selectMock = jest.fn().mockResolvedValue(mockUser);
        User.findById = jest.fn().mockReturnValue({ select: selectMock });
        await requireAuth(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual(mockUser);
    });
});

// ─── requireAdmin ─────────────────────────────────────────────────────────────
describe('requireAdmin', () => {
    beforeEach(() => jest.clearAllMocks());

    const OLD_ENV = process.env;
    afterEach(() => {
        process.env = { ...OLD_ENV };
    });

    it('next() — валідний X-Admin-Key', async () => {
        process.env.ADMIN_KEY = 'secret';
        const req = buildReq({ 'x-admin-key': 'secret' });
        const res = buildRes();
        const next = jest.fn();
        await requireAdmin(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('401 — немає заголовка і немає токена', async () => {
        process.env.ADMIN_KEY = 'secret';
        const req = buildReq({});
        const res = buildRes();
        const next = jest.fn();
        await requireAdmin(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('403 — токен є але роль не admin', async () => {
        process.env.ADMIN_KEY = 'secret';
        const req = buildReq({ authorization: 'Bearer tok' });
        const res = buildRes();
        const next = jest.fn();
        jwt.verify = jest.fn().mockReturnValue({ id: 'uid1' });
        const selectMock = jest.fn().mockResolvedValue({ role: 'voter' });
        User.findById = jest.fn().mockReturnValue({ select: selectMock });
        await requireAdmin(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('next() — токен з роллю admin', async () => {
        process.env.ADMIN_KEY = 'secret';
        const req = buildReq({ authorization: 'Bearer tok' });
        const res = buildRes();
        const next = jest.fn();
        jwt.verify = jest.fn().mockReturnValue({ id: 'uid1' });
        const selectMock = jest.fn().mockResolvedValue({ role: 'admin', _id: 'uid1' });
        User.findById = jest.fn().mockReturnValue({ select: selectMock });
        await requireAdmin(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});

// ─── requireActivePoll ────────────────────────────────────────────────────────
describe('requireActivePoll', () => {
    beforeEach(() => jest.clearAllMocks());

    it('next() — pollId відсутній', async () => {
        const req = buildReq({}, {});
        const res = buildRes();
        const next = jest.fn();
        await requireActivePoll(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('404 — опитування не знайдено', async () => {
        const req = buildReq({}, { pollId: 'abc' });
        const res = buildRes();
        const next = jest.fn();
        Poll.findById = jest.fn().mockResolvedValue(null);
        await requireActivePoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 — опитування закрите', async () => {
        const req = buildReq({}, { pollId: 'abc' });
        const res = buildRes();
        const next = jest.fn();
        Poll.findById = jest.fn().mockResolvedValue({ status: 'closed', title: 'Test' });
        await requireActivePoll(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('next() та req.poll — опитування активне', async () => {
        const req = buildReq({}, { pollId: 'abc' });
        const res = buildRes();
        const next = jest.fn();
        const mockPoll = { status: 'active', title: 'Test' };
        Poll.findById = jest.fn().mockResolvedValue(mockPoll);
        await requireActivePoll(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.poll).toEqual(mockPoll);
    });
});

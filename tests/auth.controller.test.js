/**
 * Тести для auth.controller.js
 */

jest.mock('../models/user.model');
jest.mock('../models/voter.model');
jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Voter = require('../models/voter.model');
const { register, login, getMe } = require('../controllers/auth.controller');

const buildMocks = (body = {}, params = {}) => {
    const req = { body, params, user: null };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
};

afterAll(() => jest.clearAllMocks());

// ─── register ─────────────────────────────────────────────────────────────────
describe('register', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — відсутні поля', async () => {
        const { req, res, next } = buildMocks({ email: '', password: '', fullName: '' });
        await register(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('409 — email вже існує', async () => {
        const { req, res, next } = buildMocks({
            email: 'a@b.com',
            password: '123456',
            fullName: 'Test',
        });
        User.findOne = jest.fn().mockResolvedValue({ _id: '1' });
        await register(req, res, next);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('201 — успішна реєстрація', async () => {
        const { req, res, next } = buildMocks({
            email: 'new@b.com',
            password: '123456',
            fullName: 'New User',
        });
        User.findOne = jest.fn().mockResolvedValue(null);
        User.create = jest.fn().mockResolvedValue({
            _id: 'uid1',
            email: 'new@b.com',
            fullName: 'New User',
            voterId: 'VOTER-123',
        });
        Voter.create = jest.fn().mockResolvedValue({});
        jwt.sign = jest.fn().mockReturnValue('fake-token');

        await register(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'fake-token' }));
    });

    it('next(error) — на помилку бази', async () => {
        const { req, res, next } = buildMocks({
            email: 'a@b.com',
            password: '123456',
            fullName: 'T',
        });
        User.findOne = jest.fn().mockRejectedValue(new Error('db error'));
        await register(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─── login ────────────────────────────────────────────────────────────────────
describe('login', () => {
    beforeEach(() => jest.clearAllMocks());

    it('400 — відсутні поля', async () => {
        const { req, res, next } = buildMocks({ email: '', password: '' });
        await login(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('401 — невірний email', async () => {
        const { req, res, next } = buildMocks({ email: 'x@b.com', password: '123' });
        User.findOne = jest.fn().mockResolvedValue(null);
        await login(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('401 — невірний пароль', async () => {
        const { req, res, next } = buildMocks({ email: 'a@b.com', password: 'wrong' });
        User.findOne = jest.fn().mockResolvedValue({
            comparePassword: jest.fn().mockResolvedValue(false),
        });
        await login(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('200 — успішний вхід', async () => {
        const { req, res, next } = buildMocks({ email: 'a@b.com', password: 'correct' });
        User.findOne = jest.fn().mockResolvedValue({
            _id: 'uid1',
            email: 'a@b.com',
            fullName: 'Test',
            voterId: 'VOTER-1',
            comparePassword: jest.fn().mockResolvedValue(true),
        });
        jwt.sign = jest.fn().mockReturnValue('tok');
        await login(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok' }));
    });
});

// ─── getMe ────────────────────────────────────────────────────────────────────
describe('getMe', () => {
    beforeEach(() => jest.clearAllMocks());

    it('404 — користувача не знайдено', async () => {
        const { req, res, next } = buildMocks();
        req.user = { id: 'uid1' };
        const selectMock = jest.fn().mockResolvedValue(null);
        User.findById = jest.fn().mockReturnValue({ select: selectMock });
        await getMe(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('200 — повертає дані користувача', async () => {
        const { req, res, next } = buildMocks();
        req.user = { id: 'uid1' };
        const mockUser = { _id: 'uid1', email: 'a@b.com', fullName: 'Test', voterId: 'V1' };
        const selectMock = jest.fn().mockResolvedValue(mockUser);
        User.findById = jest.fn().mockReturnValue({ select: selectMock });
        await getMe(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ user: mockUser });
    });
});

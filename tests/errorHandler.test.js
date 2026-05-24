/**
 * Тести для middleware/errorHandler.js
 */

const errorHandler = require('../middleware/errorHandler');

const buildMocks = (method = 'GET', url = '/test') => {
    const req = { method, originalUrl: url };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
};

const OLD_ENV = process.env;
afterAll(() => {
    process.env = { ...OLD_ENV };
    jest.clearAllMocks();
});

describe('errorHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NODE_ENV = 'test';
    });

    it('500 — загальна помилка', () => {
        const { req, res, next } = buildMocks();
        const err = new Error('Something failed');
        errorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Something failed' }),
        );
    });

    it('400 — CastError (невалідний ID)', () => {
        const { req, res, next } = buildMocks();
        const err = { name: 'CastError', path: '_id', message: 'Cast failed', status: undefined };
        errorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_ID' }));
    });

    it('400 — ValidationError', () => {
        const { req, res, next } = buildMocks();
        const err = {
            name: 'ValidationError',
            message: 'Validation failed',
            errors: { email: { message: 'Email is required' } },
        };
        errorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'VALIDATION_ERROR' }),
        );
    });

    it('409 — дублікат ключа (code 11000)', () => {
        const { req, res, next } = buildMocks();
        const err = { code: 11000, keyValue: { email: 'a@b.com' }, message: 'dup key' };
        errorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DUPLICATE_KEY' }));
    });

    it('401 — JsonWebTokenError', () => {
        const { req, res, next } = buildMocks();
        const err = { name: 'JsonWebTokenError', message: 'invalid' };
        errorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
    });

    it('401 — TokenExpiredError', () => {
        const { req, res, next } = buildMocks();
        const err = { name: 'TokenExpiredError', message: 'expired' };
        errorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
    });

    it('400 — RangeError', () => {
        const { req, res, next } = buildMocks();
        const err = new RangeError('Invalid time value');
        errorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'RANGE_ERROR' }));
    });

    it('використовує err.status якщо є', () => {
        const { req, res, next } = buildMocks();
        const err = { message: 'Not Found', status: 404 };
        errorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('у development додає stack', () => {
        process.env.NODE_ENV = 'development';
        const { req, res, next } = buildMocks();
        const err = new Error('Dev error');
        errorHandler(err, req, res, next);
        const call = res.json.mock.calls[0][0];
        expect(call.stack).toBeDefined();
    });
});

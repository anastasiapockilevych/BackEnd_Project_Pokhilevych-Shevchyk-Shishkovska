/**
 * Auth Middleware
 *
 * requireAuth      — перевіряє JWT токен (для виборців та адмінів)
 * requireAdmin     — перевіряє роль admin АБО X-Admin-Key заголовок
 * requireActivePoll — перевіряє що опитування не завершене
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Poll = require('../models/poll.model');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_env';

/**
 * Middleware: перевірка JWT токену.
 * Токен передається у заголовку Authorization: Bearer <token>
 */
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Необхідна авторизація. Передайте токен у заголовку Authorization: Bearer <token>.',
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'Токен недійсний або користувача видалено.' });
        }

        req.user = user;
        return next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Невірний токен.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Термін дії токену закінчився. Увійдіть знову.' });
        }
        return next(error);
    }
};

/**
 * Middleware: доступ лише для адміністраторів.
 * Перевіряє роль 'admin' у JWT або заголовок X-Admin-Key (зворотна сумісність).
 */
const requireAdmin = async (req, res, next) => {
    // Підтримка старого X-Admin-Key заголовку
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];

    if (adminKey && providedKey === adminKey) {
        return next();
    }

    // Перевірка через JWT
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Необхідна авторизація адміністратора.',
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.id).select('-password');
        if (!user || user.role !== 'admin') {
            return res
                .status(403)
                .json({ error: 'Доступ заборонено. Потрібні права адміністратора.' });
        }

        req.user = user;
        return next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Невірний або прострочений токен.' });
        }
        return next(error);
    }
};

/**
 * Middleware: перевірка що опитування не завершене перед змінами.
 */
const requireActivePoll = async (req, res, next) => {
    try {
        const { pollId } = req.params;

        if (!pollId) {
            return next();
        }

        const poll = await Poll.findById(pollId);

        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        if (poll.status === 'closed') {
            return res.status(400).json({
                error: `Опитування "${poll.title}" вже завершено. Будь-які зміни заборонені.`,
            });
        }

        req.poll = poll;
        return next();
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID опитування.' });
        }
        return next(error);
    }
};

module.exports = {
    requireAuth,
    requireAdmin,
    requireActivePoll,
};

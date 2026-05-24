/**
 * Auth Controller
 * Реєстрація: email + password + fullName → новий User + Voter.
 * Вхід: email + password → JWT.
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Voter = require('../models/voter.model');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_env';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * POST /auth/register
 * Реєструє нового користувача за email + password + fullName.
 */
const register = async (req, res, next) => {
    try {
        const { email, password, fullName } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'Необхідні поля: email, password, fullName.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль має бути не менше 6 символів.' });
        }

        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing) {
            return res.status(409).json({ error: 'Користувач з таким email вже існує.' });
        }

        const voterId = `VOTER-${Date.now()}`;

        const user = await User.create({
            email: email.trim().toLowerCase(),
            password,
            fullName: fullName.trim(),
            voterId,
        });

        await Voter.create({ voterId, fullName: fullName.trim(), password });

        const token = signToken(user._id);

        return res.status(201).json({
            message: 'Реєстрацію завершено успішно.',
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                voterId: user.voterId,
            },
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * POST /auth/login
 * Вхід: email + password → JWT.
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Необхідні поля: email, password.' });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Користувача з таким email не знайдено.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Невірний пароль.' });
        }

        const token = signToken(user._id);

        return res.status(200).json({
            message: 'Вхід успішний.',
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                voterId: user.voterId,
            },
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /auth/me
 * Дані поточного авторизованого користувача.
 */
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'Користувача не знайдено.' });
        }
        return res.status(200).json({ user });
    } catch (error) {
        return next(error);
    }
};

module.exports = { register, login, getMe };

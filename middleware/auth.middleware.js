/**
 * Auth Middleware — перевірка прав доступу до ресурсів.
 *
 * Оскільки проєкт не має повноцінної JWT-автентифікації,
 * middleware перевіряє наявність заголовка X-Admin-Key,
 * значення якого зберігається в .env (ADMIN_KEY).
 *
 * Використання:
 *   router.delete('/:pollId', requireAdmin, deletePoll);
 *   router.patch('/:pollId/close', requireAdmin, closePoll);
 */

require('dotenv').config();

const Poll = require('../models/poll.model');

/**
 * Middleware: доступ лише для адміністраторів.
 * Перевіряє заголовок X-Admin-Key.
 */
const requireAdmin = (req, res, next) => {
    const adminKey = process.env.ADMIN_KEY;

    // Якщо ADMIN_KEY не налаштований — дозволяємо (dev-режим)
    if (!adminKey) {
        return next();
    }

    const providedKey = req.headers['x-admin-key'];

    if (!providedKey) {
        return res.status(401).json({
            error: 'Доступ заборонено. Необхідний заголовок X-Admin-Key.',
        });
    }

    if (providedKey !== adminKey) {
        return res.status(403).json({
            error: 'Недійсний ключ адміністратора.',
        });
    }

    return next();
};

/**
 * Middleware: перевірка що опитування не завершене перед змінами.
 * Використовується разом з роутами, де req.params.pollId наявний.
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

        // Прикріплюємо poll до req щоб контролер не робив зайвий запит
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
    requireAdmin,
    requireActivePoll,
};

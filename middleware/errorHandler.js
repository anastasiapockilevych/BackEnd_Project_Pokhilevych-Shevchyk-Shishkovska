/**
 * Error Handler Middleware
 *
 * Централізована обробка помилок:
 * - логування (timestamp, метод, URL, статус, повідомлення, stack trace)
 * - коректна JSON-відповідь замість HTML
 * - код помилки та опис
 */

const errorHandler = (err, req, res, _next) => {
    // Визначаємо HTTP статус
    const status = err.status || err.statusCode || 500;

    // Логування
    const timestamp = new Date().toISOString();
    const logLine = [
        `[${timestamp}]`,
        `${status}`,
        `${req.method}`,
        `${req.originalUrl}`,
        '—',
        err.message,
    ].join(' ');

    if (status >= 500) {
        console.error(logLine);
        if (process.env.NODE_ENV !== 'test') {
            console.error(err.stack);
        }
    } else {
        console.warn(logLine);
    }

    // Mongoose помилки
    if (err.name === 'CastError') {
        return res.status(400).json({
            error: 'Невалідний формат ID.',
            code: 'INVALID_ID',
            field: err.path,
        });
    }

    if (err.name === 'ValidationError') {
        const fields = Object.keys(err.errors).map(key => ({
            field: key,
            message: err.errors[key].message,
        }));
        return res.status(400).json({
            error: 'Помилка валідації даних.',
            code: 'VALIDATION_ERROR',
            fields,
        });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'поле';
        return res.status(409).json({
            error: `Значення для поля "${field}" вже існує.`,
            code: 'DUPLICATE_KEY',
            field,
        });
    }

    // JWT помилки
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Невірний токен.', code: 'INVALID_TOKEN' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Токен прострочено.', code: 'TOKEN_EXPIRED' });
    }

    // RangeError та інші runtime помилки
    if (err instanceof RangeError) {
        return res.status(400).json({
            error: `Некоректні дані: ${err.message}`,
            code: 'RANGE_ERROR',
        });
    }

    // Загальна відповідь
    const isDev = process.env.NODE_ENV === 'development';

    return res.status(status).json({
        error: err.message || 'Внутрішня помилка сервера.',
        code: err.code || 'INTERNAL_ERROR',
        ...(isDev && { stack: err.stack }),
    });
};

module.exports = errorHandler;

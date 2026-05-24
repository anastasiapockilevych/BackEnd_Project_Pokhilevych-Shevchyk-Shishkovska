const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const pollsRouter = require('./routes/polls');
const votesRouter = require('./routes/votes');
const analyticsRouter = require('./routes/analytics');
const authRouter = require('./routes/auth');

const errorHandler = require('./middleware/errorHandler');

require('./config/db.config');

const app = express();

// ─── Swagger ────────────────────────────────────────────────────────────────
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'API Платформи для голосування',
            version: '1.0.0',
            description:
                'Документація API. Для захищених ендпоінтів потрібен JWT токен.\n\n' +
                '**Як отримати токен:**\n' +
                '1. `POST /auth/register` — реєстрація\n' +
                '2. `POST /auth/login` — вхід\n' +
                '3. Скопіюйте `token` та натисніть **Authorize** →',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Локальний сервер',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Введіть JWT токен отриманий при вході або реєстрації.',
                },
            },
        },
    },
    apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ─── View engine ─────────────────────────────────────────────────────────────
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/auth', authRouter); // публічний: реєстрація / логін
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/polls', pollsRouter);
app.use('/votes', votesRouter); // захищений через requireAuth у votes.js
app.use('/analytics', analyticsRouter);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res, _next) => {
    res.status(404).json({
        error: `Маршрут ${req.method} ${req.originalUrl} не знайдено.`,
        code: 'NOT_FOUND',
    });
});

// ─── Error Handler (централізований, замість HTML-рендеру) ───────────────────
app.use(errorHandler);

module.exports = app;

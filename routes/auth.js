const express = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Реєстрація та вхід у систему
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Реєстрація нового виборця
 *     tags: [Auth]
 *     description: |
 *       Створює новий обліковий запис виборця.
 *       Після реєстрації повертає JWT токен для подальших запитів.
 *       Голосування є анонімним — personalia не зберігається в бюлетенях.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: voter@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: secret123
 *               fullName:
 *                 type: string
 *                 example: Іван Іваненко
 *     responses:
 *       201:
 *         description: Реєстрація успішна
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT токен (зберігайте на клієнті)
 *                 user:
 *                   type: object
 *       400:
 *         description: Відсутні обов'язкові поля
 *       409:
 *         description: Email вже зареєстровано
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Вхід у систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: voter@example.com
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Вхід успішний
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT токен для авторизованих запитів
 *                 user:
 *                   type: object
 *       400:
 *         description: Відсутні поля
 *       401:
 *         description: Невірний email або пароль
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Дані поточного користувача
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Дані користувача
 *       401:
 *         description: Не авторизовано
 */
router.get('/me', requireAuth, getMe);

module.exports = router;

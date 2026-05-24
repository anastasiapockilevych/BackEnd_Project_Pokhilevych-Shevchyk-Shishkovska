const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

const {
    castVote,
    checkVoteStatus,
    getPollResults,
    deleteVote,
} = require('../controllers/votes.controller');

/**
 * @swagger
 * tags:
 *   name: Votes
 *   description: Голосування та результати
 */

/**
 * @swagger
 * /votes:
 *   post:
 *     summary: Подати голос
 *     tags: [Votes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Подає голос авторизованого виборця за кандидата.
 *       voterId береться автоматично з JWT токену — голосування анонімне.
 *       - Опитування (pollId) має бути активним.
 *       - Кандидат (candidateId) має належати до вказаного опитування.
 *       - Один виборець — лише один голос в одному опитуванні.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pollId
 *               - candidateId
 *             properties:
 *               pollId:
 *                 type: string
 *                 example: "665f1a2b3c4d5e6f7a8b9c0d"
 *               candidateId:
 *                 type: string
 *                 example: "665f1a2b3c4d5e6f7a8b9c0e"
 *     responses:
 *       201:
 *         description: Голос успішно зараховано
 *       400:
 *         description: Закрите опитування або кандидат не в цьому опитуванні
 *       401:
 *         description: Не авторизовано
 *       404:
 *         description: Опитування або кандидата не знайдено
 *       409:
 *         description: Повторне голосування заборонено
 */
router.post('/', requireAuth, castVote);

/**
 * @swagger
 * /votes:
 *   delete:
 *     summary: Скасувати голос виборця
 *     tags: [Votes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pollId
 *             properties:
 *               pollId:
 *                 type: string
 *                 example: "665f1a2b3c4d5e6f7a8b9c0d"
 *     responses:
 *       200:
 *         description: Голос успішно скасовано
 *       400:
 *         description: Опитування вже закрито
 *       401:
 *         description: Не авторизовано
 *       404:
 *         description: Бюлетеня не знайдено
 */
router.delete('/', requireAuth, deleteVote);

/**
 * @swagger
 * /votes/check:
 *   get:
 *     summary: Перевірити статус голосування виборця
 *     tags: [Votes]
 *     parameters:
 *       - in: query
 *         name: voterId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Статус голосування
 *       400:
 *         description: Відсутні query-параметри
 *       404:
 *         description: Виборця або опитування не знайдено
 */
router.get('/check', checkVoteStatus);

/**
 * @swagger
 * /votes/results/{pollId}:
 *   get:
 *     summary: Переглянути результати опитування
 *     tags: [Votes]
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Результати голосування (без персональних даних виборців)
 *       400:
 *         description: Невалідний формат ID
 *       404:
 *         description: Опитування не знайдено
 */
router.get('/results/:pollId', getPollResults);

module.exports = router;

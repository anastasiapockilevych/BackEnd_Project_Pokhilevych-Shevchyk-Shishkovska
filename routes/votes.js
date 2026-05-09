const express = require('express');

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
 *     description: |
 *       Подає голос виборця за обраного кандидата.
 *
 *       Бізнес-правила:
 *       - Виборець (voterId) має бути зареєстрований у системі.
 *       - Опитування (pollId) має бути активним (status: active).
 *       - Кандидат (candidateId) має належати до вказаного опитування.
 *       - Один виборець — лише один голос в одному опитуванні.
 *         Повторне голосування повертає HTTP 409.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - voterId
 *               - pollId
 *               - candidateId
 *             properties:
 *               voterId:
 *                 type: string
 *                 example: "STUD-001"
 *               pollId:
 *                 type: string
 *                 example: "665f1a2b3c4d5e6f7a8b9c0d"
 *               candidateId:
 *                 type: string
 *                 example: "665f1a2b3c4d5e6f7a8b9c0e"
 *     responses:
 *       201:
 *         description: Голос успішно зараховано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ваш голос успішно зараховано!"
 *                 ballot:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     poll:
 *                       type: string
 *                     candidate:
 *                       type: string
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Відсутні поля, закрите опитування або кандидат не в цьому опитуванні
 *       404:
 *         description: Виборця, опитування або кандидата не знайдено
 *       409:
 *         description: Повторне голосування заборонено
 *       500:
 *         description: Внутрішня помилка сервера
 */
router.post('/', castVote);

/**
 * @swagger
 * /votes:
 *   delete:
 *     summary: Скасувати голос виборця
 *     tags: [Votes]
 *     description: |
 *       Скасовує голос виборця в активному опитуванні.
 *
 *       Бізнес-правила:
 *       - Скасувати голос можна лише в активному опитуванні.
 *       - Якщо опитування вже закрито — скасування заборонено (HTTP 400).
 *       - Якщо виборець не голосував — повертається HTTP 404.
 *       - Лічильник голосів кандидата зменшується автоматично.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - voterId
 *               - pollId
 *             properties:
 *               voterId:
 *                 type: string
 *                 description: "Рядковий ID виборця"
 *                 example: "STUD-001"
 *               pollId:
 *                 type: string
 *                 description: "MongoDB ObjectId опитування"
 *                 example: "665f1a2b3c4d5e6f7a8b9c0d"
 *     responses:
 *       200:
 *         description: Голос успішно скасовано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Голос виборця успішно скасовано."
 *                 cancelled:
 *                   type: object
 *                   properties:
 *                     pollId:
 *                       type: string
 *                     voterId:
 *                       type: string
 *       400:
 *         description: Опитування вже закрито або відсутні обов'язкові поля
 *       404:
 *         description: Виборця, опитування або бюлетеня не знайдено
 */
router.delete('/', deleteVote);

/**
 * @swagger
 * /votes/check:
 *   get:
 *     summary: Перевірити статус голосування виборця
 *     tags: [Votes]
 *     description: "Повертає інформацію: чи проголосував виборець у вказаному опитуванні."
 *     parameters:
 *       - in: query
 *         name: voterId
 *         required: true
 *         schema:
 *           type: string
 *         example: "STUD-001"
 *       - in: query
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Статус голосування
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasVoted:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 votedFor:
 *                   type: object
 *                   description: "Присутнє лише якщо hasVoted = true"
 *                   properties:
 *                     candidateName:
 *                       type: string
 *                     party:
 *                       type: string
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Відсутні обов'язкові query-параметри
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
 *     description: |
 *       Повертає агреговані результати голосування.
 *       Таємність голосування: лише кількість голосів та відсоток,
 *       без персональних даних виборців.
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Результати голосування (без персональних даних виборців)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 poll:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                 totalVotes:
 *                   type: number
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       party:
 *                         type: string
 *                       votes:
 *                         type: number
 *                       percentage:
 *                         type: string
 *                         example: "54.55%"
 *       400:
 *         description: Невалідний формат ID
 *       404:
 *         description: Опитування не знайдено
 */
router.get('/results/:pollId', getPollResults);

module.exports = router;
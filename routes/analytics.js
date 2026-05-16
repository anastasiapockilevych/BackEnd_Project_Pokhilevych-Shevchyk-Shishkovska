const express = require('express');

const router = express.Router();

const { getPollAnalytics, getOverviewAnalytics } = require('../controllers/analytics.controller');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Аналітика результатів голосувань
 */

/**
 * @swagger
 * /analytics/overview:
 *   get:
 *     summary: Зведена аналітика по всіх опитуваннях
 *     tags: [Analytics]
 *     description: |
 *       Повертає загальну статистику платформи:
 *       - кількість активних та завершених опитувань
 *       - загальна кількість проголосувань
 *       - топ-5 опитувань за активністю
 *       - розбивка по категоріях
 *     responses:
 *       200:
 *         description: Зведена аналітика
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalPolls:
 *                       type: number
 *                     activePolls:
 *                       type: number
 *                     closedPolls:
 *                       type: number
 *                     totalRegisteredVoters:
 *                       type: number
 *                     totalVotesCast:
 *                       type: number
 *                     averageVotesPerPoll:
 *                       type: string
 *                 topActivePolls:
 *                   type: array
 *                 categoryBreakdown:
 *                   type: array
 *       500:
 *         description: Внутрішня помилка сервера
 */
router.get('/overview', getOverviewAnalytics);

/**
 * @swagger
 * /analytics/polls/{pollId}/summary:
 *   get:
 *     summary: Повна аналітика конкретного опитування
 *     tags: [Analytics]
 *     description: |
 *       Детальна аналітика результатів:
 *       - переможець (якщо опитування закрите) або поточний лідер
 *       - відсоток явки виборців
 *       - розподіл голосів по кандидатах з рангами та відсотками
 *       - погодинна динаміка голосування (timeline)
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId опитування
 *     responses:
 *       200:
 *         description: Детальна аналітика опитування
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 poll:
 *                   type: object
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalVotes:
 *                       type: number
 *                     totalRegisteredVoters:
 *                       type: number
 *                     turnoutPercent:
 *                       type: string
 *                       example: "60.00%"
 *                     winner:
 *                       type: object
 *                       nullable: true
 *                 breakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rank:
 *                         type: number
 *                       name:
 *                         type: string
 *                       party:
 *                         type: string
 *                       votes:
 *                         type: number
 *                       percentage:
 *                         type: string
 *                 timeline:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hour:
 *                         type: string
 *                         format: date-time
 *                       votes:
 *                         type: number
 *                       cumulative:
 *                         type: number
 *       400:
 *         description: Невалідний формат ID
 *       404:
 *         description: Опитування не знайдено
 */
router.get('/polls/:pollId/summary', getPollAnalytics);

module.exports = router;

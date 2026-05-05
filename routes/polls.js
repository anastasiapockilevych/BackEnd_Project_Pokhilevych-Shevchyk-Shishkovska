const express = require('express');

const router = express.Router();

const {
  createPoll,
  getAllPolls,
  getPollById,
  addCandidate,
  closePoll,
} = require('../controllers/polls.controller');

/**
 * @swagger
 * tags:
 *   name: Polls
 *   description: Управління опитуваннями
 */

/**
 * @swagger
 * /polls:
 *   post:
 *     summary: Створити нове опитування
 *     tags: [Polls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 example: "Вибори студентської ради 2025"
 *               description:
 *                 type: string
 *                 example: "Голосування за голову студентської ради"
 *               candidates:
 *                 type: array
 *                 description: "Необов'язково. Якщо передано — мінімум 2 кандидати."
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Іван Іваненко"
 *                     party:
 *                       type: string
 *                       example: "Незалежний"
 *     responses:
 *       201:
 *         description: Опитування успішно створено
 *       400:
 *         description: Помилка валідації (відсутні поля, мало кандидатів, дублікат імені)
 *       409:
 *         description: Опитування з такою назвою вже існує
 *       500:
 *         description: Внутрішня помилка сервера
 */
router.post('/', createPoll);

/**
 * @swagger
 * /polls:
 *   get:
 *     summary: Отримати список усіх опитувань
 *     tags: [Polls]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed]
 *         description: "Фільтр за статусом. Без параметра — повертає всі."
 *     responses:
 *       200:
 *         description: Масив опитувань (сортування від найновішого)
 *       400:
 *         description: Невалідне значення параметра status
 */
router.get('/', getAllPolls);

/**
 * @swagger
 * /polls/{pollId}:
 *   get:
 *     summary: Отримати опитування за ID (з кандидатами)
 *     tags: [Polls]
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId опитування
 *     responses:
 *       200:
 *         description: Об'єкт poll та масив candidates
 *       400:
 *         description: Невалідний формат ID
 *       404:
 *         description: Опитування не знайдено
 */
router.get('/:pollId', getPollById);

/**
 * @swagger
 * /polls/{pollId}/candidates:
 *   post:
 *     summary: Додати кандидата до існуючого опитування
 *     tags: [Polls]
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId опитування
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Марія Ковальчук"
 *               party:
 *                 type: string
 *                 example: "Партія прогресу"
 *     responses:
 *       201:
 *         description: Кандидата успішно додано
 *       400:
 *         description: Поле name відсутнє або опитування вже закрите
 *       404:
 *         description: Опитування не знайдено
 *       409:
 *         description: Кандидат з таким іменем вже зареєстрований у цьому опитуванні
 */
router.post('/:pollId/candidates', addCandidate);

/**
 * @swagger
 * /polls/{pollId}/close:
 *   patch:
 *     summary: Закрити опитування (завершити голосування)
 *     tags: [Polls]
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId опитування
 *     responses:
 *       200:
 *         description: Опитування успішно закрито
 *       400:
 *         description: Опитування вже закрите
 *       404:
 *         description: Опитування не знайдено
 */
router.patch('/:pollId/close', closePoll);

module.exports = router;
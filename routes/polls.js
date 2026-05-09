const express = require('express');

const router = express.Router();

const {
    createPoll,
    getAllPolls,
    getPollById,
    addCandidate,
    closePoll,
    deletePoll,
} = require('../controllers/polls.controller');

/**
 * @swagger
 * tags:
 *   name: Polls
 *   description: Управління опитуваннями (вибори різних рівнів)
 */

/**
 * @swagger
 * /polls:
 *   post:
 *     summary: Створити нове опитування
 *     tags: [Polls]
 *     description: |
 *       Створює нове виборче опитування з обов'язковим типом (category).
 *
 *       **Доступні категорії:**
 *       | category    | Опис                                      |
 *       |-------------|-------------------------------------------|
 *       | president   | Вибори Президента України                 |
 *       | minister    | Вибори Міністра (уточнити у полі title)   |
 *       | mayor       | Вибори Мера міста (уточнити у полі title) |
 *       | parliament  | Парламентські вибори                      |
 *       | other       | Інше голосування                          |
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 example: "Вибори Президента України 2014"
 *               category:
 *                 type: string
 *                 enum: [president, minister, mayor, parliament, other]
 *                 example: "president"
 *               description:
 *                 type: string
 *                 example: "Позачергові вибори Президента України, травень 2014"
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
 *                       example: "Петро Порошенко"
 *                     party:
 *                       type: string
 *                       example: "УДАР"
 *     responses:
 *       201:
 *         description: Опитування успішно створено
 *       400:
 *         description: Помилка валідації (відсутні поля, невірна категорія, мало кандидатів)
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
 *     description: |
 *       Повертає всі опитування. Можна фільтрувати за статусом та/або категорією.
 *
 *       **Приклади запитів:**
 *       - Всі активні президентські вибори: ?status=active&category=president
 *       - Всі вибори мерів: ?category=mayor
 *       - Всі завершені: ?status=closed
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed]
 *         description: "Фільтр за статусом опитування."
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [president, minister, mayor, parliament, other]
 *         description: "Фільтр за типом виборів."
 *     responses:
 *       200:
 *         description: Масив опитувань (від найновішого)
 *       400:
 *         description: Невалідне значення параметра status або category
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
 *         description: Обєкт poll та масив candidates
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
 *                 example: "Юлія Тимошенко"
 *               party:
 *                 type: string
 *                 example: "Батьківщина"
 *     responses:
 *       201:
 *         description: Кандидата успішно додано
 *       400:
 *         description: Поле name відсутнє або опитування вже закрите
 *       404:
 *         description: Опитування не знайдено
 *       409:
 *         description: Кандидат з таким іменем вже зареєстрований
 */
router.post('/:pollId/candidates', addCandidate);

/**
 * @swagger
 * /polls/{pollId}/close:
 *   patch:
 *     summary: Закрити опитування
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

/**
 * @swagger
 * /polls/{pollId}:
 *   delete:
 *     summary: Видалити опитування (каскадне видалення)
 *     tags: [Polls]
 *     description: |
 *       Видаляє опитування разом із усіма пов'язаними даними:
 *       кандидатами та бюлетенями (каскадне видалення).
 *
 *       Бізнес-правило - видалення активного опитування заборонено.
 *       Спочатку закрийте його через PATCH /polls/:pollId/close.
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId опитування
 *     responses:
 *       200:
 *         description: Опитування та всі пов'язані дані успішно видалено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Опитування успішно видалено."
 *                 deleted:
 *                   type: object
 *                   properties:
 *                     pollId:
 *                       type: string
 *                     candidatesRemoved:
 *                       type: number
 *                       description: Кількість видалених кандидатів
 *       400:
 *         description: Неможливо видалити активне опитування або невалідний формат ID
 *       404:
 *         description: Опитування не знайдено
 */
router.delete('/:pollId', deletePoll);

module.exports = router;
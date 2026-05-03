const express = require('express');
const router = express.Router();

// Імпортуємо всі наші нові моделі
const Poll = require('../models/poll.model');
const Candidate = require('../models/candidate.model');
const Voter = require('../models/voter.model');
const Ballot = require('../models/ballot.model');

/* Головна сторінка */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express Voting Platform' });
});

/**
 * @swagger
 * /seed:
 * get:
 * summary: Повна ініціалізація бази даних
 * description: Очищає всі колекції та створює структуру Опитування -> Кандидати + список Виборців.
 */
router.get('/seed', async (req, res) => {
  try {
    // 1. Повне очищення бази перед заповненням
    await Poll.deleteMany({});
    await Candidate.deleteMany({});
    await Voter.deleteMany({});
    await Ballot.deleteMany({});

    // 2. Створюємо основну сутність Опитування
    const mainPoll = await Poll.create({
      title: "Позачергові вибори Президента України 2014",
      description: "Голосування за кандидатів на пост Президента України",
      status: "active"
    });

    // 3. Готуємо список кандидатів, прив'язуючи кожного до створеного опитування через poll: mainPoll._id
    const candidatesData = [
      { name: "Петро Порошенко", party: "БПП", poll: mainPoll._id, votesCount: 0 },
      { name: "Юлія Тимошенко", party: "Батьківщина", poll: mainPoll._id, votesCount: 0 },
      { name: "Олег Ляшко", party: "Радикальна партія", poll: mainPoll._id, votesCount: 0 },
      { name: "Анатолій Гриценко", party: "Громадянська позиція", poll: mainPoll._id, votesCount: 0 },
      { name: "Сергій Тігіпко", party: "Сильна Україна", poll: mainPoll._id, votesCount: 0 },
      { name: "Михайло Добкін", party: "Партія Регіонів", poll: mainPoll._id, votesCount: 0 },
      { name: "Вадим Рабінович", party: "Самовисуванець", poll: mainPoll._id, votesCount: 0 },
      { name: "Ольга Богомолець", party: "Самовисуванець", poll: mainPoll._id, votesCount: 0 },
      { name: "Петро Симоненко", party: "КПУ", poll: mainPoll._id, votesCount: 0 },
      { name: "Олег Тягнибок", party: "Свобода", poll: mainPoll._id, votesCount: 0 },
      { name: "Дмитро Ярош", party: "Правий Сектор", poll: mainPoll._id, votesCount: 0 }
    ];

    await Candidate.insertMany(candidatesData);

    // 4. Створюємо тестових виборців (студентів)
    const votersData = [
      { voterId: "STUD-001", fullName: "Іван Іваненко" },
      { voterId: "STUD-002", fullName: "Марія Ковальчук" },
      { voterId: "STUD-003", fullName: "Олександр Петренко" },
      { voterId: "STUD-004", fullName: "Олена Сидоренко" },
      { voterId: "ADMIN-01", fullName: "Адміністратор Системи" }
    ];

    await Voter.insertMany(votersData);

    // Відправляємо гарну відповідь
    res.send(`
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f7f6; padding: 40px; border-radius: 15px; display: inline-block;">
        <h1 style="color: #4CAF50;">🚀 Базу оновлено до версії 2.0!</h1>
        <hr style="border: 0; height: 1px; background: #ddd;">
        <div style="text-align: left; display: inline-block; margin-top: 20px;">
          <p><b>Опитування створено:</b> "${mainPoll.title}"</p>
          <p><b>Кандидатів додано:</b> 11 осіб (усі прив'язані до опитування)</p>
          <p><b>Виборців зареєстровано:</b> 5 (готові до голосування)</p>
          <p><b>Бюлетені:</b> Порожньо (чекають на ваші POST-запити)</p>
        </div>
        <p style="margin-top: 30px; color: #666; font-style: italic;">
          Тепер ваші друзі можуть використовувати <b>Candidate ID</b> та <b>Voter ID</b> для створення записів у Ballot.
        </p>
      </div>
    `);

  } catch (error) {
    console.error(error);
    res.status(500).send(`
      <h2 style="color: red; font-family: sans-serif;">❌ Помилка при заповненні бази:</h2>
      <pre>${error.message}</pre>
    `);
  }
});

module.exports = router;
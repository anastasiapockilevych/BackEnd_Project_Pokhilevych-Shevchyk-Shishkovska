const express = require('express');
const router = express.Router();
const Poll = require('../models/poll.model'); 

/* Головна сторінка */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* СТВОРЕННЯ ПОЧАТКОВИХ ДАНИХ (ПОРОЖНІ ГОЛОСУВАННЯ) */
router.get('/seed', async (req, res) => {
  try {
    // Очищаємо базу, щоб почати з чистого аркуша
    await Poll.deleteMany({});

    // Готуємо список кандидатів, але у всіх votes: 0
    const emptyPolls = [
      {
        question: "Позачергові вибори Президента України 2014",
        options: [
          { optionText: "Петро Порошенко", votes: 0 },
          { optionText: "Юлія Тимошенко", votes: 0 },
          { optionText: "Олег Ляшко", votes: 0 },
          { optionText: "Анатолій Гриценко", votes: 0 },
          { optionText: "Сергій Тігіпко", votes: 0 },
          { optionText: "Михайло Добкін", votes: 0 },
          { optionText: "Вадим Рабінович", votes: 0 },
          { optionText: "Ольга Богомолець", votes: 0 },
          { optionText: "Петро Симоненко", votes: 0 },
          { optionText: "Олег Тягнибок", votes: 0 },
          { optionText: "Дмитро Ярош", votes: 0 }
        ]
      }
    ];

    await Poll.insertMany(emptyPolls);

    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #2196F3;">📋 Базу підготовлено для лабораторної!</h1>
        <p style="font-size: 18px;">Додано список кандидатів 2014 року. Кількість голосів: 0.</p>
        <p style="color: #555;">Тепер реалізуйте API для голосування та перегляду результатів!</p>
      </div>
    `);
  } catch (error) {
    res.send("<h2 style='color: red;'>❌ Помилка: " + error.message + "</h2>");
  }
});

module.exports = router;
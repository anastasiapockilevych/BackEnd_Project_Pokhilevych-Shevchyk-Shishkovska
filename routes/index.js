const express = require('express');

const router = express.Router();

// Імпортуємо всі наші нові моделі
const Poll = require('../models/poll.model');
const Candidate = require('../models/candidate.model');
const Voter = require('../models/voter.model');
const Ballot = require('../models/ballot.model');

/* Головна сторінка */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express Voting Platform' });
});

/**
 * @swagger
 * /seed:
 * get:
 * summary: Повна ініціалізація бази даних
 * description: Очищає всі колекції та створює структуру Опитувань (Президент, Мер, Парламент) -> Кандидати/Партії + список Виборців.
 */
router.get('/seed', async (req, res) => {
    try {
        // 1. Повне очищення бази перед заповненням
        await Poll.deleteMany({});
        await Candidate.deleteMany({});
        await Voter.deleteMany({});
        await Ballot.deleteMany({});

        // 2. Створюємо основні сутності Опитувань
        const pollsData = [
            {
                title: 'Позачергові вибори Президента України 2014',
                description: 'Голосування за кандидатів на пост Президента України',
                status: 'active',
            },
            {
                title: 'Позачергові вибори міського голови Чернівців 2014',
                description: 'Голосування за кандидатів на посаду мера міста Чернівці',
                status: 'active',
            },
            {
                title: 'Позачергові вибори до Верховної Ради України 2014',
                description: 'Голосування за політичні партії (багатомандатний загальнодержавний округ)',
                status: 'active',
            }
        ];

        // Зберігаємо опитування і отримуємо їхні об'єкти з _id
        const [presidentialPoll, mayoralPoll, parliamentaryPoll] = await Poll.insertMany(pollsData);

        // 3. Готуємо список кандидатів та партій, прив'язуючи кожного до відповідного опитування
        const candidatesData = [
            // --- КАНДИДАТИ В ПРЕЗИДЕНТИ 2014 ---
            { name: 'Петро Порошенко', party: 'БПП', poll: presidentialPoll._id, votesCount: 0 },
            { name: 'Юлія Тимошенко', party: 'Батьківщина', poll: presidentialPoll._id, votesCount: 0 },
            { name: 'Олег Ляшко', party: 'Радикальна партія', poll: presidentialPoll._id, votesCount: 0 },
            { name: 'Анатолій Гриценко', party: 'Громадянська позиція', poll: presidentialPoll._id, votesCount: 0 },
            { name: 'Сергій Тігіпко', party: 'Сильна Україна', poll: presidentialPoll._id, votesCount: 0 },
            { name: 'Михайло Добкін', party: 'Партія Регіонів', poll: presidentialPoll._id, votesCount: 0 },
            { name: 'Вадим Рабінович', party: 'Самовисуванець', poll: presidentialPoll._id, votesCount: 0 },
            { name: 'Ольга Богомолець', party: 'Самовисуванець', poll: presidentialPoll._id, votesCount: 0 },
            { name: 'Петро Симоненко', party: 'КПУ', poll: presidentialPoll._id, votesCount: 0 },
            { name: 'Олег Тягнибок', party: 'Свобода', poll: presidentialPoll._id, votesCount: 0 },
            { name: 'Дмитро Ярош', party: 'Правий Сектор', poll: presidentialPoll._id, votesCount: 0 },

            // --- КАНДИДАТИ В МЕРИ ЧЕРНІВЦІВ 2014 ---
            { name: 'Олексій Каспрук', party: 'Батьківщина', poll: mayoralPoll._id, votesCount: 0 },
            { name: 'Віталій Михайлішин', party: 'Самовисуванець', poll: mayoralPoll._id, votesCount: 0 },
            { name: 'В\'ячеслав Кишлярук', party: 'УДАР', poll: mayoralPoll._id, votesCount: 0 },
            { name: 'Віталій Ткачук', party: 'Свобода', poll: mayoralPoll._id, votesCount: 0 },
            { name: 'Ілля Хочь', party: 'Самовисуванець', poll: mayoralPoll._id, votesCount: 0 },

            // --- ПАРТІЇ ДО ВЕРХОВНОЇ РАДИ 2014 (тільки партії) ---
            { name: 'Народний фронт', party: 'Народний фронт', poll: parliamentaryPoll._id, votesCount: 0 },
            { name: 'Блок Петра Порошенка', party: 'Блок Петра Порошенка', poll: parliamentaryPoll._id, votesCount: 0 },
            { name: 'Об\'єднання Самопоміч', party: 'Самопоміч', poll: parliamentaryPoll._id, votesCount: 0 },
            { name: 'Опозиційний блок', party: 'Опозиційний блок', poll: parliamentaryPoll._id, votesCount: 0 },
            { name: 'Радикальна партія Олега Ляшка', party: 'Радикальна партія', poll: parliamentaryPoll._id, votesCount: 0 },
            { name: 'ВО Батьківщина', party: 'Батьківщина', poll: parliamentaryPoll._id, votesCount: 0 },
            { name: 'ВО Свобода', party: 'Свобода', poll: parliamentaryPoll._id, votesCount: 0 }
        ];

        await Candidate.insertMany(candidatesData);

        // 4. Створюємо тестових виборців
        const votersData = [
            { voterId: 'STUD-001', fullName: 'Іван Іваненко' },
            { voterId: 'STUD-002', fullName: 'Марія Ковальчук' },
            { voterId: 'STUD-003', fullName: 'Олександр Петренко' },
            { voterId: 'STUD-004', fullName: 'Олена Сидоренко' },
            { voterId: 'ADMIN-01', fullName: 'Адміністратор Системи' },
        ];

        await Voter.insertMany(votersData);

        // 5. Відправляємо гарну відповідь
        res.send(`
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f7f6; padding: 40px; border-radius: 15px; display: inline-block;">
                <h1 style="color: #4CAF50;">🚀 Базу успішно оновлено!</h1>
                <hr style="border: 0; height: 1px; background: #ddd;">
                <div style="text-align: left; display: inline-block; margin-top: 20px;">
                    <p><b>Опитування створено:</b> 3 (Президент, Мер Чернівців, Парламент)</p>
                    <p><b>Учасників/Партій додано:</b> ${candidatesData.length}</p>
                    <p><b>Виборців зареєстровано:</b> ${votersData.length}</p>
                    <p><b>Бюлетені:</b> Порожньо (чекають на ваші POST-запити)</p>
                </div>
                <p style="margin-top: 30px; color: #666; font-style: italic;">
                    Тепер можна голосувати в різних категоріях, використовуючи <b>Candidate ID</b> та <b>Voter ID</b>.
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

/**
 * Маршрут для реєстрації нового виборця
 * Саме цей шлях викликає ваш frontend.js через fetch('/users/new')
 */
router.post('/users/new', async (req, res) => {
    try {
        const { fullName, voterId } = req.body;

        // Перевіряємо, чи такий виборець вже існує
        const existingVoter = await Voter.findOne({ voterId });
        if (existingVoter) {
            return res.status(400).json({ error: 'Виборець з таким ID вже зареєстрований' });
        }

        const newVoter = new Voter({ fullName, voterId });
        await newVoter.save();

        res.status(201).json({ message: 'Виборця успішно створено', voter: newVoter });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 
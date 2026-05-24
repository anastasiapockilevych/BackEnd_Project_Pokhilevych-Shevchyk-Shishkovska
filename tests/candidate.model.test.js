const mongoose = require('mongoose');
const Candidate = require('../models/candidate.model'); // Перевір шлях до файлу

describe('Candidate Model Test', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('повинен успішно пройти валідацію з мінімальними даними та встановити default значення', () => {
        // Передаємо ТІЛЬКИ обов'язкове поле name
        const validCandidate = new Candidate({
            name: 'Олександр',
        });

        const error = validCandidate.validateSync();
        expect(error).toBeUndefined(); // Помилок валідації немає

        // Фішка для викладача: перевіряємо, що Mongoose сам поставив 0
        expect(validCandidate.votesCount).toBe(0);
    });

    it('повинен успішно пройти валідацію з усіма полями', () => {
        const fullCandidate = new Candidate({
            name: 'Олександр',
            party: 'Партія програмістів',
            votesCount: 15,
            poll: new mongoose.Types.ObjectId(), // Генеруємо правильний ObjectID для імітації опитування
        });

        const error = fullCandidate.validateSync();
        expect(error).toBeUndefined();
    });

    // eslint-disable-next-line prettier/prettier
    it('повинен викинути помилку валідації, якщо відсутнє обов\'язкове поле name', () => {
        const candidateWithoutName = new Candidate({
            party: 'Безпартійна',
        });

        const error = candidateWithoutName.validateSync();

        expect(error).toBeDefined();
        // Перевіряємо, що Mongoose лається саме на відсутність name
        expect(error.errors.name).toBeDefined();
        expect(error.errors.name.message).toMatch(/required/i);
    });

    it('повинен викинути помилку, якщо тип даних votesCount неправильний (рядок замість числа)', () => {
        const invalidCandidate = new Candidate({
            name: 'Марія',
            votesCount: 'багато', // Mongoose очікує Number, а ми даємо String
        });

        const error = invalidCandidate.validateSync();

        expect(error).toBeDefined();
        // Mongoose спробує перетворити 'багато' на число, не зможе, і викине CastError
        expect(error.errors.votesCount).toBeDefined();
        expect(error.errors.votesCount.name).toBe('CastError');
    });
});

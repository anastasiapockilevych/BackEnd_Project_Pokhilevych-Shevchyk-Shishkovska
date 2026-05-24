const mongoose = require('mongoose');
const Voter = require('../models/voter.model'); // Перевір шлях до файлу моделі

describe('Voter Model Test', () => {
    
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('повинен успішно пройти валідацію з мінімальними правильними даними (тільки voterId)', () => {
        // fullName не є обов'язковим, тому тест має пройти успішно
        const validVoter = new Voter({
            voterId: 'VOTER-12345'
        });

        const error = validVoter.validateSync();
        expect(error).toBeUndefined(); // Помилок немає
    });

    it('повинен успішно пройти валідацію з усіма полями', () => {
        const fullVoter = new Voter({
            voterId: 'VOTER-67890',
            fullName: 'Анастасія Шевчук'
        });

        const error = fullVoter.validateSync();
        expect(error).toBeUndefined();
    });

    it('повинен викинути помилку валідації, якщо відсутнє обов\'язкове поле voterId', () => {
        const voterWithoutId = new Voter({
            fullName: 'Іван Іванов'
        });

        const error = voterWithoutId.validateSync();

        expect(error).toBeDefined();
        // Перевіряємо, що Mongoose лається саме на відсутність voterId
        expect(error.errors.voterId).toBeDefined();
        expect(error.errors.voterId.message).toMatch(/required/i);
    });

});
const mongoose = require('mongoose');
const Ballot = require('../models/ballot.model'); // Перевір шлях до файлу

describe('Ballot Model Test', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    // eslint-disable-next-line prettier/prettier
    it('повинен успішно пройти валідацію з усіма обов\'язковими полями і встановити дату votedAt', () => {
        // Генеруємо правильні ObjectId для імітації зв'язків
        const validBallot = new Ballot({
            voter: new mongoose.Types.ObjectId(),
            poll: new mongoose.Types.ObjectId(),
            candidate: new mongoose.Types.ObjectId(),
        });

        const error = validBallot.validateSync();
        expect(error).toBeUndefined(); // Помилок немає

        // Фішка: перевіряємо, що Mongoose сам поставив поточну дату
        expect(validBallot.votedAt).toBeDefined();
        expect(validBallot.votedAt).toBeInstanceOf(Date);
    });

    it('повинен викинути помилку валідації, якщо відсутнє поле voter', () => {
        const invalidBallot = new Ballot({
            poll: new mongoose.Types.ObjectId(),
            candidate: new mongoose.Types.ObjectId(),
        });

        const error = invalidBallot.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.voter).toBeDefined();
        expect(error.errors.voter.message).toMatch(/required/i);
    });

    it('повинен викинути помилку валідації, якщо відсутнє поле poll', () => {
        const invalidBallot = new Ballot({
            voter: new mongoose.Types.ObjectId(),
            candidate: new mongoose.Types.ObjectId(),
        });

        const error = invalidBallot.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.poll).toBeDefined();
    });

    it('повинен викинути помилку (CastError), якщо передати текст замість ObjectId', () => {
        const invalidBallot = new Ballot({
            voter: 'просто_текст_замість_айді', // Неправильний формат
            poll: new mongoose.Types.ObjectId(),
            candidate: new mongoose.Types.ObjectId(),
        });

        const error = invalidBallot.validateSync();

        expect(error).toBeDefined();
        // Mongoose не зможе перетворити текст на ObjectId і викине CastError
        expect(error.errors.voter).toBeDefined();
        expect(error.errors.voter.name).toBe('CastError');
    });
});

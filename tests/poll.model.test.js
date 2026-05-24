const Poll = require('../models/poll.model'); // Перевір, чи правильний шлях до файлу моделі

describe('Poll Model Test', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('повинен успішно пройти валідацію з мінімальними правильними даними', () => {
        // За твоєю схемою обов'язковим є ТІЛЬКИ title
        const validPoll = new Poll({
            title: 'Вибори президента університету',
        });

        const error = validPoll.validateSync();
        expect(error).toBeUndefined(); // Помилок бути не повинно
    });

    it('повинен успішно пройти валідацію з усіма полями', () => {
        const fullPoll = new Poll({
            title: 'Вибори президента університету',
            description: 'Детальний опис виборів',
            status: 'closed',
        });

        const error = fullPoll.validateSync();
        expect(error).toBeUndefined();
    });

    // eslint-disable-next-line prettier/prettier
    it('повинен викинути помилку валідації, якщо відсутнє обов\'язкове поле title', () => {
        const pollWithoutTitle = new Poll({
            description: 'Опитування без назви',
            status: 'active',
        });

        const error = pollWithoutTitle.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.title).toBeDefined(); // Лається саме на title
        expect(error.errors.title.message).toMatch(/required/i);
    });

    it('повинен викинути помилку валідації, якщо status має недопустиме значення', () => {
        const pollInvalidStatus = new Poll({
            title: 'Опитування з поганим статусом',
            status: 'pending', // Такого статусу немає в enum ['active', 'closed']
        });

        const error = pollInvalidStatus.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.status).toBeDefined(); // Лається на некоректний статус
        expect(error.errors.status.message).toMatch(/is not a valid enum value/i);
    });
});

/* eslint-disable global-require */
describe('Voter Model Test', () => {
    let Voter;
    let bcrypt;

    beforeAll(() => {
        jest.resetModules();
        jest.mock('bcryptjs', () => ({
            hash: jest.fn().mockResolvedValue('$2b$12$hashed_voter'),
            compare: jest.fn().mockResolvedValue(true),
        }));
        bcrypt = require('bcryptjs');
        Voter = require('../models/voter.model');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('повинен успішно пройти валідацію з мінімальними правильними даними (тільки voterId)', () => {
        // fullName не є обов'язковим, тому тест має пройти успішно
        const validVoter = new Voter({
            voterId: 'VOTER-12345',
        });

        const error = validVoter.validateSync();
        expect(error).toBeUndefined(); // Помилок немає
    });

    it('повинен успішно пройти валідацію з усіма полями', () => {
        const fullVoter = new Voter({
            voterId: 'VOTER-67890',
            fullName: 'Анастасія Шевчук',
        });

        const error = fullVoter.validateSync();
        expect(error).toBeUndefined();
    });

    // eslint-disable-next-line prettier/prettier
    it('повинен викинути помилку валідації, якщо відсутнє обов\'язкове поле voterId', () => {
        const voterWithoutId = new Voter({
            fullName: 'Іван Іванов',
        });

        const error = voterWithoutId.validateSync();

        expect(error).toBeDefined();
        // Перевіряємо, що Mongoose лається саме на відсутність voterId
        expect(error.errors.voterId).toBeDefined();
        expect(error.errors.voterId.message).toMatch(/required/i);
    });

    it('pre-save: хешує пароль коли isModified=true і пароль є', async () => {
        // eslint-disable-next-line no-underscore-dangle
        const pres = Voter.schema.s.hooks._pres.get('save');
        // eslint-disable-next-line prettier/prettier
        const preFn = pres.find(p => p.fn.toString().includes('isModified(\'password\')')).fn;

        const fakeDoc = {
            isModified: jest.fn(() => true),
            password: 'plain_password',
        };

        await preFn.call(fakeDoc);

        expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 12);
        expect(fakeDoc.password).toBe('$2b$12$hashed_voter');
    });

    it('pre-save: не хешує пароль коли isModified=false', async () => {
        // eslint-disable-next-line no-underscore-dangle
        const pres = Voter.schema.s.hooks._pres.get('save');
        // eslint-disable-next-line prettier/prettier
        const preFn = pres.find(p => p.fn.toString().includes('isModified(\'password\')')).fn;

        const fakeDoc = {
            isModified: jest.fn(() => false),
            password: 'already_hashed',
        };

        await preFn.call(fakeDoc);

        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('pre-save: не хешує пароль коли password є null', async () => {
        // eslint-disable-next-line no-underscore-dangle
        const pres = Voter.schema.s.hooks._pres.get('save');
        // eslint-disable-next-line prettier/prettier
        const preFn = pres.find(p => p.fn.toString().includes('isModified(\'password\')')).fn;

        const fakeDoc = {
            isModified: jest.fn(() => true),
            password: null,
        };

        await preFn.call(fakeDoc);

        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('comparePassword: повертає true якщо пароль збігається', async () => {
        bcrypt.compare.mockResolvedValue(true);
        const inst = new Voter({ voterId: 'V-001', password: 'hashed' });
        const result = await inst.comparePassword('plain');
        expect(bcrypt.compare).toHaveBeenCalledWith('plain', inst.password);
        expect(result).toBe(true);
    });

    it('comparePassword: повертає false якщо пароль не збігається', async () => {
        bcrypt.compare.mockResolvedValue(false);
        const inst = new Voter({ voterId: 'V-002', password: 'hashed' });
        const result = await inst.comparePassword('wrong');
        expect(result).toBe(false);
    });

    it('comparePassword: повертає false якщо password є null', async () => {
        const inst = new Voter({ voterId: 'V-003', password: null });
        const result = await inst.comparePassword('any');
        expect(result).toBe(false);
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });
});

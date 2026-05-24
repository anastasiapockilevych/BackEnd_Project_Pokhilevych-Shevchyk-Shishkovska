/* eslint-disable global-require */
describe('UserSchema pre-save hook та comparePassword', () => {
    let User;
    let bcrypt;

    beforeAll(() => {
        jest.resetModules();
        jest.mock('bcryptjs', () => ({
            hash: jest.fn().mockResolvedValue('$2b$12$hashed_password'),
            compare: jest.fn().mockResolvedValue(true),
        }));
        bcrypt = require('bcryptjs');
        User = require('../models/user.model');
    });

    beforeEach(() => jest.clearAllMocks());

    /**
     * Знаходимо власний pre-save хук (index 2 — після saveSubdocs та timestamps).
     */
    const getUserPreSave = () => {
        // eslint-disable-next-line no-underscore-dangle
        const pres = User.schema.s.hooks._pres.get('save');
        // Знаходимо функцію, яка перевіряє isModified('password')
        // eslint-disable-next-line prettier/prettier
        return pres.find(p => p.fn.toString().includes('isModified(\'password\')')).fn;
    };

    it('pre-save: хешує пароль коли isModified=true', async () => {
        const preFn = getUserPreSave();
        const fakeDoc = {
            isModified: jest.fn(() => true),
            password: 'plain_password',
        };

        await preFn.call(fakeDoc);

        expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 12);
        expect(fakeDoc.password).toBe('$2b$12$hashed_password');
    });

    it('pre-save: не хешує пароль коли isModified=false', async () => {
        const preFn = getUserPreSave();
        const fakeDoc = {
            isModified: jest.fn(() => false),
            password: 'already_hashed',
        };

        await preFn.call(fakeDoc);

        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(fakeDoc.password).toBe('already_hashed');
    });

    it('comparePassword: повертає true якщо пароль збігається', async () => {
        bcrypt.compare.mockResolvedValue(true);
        const inst = new User({ email: 'u@u.ua', password: 'hashed', fullName: 'User' });
        const result = await inst.comparePassword('plain');
        expect(bcrypt.compare).toHaveBeenCalledWith('plain', inst.password);
        expect(result).toBe(true);
    });

    it('comparePassword: повертає false якщо пароль не збігається', async () => {
        bcrypt.compare.mockResolvedValue(false);
        const inst = new User({ email: 'u2@u.ua', password: 'hashed', fullName: 'User2' });
        const result = await inst.comparePassword('wrong');
        expect(result).toBe(false);
    });
});

/**
 * Тести для poll.helpers.js та vote.helpers.js
 * Покриття: усі розгалуження кожної функції валідації.
 */

const {
    validatePollTitle,
    validateCandidatesList,
    validateCandidateName,
    validateStatusFilter,
} = require('../helpers/poll.helpers');

const {
    validateVoteFields,
    validateVoteStatusQuery,
    validateDeleteVoteFields,
    validateCandidateBelongsToPoll,
    validatePollIsActive,
} = require('../helpers/vote.helpers');

// ─────────────────────────────────────────────────────────────────────────────
// poll.helpers.js
// ─────────────────────────────────────────────────────────────────────────────

describe('validatePollTitle', () => {
    it('invalid — title відсутній (undefined)', () => {
        const result = validatePollTitle(undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/обов'язковим/);
    });

    it('invalid — title порожній рядок', () => {
        const result = validatePollTitle('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/обов'язковим/);
    });

    it('invalid — title занадто короткий (< 5 символів)', () => {
        const result = validatePollTitle('Hi');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/5 символів/);
    });

    it('invalid — title занадто довгий (> 200 символів)', () => {
        const result = validatePollTitle('A'.repeat(201));
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/200 символів/);
    });

    it('valid — title рівно 5 символів', () => {
        const result = validatePollTitle('Hello');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('valid — title рівно 200 символів', () => {
        const result = validatePollTitle('A'.repeat(200));
        expect(result.valid).toBe(true);
    });

    it('valid — нормальний title', () => {
        const result = validatePollTitle('Вибори Президента України 2024');
        expect(result.valid).toBe(true);
    });

    it('valid — title з пробілами на початку/кінці (trim)', () => {
        const result = validatePollTitle('  Valid Title  ');
        expect(result.valid).toBe(true);
    });
});

describe('validateCandidatesList', () => {
    it('invalid — не масив', () => {
        const result = validateCandidatesList('not array');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/масивом/);
    });

    it('invalid — null', () => {
        const result = validateCandidatesList(null);
        expect(result.valid).toBe(false);
    });

    it('invalid — менше 2 кандидатів', () => {
        const result = validateCandidatesList([{ name: 'Only One' }]);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/2 кандидати/);
    });

    it('invalid — більше 50 кандидатів', () => {
        const candidates = Array.from({ length: 51 }, (_, i) => ({ name: `Candidate ${i}` }));
        const result = validateCandidatesList(candidates);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/50/);
    });

    it('invalid — кандидат без name', () => {
        const result = validateCandidatesList([{ name: 'A' }, { name: '' }]);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/обов'язковим/);
    });

    it('invalid — дублікати імен (case insensitive)', () => {
        const result = validateCandidatesList([
            { name: 'John Doe' },
            { name: 'john doe' },
        ]);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/повторювані/);
    });

    it('valid — рівно 2 кандидати', () => {
        const result = validateCandidatesList([{ name: 'Alice' }, { name: 'Bob' }]);
        expect(result.valid).toBe(true);
    });

    it('valid — 50 кандидатів', () => {
        const candidates = Array.from({ length: 50 }, (_, i) => ({ name: `Candidate ${i}` }));
        const result = validateCandidatesList(candidates);
        expect(result.valid).toBe(true);
    });
});

describe('validateCandidateName', () => {
    it('invalid — name відсутній (undefined)', () => {
        const result = validateCandidateName(undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/обов'язковим/);
    });

    it('invalid — name порожній рядок', () => {
        const result = validateCandidateName('   ');
        expect(result.valid).toBe(false);
    });

    it('valid — нормальне ім\'я', () => {
        const result = validateCandidateName('Петро Порошенко');
        expect(result.valid).toBe(true);
    });
});

describe('validateStatusFilter', () => {
    it('invalid — невідомий статус', () => {
        const result = validateStatusFilter('draft');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/active.*closed/);
    });

    it('valid — "active"', () => {
        expect(validateStatusFilter('active').valid).toBe(true);
    });

    it('valid — "closed"', () => {
        expect(validateStatusFilter('closed').valid).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// vote.helpers.js
// ─────────────────────────────────────────────────────────────────────────────

describe('validateVoteFields', () => {
    it('invalid — voterId відсутній', () => {
        const result = validateVoteFields('', 'pollId', 'candidateId');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/voterId/);
    });

    it('invalid — pollId відсутній', () => {
        const result = validateVoteFields('voter', '', 'candidateId');
        expect(result.valid).toBe(false);
    });

    it('invalid — candidateId відсутній', () => {
        const result = validateVoteFields('voter', 'poll', '');
        expect(result.valid).toBe(false);
    });

    it('invalid — всі поля відсутні', () => {
        const result = validateVoteFields(undefined, undefined, undefined);
        expect(result.valid).toBe(false);
    });

    it('valid — усі поля присутні', () => {
        const result = validateVoteFields('voter', 'poll', 'candidate');
        expect(result.valid).toBe(true);
    });
});

describe('validateVoteStatusQuery', () => {
    it('invalid — voterId відсутній', () => {
        const result = validateVoteStatusQuery('', 'pollId');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/voterId/);
    });

    it('invalid — pollId відсутній', () => {
        const result = validateVoteStatusQuery('voter', '');
        expect(result.valid).toBe(false);
    });

    it('valid — обидва поля присутні', () => {
        const result = validateVoteStatusQuery('voter', 'poll');
        expect(result.valid).toBe(true);
    });
});

describe('validateDeleteVoteFields', () => {
    it('invalid — voterId відсутній', () => {
        const result = validateDeleteVoteFields('', 'pollId');
        expect(result.valid).toBe(false);
    });

    it('invalid — pollId відсутній', () => {
        const result = validateDeleteVoteFields('voterId', '');
        expect(result.valid).toBe(false);
    });

    it('valid — обидва поля присутні', () => {
        const result = validateDeleteVoteFields('voter', 'poll');
        expect(result.valid).toBe(true);
    });
});

describe('validateCandidateBelongsToPoll', () => {
    it('invalid — кандидат належить до іншого опитування', () => {
        const candidate = {
            name: 'Test',
            poll: { toString: () => 'other-poll-id' },
        };
        const poll = { _id: { toString: () => 'this-poll-id' } };
        const result = validateCandidateBelongsToPoll(candidate, poll);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/не бере участі/);
    });

    it('valid — кандидат належить до правильного опитування', () => {
        const id = '507f1f77bcf86cd799439011';
        const candidate = { name: 'Test', poll: { toString: () => id } };
        const poll = { _id: { toString: () => id } };
        const result = validateCandidateBelongsToPoll(candidate, poll);
        expect(result.valid).toBe(true);
    });
});

describe('validatePollIsActive', () => {
    it('invalid — опитування закрите', () => {
        const poll = { status: 'closed', title: 'Ended Poll' };
        const result = validatePollIsActive(poll);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/завершено/);
    });

    it('valid — опитування активне', () => {
        const poll = { status: 'active', title: 'Active Poll' };
        const result = validatePollIsActive(poll);
        expect(result.valid).toBe(true);
    });
});
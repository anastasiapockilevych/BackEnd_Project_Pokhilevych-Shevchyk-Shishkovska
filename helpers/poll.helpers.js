/**
 * Helper functions for poll validation.
 * Centralizes all validation logic to keep controllers clean.
 */

/**
 * Validates poll title field.
 * @param {string} title
 * @returns {{ valid: boolean, error?: string }}
 */
const validatePollTitle = (title) => {
    if (!title || title.trim() === '') {
        return { valid: false, error: 'Поле "title" є обов\'язковим і не може бути порожнім.' };
    }
    if (title.trim().length < 5) {
        return { valid: false, error: 'Назва опитування повинна містити щонайменше 5 символів.' };
    }
    if (title.trim().length > 200) {
        return { valid: false, error: 'Назва опитування не може перевищувати 200 символів.' };
    }
    return { valid: true };
};

/**
 * Validates the candidates array provided during poll creation.
 * @param {Array} candidates
 * @returns {{ valid: boolean, error?: string }}
 */
const validateCandidatesList = (candidates) => {
    if (!Array.isArray(candidates)) {
        return { valid: false, error: 'Поле "candidates" має бути масивом об\'єктів.' };
    }
    if (candidates.length < 2) {
        return { valid: false, error: 'Опитування повинно містити щонайменше 2 кандидати.' };
    }
    if (candidates.length > 50) {
        return { valid: false, error: 'Кількість кандидатів не може перевищувати 50.' };
    }
    for (let i = 0; i < candidates.length; i++) {
        if (!candidates[i].name || candidates[i].name.trim() === '') {
            return { valid: false, error: `Кандидат #${i + 1}: поле "name" є обов'язковим.` };
        }
    }
    const names = candidates.map((c) => c.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
        return { valid: false, error: 'Список кандидатів містить повторювані імена.' };
    }
    return { valid: true };
};

/**
 * Validates a single candidate name field.
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
const validateCandidateName = (name) => {
    if (!name || name.trim() === '') {
        return { valid: false, error: 'Поле "name" є обов\'язковим.' };
    }
    return { valid: true };
};

/**
 * Validates the poll status query parameter.
 * @param {string} status
 * @returns {{ valid: boolean, error?: string }}
 */
const validateStatusFilter = (status) => {
    if (!['active', 'closed'].includes(status)) {
        return {
            valid: false,
            error: 'Параметр "status" може бути лише "active" або "closed".',
        };
    }
    return { valid: true };
};

module.exports = {
    validatePollTitle,
    validateCandidatesList,
    validateCandidateName,
    validateStatusFilter,
};
/**
 * Helper functions for vote validation.
 * Centralizes all validation logic to keep controllers clean.
 */

/**
 * Validates that all required vote fields are present.
 * @param {string} voterId
 * @param {string} pollId
 * @param {string} candidateId
 * @returns {{ valid: boolean, error?: string }}
 */
const validateVoteFields = (voterId, pollId, candidateId) => {
    if (!voterId || !pollId || !candidateId) {
        return {
            valid: false,
            error: 'Необхідно вказати всі поля: "voterId", "pollId", "candidateId".',
        };
    }
    return { valid: true };
};

/**
 * Validates that required query parameters for vote status check are present.
 * @param {string} voterId
 * @param {string} pollId
 * @returns {{ valid: boolean, error?: string }}
 */
const validateVoteStatusQuery = (voterId, pollId) => {
    if (!voterId || !pollId) {
        return {
            valid: false,
            error: 'Необхідно вказати query-параметри "voterId" та "pollId".',
        };
    }
    return { valid: true };
};

/**
 * Checks that a candidate belongs to the given poll.
 * @param {Object} candidate - Mongoose Candidate document
 * @param {Object} poll - Mongoose Poll document
 * @returns {{ valid: boolean, error?: string }}
 */
const validateCandidateBelongsToPoll = (candidate, poll) => {
    if (candidate.poll.toString() !== poll._id.toString()) {
        return {
            valid: false,
            error: `Кандидат "${candidate.name}" не бере участі у цьому опитуванні.`,
        };
    }
    return { valid: true };
};

/**
 * Checks that a poll is still active (not closed).
 * @param {Object} poll - Mongoose Poll document
 * @returns {{ valid: boolean, error?: string }}
 */
const validatePollIsActive = (poll) => {
    if (poll.status === 'closed') {
        return {
            valid: false,
            error: `Опитування "${poll.title}" вже завершено. Голосування не приймається.`,
        };
    }
    return { valid: true };
};

module.exports = {
    validateVoteFields,
    validateVoteStatusQuery,
    validateCandidateBelongsToPoll,
    validatePollIsActive,
};
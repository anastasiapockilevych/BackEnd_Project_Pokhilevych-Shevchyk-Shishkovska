const Poll = require('../models/poll.model');
const Candidate = require('../models/candidate.model');
const Ballot = require('../models/ballot.model');
const {
    validatePollTitle,
    validatePollCategory,
    validateCandidatesList,
    validateCandidateName,
    validateStatusFilter,
    validateCategoryFilter,
} = require('../helpers/poll.helpers');

const createPoll = async (req, res, next) => {
    try {
        const { title, category, description, candidates } = req.body;

        const titleValidation = validatePollTitle(title);
        if (!titleValidation.valid) {
            return res.status(400).json({ error: titleValidation.error });
        }

        const categoryValidation = validatePollCategory(category);
        if (!categoryValidation.valid) {
            return res.status(400).json({ error: categoryValidation.error });
        }

        const existing = await Poll.findOne({ title: title.trim() });
        if (existing) {
            return res.status(409).json({
                error: `Опитування з назвою "${title.trim()}" вже існує.`,
            });
        }

        if (candidates !== undefined) {
            const candidatesValidation = validateCandidatesList(candidates);
            if (!candidatesValidation.valid) {
                return res.status(400).json({ error: candidatesValidation.error });
            }
        }

        const poll = await Poll.create({
            title: title.trim(),
            category,
            description: description ? description.trim() : undefined,
            status: 'active',
        });

        let createdCandidates = [];

        if (candidates && candidates.length > 0) {
            const candidatesData = candidates.map((c) => ({
                name: c.name.trim(),
                party: c.party ? c.party.trim() : undefined,
                poll: poll._id,
                votesCount: 0,
            }));
            createdCandidates = await Candidate.insertMany(candidatesData);
        }

        return res.status(201).json({
            message: 'Опитування успішно створено.',
            poll,
            candidates: createdCandidates,
        });
    } catch (error) {
        next(error);
    }
};

const getAllPolls = async (req, res, next) => {
    try {
        const { status, category } = req.query;

        const filter = {};

        if (status) {
            const statusValidation = validateStatusFilter(status);
            if (!statusValidation.valid) {
                return res.status(400).json({ error: statusValidation.error });
            }
            filter.status = status;
        }

        if (category) {
            const categoryValidation = validateCategoryFilter(category);
            if (!categoryValidation.valid) {
                return res.status(400).json({ error: categoryValidation.error });
            }
            filter.category = category;
        }

        const polls = await Poll.find(filter).sort({ createdAt: -1 });

        return res.status(200).json(polls);
    } catch (error) {
        next(error);
    }
};

const getPollById = async (req, res, next) => {
    try {
        const poll = await Poll.findById(req.params.pollId);

        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        const candidates = await Candidate.find({ poll: poll._id }).select('name party votesCount');

        return res.status(200).json({ poll, candidates });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID опитування.' });
        }
        next(error);
    }
};

const addCandidate = async (req, res, next) => {
    try {
        const { pollId } = req.params;
        const { name, party } = req.body;

        const nameValidation = validateCandidateName(name);
        if (!nameValidation.valid) {
            return res.status(400).json({ error: nameValidation.error });
        }

        const poll = await Poll.findById(pollId);

        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        if (poll.status === 'closed') {
            return res.status(400).json({
                error: 'Неможливо додати кандидата до завершеного опитування.',
            });
        }

        const duplicate = await Candidate.findOne({
            poll: poll._id,
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        });

        if (duplicate) {
            return res.status(409).json({
                error: `Кандидат з іменем "${name.trim()}" вже зареєстрований у цьому опитуванні.`,
            });
        }

        const candidate = await Candidate.create({
            name: name.trim(),
            party: party ? party.trim() : undefined,
            poll: poll._id,
            votesCount: 0,
        });

        return res.status(201).json({
            message: 'Кандидата успішно додано.',
            candidate,
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID.' });
        }
        next(error);
    }
};

const closePoll = async (req, res, next) => {
    try {
        const poll = await Poll.findById(req.params.pollId);

        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        if (poll.status === 'closed') {
            return res.status(400).json({ error: 'Опитування вже закрито.' });
        }

        poll.status = 'closed';
        await poll.save();

        return res.status(200).json({
            message: 'Опитування успішно закрито.',
            poll,
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID опитування.' });
        }
        next(error);
    }
};

const deletePoll = async (req, res, next) => {
    try {
        const poll = await Poll.findById(req.params.pollId);

        if (!poll) {
            return res.status(404).json({ error: 'Опитування не знайдено.' });
        }

        if (poll.status === 'active') {
            return res.status(400).json({
                error: 'Неможливо видалити активне опитування. Спочатку закрийте його через PATCH /polls/:pollId/close.',
            });
        }

        // Каскадне видалення: бюлетені → кандидати → опитування
        const candidateIds = await Candidate.find({ poll: poll._id }).distinct('_id');
        await Ballot.deleteMany({ poll: poll._id });
        await Candidate.deleteMany({ poll: poll._id });
        await Poll.findByIdAndDelete(poll._id);

        return res.status(200).json({
            message: `Опитування "${poll.title}" та всі пов'язані дані успішно видалено.`,
            deleted: {
                pollId: poll._id,
                candidatesRemoved: candidateIds.length,
            },
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Невалідний формат ID опитування.' });
        }
        next(error);
    }
};

module.exports = {
    createPoll,
    getAllPolls,
    getPollById,
    addCandidate,
    closePoll,
    deletePoll,
};
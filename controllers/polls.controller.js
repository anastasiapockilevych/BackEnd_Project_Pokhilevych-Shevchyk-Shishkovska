const Poll = require('../models/poll.model');
const Candidate = require('../models/candidate.model');

const createPoll = async (req, res, next) => {
  try {
    const { title, description, candidates } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        error: 'Поле "title" є обов\'язковим і не може бути порожнім.',
      });
    }

    if (title.trim().length < 5) {
      return res.status(400).json({
        error: 'Назва опитування повинна містити щонайменше 5 символів.',
      });
    }

    if (title.trim().length > 200) {
      return res.status(400).json({
        error: 'Назва опитування не може перевищувати 200 символів.',
      });
    }

    const existing = await Poll.findOne({ title: title.trim() });
    if (existing) {
      return res.status(409).json({
        error: `Опитування з назвою "${title.trim()}" вже існує.`,
      });
    }

    if (candidates !== undefined) {
      if (!Array.isArray(candidates)) {
        return res.status(400).json({
          error: 'Поле "candidates" має бути масивом об\'єктів.',
        });
      }

      if (candidates.length < 2) {
        return res.status(400).json({
          error: 'Опитування повинно містити щонайменше 2 кандидати.',
        });
      }

      if (candidates.length > 50) {
        return res.status(400).json({
          error: 'Кількість кандидатів не може перевищувати 50.',
        });
      }

      for (let i = 0; i < candidates.length; i++) {
        if (!candidates[i].name || candidates[i].name.trim() === '') {
          return res.status(400).json({
            error: `Кандидат #${i + 1}: поле "name" є обов'язковим.`,
          });
        }
      }

      const names = candidates.map((c) => c.name.trim().toLowerCase());
      if (new Set(names).size !== names.length) {
        return res.status(400).json({
          error: 'Список кандидатів містить повторювані імена.',
        });
      }
    }

    const poll = await Poll.create({
      title: title.trim(),
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
    const { status } = req.query;

    const filter = {};
    if (status) {
      if (!['active', 'closed'].includes(status)) {
        return res.status(400).json({
          error: 'Параметр "status" може бути лише "active" або "closed".',
        });
      }
      filter.status = status;
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

    const candidates = await Candidate.find({ poll: poll._id }).select(
      'name party votesCount'
    );

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

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Поле "name" є обов\'язковим.' });
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

module.exports = {
  createPoll,
  getAllPolls,
  getPollById,
  addCandidate,
  closePoll,
};
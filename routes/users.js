const express = require('express');
const { getUsers, addUser } = require('../controllers/users.controller');

const router = express.Router();

/* GET users listing. */
router.get('/', getUsers);

router.post('/new', addUser);

module.exports = router;

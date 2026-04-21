const Department = require('../models/department.model');

/**
 * @swagger
 * definitions:
 *   User:
 *     type: object
 *     required:
 *        - id
 *        - firstName
 *        - lastName
 *        - email
 *     properties:
 *       id:
 *         type: number
 *       firstName:
 *         type: string
 *       lastName:
 *         type: string
 *       email:
 *         type: string
 */
const users = [
    {
        id: 1,
        firstName: 'FirstName1',
        lastName: 'LastName1',
        email: 'a1@b.com',
    },
    {
        id: 2,
        firstName: 'FirstName2',
        lastName: 'LastName2',
        email: 'a2@b.com',
    },
    {
        id: 3,
        firstName: 'FirstName3',
        lastName: 'LastName3',
        email: 'a3@b.com',
    },
];

/**
 * @swagger
 * /users:
 *   get:
 *     description: Get all users
 *     tags:
 *       - Employee
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: All users
 *         schema:
 *           $ref: '#/definitions/User'
 *       500:
 *         description: Internal server error
 */
const getUsers = async (req, res) => {
    // Demo implementation
    // const departments = await Department.getAll();
    // console.log(departments);
    res.status(200).json(users);
};

const addUser = async (req, res) => {
    const user = req.body;
    user.id = users.length + 1;
    users.push(user);
    res.status(201).json(user);
};

module.exports = {
    getUsers,
    addUser,
};

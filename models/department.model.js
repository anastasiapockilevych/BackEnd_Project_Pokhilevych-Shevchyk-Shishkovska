const db = require('./db');

// constructor
// eslint-disable-next-line func-names
const Department = function (department) {
    this.id = department.id;
    this.id_group = department.id_group;
    this.department_name = department.department_name;
};

Department.getAll = async () => {
    const query = 'SELECT * FROM department';
    const rows = await db.query(query);
    return rows;
};

module.exports = Department;

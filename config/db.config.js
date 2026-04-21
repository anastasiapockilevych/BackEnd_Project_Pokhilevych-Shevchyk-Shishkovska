const config = {
    db: {
        /* don't expose password or any sensitive info, done only for demo */
        host: 'localhost',
        user: 'app_user', // Provide your user here
        password: 'app_pwd', // Provide your password here
        database: 'employees', // Provide your db name here
        connectTimeout: 60000,
    },
    listPerPage: 10,
};
module.exports = config;

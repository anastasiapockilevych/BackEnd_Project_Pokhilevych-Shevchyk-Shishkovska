const mongoose = require('mongoose');
require('dotenv').config();

mongoose
    .connect(process.env.MONGO_URI, { family: 4 })
    .then(() => console.log('✅ Успішно підключено до MongoDB Atlas!'))
    .catch(error => console.log('❌ Помилка підключення до бази:', error));

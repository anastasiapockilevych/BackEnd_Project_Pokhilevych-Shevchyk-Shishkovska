const mongoose = require('mongoose');
require('dotenv').config();

// Додаємо { family: 4 } ось сюди другим параметром:
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("✅ Успішно підключено до MongoDB Atlas!"))
  .catch((error) => console.log("❌ Помилка підключення до бази:", error));
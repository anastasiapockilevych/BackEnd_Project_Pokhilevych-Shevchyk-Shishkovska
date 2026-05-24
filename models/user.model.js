const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 6 },
        fullName: { type: String, required: true, trim: true },
        role: { type: String, enum: ['voter', 'admin'], default: 'voter' },
        // Прив'язка до Voter (після реєстрації)
        voterId: { type: String, unique: true, sparse: true },
    },
    { timestamps: true },
);

// Хешуємо пароль перед збереженням
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

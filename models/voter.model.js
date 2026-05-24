const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const voterSchema = new mongoose.Schema(
    {
        voterId: { type: String, required: true, unique: true, trim: true },
        fullName: { type: String, trim: true },
        password: { type: String, default: null }, // null = ще не зареєстрований через auth
        role: { type: String, enum: ['voter', 'admin'], default: 'voter' },
    },
    { timestamps: true },
);

voterSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;
    this.password = await bcrypt.hash(this.password, 12);
});

voterSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Voter', voterSchema);

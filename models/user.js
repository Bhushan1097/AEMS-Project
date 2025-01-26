const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    user_Id: {
        type: String,
        required: true,
        unique: true,
    },
    mac_Id: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    mobile_no: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    address: {
        type: String,
        required: true,
    },
    pincode: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^[0-9]{6}$/.test(v); // Validates a 6-digit pincode
            },
            message: (props) => `${props.value} is not a valid pincode!`,
        },
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now,
    },
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    try {
        // Check if the password is being modified
        if (!this.isModified('password')) {
            return next();
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10); // Generate salt with 10 rounds
        this.password = await bcrypt.hash(this.password, salt); // Hash the password with the salt

        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;

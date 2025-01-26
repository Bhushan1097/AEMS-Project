const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    admin_Id: {
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
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); // Validates standard email format
            },
            message: (props) => `${props.value} is not a valid email address!`,
        },
    },
    mobile_no: {
        type: String,
        required: [true, "Mobile number is required"],
        validate: {
            validator: function (v) {
                return /^[6-9]\d{9}$/.test(v); // Validates Indian mobile numbers
            },
            message: (props) => `${props.value} is not a valid mobile number! Must be 10 digits starting with 6-9.`,
        },
    },

    created_at: {
        type: Date,
        required: true,
        default: Date.now,
    },
});

// Pre-save middleware to hash password
adminSchema.pre('save', async function (next) {
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
adminSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;

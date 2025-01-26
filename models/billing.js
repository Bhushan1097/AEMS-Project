const mongoose = require("mongoose");

const billingSchema = new mongoose.Schema({
    user_Id: {
        type: String, // Reference to User model's ObjectId
        ref: 'User', // This links the user_Id to the User collection
        required: true,
    },

    mac_Id: {
        type: String,
        ref: 'User', 
        required: true,
    },

    amount_paid: {
        type: Number,
        required: true,
    },
    amount_received: {
        type: Number,
        default: 0,
    },
    payment_status: {
        type: String,
        enum: ['Paid', 'Pending', 'Failed'],
        required: true,
    },
    transaction_id: {
        type: String,
        required: true,
        unique: true,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
    },
});

// Middleware to update the `updated_at` field automatically
billingSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

const Billing = mongoose.model("Billing", billingSchema);

module.exports = Billing;
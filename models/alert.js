const mongoose = require('mongoose');

// Define the schema for Alert
const alertSchema = new mongoose.Schema({
    mac_Id: {
        type: String,
        ref: 'User',
        required: true, // MAC ID is mandatory
    },
    user_Id: {
        type:String, // Reference to the User model
        ref: 'User', // Ensures the user is related to the alert
        required: true,
    },
    alert: {
        type: String,
        required: true, // Alert description or message
    },
    time_stamp: {
        type: Date,
        default: Date.now, // Automatically sets the current time if not provided
    },
});

// Create and export the Alert model
const Alert = mongoose.model('Alert', alertSchema);
module.exports = Alert;

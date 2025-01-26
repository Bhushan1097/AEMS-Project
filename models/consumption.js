const mongoose = require("mongoose");

// Define the schema for energy consumption
const consumptionSchema = new mongoose.Schema({
    mac_Id: {
        type: String, // Reference to User model
        ref: 'user',
        required: true,
    },

    time_stamp: {
        type: Date, // Time the data was recorded
        default: Date.now, // Set default system time
        required: true
    },
    
    consumption: {
        type: Number, // Energy consumed (e.g., in kWh)
        required: true
    },
    relay_status: {
        type: String, // Relay status (e.g., "ON", "OFF")
        enum: ["ON", "OFF", "FAULT"], // Valid relay statuses
        required: true
    },
    voltage: {
        type: Number, // Voltage measured (e.g., in volts)
        required: true
    },
    current: {
        type: Number, // Current measured (e.g., in amperes)
    },
    power: {
        type: Number, // Power consumption (e.g., in watts or kW)
    },
    balance: {
        type: Number, // Prepaid balance remaining (e.g., in currency)
    },
    power_factor: {
        type: Number, // Power factor (e.g., between 0 and 1)
    },
    frequency: {
        type: Number, // Frequency measured (e.g., in Hz)
    },
    reset_time: {
        type: Date, // When the data was last reset
        default: Date.now // Default to current time
    },
    update_time: { 
        type: Date, // Custom field for when the record is created
        default: Date.now // Default to the current date and time
    }
}, { timestamps: true }); // Automatically adds 'createdAt' and 'updatedAt' fields to the schema

// Create the model from the schema
const Consumption = mongoose.model("Consumption", consumptionSchema);

module.exports = Consumption;

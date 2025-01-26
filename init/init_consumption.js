const mongoose = require("mongoose");
const Consumption = require("../models/consumption.js"); 

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/SmartEnergyMeter", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB");
    insertDummyData();
}).catch((err) => {
    console.error("Error connecting to MongoDB:", err);
});

// Function to insert dummy data
async function insertDummyData() {
    const mac_Id = "MAC00123E"; // MAC address
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60); // Start date 60 days ago

    try {
        // Delete all existing data in the collection
        await Consumption.deleteMany({});
        console.log("All existing data deleted.");

        const data = [];

        // Generate 60 days of data (2 readings per day)
        for (let i = 0; i < 60; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);

            // Two readings per day
            for (let j = 0; j < 2; j++) {
                const time = new Date(day);
                time.setHours(j === 0 ? 8 : 20); // 8 AM and 8 PM readings

                const reading = {
                    mac_Id: mac_Id,
                    time_stamp: time,
                    consumption: parseFloat((Math.random() * 10).toFixed(2)), // Random consumption between 0 and 10 kWh
                    relay_status: Math.random() > 0.1 ? "ON" : "OFF", // 90% chance of being "ON"
                    voltage: parseFloat((Math.random() * (240 - 220) + 220).toFixed(2)), // Random voltage between 220V and 240V
                    current: parseFloat((Math.random() * (10 - 5) + 5).toFixed(2)), // Random current between 5A and 10A
                    power: parseFloat((Math.random() * 2000 + 1000).toFixed(2)), // Random power consumption between 1000W and 3000W
                    balance: parseFloat((Math.random() * 50).toFixed(2)), // Random balance between 0 and 50 currency
                    power_factor: parseFloat((Math.random() * (1 - 0.7) + 0.7).toFixed(2)), // Random power factor between 0.7 and 1
                    frequency: parseFloat((Math.random() * (60 - 50) + 50).toFixed(2)), // Random frequency between 50Hz and 60Hz
                    reset_time: time, // Set reset time to the same as the timestamp
                    created_at: new Date() // Timestamp for record creation
                };

                data.push(reading);
            }
        }

        // Insert the data into the database
        await Consumption.insertMany(data);
        console.log("Dummy data inserted successfully!");
    } catch (err) {
        console.error("Error during data insertion:", err);
    } finally {
        mongoose.disconnect(); // Disconnect from MongoDB
    }
}

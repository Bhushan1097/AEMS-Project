const mongoose = require("mongoose");
const Alert = require("../models/alert.js"); // Adjust the path to your alert model as needed
const User = require("../models/user.js"); // Adjust the path to your user model as needed

// Main function to connect to the database and initialize the data
main()
    .then(() => {
        console.log("Connection successful");
        return deleteAllAlerts(); // Delete existing alerts before inserting new ones
    })
    .then(() => {
        return insertAlerts(); // Insert new alerts
    })
    .then(() => {
        console.log("Alerts inserted successfully");
        mongoose.connection.close(); // Close the database connection
    })
    .catch((err) => {
        console.error(err);
        mongoose.connection.close(); // Ensure the connection is closed on error
    });

// Function to connect to MongoDB
async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/SmartEnergyMeter", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}

// Function to delete all alerts from the database
async function deleteAllAlerts() {
    await Alert.deleteMany({});
    console.log("All alerts deleted");
}

// Function to insert new alerts into the database
async function insertAlerts() {
    // Get the first few users from the User collection to associate with alerts
    const users = await User.find().limit(5); // Fetch up to 5 users from the User collection
    
    let allAlerts = [
        {
            mac_Id: "MAC00123A",
            user_Id: "USR001", // Use the first user's user_Id
            alert: "Low Balance Alert",
            time_stamp: new Date(),
        },
        {
            mac_Id: "MAC00123B",
            user_Id:  "USR005", // Use the second user's user_Id
            alert: "High Power Consumption",
            time_stamp: new Date(),
        },
        {
            mac_Id: "MAC00123C",
            user_Id:  "USR002", // Use the third user's user_Id
            alert: "Power Surge Detected",
            time_stamp: new Date(),
        },
        {
            mac_Id: "MAC00123D",
            user_Id:  "USR003", // Use the fourth user's user_Id
            alert: "Device Offline",
            time_stamp: new Date(),
        },
        {
            mac_Id: "MAC00123E",
            user_Id: "USR004", // Use the fifth user's user_Id
            alert: "Overload Warning",
            time_stamp: new Date(),
        },
    ];

    // Insert the alerts into the database
    await Alert.insertMany(allAlerts);
}

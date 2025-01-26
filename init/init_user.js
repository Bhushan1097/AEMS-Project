const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.js"); // Adjust the path to your user model as needed

// Main function to connect to the database and initialize the data
main()
    .then(() => {
        console.log("Connection successful");
        return deleteAllUsers(); // Delete existing users before inserting new ones
    })
    .then(() => {
        return insertUsers(); // Insert new users
    })
    .then(() => {
        console.log("Users inserted successfully");
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

// Function to delete all users from the database
async function deleteAllUsers() {
    await User.deleteMany({});
    console.log("All users deleted");
}

// Function to insert new users into the database
async function insertUsers() {
    let allUsers = [
        {
            user_Id: "USR001",
            mac_Id: "MAC00123A",
            name: "Rohan Sharma",
            username: "rohan123",
            password: "password123",
            mobile_no: "9876543210",
            email: "rohan@example.com",
            address: "123 MG Road, Pune",
            pincode: "411001",
            created_at: new Date(),
        },
        {
            user_Id: "USR002",
            mac_Id: "MAC00123B",
            name: "Vaishnavi Patil",
            username: "vaishnavi98",
            password: "securePass",
            mobile_no: "8765432109",
            email: "vaishnavi@example.com",
            address: "67 Koregaon Park, Pune",
            pincode: "411036",
            created_at: new Date(),
        },
        {
            user_Id: "USR003",
            mac_Id: "MAC00123C",
            name: "Bhushan Desai",
            username: "bhushanD",
            password: "pass9876",
            mobile_no: "7654321098",
            email: "bhushan@example.com",
            address: "45 Viman Nagar, Pune",
            pincode: "411014",
            created_at: new Date(),
        },
        {
            user_Id: "USR004",
            mac_Id: "MAC00123D",
            name: "Aniket Kulkarni",
            username: "aniket_89",
            password: "kulkarniPass",
            mobile_no: "6543210987",
            email: "aniket@example.com",
            address: "21 Shivaji Nagar, Pune",
            pincode: "411005",
            created_at: new Date(),
        },
        {
            user_Id: "USR005",
            mac_Id: "MAC00123E",
            name: "Sarita Joshi",
            username: "sarita",
            password: "123",
            mobile_no: "5432109876",
            email: "sarita@example.com",
            address: "11 Baner Road, Pune",
            pincode: "411045",
            created_at: new Date(),
        },
    ];

    // Hash passwords for each user
    for (let user of allUsers) {
        const salt = await bcrypt.genSalt(10); // Generate salt
        user.password = await bcrypt.hash(user.password, salt); // Hash the password
    }

    // Insert the hashed users into the database
    await User.insertMany(allUsers);
}

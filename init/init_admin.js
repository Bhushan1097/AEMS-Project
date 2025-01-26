const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/admin.js"); // Adjust the path to your admin model as needed

// Main function to connect to the database and initialize the data
main()
    .then(() => {
        console.log("Database connection successful");
        return deleteAllAdmins(); // Delete existing admins before inserting new ones
    })
    .then(() => {
        return insertAdmins(); // Insert new admins
    })
    .then(() => {
        console.log("Admins inserted successfully");
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

// Function to delete all admins from the database
async function deleteAllAdmins() {
    await Admin.deleteMany({});
    console.log("All admins deleted");
}

// Function to insert new admins into the database
async function insertAdmins() {
    let allAdmins = [
        {
            admin_Id: "ADM001",
            name: "Admin Rohan",
            username: "admin_rohan",
            password: "adminPass123",
            email: "admin.rohan@example.com",
            mobile_no: "9876543210",
            created_at: new Date(),
        },
        {
            admin_Id: "ADM002",
            name: "Admin Vaishnavi",
            username: "admin_vaishnavi",
            password: "adminSecure98",
            email: "admin.vaishnavi@example.com",
            mobile_no: "8765432109",
            created_at: new Date(),
        },
        {
            admin_Id: "ADM003",
            name: "Admin Bhushan",
            username: "admin_bhushan",
            password: "bhushanPass123",
            email: "admin.bhushan@example.com",
            mobile_no: "7654321098",
            created_at: new Date(),
        },
        {
            admin_Id: "ADM004",
            name: "Admin Aniket",
            username: "admin_aniket",
            password: "kulkarniAdmin",
            email: "admin.aniket@example.com",
            mobile_no: "6543210987",
            created_at: new Date(),
        },
        {
            admin_Id: "ADM005",
            name: "Admin Sarita",
            username: "sarita",
            password: "123",
            email: "admin.sarita@example.com",
            mobile_no: "9432109876",
            created_at: new Date(),
        },
    ];

    // Hash passwords for each admin
    for (let admin of allAdmins) {
        const salt = await bcrypt.genSalt(10); // Generate salt
        admin.password = await bcrypt.hash(admin.password, salt); // Hash the password
    }

    // Insert the hashed admins into the database
    await Admin.insertMany(allAdmins);
}

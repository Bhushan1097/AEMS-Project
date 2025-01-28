require("dotenv").config(); // Load env in all environments

if (process.env.NODE_ENV === "production") {
    console.log("Running in production mode.");
}

const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoStore=require("connect-mongo");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); 
const ejsMate = require('ejs-mate');
const { v4: uuidv4 } = require('uuid'); 
const app = express();
const port = 8040;
const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");

// Connect to MongoDB
main()
    .then(() => console.log("Connection to MongoDB successful"))
    .catch((err) => console.log(err));

async function main() {
    await mongoose.connect(process.env.ATLASDB_URL);
}

// Import models
const User = require('./models/user');
const Consumption = require('./models/consumption');
const Alert = require('./models/alert');
const Billing = require('./models/billing');
const Admin = require("./models/admin"); 


// Middleware
// Set the view engine to EJS and use ejsMate

app.set('view engine', 'ejs');
app.engine('ejs', ejsMate);
app.use(express.json());

// Middleware for static files and form data
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

//mongostore

const store=mongoStore.create(
    {
        mongoUrl:process.env.ATLASDB_URL,
        crypto:{
            secret:process.env.SECRET,
        },
        touchAfter:3600*24,
    }
);

// Session management

app.use(session({
    store:store,
    secret: process.env.SECRET, // Replace with a secure key
    resave: false,
    saveUninitialized:true,
    cookie:{
      expires:Date.now()+7*1000*60*60*24,
      maxAge:7*1000*60*60*24,
      httpOnly:true,
    }, // Set to true if using HTTPS
}));

store.on("error",()=>{
console.log("error in mongo session store",err);
})




// Middleware to disable caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Middleware for authentication
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/');
    }
}


function Authenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/admin-login');
}





// Login route
app.get('/', (req, res) => {
    res.render('pages/login');
});

app.post('/login', wrapAsync(async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).send('Invalid username or password');
        }

        // Compare hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send('Invalid username or password');
        }

        req.session.user = user;
        req.session.save(() => {
            res.redirect('/dashboard');
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('An error occurred during login. Please try again.');
    }
}));



// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Failed to log out');
        }
        res.redirect('/');
    });
});

// Registration route (GET)
app.get('/register', (req, res) => {
    res.render('pages/register');
});

// Registration route (POST)
app.post('/register', wrapAsync(async (req, res) => {
    try {
        const { 
            user_Id,
            username, 
            password, 
            mac_Id, 
            name, 
            email, 
            mobile_no, 
            address, 
            pincode, 
        } = req.body;

        if (!user_Id || !username || !password || !mac_Id || !name || !email || !mobile_no || !address || !pincode) {
            return res.status(400).send('All required fields must be filled.');
        }

        const existingUserId = await User.findOne({ user_Id });
        if (existingUserId) {
            return res.status(409).send('UserId already exists. Please choose a different one.');
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).send('Username already exists. Please choose a different one.');
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(409).send('User with email already exists. Please choose a different one.');
        }

        const existingMacId = await User.findOne({ mac_Id });
        if (existingMacId) {
            return res.status(409).send('MAC ID is already registered.');
        }


        const newUser = new User({
            user_Id,
            username,
            password, // Store hashed password
            mac_Id,
            name,
            email,
            mobile_no,
            address, 
            pincode,
        });

        await newUser.save();
        res.redirect('/?message=RegistrationSuccessful');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('An error occurred during registration. Please try again.');
    }
}));



// POST route to receive data
app.post(
    "/api/consumption",
    (wrapAsync(async (req, res) => {
        try {
            // Validate incoming data
            const {
                mac_Id,
                time_stamp,
                consumption,
                relay_status,
                voltage,
                current,
                power,
                balance,
                power_factor,
                frequency,
                reset_time,
                update_time,
            } = req.body;

            console.log("recived bode",req.body);

            // Ensure all required fields are present
            if (!mac_Id || !time_stamp || typeof relay_status === "undefined") {
                console.error("Missing required fields");
                return res.status(400).json({ error: "Missing required fields" });
            }

            // Fetch the last consumption record for the given mac_Id
            let rel;
            const lastConsumption = await Consumption.findOne({ mac_Id }).sort({ time_stamp: -1 });
            if(!lastConsumption){
             rel=  relay_status;
            }else{
             rel = lastConsumption ? lastConsumption.relay_status : null;
            }

            // Fetch the billing record associated with this mac_Id
            const billingRecord = await Billing.findOne({ mac_Id }).sort({ created_at: -1 });
            let amount_received;
            if (!billingRecord) {
               amount_received=0;
            }else{
                amount_received=billingRecord.amount_received;
            }
            console.log("Amount Recived : Rs",amount_received);

            let newBalance = balance;
            let newTime=time_stamp;
            console.log("newTime",newBalance);
            let message = "Data Saved Successfully";

            // Check if amount_received in Billing model is greater than 0
            if (amount_received > 0) {
                newBalance +=amount_received; // Add amount_received to the current balance

                // Update the Billing model to set amount_recived to 0
                billingRecord.amount_received = 0;
                await billingRecord.save();

                console.log("Amount received added to balance and reset in Billing model.");

            } else {
                console.log("No amount received to add. Balance remains unchanged.");
            }

            // Create a new Consumption record with the updated balance
            const newConsumption = new Consumption({
                mac_Id,
                time_stamp:newTime,
                consumption,
                relay_status,
                voltage,
                current,
                power,
                balance: newBalance,
                power_factor,
                frequency,
                reset_time: reset_time || new Date(), // Optional, defaults to current time if not provided
                update_time: update_time || new Date(), // Optional, defaults to current time if not provided
            });

            // Save the new Consumption record to the database
            const savedConsumption = await newConsumption.save();

            console.log("Data saved :", savedConsumption);
            
            // Send the response with updated data
            res.status(201).json({
                message,
                balance: newBalance,
                relayStatus: rel,
                timestamp: time_stamp,
            });
        } catch (err) {
            console.error("Error saving data:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    })
));


// POST route to receive alert data from meter

app.post(
    "/api/alert",
    wrapAsync(async (req, res) => {
        try {
            // Validate incoming data
            const {
                mac_Id,
                user_Id,
                alert,
                time_stamp,
            } = req.body;

            console.log("Incoming Alert Request:", req.body);

            // Ensure all required fields are present
            if (!mac_Id || !user_Id || !alert) {
                console.error("Missing required fields");
                return res.status(400).json({ error: "Missing required fields" });
            }

            // Create a new Alert record
            const newAlert = new Alert({
                mac_Id,
                user_Id,
                alert,
                time_stamp: time_stamp || new Date(), // Use provided time or default to current time
            });

            // Save the new Alert record to the database
            const savedAlert = await newAlert.save();

            console.log("Alert saved:", savedAlert);

            // Send response with saved alert data
            res.status(201).json({
                message: "Alert saved successfully",
                alert: savedAlert,
            });

        } catch (err) {
            console.error("Error saving alert:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    })
);




// Dashboard route

app.get('/dashboard', isAuthenticated, wrapAsync(async (req, res) => {
    try {
        const mac_Id = req.session.user.mac_Id;

        const latestConsumption = await Consumption.findOne({ mac_Id }).sort({ time_stamp: -1 });
        const latestBalance = latestConsumption ? latestConsumption.balance : 0;

        const user = await User.findOne({ mac_Id });
        if (!user) return res.status(404).send('User not found');

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);


        const [dailyConsumption, weeklyConsumption, monthlyConsumption] = await Promise.all([
            Consumption.aggregate([
                { $match: { mac_Id, time_stamp: { $gte: startOfDay } } },
                { $group: { _id: null, totalConsumption: { $sum: "$consumption" } } }
            ]),
            Consumption.aggregate([
                { $match: { mac_Id, time_stamp: { $gte: startOfWeek } } },
                { $group: { _id: null, totalConsumption: { $sum: "$consumption" } } }
            ]),
            Consumption.aggregate([
                { $match: { mac_Id, time_stamp: { $gte: startOfMonth } } },
                { $group: { _id: null, totalConsumption: { $sum: "$consumption" } } }
            ])
        ]);



        const [hourlyConsumption, dailyForWeekConsumption, dailyForMonthConsumption] = await Promise.all([
            Consumption.aggregate([
                { $match: { mac_Id, time_stamp: { $gte: startOfDay } } },
                {
                    $group: {
                        _id: { $hour: "$time_stamp" },
                        totalConsumption: { $sum: "$consumption" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Consumption.aggregate([
                { $match: { mac_Id, time_stamp: { $gte: startOfWeek } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$time_stamp" } },
                        totalConsumption: { $sum: "$consumption" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Consumption.aggregate([
                { $match: { mac_Id, time_stamp: { $gte: startOfMonth } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$time_stamp" } },
                        totalConsumption: { $sum: "$consumption" }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        // Construct `chartData`
        const chartData = {
            daily: {
                labels: hourlyConsumption.map((item) => item._id + ':00'), // Format hours
                data: hourlyConsumption.map((item) => item.totalConsumption)
            },
            weekly: {
                labels: dailyForWeekConsumption.map((item) => item._id), // Dates
                data: dailyForWeekConsumption.map((item) => item.totalConsumption)
            },
            monthly: {
                labels: dailyForMonthConsumption.map((item) => item._id), // Dates
                data: dailyForMonthConsumption.map((item) => item.totalConsumption)
            }
        };

        const consumptionData = {
            daily: dailyConsumption.length > 0 ? dailyConsumption[0].totalConsumption : 0,
            weekly: weeklyConsumption.length > 0 ? weeklyConsumption[0].totalConsumption : 0,
            monthly: monthlyConsumption.length > 0 ? monthlyConsumption[0].totalConsumption : 0,
        };

        res.render("pages/dashboard", {
            user,
            latestBalance,
            chartData, // Pass `chartData` to the template
            consumption: consumptionData
    
        });
    } catch (err) {
        console.error("Error fetching dashboard data:", err);
        res.status(500).send("Internal Server Error");
    }
}));


// Recharge route
app.post('/recharge', isAuthenticated, wrapAsync(async (req, res) => {
    try {

        const { amount } = req.body;
        const mac_Id = req.session.user.mac_Id;

        console.log("Amount Received:", amount); // Debugging

        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            console.log("Invalid amount detected."); // Debugging
            return res.status(400).json({ success: false, message: "Invalid amount." });
        }

        // Fetch the user's consumption data
        const consumption = await Consumption.findOne({ mac_Id }).sort({ time_stamp: -1 });
        if (!consumption) {
            console.log("Consumption data not found."); // Debugging
            return res.status(404).json({ success: false, message: "Consumption data not found." });
        }

        // Update balance
        const newBalance = (consumption.balance || 0) + parseFloat(amount);
        consumption.balance = newBalance;
        await consumption.save();

        console.log("Updated Balance:", newBalance); // Debugging

        // Record the recharge
        const newTransaction = new Billing({
            user_Id: req.session.user.user_Id,
            mac_Id,
            amount_paid: parseFloat(amount),
            amount_received: parseFloat(amount),
            payment_status: 'Paid',
            transaction_id: uuidv4(),
        });
        try {
            await newTransaction.save();
            console.log("Transaction saved successfully:", newTransaction);
        } catch (error) {
            console.error("Error saving transaction:", error);
        }
        res.json({ success: true, newBalance });
    } catch (err) {
        console.error("Error during recharge:", err); // Debugging
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}));


// Billing History route 

app.get('/billing', isAuthenticated, wrapAsync(async (req, res) => {
    try {
        const mac_Id = req.session.user.mac_Id; // Get mac_Id from session

        // Fetch billing information for the user based on mac_Id
        const billingHistory = await Billing.find({ mac_Id }).sort({ created_at: -1 }); // Sort by date (latest first)

        // Render the billing page with the fetched data
        res.render('pages/billing', { billingHistory });
    } catch (err) {
        console.error('Error fetching billing information:', err);
        res.status(500).send('Internal Server Error');
    }
}));


// Alerts route
app.get('/user-alerts', isAuthenticated, wrapAsync(async (req, res) => {
    try {
        const mac_Id = req.session.user.mac_Id;

        // Fetch alerts corresponding to the user's MAC ID
        const userAlerts = await Alert.find().sort({ time_stamp: -1 });


        // Render the alerts page and pass the alerts to the template
        res.render('pages/user-alerts', { alerts: userAlerts });
    } catch (error) {
        console.error("Error fetching alerts:", error);
        res.status(500).send("An error occurred while fetching alerts.");
    }
}));


app.get('/current-data', isAuthenticated, wrapAsync(async (req, res) => {
    // Retrieve the user data from the database or session
    const mac_Id = req.session.user.mac_Id;
    const user = await User.findOne({mac_Id});
    const consumption = await Consumption.findOne({ mac_Id }).sort({ time_stamp: -1 });
    // Pass the user data to the template
    res.render('pages/data', { user,consumption ,  error: null});
}));

app.get('/profile', isAuthenticated, wrapAsync(async (req, res) => {
    // Retrieve the user data from the database or session
    const user = await User.findOne({ mac_Id: req.session.user.mac_Id }); // Replace with actual user-fetching logic

    // Pass the user data to the template
    res.render('pages/profile', { user ,  error: null});
}));


//edit route 
// Profile Edit (POST) Route - Fetch user from session and render update form

app.post('/profile/edit', wrapAsync(async (req, res) => {
    try {
        const { password } = req.body;
        const user = req.session.user;  // Get the user from session

        if (!user) {
            // If session user doesn't exist, redirect to login
            return res.redirect('/');
        }

        // Compare entered password with the stored (hashed) password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // If password is incorrect, show an error message
            return res.render('pages/profile', { 
                user, 
                error: 'Incorrect password. Please try again.' 
            });
        }

        // If password is correct, render the profile edit form
        res.render('pages/update_profile', { user });

    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).send("An error occurred while fetching user data.");
    }
}));

 

// Profile Update Route
app.post('/profile/update', isAuthenticated, wrapAsync(async (req, res) => {
    const { name, password, mobile_no, email, address, pincode } = req.body;

    try {
        let updatedFields = { name, mobile_no, email, address, pincode };

        // If a new password is provided, hash it
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updatedFields.password = await bcrypt.hash(password, salt);
        }

        // Update user data in MongoDB
        const updatedUser = await User.findOneAndUpdate(
            { mac_Id: req.session.user.mac_Id }, // Use the mac_Id to find the user
            updatedFields,
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).send("User not found.");
        }

        // Update session data to reflect the changes
        req.session.user = updatedUser;

        res.redirect('/profile'); // Redirect to profile page after updating
    } catch (error) {
        console.error("Error updating profile:", error); // Log any errors
        res.status(500).send("Failed to update profile.");
    }
}));


app.get('/support', isAuthenticated, (req, res) => res.render('pages/support'));










//ADMIN CODE 









// Login route
app.get('/admin-login', (req, res) => {
    res.render('pages/admin-login', { error: req.query.error || null });
});

// Login route (POST)
app.post('/admin-login', wrapAsync(async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).render('pages/login', { error: 'All fields are required.' });
        }

        // Find user in the database
        const user = await Admin.findOne({ username }); // Or User model if applicable
        if (!user) {
            return res.status(401).render('pages/admin-login', { error: 'Invalid username or password.' });
        }

        // Compare hashed passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).render('pages/admin-login', { error: 'Invalid username or password.' });
        }

        // Save user info in session
        req.session.userId = user._id;
        req.session.admin = user; // Store the admin object in the session

        // Redirect to dashboard
        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal server error');
    }
}));



// Logout route
app.get('/admin-logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Failed to log out');
        }
        res.redirect('/admin-login');
    });
});



// Registration route (GET)
app.get('/admin-register', (req, res) => {
    res.render('pages/admin-register');
});


// Registration route (POST) for Admin
app.post('/admin/register', wrapAsync(async (req, res) => {
    try {
        const { 
            admin_Id,
            name, 
            username, 
            password, 
            email, 
            mobile_no 
        } = req.body;

        // Validate that all required fields are provided
        if (!admin_Id || !name || !username || !password || !email || !mobile_no) {
            return res.status(400).send('All required fields must be filled.');
        }

        // Check if username already exists
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return res.status(409).send('Username already exists. Please choose a different one.');
        }
        const existingAdminID = await Admin.findOne({ admin_Id });
        if (existingAdminID) {
            return res.status(409).send('admin_Id already exists. Please choose a different one.');
        }

        // Check if email already exists
        const existingEmail = await Admin.findOne({ email });
        if (existingEmail) {
            return res.status(409).send('Email is already registered.');
        }

        // Check if mobile number already exists
        const existingMobile = await Admin.findOne({ mobile_no });
        if (existingMobile) {
            return res.status(409).send('Mobile number is already registered.');
        }

        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new admin document
        const newAdmin = new Admin({
            admin_Id,
            name,
            username,
            password,  // Store hashed password
            email,
            mobile_no,
        });

        // Save the new admin to the database
        await newAdmin.save();

        // Redirect to login page after successful registration
        res.redirect('/admin-login?message=RegistrationSuccessful');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('An error occurred during registration. Please try again.');
    }
}));



// Dashboard Route (Admin view)
app.get('/admin-dashboard', Authenticated, wrapAsync(async(req, res) => {
    try {

        const totalUsers = await User.countDocuments();

    const activeMetersResult = await Consumption.aggregate([
    { $match: { relay_status: 'ON' } }, // Match active meters
    { $group: { _id: "$mac_Id" } }, // Group by unique mac_Id
    { $count: "activeMeters" } // Count the number of groups
    ]);

    const activeMeters = activeMetersResult.length > 0 ? activeMetersResult[0].activeMeters : 0; // Extract count
   
    const Alertspending = await Alert.countDocuments();

        res.render('pages/admin-dashboard',{totalUsers, activeMeters,Alertspending});
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching admin dashboard data");
    }
}));


//manage users route 
app.get('/manage-users', Authenticated, wrapAsync(async (req, res) => {
    try {
        const users = await User.find();
        
        const userConsumptionDetails = await Promise.all(
            users.map(async (user) => {
                // Fetch the latest record by time_stamp
                const latestConsumption = await Consumption.findOne({ mac_Id: user.mac_Id })
                    .sort({ time_stamp: -1 });

                // Calculate the total consumption for the user
                const totalConsumption = await Consumption.aggregate([
                    { $match: { mac_Id: user.mac_Id } },
                    { $group: { _id: null, total: { $sum: "$consumption" } } }
                ]);

                return {
                    user_Id: user.user_Id,
                    mac_Id: user.mac_Id,
                    name: user.name,
                    mobile_no: user.mobile_no,
                    email: user.email,
                    lastReset: latestConsumption ? latestConsumption.reset_time : "N/A",
                    lastUpdate: latestConsumption ? latestConsumption.update_time : "N/A",
                    totalConsumption: totalConsumption.length > 0 ? totalConsumption[0].total : 0, // Use aggregated value
                    remainingBalance: latestConsumption ? latestConsumption.balance || "N/A" : "N/A", // Fetch balance
                    relayStatus: latestConsumption ? latestConsumption.relay_status : "N/A",
                };
            })
        );
        
        res.render('pages/manage-users', { userConsumptionDetails });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching user data");
    }
}));


// Turn On/Off Relay Route
app.post('/update-relay-status', Authenticated, wrapAsync(async (req, res) => {

    const { mac_Id, status } = req.body; // Get MAC ID and status from the form

    console.log(`Received mac_Id: ${mac_Id}, status: ${status}`); // Debugging log

    try {
        // Check if mac_Id and status are valid
        if (!mac_Id || !status) {
            console.log("MAC ID or Status is missing");
            return res.status(400).send("MAC ID and Status are required.");
        }

        // Find the latest consumption record for the given mac_Id, sorted by time_stamp in descending order
        const latestConsumption = await Consumption.findOne({ mac_Id })
            .sort({ time_stamp: -1 }); // Sort to get the latest record based on time_stamp

        if (latestConsumption) {
            // Now update the relay_status in the latest consumption record
            latestConsumption.relay_status = status; // Set the new relay status

            // Save the updated document
            await latestConsumption.save(); // Save the changes to the database
            console.log('Relay status updated successfully');
        } else {
            console.log('No consumption record found for the given mac_Id');
            return res.status(404).send("No consumption record found for the given MAC ID");
        }

        // Redirect to manage-users after updating
        res.redirect('/manage-users');
    } catch (error) {
        console.error("Error in updating relay status:", error);
        res.status(500).send("Error updating relay status");
    }
}));



// Billing history Route 

app.get('/admin-billing', Authenticated,  wrapAsync(async (req, res) => {
    try {
        // Fetch billing data and populate user reference
        const billingHistory = await Billing.find().sort({ created_at: -1 });

        // Check if billingHistory is empty
        if (!billingHistory || billingHistory.length === 0) {
            console.log("No billing data found.");
        }

        // Render the billing-history page with the fetched data
        res.render('pages/admin-billing-history', { billingHistory });
    } catch (error) {
        console.error("Error fetching billing data:", error); // Log the full error
        res.status(500).send("Error fetching billing data");
    }
}));





// Alerts Pending route

app.get('/alerts', Authenticated,  wrapAsync(async (req, res) => {
    try {
        // Fetch all alerts from the database, sorted by timestamp in descending order
        const alerts = await Alert.find().sort({ time_stamp: -1 });

        // Pass the alerts to the EJS template
        res.render('pages/alerts', { alerts });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching alerts data");
    }
}));

// DELETE route to delete an alert
app.delete('/alerts/:id',  wrapAsync(async (req, res) => {
    try {
        const alertId = req.params.id;

        // Find and delete the alert
        const result = await Alert.findByIdAndDelete(alertId);

        if (result) {
            res.status(200).json({ message: "Alert deleted successfully." });
        } else {
            res.status(404).json({ error: "Alert not found." });
        }
    } catch (error) {
        console.error("Error deleting alert:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}));



// Consumption Data Route (Admin view)
app.get('/analytics', Authenticated,  wrapAsync(async (req, res) => {
    try {
        // Fetch all consumption records
        const consumptionData = await Consumption.find();

        // Calculate Peak Consumption Hours
        const hourConsumption = {}; // Map for consumption by hour
        consumptionData.forEach(record => {
            const hour = new Date(record.time_stamp).getHours(); // Extract hour from timestamp
            hourConsumption[hour] = (hourConsumption[hour] || 0) + record.consumption;
        });

        // Determine peak hours
        let peakHour = null;
        let peakConsumption = 0;

        for (const [hour, consumption] of Object.entries(hourConsumption)) {
            if (consumption > peakConsumption) {
                peakConsumption = consumption;
                peakHour = parseInt(hour); // Ensure it's a number for formatting
            }
        }

        // Format peak hours with AM/PM for a 2-hour range
        const formatHour = (hour) => {
            const period = hour >= 12 ? "PM" : "AM";
            const formattedHour = hour % 12 || 12; // Convert 0 hour to 12 for AM/PM
            return `${formattedHour}:00 ${period}`;
        };

        const formattedPeakHour = peakHour !== null
            ? `${formatHour(peakHour)} - ${formatHour(peakHour + 2)}`
            : "No Data";

        // Calculate Average Monthly Consumption
        const monthlyConsumption = {};
        consumptionData.forEach(record => {
            const month = new Date(record.time_stamp).toLocaleString('default', { month: 'long', year: 'numeric' });
            monthlyConsumption[month] = (monthlyConsumption[month] || 0) + record.consumption;
        });

        const averageMonthlyConsumption = Object.entries(monthlyConsumption).map(([month, totalConsumption]) => {
            return { month, averageConsumption: totalConsumption / 30 }; // Assuming 30 days in a month
        });

        // Render the analytics page with data
        res.render('pages/analytics', {
            formattedPeakHour,
            peakConsumption,
            averageMonthlyConsumption
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching analytics data");
    }
}));



// Profile Route (Admin view)
app.get('/admin-profile', Authenticated,  wrapAsync(async (req, res) => {
    try {

        
        // Ensure req.session.admin is defined before accessing admin_Id
        if (!req.session.admin) {
            return res.redirect('/admin-login'); // If no session, redirect to login
        }

        const admin = await Admin.findOne({ admin_Id: req.session.admin.admin_Id }); // Replace with actual admin-fetching logic

        if (!admin) {
            return res.redirect('/admin-login'); // Redirect to admin login if not found
        }

        // Render admin profile page
        res.render('pages/admin-profile', { admin, error: null });
    } catch (error) {
        console.error("Error fetching admin data:", error);
        res.status(500).send("An error occurred while fetching admin data.");
    }
}));

app.post('/admin-profile/edit', Authenticated,  wrapAsync(async (req, res) => {
    try {
 

        const { password } = req.body;

        if (!req.session.admin) {
            return res.redirect('/admin-login');
        }

        const admin = await Admin.findOne({ admin_Id: req.session.admin.admin_Id });

        if (!admin) {
            return res.redirect('/admin-login');
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.render('pages/admin-profile', {
                admin,
                error: 'Incorrect password. Please try again.',
            });
        }

        res.render('pages/admin-update_profile', { admin });
    } catch (error) {
        console.error("Error verifying admin password:", error.message);
        res.status(500).send("An error occurred while verifying password.");
    }
}));


app.post('/admin-profile/update', Authenticated,  wrapAsync(async (req, res) => {
    const { name, password, mobile_no, email } = req.body;

    try {
        // Ensure req.session.admin is defined before accessing admin_Id
        if (!req.session.admin) {
            return res.redirect('/admin-login'); // Redirect to login if session is not found
        }

        const updateFields = {
            name,
            mobile_no,
            email,
        };

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(password, salt);
        }

        const updatedAdmin = await Admin.findOneAndUpdate(
            { admin_Id: req.session.admin.admin_Id },
            updateFields,
            { new: true }
        );

        if (!updatedAdmin) {
            return res.status(404).send("Admin not found.");
        }

        req.session.admin = updatedAdmin;

        res.redirect('/admin-profile');
    } catch (error) {
        console.error("Error updating admin profile:", error);
        res.status(500).send("Failed to update profile.");
    }
}));



// Support Route (Admin view)
app.get('/admin-support', Authenticated, (req, res) => {
    res.render('pages/admin-support');
});

// page non found error middleware
app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"page not found!"));
  });
  
  // error handler middleware 
  app.use((err,req,res,next)=>{
  let {status=500,message="something went wrong!"}=err;
  res.status(status).render("pages/error.ejs",{message});
  });

// Start the server
// app.listen(port, () => {
//     console.log(`Server running on port ${port}`);
// }, "192.168.1.11");

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 

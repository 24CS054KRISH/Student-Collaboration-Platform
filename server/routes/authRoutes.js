const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /register
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, college, branch, year } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create new user
        const newUser = new User({
            fullName,
            email,
            password,
            college,
            branch,
            year
        });

        // Save to MongoDB
        await newUser.save();

        return res.status(201).json({
            success: true,
            message: "User registered successfully"
        });
    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
});

module.exports = router;

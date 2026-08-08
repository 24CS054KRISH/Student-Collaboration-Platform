const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// POST /register
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, college, branch, department, year, skills } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password before saving
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
            college,
            branch: branch || department,
            year,
            skills: typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : (skills || [])
        });

        // Save to MongoDB
        await newUser.save();

        // Sign JWT token
        const token = jwt.sign(
            { id: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userObj = newUser.toObject();
        delete userObj.password;

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: userObj
        });
    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
});

// POST /login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find user by email
        const user = await User.findOne({ email });

        // 2. If user not found
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // 3. If password does not match
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        // 4. If correct
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userObj = user.toObject();
        delete userObj.password;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: userObj
        });
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
});

const authMiddleware = require('../middleware/authMiddleware');

// GET /me - Verify current user JWT token and return session user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("Error fetching current user session:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during session verification"
        });
    }
});

// GET /users - Fetch all registered users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        return res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching users"
        });
    }
});

module.exports = router;



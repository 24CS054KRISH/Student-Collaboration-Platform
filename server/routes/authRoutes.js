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

// GET /users/:id - Fetch single user profile by ID
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id, '-password');
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
        console.error("Error fetching user profile:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching user profile"
        });
    }
});


// PUT /profile - Update current user profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { fullName, college, branch, year, bio, github, linkedin, portfolio, skills, achievements, interests, coverImage } = req.body;

        const user = await User.findById(req.user);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (fullName !== undefined) user.fullName = fullName;
        if (college !== undefined) user.college = college;
        if (branch !== undefined) user.branch = branch;
        if (year !== undefined) user.year = year;
        if (bio !== undefined) user.bio = bio;
        if (github !== undefined) user.github = github;
        if (linkedin !== undefined) user.linkedin = linkedin;
        if (portfolio !== undefined) user.portfolio = portfolio;
        if (coverImage !== undefined) user.coverImage = coverImage;
        if (skills !== undefined) {
            user.skills = Array.isArray(skills)
                ? skills
                : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);
        }
        if (achievements !== undefined) {
            user.achievements = Array.isArray(achievements)
                ? achievements
                : (typeof achievements === 'string' ? achievements.split(',').map(s => s.trim()).filter(Boolean) : []);
        }
        if (interests !== undefined) {
            user.interests = Array.isArray(interests)
                ? interests
                : (typeof interests === 'string' ? interests.split(',').map(s => s.trim()).filter(Boolean) : []);
        }

        await user.save();

        const userObj = user.toObject();
        delete userObj.password;

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: userObj
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during profile update"
        });
    }
});

// POST /avatar - Upload profile photo to Cloudinary
const { avatarUpload, coverUpload, uploadToCloudinary, uploadCoverToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

router.post('/avatar', authMiddleware, (req, res, next) => {
    avatarUpload.single('avatar')(req, res, (multerErr) => {
        if (multerErr) {
            // multer validation errors (file size, wrong type)
            return res.status(400).json({
                success: false,
                message: multerErr.message || 'File validation failed'
            });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Fetch current user to check for existing Cloudinary avatar to replace
        const currentUser = await User.findById(req.user);
        const oldAvatar = currentUser?.avatar;

        // Stream the in-memory buffer to Cloudinary
        let avatarUrl;
        try {
            avatarUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
        } catch (cloudErr) {
            const errMsg = cloudErr instanceof Error
                ? cloudErr.message
                : (typeof cloudErr === 'string' ? cloudErr : JSON.stringify(cloudErr));
            console.error('[Avatar Route] Cloudinary upload failed:', errMsg);
            return res.status(502).json({
                success: false,
                message: `Image upload to Cloudinary failed: ${errMsg || 'unknown error'}`
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user,
            { avatar: avatarUrl },
            { new: true, select: '-password' }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Delete old Cloudinary image in background if it exists and was replaced
        if (oldAvatar && oldAvatar !== avatarUrl) {
            try {
                await deleteFromCloudinary(oldAvatar);
            } catch (delErr) {
                console.error('[Avatar Route] Failed to delete replaced avatar from Cloudinary:', delErr);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Profile photo updated successfully',
            user
        });
    } catch (error) {
        console.error('Error in avatar upload route:', error);
        return res.status(500).json({ success: false, message: 'Server error during photo upload' });
    }
});

// DELETE /avatar - Remove profile photo from Cloudinary and reset MongoDB avatar
router.delete('/avatar', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const oldAvatar = user.avatar;

        // Reset avatar field in MongoDB
        user.avatar = '';
        await user.save();

        // Delete from Cloudinary if existing image was hosted there
        if (oldAvatar) {
            try {
                await deleteFromCloudinary(oldAvatar);
            } catch (cloudErr) {
                console.error('[Avatar Route] Failed to delete avatar from Cloudinary:', cloudErr);
            }
        }

        const userObj = user.toObject();
        delete userObj.password;

        return res.status(200).json({
            success: true,
            message: 'Profile photo removed successfully',
            user: userObj
        });
    } catch (error) {
        console.error('Error removing profile photo:', error);
        return res.status(500).json({ success: false, message: 'Server error during photo removal' });
    }
});

// POST /cover - Upload cover/banner photo to Cloudinary
router.post('/cover', authMiddleware, (req, res, next) => {
    coverUpload.single('coverImage')(req, res, (multerErr) => {
        if (multerErr) {
            return res.status(400).json({
                success: false,
                message: multerErr.message || 'File validation failed'
            });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Fetch current user to check for existing Cloudinary cover to replace
        const currentUser = await User.findById(req.user);
        const oldCover = currentUser?.coverImage;

        // Stream the in-memory buffer to Cloudinary
        let coverUrl;
        try {
            coverUrl = await uploadCoverToCloudinary(req.file.buffer, req.file.mimetype);
        } catch (cloudErr) {
            const errMsg = cloudErr instanceof Error
                ? cloudErr.message
                : (typeof cloudErr === 'string' ? cloudErr : JSON.stringify(cloudErr));
            console.error('[Cover Route] Cloudinary upload failed:', errMsg);
            return res.status(502).json({
                success: false,
                message: `Image upload to Cloudinary failed: ${errMsg || 'unknown error'}`
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user,
            { coverImage: coverUrl },
            { new: true, select: '-password' }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Delete old Cloudinary cover image in background if it exists and was replaced
        if (oldCover && oldCover !== coverUrl) {
            try {
                await deleteFromCloudinary(oldCover);
            } catch (delErr) {
                console.error('[Cover Route] Failed to delete replaced cover from Cloudinary:', delErr);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Cover photo updated successfully',
            user
        });
    } catch (error) {
        console.error('Error in cover upload route:', error);
        return res.status(500).json({ success: false, message: 'Server error during cover photo upload' });
    }
});

// DELETE /cover - Remove cover photo from Cloudinary and reset MongoDB coverImage
router.delete('/cover', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const oldCover = user.coverImage;

        // Reset coverImage field in MongoDB
        user.coverImage = '';
        await user.save();

        // Delete from Cloudinary if existing cover was hosted there
        if (oldCover) {
            try {
                await deleteFromCloudinary(oldCover);
            } catch (cloudErr) {
                console.error('[Cover Route] Failed to delete cover from Cloudinary:', cloudErr);
            }
        }

        const userObj = user.toObject();
        delete userObj.password;

        return res.status(200).json({
            success: true,
            message: 'Cover photo removed successfully',
            user: userObj
        });
    } catch (error) {
        console.error('Error removing cover photo:', error);
        return res.status(500).json({ success: false, message: 'Server error during cover photo removal' });
    }
});

module.exports = router;

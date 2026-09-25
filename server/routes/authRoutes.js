const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationOtpEmail } = require('../services/emailService');

/**
 * Generates a 6-digit numeric OTP code.
 */
function generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes a SHA-256 hash of the OTP for secure database storage.
 */
function hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

// POST /register
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, college, branch, department, year, skills } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ success: false, message: "Full name, email, and password are required." });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if email already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            if (existingUser.isEmailVerified) {
                return res.status(400).json({ success: false, message: "An account with this email already exists. Please log in." });
            }

            // User registered before but has not verified email yet.
            // Check resend cooldown (60 seconds)
            const COOLDOWN_MS = 60 * 1000;
            if (existingUser.emailVerificationLastSentAt) {
                const elapsed = Date.now() - new Date(existingUser.emailVerificationLastSentAt).getTime();
                if (elapsed < COOLDOWN_MS) {
                    const remainingSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
                    return res.status(429).json({
                        success: false,
                        message: `Verification code was recently sent. Please wait ${remainingSeconds} seconds before requesting a new code.`,
                        remainingSeconds,
                        requireVerification: true,
                        email: normalizedEmail
                    });
                }
            }

            // Update unverified user with new password / details if provided, and generate new OTP
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const otp = generateOtp();
            const otpHash = hashOtp(otp);

            existingUser.fullName = fullName || existingUser.fullName;
            existingUser.password = hashedPassword;
            if (college) existingUser.college = college;
            if (branch || department) existingUser.branch = branch || department;
            if (year) existingUser.year = year;
            if (skills) {
                existingUser.skills = typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : skills;
            }
            existingUser.emailVerificationOtpHash = otpHash;
            existingUser.emailVerificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
            existingUser.emailVerificationLastSentAt = new Date();

            await existingUser.save();

            // Asynchronously dispatch OTP via Gmail REST API
            sendVerificationOtpEmail({
                recipientEmail: existingUser.email,
                recipientName: existingUser.fullName,
                otp
            }).catch(err => console.error("Error sending registration verification email:", err.message));

            return res.status(200).json({
                success: true,
                message: "Registration updated. A 6-digit verification code has been sent to your email.",
                email: existingUser.email,
                requireVerification: true
            });
        }

        // Hash password before saving
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generate 6-digit OTP and hash it
        const otp = generateOtp();
        const otpHash = hashOtp(otp);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create new user
        const newUser = new User({
            fullName,
            email: normalizedEmail,
            password: hashedPassword,
            college,
            branch: branch || department,
            year,
            skills: typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : (skills || []),
            isEmailVerified: false,
            emailVerificationOtpHash: otpHash,
            emailVerificationOtpExpiresAt: otpExpiresAt,
            emailVerificationLastSentAt: new Date()
        });

        // Save to MongoDB
        await newUser.save();

        // Asynchronously dispatch OTP via Gmail REST API
        sendVerificationOtpEmail({
            recipientEmail: newUser.email,
            recipientName: newUser.fullName,
            otp
        }).catch(err => console.error("Error sending registration verification email:", err.message));

        return res.status(201).json({
            success: true,
            message: "Registration successful! A 6-digit verification code has been sent to your email.",
            email: newUser.email,
            requireVerification: true
        });
    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
});

// POST /verify-email
router.post('/verify-email', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and 6-digit verification code are required."
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const cleanedOtp = String(otp).trim();

        if (cleanedOtp.length !== 6 || !/^\d{6}$/.test(cleanedOtp)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 6-digit numeric verification code."
            });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found."
            });
        }

        if (user.isEmailVerified) {
            const token = jwt.sign(
                { id: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            const userObj = user.toObject();
            delete userObj.password;
            delete userObj.emailVerificationOtpHash;
            return res.status(200).json({
                success: true,
                message: "Email is already verified. You are logged in.",
                token,
                user: userObj
            });
        }

        // Check if OTP is expired
        if (!user.emailVerificationOtpExpiresAt || Date.now() > new Date(user.emailVerificationOtpExpiresAt).getTime()) {
            return res.status(400).json({
                success: false,
                message: "Verification code has expired. Please click Resend Code to receive a new one."
            });
        }

        // Compare OTP hashes
        const incomingHash = hashOtp(cleanedOtp);
        if (incomingHash !== user.emailVerificationOtpHash) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification code. Please check and try again."
            });
        }

        // Mark user as verified and clear OTP credentials
        user.isEmailVerified = true;
        user.emailVerificationOtpHash = null;
        user.emailVerificationOtpExpiresAt = null;
        user.emailVerificationLastSentAt = null;
        await user.save();

        // Issue JWT token upon successful verification
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.emailVerificationOtpHash;

        return res.status(200).json({
            success: true,
            message: "Email verified successfully! Welcome to SkillSync.",
            token,
            user: userObj
        });
    } catch (error) {
        console.error("Error verifying email:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during email verification."
        });
    }
});

// POST /resend-verification
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email address is required."
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No account found with this email address."
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: "This email is already verified. Please sign in."
            });
        }

        // 60-second cooldown check
        const COOLDOWN_MS = 60 * 1000;
        if (user.emailVerificationLastSentAt) {
            const elapsed = Date.now() - new Date(user.emailVerificationLastSentAt).getTime();
            if (elapsed < COOLDOWN_MS) {
                const remainingSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingSeconds} seconds before requesting another code.`,
                    remainingSeconds
                });
            }
        }

        // Generate fresh 6-digit OTP
        const otp = generateOtp();
        user.emailVerificationOtpHash = hashOtp(otp);
        user.emailVerificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        user.emailVerificationLastSentAt = new Date();

        await user.save();

        // Asynchronously dispatch OTP via Gmail REST API
        sendVerificationOtpEmail({
            recipientEmail: user.email,
            recipientName: user.fullName,
            otp
        }).catch(err => console.error("Error sending resend verification email:", err.message));

        return res.status(200).json({
            success: true,
            message: "A new verification code has been sent to your email."
        });
    } catch (error) {
        console.error("Error resending verification code:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while resending verification code."
        });
    }
});

// POST /login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Find user by email
        const user = await User.findOne({ email: normalizedEmail });

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

        // 4. Check if email is verified
        if (user.isEmailVerified === false) {
            // Defensive check: If user has no OTP hash or expiration (legacy user), treat as verified
            if (!user.emailVerificationOtpHash && !user.emailVerificationOtpExpiresAt) {
                user.isEmailVerified = true;
                await user.save();
            } else {
                return res.status(403).json({
                    success: false,
                    isUnverified: true,
                    email: user.email,
                    message: "Please verify your email before logging in. An OTP was sent to your email during registration."
                });
            }
        }

        // 5. If correct & verified
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.emailVerificationOtpHash;

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
        const user = await User.findById(req.user).select('-password -emailVerificationOtpHash');
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
        const users = await User.find({}, '-password -emailVerificationOtpHash');
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
        const user = await User.findById(req.params.id, '-password -emailVerificationOtpHash');
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

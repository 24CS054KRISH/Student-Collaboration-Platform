const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies the token in the Authorization header (Bearer <token>)
 * and attaches the decoded user ID to req.user.
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach decoded user id to req.user
        req.user = decoded.id;

        next();
    } catch (error) {
        console.error("JWT Verification Error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }
};

module.exports = authMiddleware;

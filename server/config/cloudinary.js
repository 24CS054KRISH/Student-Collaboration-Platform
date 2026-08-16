const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Use memoryStorage — we stream the buffer to Cloudinary ourselves at call time.
// IMPORTANT: Do NOT call cloudinary.config() here at module load time.
// server.js imports routes before dotenv.config() runs, so process.env vars
// are undefined at module-load time. We configure Cloudinary lazily inside
// uploadToCloudinary() so the env vars are guaranteed to be available.
const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
        }
    }
});

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 * Cloudinary is configured lazily here so env vars are always loaded first.
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @returns {Promise<string>} secure_url
 */
function uploadToCloudinary(buffer, mimetype) {
    return new Promise((resolve, reject) => {
        // Guard: ensure buffer is valid
        if (!buffer || buffer.length === 0) {
            return reject(new Error('File buffer is empty — multer did not read the file'));
        }

        // Lazy-configure Cloudinary here, after dotenv has definitely run
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key:    process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure:     true,
        });

        // Log config state for debugging (api_secret masked)
        console.log('[Cloudinary] Config at upload time -> cloud_name:', cloudinary.config().cloud_name, '| api_key:', cloudinary.config().api_key || 'MISSING');

        try {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'student-collab/avatars',
                    resource_type: 'image',
                    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
                },
                (error, result) => {
                    if (error) {
                        // Cloudinary SDK errors: { message, http_code, name }
                        const msg = error.message
                            || (typeof error === 'string' ? error : null)
                            || JSON.stringify(error);
                        console.error('[Cloudinary] Callback error:', msg, '| http_code:', error.http_code);
                        reject(new Error(msg || 'Cloudinary upload failed'));
                    } else if (result && result.secure_url) {
                        console.log('[Cloudinary] Upload success:', result.secure_url);
                        resolve(result.secure_url);
                    } else {
                        reject(new Error('Cloudinary returned no secure_url in result'));
                    }
                }
            );

            // Handle stream-level errors (network issues, etc.)
            uploadStream.on('error', (streamErr) => {
                console.error('[Cloudinary] Stream error:', streamErr.message || streamErr);
                reject(streamErr instanceof Error ? streamErr : new Error(String(streamErr)));
            });

            uploadStream.end(buffer);
        } catch (syncErr) {
            console.error('[Cloudinary] Sync error setting up stream:', syncErr.message || syncErr);
            reject(syncErr instanceof Error ? syncErr : new Error(String(syncErr)));
        }
    });
}

module.exports = { avatarUpload, uploadToCloudinary };

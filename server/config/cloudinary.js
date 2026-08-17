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

const coverUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB for banner covers
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

/**
 * Extract Cloudinary public_id from a full Cloudinary secure URL.
 * Handles nested folder paths (e.g. 'student-collab/avatars/sample').
 * @param {string} url
 * @returns {string|null} public_id
 */
function extractCloudinaryPublicId(url) {
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
        return null;
    }
    try {
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;

        let pathAfterUpload = parts[1].split('?')[0];
        const segments = pathAfterUpload.split('/');
        const cleanSegments = [];
        let passedTransformsAndVersion = false;

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            // Skip version segment like 'v1234567890'
            if (/^v\d+$/.test(seg)) {
                passedTransformsAndVersion = true;
                continue;
            }
            // Skip transformation segments before the version/path like 'c_fill,h_400,w_400'
            if (!passedTransformsAndVersion && (seg.includes('_') || seg.includes(','))) {
                continue;
            }
            passedTransformsAndVersion = true;
            cleanSegments.push(seg);
        }

        if (cleanSegments.length === 0) return null;

        const fullPublicPath = cleanSegments.join('/');
        const lastDotIdx = fullPublicPath.lastIndexOf('.');
        if (lastDotIdx > 0) {
            return fullPublicPath.substring(0, lastDotIdx);
        }
        return fullPublicPath;
    } catch (err) {
        console.error('[Cloudinary] Failed to extract public_id:', err);
        return null;
    }
}

/**
 * Delete an image from Cloudinary given its URL or public ID.
 * @param {string} urlOrPublicId
 * @returns {Promise<Object>}
 */
function deleteFromCloudinary(urlOrPublicId) {
    return new Promise((resolve) => {
        if (!urlOrPublicId) {
            return resolve({ result: 'not_found' });
        }

        const publicId = urlOrPublicId.includes('http')
            ? extractCloudinaryPublicId(urlOrPublicId)
            : urlOrPublicId;

        if (!publicId) {
            console.log('[Cloudinary] Skipping deletion: Not a valid Cloudinary public ID or URL:', urlOrPublicId);
            return resolve({ result: 'skipped' });
        }

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key:    process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure:     true,
        });

        console.log('[Cloudinary] Attempting deletion of public_id:', publicId);

        cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) {
                console.error('[Cloudinary] Destroy callback error:', error.message || error);
                resolve({ error: error.message || error });
            } else {
                console.log('[Cloudinary] Destroy result:', result);
                resolve(result);
            }
        });
    });
}

/**
 * Upload a cover/banner buffer to Cloudinary and return the secure URL.
 * Transforms image for landscape banners with quality auto.
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @returns {Promise<string>} secure_url
 */
function uploadCoverToCloudinary(buffer, mimetype) {
    return new Promise((resolve, reject) => {
        if (!buffer || buffer.length === 0) {
            return reject(new Error('File buffer is empty — multer did not read the file'));
        }

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key:    process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure:     true,
        });

        console.log('[Cloudinary] Config at cover upload time -> cloud_name:', cloudinary.config().cloud_name, '| api_key:', cloudinary.config().api_key || 'MISSING');

        try {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'student-collab/covers',
                    resource_type: 'image',
                    transformation: [
                        { width: 1400, height: 450, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' }
                    ],
                },
                (error, result) => {
                    if (error) {
                        const msg = error.message
                            || (typeof error === 'string' ? error : null)
                            || JSON.stringify(error);
                        console.error('[Cloudinary] Cover callback error:', msg, '| http_code:', error.http_code);
                        reject(new Error(msg || 'Cloudinary cover upload failed'));
                    } else if (result && result.secure_url) {
                        console.log('[Cloudinary] Cover upload success:', result.secure_url);
                        resolve(result.secure_url);
                    } else {
                        reject(new Error('Cloudinary returned no secure_url in result'));
                    }
                }
            );

            uploadStream.on('error', (streamErr) => {
                console.error('[Cloudinary] Cover stream error:', streamErr.message || streamErr);
                reject(streamErr instanceof Error ? streamErr : new Error(String(streamErr)));
            });

            uploadStream.end(buffer);
        } catch (syncErr) {
            console.error('[Cloudinary] Cover sync error:', syncErr.message || syncErr);
            reject(syncErr instanceof Error ? syncErr : new Error(String(syncErr)));
        }
    });
}

module.exports = {
    avatarUpload,
    coverUpload,
    uploadToCloudinary,
    uploadCoverToCloudinary,
    deleteFromCloudinary,
    extractCloudinaryPublicId
};

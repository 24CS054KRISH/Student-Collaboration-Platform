/**
 * migrate_legacy_users.js
 * Safely marks all existing/legacy users in MongoDB as isEmailVerified: true.
 * Preserves all other user fields, credentials, and associated documents.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function migrateLegacyUsers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected successfully.');

        // Query criteria for legacy users:
        // Users who do not have isEmailVerified set, or have it set to null,
        // or have isEmailVerified: false but have NO OTP hash or OTP expiry set.
        const query = {
            $or: [
                { isEmailVerified: { $exists: false } },
                { isEmailVerified: null },
                {
                    isEmailVerified: false,
                    emailVerificationOtpHash: { $in: [null, undefined] },
                    emailVerificationOtpExpiresAt: { $in: [null, undefined] }
                }
            ]
        };

        const legacyUsers = await User.find(query, 'email fullName isEmailVerified');
        console.log(`Found ${legacyUsers.length} legacy user(s) requiring verification update.`);

        if (legacyUsers.length > 0) {
            legacyUsers.forEach(u => console.log(` - Updating: ${u.email} (${u.fullName})`));

            const updateResult = await User.updateMany(
                query,
                { $set: { isEmailVerified: true } }
            );

            console.log(`Successfully updated ${updateResult.modifiedCount} legacy user(s) to isEmailVerified: true.`);
        } else {
            console.log('All existing users are already marked as verified.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

if (require.main === module) {
    migrateLegacyUsers();
}

module.exports = migrateLegacyUsers;

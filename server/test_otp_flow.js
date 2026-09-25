/**
 * test_otp_flow.js
 * Comprehensive automated verification script for Email OTP Registration flow.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('./models/User');

const API_BASE = 'http://localhost:5000/api';

function hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

async function runTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING COMPREHENSIVE EMAIL OTP FLOW VERIFICATION');
    console.log('====================================================\n');

    await mongoose.connect(process.env.MONGO_URI);
    console.log(' Connected to MongoDB for state verification.');

    const testTimestamp = Date.now();
    const testEmail = `test_otp_${testTimestamp}@skillsync.test`;
    const testPassword = 'Password123!';
    const testName = `OTP Tester ${testTimestamp}`;

    try {
        // --- Test 1: New User Registration ---
        console.log('\n▶️ Test 1: Registering new user...');
        const regRes = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: testName,
                email: testEmail,
                password: testPassword,
                college: 'Collab Institute of Tech',
                branch: 'CS',
                year: '3rd',
                skills: ['Node.js', 'React']
            })
        });

        const regData = await regRes.json();
        console.log(`   Response Status: ${regRes.status}`);
        console.log(`   requireVerification: ${regData.requireVerification}`);
        console.log(`   Token present in response: ${!!regData.token}`);

        if (regRes.status !== 201 || !regData.requireVerification || regData.token) {
            throw new Error(`Test 1 Failed: Expected status 201, requireVerification=true, and NO token.`);
        }
        console.log('  Test 1 Passed: User registered with unverified status and NO token exposed.');

        // Verify in MongoDB
        const dbUser = await User.findOne({ email: testEmail });
        if (!dbUser || dbUser.isEmailVerified !== false || !dbUser.emailVerificationOtpHash) {
            throw new Error(`Test 1 DB Check Failed: User in DB does not have isEmailVerified=false or otpHash.`);
        }
        console.log('  Test 1 DB Check Passed: isEmailVerified=false, emailVerificationOtpHash is set.');

        // --- Test 2: Unverified User Login Attempt ---
        console.log('\n▶️ Test 2: Attempting login with unverified credentials...');
        const unverifiedLoginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword
            })
        });

        const unverifiedLoginData = await unverifiedLoginRes.json();
        console.log(`   Response Status: ${unverifiedLoginRes.status}`);
        console.log(`   isUnverified: ${unverifiedLoginData.isUnverified}`);
        console.log(`   Message: "${unverifiedLoginData.message}"`);

        if (unverifiedLoginRes.status !== 403 || !unverifiedLoginData.isUnverified) {
            throw new Error(`Test 2 Failed: Expected status 403 and isUnverified=true.`);
        }
        console.log('  Test 2 Passed: Unverified login blocked with HTTP 403.');

        // --- Test 3: Wrong OTP Submission ---
        console.log('\n▶️ Test 3: Submitting invalid 6-digit OTP (000000)...');
        const wrongOtpRes = await fetch(`${API_BASE}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                otp: '000000'
            })
        });

        const wrongOtpData = await wrongOtpRes.json();
        console.log(`   Response Status: ${wrongOtpRes.status}`);
        console.log(`   Message: "${wrongOtpData.message}"`);

        if (wrongOtpRes.status !== 400 || wrongOtpData.success !== false) {
            throw new Error(`Test 3 Failed: Expected status 400 for incorrect OTP.`);
        }
        console.log('  Test 3 Passed: Incorrect OTP cleanly rejected.');

        // --- Test 4: Resend Cooldown Enforcement (<60s) ---
        console.log('\n▶️ Test 4: Testing 60-second resend cooldown...');
        const cooldownRes = await fetch(`${API_BASE}/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail })
        });

        const cooldownData = await cooldownRes.json();
        console.log(`   Response Status: ${cooldownRes.status}`);
        console.log(`   Remaining Seconds: ${cooldownData.remainingSeconds}`);

        if (cooldownRes.status !== 429 || !cooldownData.remainingSeconds) {
            throw new Error(`Test 4 Failed: Expected status 429 with remainingSeconds.`);
        }
        console.log('  Test 4 Passed: 60-second cooldown actively enforced.');

        // --- Test 5: Expired OTP Simulation ---
        console.log('\n▶️ Test 5: Testing expired OTP rejection...');
        // Set user expiry in DB to 1 minute ago
        await User.updateOne(
            { email: testEmail },
            { emailVerificationOtpExpiresAt: new Date(Date.now() - 60000) }
        );

        const expiredRes = await fetch(`${API_BASE}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                otp: '123456'
            })
        });

        const expiredData = await expiredRes.json();
        console.log(`   Response Status: ${expiredRes.status}`);
        console.log(`   Message: "${expiredData.message}"`);

        if (expiredRes.status !== 400 || !expiredData.message.includes('expired')) {
            throw new Error(`Test 5 Failed: Expected 400 with expiry message.`);
        }
        console.log('  Test 5 Passed: Expired OTP correctly rejected.');

        // --- Test 6: Resend OTP after cooldown elapsed ---
        console.log('\n▶️ Test 6: Resending OTP after cooldown window...');
        // Simulate cooldown elapsed
        await User.updateOne(
            { email: testEmail },
            { emailVerificationLastSentAt: new Date(Date.now() - 65000) }
        );

        const resendRes = await fetch(`${API_BASE}/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail })
        });

        const resendData = await resendRes.json();
        console.log(`   Response Status: ${resendRes.status}`);
        console.log(`   Message: "${resendData.message}"`);

        if (resendRes.status !== 200 || !resendData.success) {
            throw new Error(`Test 6 Failed: Expected 200 on resend.`);
        }
        console.log('  Test 6 Passed: New OTP generated and dispatched.');

        // --- Test 7: Correct OTP Verification ---
        console.log('\n▶️ Test 7: Verifying account with correct OTP...');
        // Set a known test OTP hash in MongoDB for testing the verification endpoint
        const knownOtp = '654321';
        await User.updateOne(
            { email: testEmail },
            {
                emailVerificationOtpHash: hashOtp(knownOtp),
                emailVerificationOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
            }
        );

        const verifyRes = await fetch(`${API_BASE}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                otp: knownOtp
            })
        });

        const verifyData = await verifyRes.json();
        console.log(`   Response Status: ${verifyRes.status}`);
        console.log(`   Success: ${verifyData.success}`);
        console.log(`   Token issued: ${!!verifyData.token}`);
        console.log(`   User verified: ${verifyData.user?.isEmailVerified}`);

        if (verifyRes.status !== 200 || !verifyData.token || !verifyData.user?.isEmailVerified) {
            throw new Error(`Test 7 Failed: Expected 200, JWT token, and verified user.`);
        }

        // Verify DB state
        const verifiedDbUser = await User.findOne({ email: testEmail });
        if (verifiedDbUser.isEmailVerified !== true || verifiedDbUser.emailVerificationOtpHash !== null) {
            throw new Error(`Test 7 DB Check Failed: OTP hash not cleared or isEmailVerified not true.`);
        }
        console.log('  Test 7 Passed: Account verified, OTP fields cleared from DB, JWT token returned.');

        // --- Test 8: Verified User Login ---
        console.log('\n▶️ Test 8: Logging in with verified user (Email + Password)...');
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword
            })
        });

        const loginData = await loginRes.json();
        console.log(`   Response Status: ${loginRes.status}`);
        console.log(`   Success: ${loginData.success}`);
        console.log(`   Token: ${!!loginData.token}`);
        console.log(`   User Email: ${loginData.user?.email}`);

        if (loginRes.status !== 200 || !loginData.token) {
            throw new Error(`Test 8 Failed: Expected 200 and token for verified login.`);
        }
        console.log('  Test 8 Passed: Normal Email + Password login succeeds seamlessly without OTP.');

        // --- Test 9: Legacy User Login (Aarav Sharma) ---
        console.log('\n▶️ Test 9: Logging in with existing legacy user (aarav@gmail.com)...');
        const legacyLoginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'aarav@gmail.com',
                password: '123456'
            })
        });

        const legacyLoginData = await legacyLoginRes.json();
        console.log(`   Response Status: ${legacyLoginRes.status}`);
        console.log(`   Success: ${legacyLoginData.success}`);
        console.log(`   Token issued: ${!!legacyLoginData.token}`);
        console.log(`   isEmailVerified: ${legacyLoginData.user?.isEmailVerified}`);

        if (legacyLoginRes.status !== 200 || !legacyLoginData.token || legacyLoginData.user?.isEmailVerified !== true) {
            throw new Error(`Test 9 Failed: Existing user Aarav failed to log in normally.`);
        }
        console.log('  Test 9 Passed: Existing legacy user logs in normally with email + password without OTP.');

        // --- Test 10: Legacy User Auto-Verification Fallback Check ---
        console.log('\n▶️ Test 10: Testing login safeguard for legacy account simulated with isEmailVerified=false and no OTP fields...');
        const legacySimEmail = `simulated_legacy_${testTimestamp}@skillsync.test`;
        const bcrypt = require('bcrypt');
        const hashedSimPassword = await bcrypt.hash('Password123!', 10);
        await User.create({
            fullName: 'Simulated Legacy User',
            email: legacySimEmail,
            password: hashedSimPassword,
            isEmailVerified: false,
            emailVerificationOtpHash: null,
            emailVerificationOtpExpiresAt: null
        });

        const simLoginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: legacySimEmail,
                password: 'Password123!'
            })
        });

        const simLoginData = await simLoginRes.json();
        console.log(`   Response Status: ${simLoginRes.status}`);
        console.log(`   Success: ${simLoginData.success}`);
        console.log(`   Token issued: ${!!simLoginData.token}`);
        console.log(`   User verified: ${simLoginData.user?.isEmailVerified}`);

        if (simLoginRes.status !== 200 || !simLoginData.token || simLoginData.user?.isEmailVerified !== true) {
            await User.deleteOne({ email: legacySimEmail });
            throw new Error(`Test 10 Failed: Simulated legacy user was not automatically verified.`);
        }

        // Cleanup simulated legacy user
        await User.deleteOne({ email: legacySimEmail });
        console.log('  Test 10 Passed: Legacy account safely auto-verified on login.');

        console.log('\n====================================================');
        console.log('🎉 ALL 10 TESTS PASSED SUCCESSFULLY! 100% SPEC COMPLIANT');
        console.log('====================================================\n');

    } catch (err) {
        console.error('\n❌ TEST RUN FAILED:', err.message);
        process.exitCode = 1;
    } finally {
        // Cleanup test user
        await User.deleteOne({ email: testEmail });
        console.log('🧹 Cleaned up temporary test user.');
        await mongoose.disconnect();
    }
}

runTests();

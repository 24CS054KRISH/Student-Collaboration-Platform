/**
 * seed.js — CollabGrad Database Seeder
 *
 * Populates MongoDB with:
 *  - 10 realistic student users (bcrypt-hashed passwords)
 *  - 8 diverse projects (linked to real user IDs)
 *  - 7 connection requests (pending / accepted / rejected mix)
 *
 * Usage:
 *   node seed.js              → seed (clears existing data first)
 *   node seed.js --clear-only → just clear the DB without seeding
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ─── Models ───────────────────────────────────────────────────────────────────
const User = require('./models/User');
const Project = require('./models/Project');
const ConnectionRequest = require('./models/ConnectionRequest');
const ProjectApplication = require('./models/ProjectApplication');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hash = (pw) => bcrypt.hash(pw, 10);
const log = (msg) => console.log(`  ${msg}`);

// ─── Seed Data ────────────────────────────────────────────────────────────────

const RAW_USERS = [
    {
        fullName: 'Aarav Sharma',
        email: 'aarav@gmail.com',
        password: '123456',
        college: 'IIT Bombay',
        branch: 'Computer Science & Engineering',
        year: '3rd Year',
        skills: ['React', 'Node.js', 'MongoDB', 'TypeScript'],
        bio: 'Full-stack developer passionate about building scalable web apps. Love open source.',
        github: 'https://github.com/aaravsharma',
        linkedin: 'https://linkedin.com/in/aaravsharma',
        portfolio: 'https://aaravsharma.dev',
    },
    {
        fullName: 'Priya Patel',
        email: 'priya@gmail.com',
        password: '123456',
        college: 'IIT Delhi',
        branch: 'Data Science & AI',
        year: '2nd Year',
        skills: ['Python', 'Machine Learning', 'Pandas', 'Scikit-learn', 'Jupyter'],
        bio: 'Data science enthusiast exploring the world of AI and predictive analytics.',
        github: 'https://github.com/priyapatel',
        linkedin: 'https://linkedin.com/in/priyapatel',
        portfolio: '',
    },
    {
        fullName: 'Rohan Mehta',
        email: 'rohan@gmail.com',
        password: '123456',
        college: 'NIT Surat',
        branch: 'Electronics & Communication',
        year: '4th Year',
        skills: ['Arduino', 'IoT', 'C++', 'Embedded Systems', 'MATLAB'],
        bio: 'Hardware hacker who loves building smart IoT systems from scratch.',
        github: 'https://github.com/rohanmehta',
        linkedin: 'https://linkedin.com/in/rohanmehta',
        portfolio: '',
    },
    {
        fullName: 'Sneha Joshi',
        email: 'sneha@gmail.com',
        password: '123456',
        college: 'BITS Pilani',
        branch: 'Artificial Intelligence & ML',
        year: '3rd Year',
        skills: ['TensorFlow', 'OpenCV', 'Python', 'Deep Learning', 'NLP'],
        bio: 'AI researcher working on computer vision and natural language processing projects.',
        github: 'https://github.com/snehajoshi',
        linkedin: 'https://linkedin.com/in/snehajoshi',
        portfolio: 'https://snehajoshi.ai',
    },
    {
        fullName: 'Dev Kapoor',
        email: 'dev@gmail.com',
        password: '123456',
        college: 'VIT Vellore',
        branch: 'Cybersecurity',
        year: '2nd Year',
        skills: ['Linux', 'Ethical Hacking', 'Python', 'Kali Linux', 'Network Security'],
        bio: 'Security-first developer and CTF competitor. Making the internet safer, one vuln at a time.',
        github: 'https://github.com/devkapoor',
        linkedin: 'https://linkedin.com/in/devkapoor',
        portfolio: '',
    },
    {
        fullName: 'Ishaan Verma',
        email: 'ishaan@gmail.com',
        password: '123456',
        college: 'DTU Delhi',
        branch: 'Information Technology',
        year: '4th Year',
        skills: ['Vue.js', 'Django', 'PostgreSQL', 'REST APIs', 'Docker'],
        bio: 'Backend-focused developer who enjoys optimizing database queries and designing clean APIs.',
        github: 'https://github.com/ishaanverma',
        linkedin: 'https://linkedin.com/in/ishaanverma',
        portfolio: 'https://ishaanverma.io',
    },
    {
        fullName: 'Ananya Singh',
        email: 'ananya@gmail.com',
        password: '123456',
        college: 'SRM Chennai',
        branch: 'UI/UX Design & HCI',
        year: '1st Year',
        skills: ['Figma', 'Adobe XD', 'CSS', 'HTML', 'Prototyping'],
        bio: 'Creative UI/UX designer passionate about building beautiful, user-friendly interfaces.',
        github: 'https://github.com/ananyasingh',
        linkedin: 'https://linkedin.com/in/ananyasingh',
        portfolio: 'https://ananyasingh.design',
    },
    {
        fullName: 'Kartik Nair',
        email: 'kartik@gmail.com',
        password: '123456',
        college: 'IIIT Hyderabad',
        branch: 'Cloud & DevOps Engineering',
        year: '3rd Year',
        skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
        bio: 'DevOps engineer automating everything. Cloud-native architecture enthusiast.',
        github: 'https://github.com/kartiknair',
        linkedin: 'https://linkedin.com/in/kartiknair',
        portfolio: '',
    },
    {
        fullName: 'Tanvi Reddy',
        email: 'tanvi@gmail.com',
        password: '123456',
        college: 'Manipal University',
        branch: 'Blockchain & Distributed Systems',
        year: '4th Year',
        skills: ['Solidity', 'Web3.js', 'Ethereum', 'Smart Contracts', 'Hardhat'],
        bio: 'Blockchain developer building decentralized applications for real-world problems.',
        github: 'https://github.com/tanvireddy',
        linkedin: 'https://linkedin.com/in/tanvireddy',
        portfolio: 'https://tanvireddy.web3',
    },
    {
        fullName: 'Harsh Agarwal',
        email: 'harsh@gmail.com',
        password: '123456',
        college: 'PDEU Gandhinagar',
        branch: 'Computer Science & Engineering',
        year: '2nd Year',
        skills: ['React', 'Express', 'MySQL', 'Git', 'Tailwind CSS'],
        bio: 'Aspiring full-stack developer building the Student Collaboration Platform to connect peers.',
        github: 'https://github.com/harshagarwal',
        linkedin: 'https://linkedin.com/in/harshagarwal',
        portfolio: '',
    },
];

// Projects are built after users are inserted (need real createdBy IDs)
const buildProjects = (users) => [
    {
        title: 'AI Study Buddy',
        description: 'An AI-powered study assistant that generates personalized quizzes, summarizes notes, and tracks learning progress using NLP and ML models.',
        category: 'AI/ML',
        techStack: ['Python', 'TensorFlow', 'Flask', 'React', 'MongoDB'],
        requiredSkills: ['Machine Learning', 'Python', 'NLP', 'React'],
        teamSize: 4,
        status: 'Open',
        createdBy: users[1]._id, // Priya Patel
    },
    {
        title: 'Campus Lost & Found App',
        description: 'A web platform for students to report lost items and find them on campus using image matching and location tagging.',
        category: 'Web App',
        techStack: ['React', 'Node.js', 'MongoDB', 'Cloudinary'],
        requiredSkills: ['React', 'Node.js', 'REST APIs'],
        teamSize: 3,
        status: 'Open',
        createdBy: users[0]._id, // Aarav Sharma
    },
    {
        title: 'Smart Attendance System',
        description: 'IoT-based facial recognition attendance system using Raspberry Pi and OpenCV that marks attendance automatically.',
        category: 'IoT',
        techStack: ['Python', 'OpenCV', 'Raspberry Pi', 'Flask', 'SQLite'],
        requiredSkills: ['IoT', 'Python', 'OpenCV', 'Embedded Systems'],
        teamSize: 5,
        status: 'Active',
        createdBy: users[2]._id, // Rohan Mehta
    },
    {
        title: 'Blockchain Voting System',
        description: 'A decentralized, tamper-proof student council voting system built on Ethereum with transparent result tallying.',
        category: 'Blockchain',
        techStack: ['Solidity', 'Web3.js', 'React', 'Hardhat', 'MetaMask'],
        requiredSkills: ['Solidity', 'Web3.js', 'Smart Contracts'],
        teamSize: 3,
        status: 'Open',
        createdBy: users[8]._id, // Tanvi Reddy
    },
    {
        title: 'Student Mental Health App',
        description: 'A mobile app providing anonymous peer support, mood tracking, and guided meditation sessions for college students.',
        category: 'Mobile App',
        techStack: ['React Native', 'Firebase', 'Expo', 'Node.js'],
        requiredSkills: ['React Native', 'UI/UX', 'Firebase'],
        teamSize: 4,
        status: 'Active',
        createdBy: users[6]._id, // Ananya Singh
    },
    {
        title: 'College Marketplace (E-Commerce)',
        description: 'A buy/sell platform exclusively for college students to trade textbooks, electronics, and other goods within campus.',
        category: 'Web App',
        techStack: ['Vue.js', 'Django', 'PostgreSQL', 'Stripe', 'Redis'],
        requiredSkills: ['Vue.js', 'Django', 'PostgreSQL', 'REST APIs'],
        teamSize: 5,
        status: 'Open',
        createdBy: users[5]._id, // Ishaan Verma
    },
    {
        title: 'Cloud-Based Online Code Judge',
        description: 'A LeetCode-style competitive programming platform with auto-scaling judge containers deployed on AWS.',
        category: 'DevOps',
        techStack: ['Docker', 'Kubernetes', 'AWS', 'Node.js', 'React'],
        requiredSkills: ['Docker', 'AWS', 'Kubernetes', 'Linux', 'Node.js'],
        teamSize: 4,
        status: 'Completed',
        createdBy: users[7]._id, // Kartik Nair
    },
    {
        title: 'Peer Tutoring Platform',
        description: 'A real-time tutoring marketplace where senior students can offer paid or free tutoring sessions to juniors.',
        category: 'Ed-Tech',
        techStack: ['React', 'Express', 'MongoDB', 'Socket.io', 'Stripe'],
        requiredSkills: ['React', 'Node.js', 'WebSockets', 'MongoDB'],
        teamSize: 3,
        status: 'Open',
        createdBy: users[9]._id, // Harsh Agarwal
    },
];

// Connections are built after users are inserted (need real _id references)
const buildConnections = (users) => [
    // Accepted connections (fully connected peers)
    { sender: users[0]._id, receiver: users[1]._id, status: 'accepted' }, // Aarav ↔ Priya
    { sender: users[3]._id, receiver: users[1]._id, status: 'accepted' }, // Sneha ↔ Priya
    { sender: users[6]._id, receiver: users[4]._id, status: 'accepted' }, // Ananya ↔ Dev
    { sender: users[9]._id, receiver: users[0]._id, status: 'accepted' }, // Harsh ↔ Aarav

    // Pending requests (waiting for response)
    { sender: users[2]._id, receiver: users[0]._id, status: 'pending' },  // Rohan → Aarav
    { sender: users[5]._id, receiver: users[3]._id, status: 'pending' },  // Ishaan → Sneha
    { sender: users[7]._id, receiver: users[5]._id, status: 'pending' },  // Kartik → Ishaan

    // Rejected request
    { sender: users[4]._id, receiver: users[2]._id, status: 'rejected' }, // Dev → Rohan (rejected)
];

// Project Applications built after projects and users exist
const buildApplications = (users, projects) => [
    {
        project: projects[1]._id, // Campus Lost & Found App (owned by Aarav)
        applicant: users[1]._id, // Priya Patel
        owner: users[0]._id,
        message: 'Hello. I am writing to express my interest in joining your project team. My technical focus is in Data Science and React frontend development.',
        status: 'pending'
    },
    {
        project: projects[1]._id, // Campus Lost & Found App (owned by Aarav)
        applicant: users[2]._id, // Rohan Mehta
        owner: users[0]._id,
        message: 'Hello. I am interested in collaborating on this project and can assist with backend hardware integration and cloud storage services.',
        status: 'pending'
    },
    {
        project: projects[0]._id, // AI Study Buddy (owned by Priya)
        applicant: users[3]._id, // Sneha Joshi
        owner: users[1]._id,
        message: 'Hello. I would like to offer my expertise in Machine Learning and Natural Language Processing to support the goals of your AI Study Buddy project.',
        status: 'pending'
    }
];

// ─── Main Seeder ──────────────────────────────────────────────────────────────

async function seed() {
    const clearOnly = process.argv.includes('--clear-only');

    try {
        console.log('\n🌱  CollabGrad Database Seeder');
        console.log('═══════════════════════════════════════');

        // Connect to MongoDB
        log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        log('✅ Connected!\n');

        // ── Step 1: Clear existing data ─────────────────────────────────────
        console.log('🗑️  Clearing existing data...');
        const [delUsers, delProjects, delConnections, delApps] = await Promise.all([
            User.deleteMany({}),
            Project.deleteMany({}),
            ConnectionRequest.deleteMany({}),
            ProjectApplication.deleteMany({}),
        ]);
        log(`Deleted ${delUsers.deletedCount} users`);
        log(`Deleted ${delProjects.deletedCount} projects`);
        log(`Deleted ${delConnections.deletedCount} connections`);
        log(`Deleted ${delApps.deletedCount} project applications\n`);

        if (clearOnly) {
            console.log('✅ Database cleared. Skipping seed (--clear-only flag).\n');
            await mongoose.disconnect();
            process.exit(0);
        }

        // ── Step 2: Create Users ────────────────────────────────────────────
        console.log('👤  Seeding users...');
        const usersWithHashes = await Promise.all(
            RAW_USERS.map(async (u) => ({
                ...u,
                password: await hash(u.password),
            }))
        );
        const users = await User.insertMany(usersWithHashes);
        log(`✅ Created ${users.length} users\n`);

        // ── Step 3: Create Projects ─────────────────────────────────────────
        console.log('📁  Seeding projects...');
        const projects = await Project.insertMany(buildProjects(users));
        log(`✅ Created ${projects.length} projects\n`);

        // ── Step 4: Create Connection Requests ──────────────────────────────
        console.log('🔗  Seeding connections...');
        const connections = await ConnectionRequest.insertMany(buildConnections(users));
        log(`✅ Created ${connections.length} connection requests\n`);

        // ── Step 5: Create Project Applications ─────────────────────────────
        console.log('📝  Seeding project applications...');
        const apps = await ProjectApplication.insertMany(buildApplications(users, projects));
        log(`✅ Created ${apps.length} project applications\n`);

        // ── Summary ─────────────────────────────────────────────────────────
        console.log('═══════════════════════════════════════');
        console.log('🎉  Seeding complete! Summary:\n');

        console.log('  📧 Test Accounts (password = 123456):');
        RAW_USERS.forEach((u) => {
            console.log(`     ${u.email.padEnd(35)} → password: ${u.password}`);
        });

        console.log('\n  📁 Projects Created:');
        buildProjects(users).forEach((p) => {
            console.log(`     [${p.status.padEnd(9)}] ${p.title}  (${p.category})`);
        });

        console.log('\n  🔗 Connections: 4 Accepted, 3 Pending, 1 Rejected');
        console.log('  📝 Project Applications: 3 Pending');

        console.log('\n═══════════════════════════════════════\n');

    } catch (err) {
        console.error('\n❌ Seeding failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        log('Disconnected from MongoDB.\n');
    }
}

seed();


const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const ConnectionRequest = require('../models/ConnectionRequest');
const ProjectApplication = require('../models/ProjectApplication');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Escapes regex special characters to prevent regex injection or syntax errors
 * when searching keywords like "C++", "Node.js", or "[React]".
 */
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * GET /api/search/global?q=<query>
 * Unified global search across Projects, Students, Connections, and Chats.
 * Protected by authMiddleware.
 */
router.get('/global', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user;
        const rawQuery = (req.query.q || req.query.query || '').trim();

        if (!rawQuery) {
            return res.status(200).json({
                success: true,
                projects: [],
                students: [],
                connections: [],
                chats: []
            });
        }

        const safePattern = escapeRegex(rawQuery);
        const searchRegex = new RegExp(safePattern, 'i');

        // Execute all category lookups in parallel for optimal performance
        const [
            matchingCreators,
            studentsResult,
            acceptedConnectionsRequests,
            ownedProjects,
            acceptedApplications
        ] = await Promise.all([
            // 1. Find users whose names match the query (to link to projects authored by them)
            User.find({ fullName: searchRegex }).select('_id').limit(15).lean(),

            // 2. Students / Users: Exclude currently logged in user, exclude password
            User.find({
                _id: { $ne: currentUserId },
                $or: [
                    { fullName: searchRegex },
                    { bio: searchRegex },
                    { college: searchRegex },
                    { branch: searchRegex },
                    { skills: searchRegex },
                    { interests: searchRegex }
                ]
            })
                .select('-password')
                .limit(8)
                .lean(),

            // 3. Accepted connections for the logged-in user
            ConnectionRequest.find({
                status: 'accepted',
                $or: [{ sender: currentUserId }, { receiver: currentUserId }]
            })
                .populate('sender', '-password')
                .populate('receiver', '-password')
                .lean(),

            // 4. User's owned projects (for team chat search)
            Project.find({ createdBy: currentUserId }).lean(),

            // 5. User's accepted project applications (for team chat search)
            ProjectApplication.find({
                applicant: currentUserId,
                status: 'accepted'
            }).populate({
                path: 'project',
                populate: {
                    path: 'createdBy',
                    select: 'fullName email college branch avatar'
                }
            }).lean()
        ]);

        // Projects Search:
        // Match title, description, category, techStack, requiredSkills, OR authored by matching users
        const creatorIds = matchingCreators.map(u => u._id);
        const projectConditions = [
            { title: searchRegex },
            { description: searchRegex },
            { category: searchRegex },
            { techStack: searchRegex },
            { requiredSkills: searchRegex }
        ];

        if (creatorIds.length > 0) {
            projectConditions.push({ createdBy: { $in: creatorIds } });
        }

        const projects = await Project.find({ $or: projectConditions })
            .populate('createdBy', 'fullName email college branch year avatar')
            .limit(8)
            .lean();

        // Connections Filtering:
        // Extract the unique connected peer and check against search query
        const connectionsMap = new Map();
        acceptedConnectionsRequests.forEach(reqDoc => {
            if (!reqDoc.sender || !reqDoc.receiver) return;
            const isSender = reqDoc.sender._id.toString() === currentUserId.toString();
            const peer = isSender ? reqDoc.receiver : reqDoc.sender;

            if (peer && peer._id) {
                const peerIdStr = peer._id.toString();
                if (!connectionsMap.has(peerIdStr)) {
                    const nameMatches = peer.fullName && searchRegex.test(peer.fullName);
                    const bioMatches = peer.bio && searchRegex.test(peer.bio);
                    const branchMatches = peer.branch && searchRegex.test(peer.branch);
                    const collegeMatches = peer.college && searchRegex.test(peer.college);
                    const skillMatches = Array.isArray(peer.skills) && peer.skills.some(s => searchRegex.test(s));

                    if (nameMatches || bioMatches || branchMatches || collegeMatches || skillMatches) {
                        connectionsMap.set(peerIdStr, {
                            ...peer,
                            isConnected: true
                        });
                    }
                }
            }
        });
        const connections = Array.from(connectionsMap.values()).slice(0, 8);

        // Chats / Conversations Search:
        // A. Direct Chats: from matching accepted connections
        const directChats = connections.map(peer => ({
            id: peer._id,
            type: 'direct',
            title: peer.fullName || 'Student',
            subtitle: [peer.branch || 'Student', peer.college].filter(Boolean).join(' • '),
            avatar: peer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.fullName || 'Student')}&background=0D8ABC&color=fff`,
            peerObj: peer
        }));

        // B. Team Channels: owned projects or joined projects that match query
        const teamChatsMap = new Map();

        ownedProjects.forEach(proj => {
            const titleMatches = proj.title && searchRegex.test(proj.title);
            const catMatches = proj.category && searchRegex.test(proj.category);
            const skillsMatches = (proj.requiredSkills || []).some(s => searchRegex.test(s)) || (proj.techStack || []).some(s => searchRegex.test(s));

            if (titleMatches || catMatches || skillsMatches) {
                teamChatsMap.set(proj._id.toString(), {
                    id: proj._id,
                    type: 'team',
                    title: proj.title,
                    subtitle: `${proj.category || 'Project'} • Team Chat (Owner)`,
                    avatar: null,
                    projectObj: proj
                });
            }
        });

        acceptedApplications.forEach(app => {
            const proj = app.project;
            if (proj && proj._id && !teamChatsMap.has(proj._id.toString())) {
                const titleMatches = proj.title && searchRegex.test(proj.title);
                const catMatches = proj.category && searchRegex.test(proj.category);
                const skillsMatches = (proj.requiredSkills || []).some(s => searchRegex.test(s)) || (proj.techStack || []).some(s => searchRegex.test(s));

                if (titleMatches || catMatches || skillsMatches) {
                    teamChatsMap.set(proj._id.toString(), {
                        id: proj._id,
                        type: 'team',
                        title: proj.title,
                        subtitle: `${proj.category || 'Project'} • Team Chat`,
                        avatar: null,
                        projectObj: proj
                    });
                }
            }
        });

        const chats = [...directChats, ...Array.from(teamChatsMap.values())].slice(0, 8);

        return res.status(200).json({
            success: true,
            query: rawQuery,
            counts: {
                projects: projects.length,
                students: studentsResult.length,
                connections: connections.length,
                chats: chats.length
            },
            projects,
            students: studentsResult,
            connections,
            chats
        });
    } catch (error) {
        console.error('Error in global search endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while performing global search'
        });
    }
});

module.exports = router;

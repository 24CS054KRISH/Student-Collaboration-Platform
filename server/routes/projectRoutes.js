const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const ProjectApplication = require('../models/ProjectApplication');
const ActivityLog = require('../models/ActivityLog');
const authMiddleware = require('../middleware/authMiddleware');

// Helper to attach real team members from accepted applications
const attachMembersToProjects = async (projects) => {
    return await Promise.all(
        projects.map(async (projectDoc) => {
            const project = projectDoc.toObject ? projectDoc.toObject() : projectDoc;

            const acceptedApps = await ProjectApplication.find({
                project: project._id,
                status: 'accepted'
            }).populate('applicant', 'fullName email college branch year skills bio github linkedin portfolio avatar');

            const members = [];

            if (project.createdBy) {
                const ownerObj = typeof project.createdBy === 'object' ? project.createdBy : {};
                const ownerName = ownerObj.fullName || 'Project Lead';
                members.push({
                    _id: ownerObj._id || project.createdBy,
                    fullName: ownerName,
                    email: ownerObj.email || '',
                    college: ownerObj.college || '',
                    branch: ownerObj.branch || '',
                    year: ownerObj.year || '',
                    skills: ownerObj.skills || [],
                    bio: ownerObj.bio || '',
                    role: 'Lead Developer',
                    isOwner: true,
                    avatar: ownerObj.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=0D8ABC&color=fff`
                });
            }

            acceptedApps.forEach((app) => {
                if (app.applicant) {
                    const appUser = app.applicant;
                    const name = appUser.fullName || 'Team Member';
                    members.push({
                        _id: appUser._id,
                        fullName: name,
                        email: appUser.email || '',
                        college: appUser.college || '',
                        branch: appUser.branch || '',
                        year: appUser.year || '',
                        skills: appUser.skills || [],
                        bio: appUser.bio || '',
                        role: 'Contributor',
                        isOwner: false,
                        avatar: appUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`
                    });
                }
            });

            project.members = members;
            project.teamAvatars = members.map((m) => m.avatar);
            return project;
        })
    );
};

// POST /create
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { title, description, category, techStack, requiredSkills, teamSize } = req.body;

        // Basic validation
        if (!title || !description || !category) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const newProject = new Project({
            title,
            description,
            category,
            techStack,
            requiredSkills,
            teamSize,
            createdBy: req.user
        });

        await newProject.save();
        const populatedProject = await Project.findById(newProject._id).populate('createdBy', 'fullName email college branch year skills bio github linkedin portfolio');
        const [createdProjectWithMembers] = await attachMembersToProjects([populatedProject]);

        try {
            const activity = new ActivityLog({
                user: req.user,
                type: 'project_created',
                title: `launched a new project: "${title}"`,
                description: description ? description.substring(0, 100) : "",
                meta: { projectId: newProject._id }
            });
            await activity.save();
            const populatedActivity = await ActivityLog.findById(activity._id).populate('user', 'fullName email avatar branch year college skills');
            req.app.get('io')?.emit('new_activity_event', populatedActivity);
        } catch (actErr) {
            console.error("Error logging project_created activity:", actErr);
        }

        return res.status(201).json({
            success: true,
            message: "Project created successfully",
            project: createdProjectWithMembers
        });
    } catch (error) {
        console.error("Error creating project:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during project creation"
        });
    }
});

// GET /all - Fetch all projects with optional search & filtering queries (?search=...&category=...&status=...&skill=...)
router.get('/all', async (req, res) => {
    try {
        const { search, category, status, skill } = req.query;
        const filter = {};

        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { category: searchRegex }
            ];
        }

        if (category && category !== 'All') {
            filter.category = new RegExp(category.trim(), 'i');
        }

        if (status && status !== 'All') {
            filter.status = status.trim();
        }

        if (skill && skill !== 'All') {
            const skillRegex = new RegExp(skill.trim(), 'i');
            if (filter.$or) {
                filter.$and = [
                    { $or: filter.$or },
                    {
                        $or: [
                            { requiredSkills: skillRegex },
                            { techStack: skillRegex }
                        ]
                    }
                ];
                delete filter.$or;
            } else {
                filter.$or = [
                    { requiredSkills: skillRegex },
                    { techStack: skillRegex }
                ];
            }
        }

        const rawProjects = await Project.find(filter)
            .populate('createdBy', 'fullName email college branch year skills bio github linkedin portfolio')
            .sort({ createdAt: -1 });

        const projects = await attachMembersToProjects(rawProjects);
        const totalProjects = projects.length;

        return res.status(200).json({
            success: true,
            totalProjects,
            projects
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching projects"
        });
    }
});

// GET /my/:userId
router.get('/my/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const rawProjects = await Project.find({ createdBy: userId }).populate('createdBy', 'fullName email college branch year skills bio github linkedin portfolio').sort({ createdAt: -1 });
        const projects = await attachMembersToProjects(rawProjects);
        const totalProjects = projects.length;

        return res.status(200).json({
            success: true,
            totalProjects,
            projects
        });
    } catch (error) {
        console.error("Error fetching user projects:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching user projects"
        });
    }
});

// DELETE /delete/:id
router.delete('/delete/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Only the project creator can delete
        if (project.createdBy.toString() !== req.user) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to delete this project"
            });
        }

        await Project.findByIdAndDelete(id);
        // Clean up applications for deleted project
        await ProjectApplication.deleteMany({ project: id });

        return res.status(200).json({
            success: true,
            message: "Project deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting project:", error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }
        return res.status(500).json({
            success: false,
            message: "Server error during project deletion"
        });
    }
});

// PUT /update/:id
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, teamSize, requiredSkills, status, progress } = req.body;

        // Find project
        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Only the project creator can update
        if (project.createdBy.toString() !== req.user) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to update this project"
            });
        }

        // Validate title cannot be empty
        if (title !== undefined && (!title || title.trim() === "")) {
            return res.status(400).json({
                success: false,
                message: "Title cannot be empty"
            });
        }

        // Validate description cannot be empty
        if (description !== undefined && (!description || description.trim() === "")) {
            return res.status(400).json({
                success: false,
                message: "Description cannot be empty"
            });
        }

        // Update only allowed fields
        if (title !== undefined) project.title = title;
        if (description !== undefined) project.description = description;
        if (category !== undefined) project.category = category;
        if (teamSize !== undefined) project.teamSize = teamSize;
        if (requiredSkills !== undefined) project.requiredSkills = requiredSkills;
        if (status !== undefined) project.status = status;
        if (progress !== undefined) project.progress = progress;

        const savedProject = await project.save();
        const populatedProject = await Project.findById(savedProject._id).populate('createdBy', 'fullName email college branch year skills bio github linkedin portfolio');
        const [updatedProjectWithMembers] = await attachMembersToProjects([populatedProject]);

        return res.status(200).json({
            success: true,
            message: "Project updated successfully",
            project: updatedProjectWithMembers
        });
    } catch (error) {
        console.error("Error updating project:", error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }
        return res.status(500).json({
            success: false,
            message: "Server error during project update"
        });
    }
};

router.put('/update/:id', authMiddleware, updateProject);

// ─── Project Join Application Endpoints ─────────────────────────────────────

// POST /api/projects/apply/:projectId — Apply to join a project
router.post('/apply/:projectId', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { message } = req.body;
        const applicantId = req.user;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Prevent applying to own project
        if (project.createdBy.toString() === applicantId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot apply to your own project"
            });
        }

        // Check for existing application
        const existingApp = await ProjectApplication.findOne({
            project: projectId,
            applicant: applicantId
        });

        if (existingApp) {
            return res.status(400).json({
                success: false,
                message: `You have already applied to this project (Status: ${existingApp.status})`
            });
        }

        let finalMessage = message && message.trim() ? message.trim() : null;

        if (!finalMessage) {
            const User = require('../models/User');
            const userDoc = await User.findById(applicantId);
            if (userDoc) {
                const branchStr = userDoc.branch || "Software Engineering";
                const skillsStr = (userDoc.skills && userDoc.skills.length > 0)
                    ? userDoc.skills.slice(0, 4).join(", ")
                    : "Software Development";
                finalMessage = `Hello. I am writing to express my interest in joining your project team. My technical focus is in ${branchStr} with skills in ${skillsStr}.`;
            } else {
                finalMessage = "Hello. I am writing to express my interest in joining your project team and would appreciate the opportunity to collaborate.";
            }
        }

        const newApplication = new ProjectApplication({
            project: projectId,
            applicant: applicantId,
            owner: project.createdBy,
            message: finalMessage
        });

        await newApplication.save();

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully!",
            application: newApplication
        });
    } catch (error) {
        console.error("Error applying to project:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while applying to project"
        });
    }
});

// GET /api/projects/applications/received — Incoming applications for projects owned by logged-in user
router.get('/applications/received', authMiddleware, async (req, res) => {
    try {
        const applications = await ProjectApplication.find({
            owner: req.user,
            status: 'pending'
        })
            .populate('applicant', '-password')
            .populate('project', 'title category techStack requiredSkills status')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            applications
        });
    } catch (error) {
        console.error("Error fetching received project applications:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching project applications"
        });
    }
});

// GET /api/projects/applications/my-applications — Applications sent by logged-in user
router.get('/applications/my-applications', authMiddleware, async (req, res) => {
    try {
        const applications = await ProjectApplication.find({ applicant: req.user })
            .select('project status createdAt')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            applications
        });
    } catch (error) {
        console.error("Error fetching sent project applications:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching sent applications"
        });
    }
});

// DELETE /api/projects/applications/cancel/:projectId — Withdraw/cancel sent application
router.delete('/applications/cancel/:projectId', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user;

        const application = await ProjectApplication.findOneAndDelete({
            project: projectId,
            applicant: userId,
            status: 'pending'
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Pending application not found or already processed"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project application withdrawn successfully"
        });
    } catch (error) {
        console.error("Error withdrawing project application:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while withdrawing project application"
        });
    }
});

// PUT /api/projects/applications/respond/:applicationId — Accept or reject project join application
router.put('/applications/respond/:applicationId', authMiddleware, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { action } = req.body; // 'accept' or 'reject'

        if (!action || !['accept', 'reject'].includes(action.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: "Valid action ('accept' or 'reject') is required"
            });
        }

        const application = await ProjectApplication.findById(applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Project application not found"
            });
        }

        if (application.owner.toString() !== req.user.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to respond to this application"
            });
        }

        application.status = action.toLowerCase() === 'accept' ? 'accepted' : 'rejected';
        await application.save();

        return res.status(200).json({
            success: true,
            message: `Project application ${application.status} successfully`,
            application
        });
    } catch (error) {
        console.error("Error responding to project application:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while responding to project application"
        });
    }
});

module.exports = router;


const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const authMiddleware = require('../middleware/authMiddleware');

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

        return res.status(201).json({
            success: true,
            message: "Project created successfully",
            project: newProject
        });
    } catch (error) {
        console.error("Error creating project:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during project creation"
        });
    }
});

// GET /all
router.get('/all', async (req, res) => {
    try {
        const projects = await Project.find().populate('createdBy', 'fullName email').sort({ createdAt: -1 });
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
            message: "Server error while fetching projects"
        });
    }
});

// GET /my/:userId
router.get('/my/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const projects = await Project.find({ createdBy: userId }).populate('createdBy', 'fullName email').sort({ createdAt: -1 });
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

        const updatedProject = await project.save();

        return res.status(200).json({
            success: true,
            message: "Project updated successfully",
            project: updatedProject
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

module.exports = router;

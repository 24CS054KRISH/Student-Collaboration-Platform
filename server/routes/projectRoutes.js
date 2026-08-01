const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// POST /create
router.post('/create', async (req, res) => {
    try {
        const { title, description, category, techStack, requiredSkills, teamSize, createdBy } = req.body;

        // Basic validation
        if (!title || !description || !category || !createdBy) {
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
            createdBy
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
        const projects = await Project.find().sort({ createdAt: -1 });
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

        const projects = await Project.find({ createdBy: userId }).sort({ createdAt: -1 });
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

// DELETE /delete/:projectId
router.delete('/delete/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        await Project.findByIdAndDelete(projectId);

        return res.status(200).json({
            success: true,
            message: "Project deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting project:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during project deletion"
        });
    }
});

module.exports = router;

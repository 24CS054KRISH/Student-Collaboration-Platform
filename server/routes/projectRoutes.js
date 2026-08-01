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

module.exports = router;

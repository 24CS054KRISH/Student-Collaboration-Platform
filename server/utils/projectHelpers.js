const ProjectApplication = require('../models/ProjectApplication');

/**
 * Helper to attach real team members from accepted applications and project creator
 * @param {Array} projects - Array of Project mongoose documents or plain objects
 * @returns {Promise<Array>} - Array of projects with populated `members` and `teamAvatars`
 */
const attachMembersToProjects = async (projects) => {
    return await Promise.all(
        projects.map(async (projectDoc) => {
            const project = projectDoc.toObject ? projectDoc.toObject() : { ...projectDoc };

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
                    name: ownerName,
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
                        name: name,
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

module.exports = {
    attachMembersToProjects
};

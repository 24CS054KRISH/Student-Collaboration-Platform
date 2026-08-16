import { useState, useRef } from "react";
import { updateProfile, uploadAvatar } from "../api/authApi";
import { useToast } from "./Toast";

export default function Profile({ userProfile, setUserProfile, projects }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const showToast = useToast();

  // Handle profile photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('Only JPG, PNG, or WEBP images are allowed.', 'error');
      return;
    }
    // Validate size (3 MB)
    if (file.size > 3 * 1024 * 1024) {
      showToast('Image must be smaller than 3 MB.', 'error');
      return;
    }

    setUploadingPhoto(true);
    try {
      const response = await uploadAvatar(file);
      if (response.success && response.user) {
        const u = response.user;
        const newAvatarUrl = u.avatar;
        // Persist to localStorage
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        stored.avatar = newAvatarUrl;
        localStorage.setItem('user', JSON.stringify(stored));
        // Update parent state immediately (no page refresh needed)
        setUserProfile((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
        showToast('Profile photo updated!', 'success');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      showToast(err.response?.data?.message || 'Failed to upload photo.', 'error');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };
  
  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: "",
    college: "",
    major: "",
    year: "",
    bio: "",
    about: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    achievements: "",
    interests: ""
  });

  // Open Edit Modal and prefill data
  const handleOpenEdit = () => {
    setEditForm({
      name: userProfile.name || "",
      college: userProfile.college || "",
      major: userProfile.major || "",
      year: userProfile.year || "",
      bio: userProfile.bio || "",
      about: userProfile.about || "",
      githubUrl: userProfile.githubUrl || "",
      linkedinUrl: userProfile.linkedinUrl || "",
      portfolioUrl: userProfile.portfolioUrl || "",
      achievements: userProfile.achievements ? userProfile.achievements.join(", ") : "",
      interests: userProfile.interests ? userProfile.interests.join(", ") : ""
    });
    setShowEditModal(true);
  };

  // Submit edit form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const achievementsArray = editForm.achievements
      ? editForm.achievements.split(",").map((item) => item.trim()).filter((item) => item.length > 0)
      : [];

    const interestsArray = editForm.interests
      ? editForm.interests.split(",").map((item) => item.trim()).filter((item) => item.length > 0)
      : [];

    try {
      const submittedBio = editForm.bio || editForm.about;

      const response = await updateProfile({
        fullName: editForm.name,
        college: editForm.college,
        branch: editForm.major,
        year: editForm.year,
        bio: submittedBio,
        github: editForm.githubUrl,
        linkedin: editForm.linkedinUrl,
        portfolio: editForm.portfolioUrl,
        skills: userProfile.skills,
        achievements: achievementsArray,
        interests: interestsArray
      });

      if (response.success && response.user) {
        const u = response.user;

        // Save latest user object returned by backend into localStorage
        localStorage.setItem("user", JSON.stringify(u));

        const updatedBio = u.bio !== undefined && u.bio !== null ? u.bio : submittedBio;

        // Immediately update parent state so both header bio and Section 2 About re-render instantly
        setUserProfile((prev) => ({
          ...prev,
          name: u.fullName || editForm.name || prev.name,
          college: u.college !== undefined ? u.college : editForm.college,
          major: u.branch !== undefined ? u.branch : editForm.major,
          year: u.year !== undefined ? u.year : editForm.year,
          bio: updatedBio,
          about: updatedBio,
          githubUrl: u.github !== undefined ? u.github : editForm.githubUrl,
          linkedinUrl: u.linkedin !== undefined ? u.linkedin : editForm.linkedinUrl,
          portfolioUrl: u.portfolio !== undefined ? u.portfolio : editForm.portfolioUrl,
          skills: Array.isArray(u.skills) ? u.skills : prev.skills,
          achievements: Array.isArray(u.achievements) ? u.achievements : achievementsArray,
          interests: Array.isArray(u.interests) ? u.interests : interestsArray
        }));

        showToast("Profile updated successfully", "success");
        setShowEditModal(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast(error.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  // Add Skill
  const handleAddSkillSubmit = async (e) => {
    e.preventDefault();
    const skillToAdd = newSkillInput.trim();
    if (skillToAdd && !userProfile.skills.includes(skillToAdd)) {
      const updatedSkills = [...userProfile.skills, skillToAdd];
      try {
        const response = await updateProfile({ skills: updatedSkills });
        if (response.success && response.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
          setUserProfile((prev) => ({
            ...prev,
            skills: response.user.skills || updatedSkills
          }));
          setNewSkillInput("");
        }
      } catch (error) {
        console.error("Error updating skills:", error);
        showToast(error.response?.data?.message || "Failed to add skill", "error");
      }
    }
  };

  // Remove Skill
  const handleRemoveSkill = async (skillToRemove) => {
    const updatedSkills = userProfile.skills.filter((s) => s !== skillToRemove);
    try {
      const response = await updateProfile({ skills: updatedSkills });
      if (response.success && response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
        setUserProfile((prev) => ({
          ...prev,
          skills: response.user.skills || updatedSkills
        }));
      }
    } catch (error) {
      console.error("Error removing skill:", error);
      showToast(error.response?.data?.message || "Failed to remove skill", "error");
    }
  };

  // Remove Achievement
  const handleRemoveAchievement = async (achievementToRemove) => {
    const currentAchievements = userProfile.achievements || [];
    const updated = currentAchievements.filter((a) => a !== achievementToRemove);
    try {
      const response = await updateProfile({ achievements: updated });
      if (response.success && response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
        setUserProfile((prev) => ({
          ...prev,
          achievements: response.user.achievements || updated
        }));
        showToast("Achievement removed", "success");
      }
    } catch (error) {
      console.error("Error removing achievement:", error);
      showToast(error.response?.data?.message || "Failed to remove achievement", "error");
    }
  };


  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ============================================== */}
      {/* TOP SECTION: BANNER & OVERVIEW */}
      {/* ============================================== */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden relative">
        {/* Decorative Banner Background */}
        <div className="h-32 md:h-44 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-xl -translate-y-6 translate-x-6" />
          <div className="absolute bottom-0 left-1/4 w-28 h-28 bg-white/5 rounded-full blur-lg translate-y-6" />
        </div>

        {/* Profile Details Block */}
        <div className="px-6 pb-6 pt-0 flex flex-col md:flex-row md:items-end gap-5 relative z-10">
          {/* Large Photo */}
          <div className="relative -mt-14 md:-mt-20 self-start md:self-auto flex-shrink-0">
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name}
              className="w-28 h-28 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
            />
            {/* Camera overlay button */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              title={uploadingPhoto ? 'Uploading…' : 'Change profile photo'}
              className="absolute bottom-1.5 right-1.5 w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl shadow-md flex items-center justify-center transition-colors cursor-pointer"
            >
              {uploadingPhoto ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            {/* Hidden file input */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Texts & Edit Button */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-1.5 md:pt-4">
              <h1 className="text-2xl font-extrabold text-slate-900 leading-snug">{userProfile.name}</h1>
              <p className="text-sm font-semibold text-blue-600">{userProfile.major}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {userProfile.college || "University Student"}
                </span>
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full my-auto hidden sm:inline" />
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {userProfile.year}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xl pt-2">
                {userProfile.bio}
              </p>
            </div>

            <button
              onClick={handleOpenEdit}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* ============================================== */}
      {/* MAIN TWO-COLUMN SECTION GRID */}
      {/* ============================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: OVERVIEWS & TAGS */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Section 1: Skills */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">1. Skills</h3>
            </div>
            
            {/* Tag cloud */}
            <div className="flex flex-wrap gap-2">
              {userProfile.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 font-semibold text-xs border border-blue-100 rounded-full"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-500 font-bold focus:outline-none text-[10px] cursor-pointer ml-1"
                    title="Remove Skill"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {/* Add Skill Button Input */}
            <form onSubmit={handleAddSkillSubmit} className="flex gap-2 pt-2 border-t border-slate-50">
              <input
                type="text"
                placeholder="e.g. Next.js, Docker"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 bg-slate-50/50"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Add Skill
              </button>
            </form>
          </div>

          {/* Section 3, 4, 5: Social / Professional Links */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Links</h3>
            
            <div className="space-y-3.5">
              {/* GitHub */}
              <a
                href={userProfile.githubUrl || "#"}
                onClick={(e) => {
                  if (!userProfile.githubUrl) e.preventDefault();
                }}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 border border-slate-200/60 hover:border-blue-200 bg-slate-50/30 hover:bg-blue-50/10 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 group-hover:text-blue-600 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.436 22 12.017 2 6.484 6.477 2 12 2z" />
                    </svg>
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">3. GitHub</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px]">
                      {userProfile.githubUrl ? userProfile.githubUrl.replace("https://", "") : "Not set"}
                    </p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </a>

              {/* LinkedIn */}
              <a
                href={userProfile.linkedinUrl || "#"}
                onClick={(e) => {
                  if (!userProfile.linkedinUrl) e.preventDefault();
                }}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 border border-slate-200/60 hover:border-blue-200 bg-slate-50/30 hover:bg-blue-50/10 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 group-hover:text-blue-600 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">4. LinkedIn</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px]">
                      {userProfile.linkedinUrl ? userProfile.linkedinUrl.replace("https://", "") : "Not set"}
                    </p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </a>

              {/* Portfolio */}
              <a
                href={userProfile.portfolioUrl || "#"}
                onClick={(e) => {
                  if (!userProfile.portfolioUrl) e.preventDefault();
                }}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 border border-slate-200/60 hover:border-blue-200 bg-slate-50/30 hover:bg-blue-50/10 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 group-hover:text-blue-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">5. Portfolio</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px]">
                      {userProfile.portfolioUrl ? userProfile.portfolioUrl.replace("https://", "") : "Not set"}
                    </p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </a>
            </div>
          </div>

          {/* Section 8: Interests */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">8. Interests</h3>
            <div className="flex flex-wrap gap-1.5">
              {userProfile.interests && userProfile.interests.map((interest) => (
                <span
                  key={interest}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200/50"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DETAILED INFO */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 2: About */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">2. About</h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-line">
              {userProfile.about || "Write an overview detailing your project history and background."}
            </p>
          </div>

          {/* Section 7: Achievements */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">7. Achievements</h3>
            
            <ul className="space-y-3.5">
              {userProfile.achievements && userProfile.achievements.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="h-5 w-5 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 border border-amber-100 shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs md:text-sm font-semibold text-slate-800 leading-snug">{item}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 6: Projects (Lead & Joined) */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
            
            {/* Subsection A: Created / Lead Projects */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Created & Lead Projects</h3>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                  {(projects || []).filter((p) => p.isOwner).length}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {(projects || []).filter((p) => p.isOwner).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No projects created yet.</p>
                ) : (
                  (projects || []).filter((p) => p.isOwner).map((proj) => (
                    <div key={proj._id || proj.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs md:text-sm font-extrabold text-slate-800">{proj.title}</h4>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                            Lead
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium truncate max-w-sm">{proj.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          proj.status === "Completed" ? "bg-green-50 text-green-600 border border-green-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          {proj.status || "Active"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Subsection B: Joined Team Projects */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Joined Team Projects</h3>
                <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                  {(projects || []).filter((p) => !p.isOwner && p.members && p.members.some((m) => String(m._id) === String((JSON.parse(localStorage.getItem("user") || "{}"))._id))).length}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {(projects || []).filter((p) => !p.isOwner && p.members && p.members.some((m) => String(m._id) === String((JSON.parse(localStorage.getItem("user") || "{}"))._id))).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No joined team projects yet.</p>
                ) : (
                  (projects || []).filter((p) => !p.isOwner && p.members && p.members.some((m) => String(m._id) === String((JSON.parse(localStorage.getItem("user") || "{}"))._id))).map((proj) => (
                    <div key={proj._id || proj.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs md:text-sm font-extrabold text-slate-800">{proj.title}</h4>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">
                            Member
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium truncate max-w-sm">{proj.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
                          {proj.status || "Active"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ============================================== */}
      {/* EDIT PROFILE OVERLAY MODAL */}
      {/* ============================================== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Edit Profile Information</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">College</label>
                  <input
                    type="text"
                    required
                    value={editForm.college}
                    onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Branch (Major)</label>
                  <input
                    type="text"
                    required
                    value={editForm.major}
                    onChange={(e) => setEditForm({ ...editForm, major: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Year & Grade</label>
                  <input
                    type="text"
                    required
                    value={editForm.year}
                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Short Bio (Tagline)</label>
                <input
                  type="text"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="e.g. Passionate web developer..."
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Detailed About Description</label>
                <textarea
                  rows="3"
                  value={editForm.about}
                  onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">GitHub URL</label>
                  <input
                    type="text"
                    value={editForm.githubUrl}
                    onChange={(e) => setEditForm({ ...editForm, githubUrl: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">LinkedIn URL</label>
                  <input
                    type="text"
                    value={editForm.linkedinUrl}
                    onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Portfolio URL</label>
                  <input
                    type="text"
                    value={editForm.portfolioUrl}
                    onChange={(e) => setEditForm({ ...editForm, portfolioUrl: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Achievements (Comma separated)</label>
                <input
                  type="text"
                  value={editForm.achievements}
                  onChange={(e) => setEditForm({ ...editForm, achievements: e.target.value })}
                  placeholder="e.g. Winner Hackathon 2026, Dean's List"
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Interests (Comma separated)</label>
                <input
                  type="text"
                  value={editForm.interests}
                  onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                  placeholder="e.g. AI, Web Development, HCI"
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

import { useState, useEffect } from "react";
import MyProjects from "./MyProjects";
import FindTeam from "./FindTeam";
import PendingRequests from "./PendingRequests";
import MyConnections from "./MyConnections";
import Profile from "./Profile";


import { getAllProjects, createProject, updateProject, deleteProject } from "../api/projectApi";
import ProjectDetailsDrawer from "./ProjectDetailsDrawer";
import ProjectEditModal from "./ProjectEditModal";

export default function Dashboard({ onNavigate }) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "Dashboard";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);
  
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    localStorage.setItem("activeTab", tabName);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentPage");
    localStorage.removeItem("activeTab");
    if (onNavigate) onNavigate("login");
  };

  // New project form state
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    tags: "",
    role: "Lead",
    status: "Planning",
    progress: 0,
  });

  // User Data State
  const [userProfile, setUserProfile] = useState({
    name: "Alex Rivera",
    email: "alex.rivera@university.edu",
    major: "Computer Science & Engineering",
    year: "Junior (3rd Year)",
    bio: "Passionate web developer focused on building collaborative, user-centric apps.",
    skills: ["React", "JavaScript", "Tailwind CSS", "Python", "Node.js"],
    projectsCount: 3,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    college: "Stanford University",
    about: "I am a student passionate about web architecture and open-source software.",
    githubUrl: "https://github.com",
    linkedinUrl: "https://linkedin.com",
    portfolioUrl: "https://portfolio.dev",
    achievements: ["Hackathon Participant", "Dean's List"],
    interests: ["Artificial Intelligence", "Web Accessibility", "Open Source"]
  });

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        const name = u.fullName || u.name || "Student";
        setUserProfile((prev) => ({
          ...prev,
          name: name,
          email: u.email || prev.email,
          college: u.college || prev.college,
          major: u.branch || prev.major,
          avatarUrl: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`
        }));
      }
    } catch (e) {
      console.error("Error setting user profile in dashboard:", e);
    }
  }, []);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getAllProjects();
      const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
      const mappedProjects = (data.projects || []).map((p) => {
        const ownerId = p.createdBy && typeof p.createdBy === "object" ? p.createdBy._id : p.createdBy;
        return {
          ...p,
          isOwner: ownerId === loggedInUser?._id
        };
      });
      setProjects(mappedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);


  // Mock Available Teams/Students for "Find Team"
  const [findTeamData, setFindTeamData] = useState([
    {
      id: 1,
      name: "Marcus Chen",
      role: "UI/UX Designer",
      major: "Design & Interaction",
      skills: ["Figma", "Adobe XD", "Prototyping", "HTML/CSS"],
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80",
      status: "Looking for Project",
      matchingPercentage: 92
    },
    {
      id: 2,
      name: "Sophia Martinez",
      role: "Machine Learning Engineer",
      major: "Data Science",
      skills: ["Python", "PyTorch", "Pandas", "Scikit-Learn"],
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80",
      status: "Looking for Project",
      matchingPercentage: 88
    },
    {
      id: 3,
      name: "GreenCampus Team",
      role: "Project Team",
      major: "Environmental Tech project",
      skills: ["React", "Node.js", "GIS Mapping"],
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80",
      status: "Hiring 1 Developer",
      matchingPercentage: 85
    },
    {
      id: 4,
      name: "Liam O'Connor",
      role: "Full-Stack Dev",
      major: "Software Engineering",
      skills: ["TypeScript", "Next.js", "PostgreSQL", "Docker"],
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80",
      status: "Looking for Project",
      matchingPercentage: 79
    }
  ]);

  // Sidebar Menu Items
  const menuItems = [
    { name: "Dashboard", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    )},
    { name: "My Projects", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )},
    { name: "Find Team", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    )},
    { name: "Pending Requests", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    )},
    { name: "My Connections", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
    { name: "Profile", icon: (


      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
    { name: "Settings", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
  ];

  // Filtering projects list based on search and tags/skills
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTagFilter === "All" || 
                       (p.requiredSkills && p.requiredSkills.includes(selectedTagFilter)) ||
                       (p.tags && p.tags.includes(selectedTagFilter));
    return matchesSearch && matchesTag;
  });

  const userProjects = projects.filter((p) => {
    const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
    const ownerId = p.createdBy && typeof p.createdBy === "object" ? p.createdBy._id : p.createdBy;
    return p.isOwner || (loggedInUser?._id && ownerId === loggedInUser._id);
  });

  // Calculate high-level stats
  const activeCount = userProjects.filter((p) => p.status === "In Progress" || p.status === "Planning" || p.status === "Open" || !p.status).length;
  const completedCount = userProjects.filter((p) => p.status === "Completed").length;

  // TODO: Update pendingRequests count once the Join Request module is implemented
  const pendingRequests = 0;

  const totalTeamMembers = userProjects.reduce((sum, p) => sum + (Number(p.teamSize) || 0), 0);
  const averageProgress = userProjects.length > 0 
    ? Math.round(userProjects.reduce((sum, p) => sum + (Number(p.progress) || 0), 0) / userProjects.length)
    : 0;

  // Handle creating a new project
  const handleCreateProjectSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newProject.title || !newProject.description || !newProject.tags) {
      alert("Please fill in all required fields.");
      return;
    }

    // Convert Required Skills into an array using comma separation
    const requiredSkills = newProject.tags
      ? newProject.tags.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      setSubmitting(true);
      await createProject({
        title: newProject.title,
        description: newProject.description,
        requiredSkills,
        category: "General",
        techStack: [],
        teamSize: 2
      });

      alert("Project Created Successfully");
      setShowCreateModal(false);
      
      // Reset new project form state
      setNewProject({
        title: "",
        description: "",
        tags: "",
        role: "Lead",
        status: "Planning",
        progress: 0,
      });

      // Refresh Dashboard project list
      await fetchProjects();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create project";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async (updatedFields) => {
    try {
      const response = await updateProject(editingProject._id || editingProject.id, updatedFields);
      if (response.success) {
        await fetchProjects();
        setEditingProject(null);
        if (viewingProject && (viewingProject._id === editingProject._id || viewingProject.id === editingProject.id)) {
          const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
          const updatedOwnerId = response.project.createdBy && typeof response.project.createdBy === "object" ? response.project.createdBy._id : response.project.createdBy;
          const updated = {
            ...editingProject,
            ...response.project,
            isOwner: updatedOwnerId === loggedInUser?._id
          };
          setViewingProject(updated);
        }
        alert("Project updated successfully");
      } else {
        alert(response.message || "Failed to update project");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      alert(error.response?.data?.message || "Error updating project. Please try again.");
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return false;
    }
    try {
      const response = await deleteProject(projectId);
      if (response.success) {
        await fetchProjects();
        alert("Project deleted successfully");
        return true;
      } else {
        alert(response.message || "Failed to delete project");
        return false;
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert(error.response?.data?.message || "Error deleting project. Please try again.");
      return false;
    }
  };



  // Main UI Render
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 antialiased">
      
      {/* MOBILE HEADER BAR */}
      <header className="md:hidden w-full flex items-center justify-between bg-white px-4 h-16 border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5.5 w-5.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            CollabGrad
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none cursor-pointer"
        >
          {sidebarOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between fixed h-[calc(100vh-4rem)] md:h-screen z-30 transition-all duration-300 ${
          sidebarOpen ? "left-0" : "-left-64"
        } md:sticky md:top-0`}
      >
        <div>
          {/* Logo - Desktop only */}
          <div className="hidden md:flex items-center gap-2 px-6 h-20 border-b border-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5.5 w-5.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-xl font-bold tracking-tight text-transparent">
              CollabGrad
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    handleTabChange(item.name);
                    setSidebarOpen(false); // Close on mobile navigation
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <span className={`${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                    {item.icon}
                  </span>
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile section at the bottom of Sidebar */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 truncate">{userProfile.name}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">{userProfile.email}</p>
              </div>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

      </aside>

      {/* MOBILE BACKDROP OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 md:hidden"
        />
      )}

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        
        {/* ============================================== */}
        {/* TAB CONTENT: DASHBOARD OVERVIEW */}
        {/* ============================================== */}
        {activeTab === "Dashboard" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* 1. Welcome Card */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/10 p-6 md:p-8">
              {/* Background Shapes */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -translate-y-12 translate-x-12" />
              <div className="absolute bottom-0 right-1/4 w-36 h-36 bg-white/5 rounded-full blur-xl translate-y-12" />

              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md mb-4 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online Workspace
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Welcome back, {userProfile.name.split(" ")[0]}! 🚀
                </h1>
                <p className="mt-2 text-white/80 text-sm md:text-base font-normal leading-relaxed">
                  You are currently leading <span className="font-bold text-white">1 project</span> and participating in <span className="font-bold text-white">2 collaborations</span>. There are 2 pending applications from classmates looking to team up with you.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="rounded-xl bg-white text-blue-600 px-4 py-2.5 text-xs font-bold shadow-md hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Start New Project
                  </button>
                  <button
                    onClick={() => setActiveTab("Find Team")}
                    className="rounded-xl bg-blue-700/40 text-white border border-white/20 hover:bg-blue-700/60 px-4 py-2.5 text-xs font-bold backdrop-blur-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Browse Directory
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Search Bar + Filters */}
            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-4 md:p-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search projects by title, description, or stack..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 text-sm text-slate-900 border border-slate-200 rounded-xl bg-slate-50 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all"
                />
              </div>

              {/* Tag Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Filter tags:</span>
                {["All", "React", "Python", "Node.js", "Firebase", "MongoDB", "UI/UX Design"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(tag)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedTagFilter === tag
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/10"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 4 Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Stat Card 1: Active Projects */}
              <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Projects</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{activeCount}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-green-600 mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>+1 this month</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                  </svg>
                </div>
              </div>

              {/* Stat Card 2: Collaborators */}
              <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Members</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{totalTeamMembers}</h3>
                  <div className="flex items-center -space-x-1.5 mt-2">
                    <img className="w-5 h-5 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=50" alt="" />
                    <img className="w-5 h-5 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=50" alt="" />
                    <img className="w-5 h-5 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=50" alt="" />
                    <img className="w-5 h-5 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=50" alt="" />
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 ring-2 ring-white text-[8px] font-bold text-slate-500">+4</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>

              {/* Stat Card 3: Pending Applications */}
              {/* TODO: Display the number of pending join requests once the Join Request module is implemented */}
              <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Requests</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{pendingRequests}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-0.5" />
                    <span>Requires attention</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>

              {/* Stat Card 4: Avg Progress */}
              <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Progress</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{averageProgress}%</h3>
                  {/* Progress Line */}
                  <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${averageProgress}%` }} />
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>

            </div>

            {/* 4. Recent Projects Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Recent Projects</h2>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">Explore active projects or manage your own listings</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/15 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  New Project
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm font-medium text-slate-500 animate-pulse">Loading projects...</span>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
                  </svg>
                  <p className="text-sm font-semibold text-slate-500">No projects found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id || project._id}
                      className="group bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        {/* Header Status & Icon */}
                        <div className="flex items-center justify-between mb-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase ${
                            project.status === "Completed"
                              ? "bg-green-50 text-green-600 border border-green-100"
                              : project.status === "In Progress"
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}>
                            {project.status || "Open"}
                          </span>
                          
                          {project.isOwner && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Owner
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                          {project.title}
                        </h3>
                        {project.category && (
                          <div className="mt-1 text-xs font-semibold text-blue-600">
                            Category: {project.category}
                          </div>
                        )}
                        <p className="text-xs text-slate-500 leading-relaxed font-normal mt-2 line-clamp-3">
                          {project.description}
                        </p>

                        {/* Required Skills */}
                        <div className="flex flex-wrap gap-1.5 mt-4">
                          {(project.requiredSkills || project.tags || []).map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer: Avatars, Progress & Action */}
                      <div className="mt-6 pt-4 border-t border-slate-100">
                        {/* Team Avatars & Progress */}
                        <div className="flex items-center justify-between text-xs font-semibold mb-3">
                          <div className="flex items-center -space-x-2">
                            {project.teamAvatars && project.teamAvatars.map((url, i) => (
                              <img
                                key={i}
                                className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm"
                                src={url}
                                alt="Team Member"
                              />
                            ))}
                            {project.teamAvatars && project.teamSize > project.teamAvatars.length && (
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[8px] border-2 border-white font-bold text-slate-500">
                                +{project.teamSize - project.teamAvatars.length}
                              </span>
                            )}
                            {(!project.teamAvatars || project.teamAvatars.length === 0) && (
                              <span className="text-slate-500 text-xs font-medium">
                                Team Size: {project.teamSize || 0}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 font-bold">{project.progress || 0}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-4">
                          <div
                            className={`h-1.5 rounded-full ${
                              project.status === "Completed" ? "bg-green-500" : "bg-blue-600"
                            }`}
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewingProject(project)}
                            className="flex-1 text-center py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl transition-colors cursor-pointer"
                          >
                            View Work
                          </button>
                          {project.isOwner && (
                            <button
                              onClick={() => {
                                // Simple edit status modal trigger or status toggle mock
                                const updatedProjects = projects.map((p) => {
                                  const idMatch = (p.id && p.id === project.id) || (p._id && p._id === project._id);
                                  if (idMatch) {
                                    const nextStatus = p.status === "Planning" ? "In Progress" : p.status === "In Progress" ? "Completed" : "Planning";
                                    const nextProgress = nextStatus === "Completed" ? 100 : nextStatus === "In Progress" ? 50 : 0;
                                    return { ...p, status: nextStatus, progress: nextProgress };
                                  }
                                  return p;
                                });
                                setProjects(updatedProjects);
                              }}
                              className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                              title="Mock Status Toggle"
                            >
                              Update Status
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ============================================== */}
        {/* TAB CONTENT: MY PROJECTS */}
        {/* ============================================== */}
        {activeTab === "My Projects" && (
          <MyProjects
            projects={projects}
            setProjects={setProjects}
            onCreateClick={() => setShowCreateModal(true)}
          />
        )}

        {/* ============================================== */}
        {/* TAB CONTENT: FIND TEAM */}
        {/* ============================================== */}
        {activeTab === "Find Team" && (
          <FindTeam />
        )}

        {/* ============================================== */}
        {/* TAB CONTENT: PENDING REQUESTS */}
        {/* ============================================== */}
        {activeTab === "Pending Requests" && (
          <PendingRequests />
        )}

        {/* ============================================== */}
        {/* TAB CONTENT: MY CONNECTIONS */}
        {/* ============================================== */}
        {activeTab === "My Connections" && (
          <MyConnections />
        )}

        {/* ============================================== */}
        {/* TAB CONTENT: PROFILE */}
        {/* ============================================== */}
        {activeTab === "Profile" && (
          <Profile userProfile={userProfile} setUserProfile={setUserProfile} projects={projects} />
        )}



        {/* ============================================== */}
        {/* TAB CONTENT: SETTINGS */}
        {/* ============================================== */}
        {activeTab === "Settings" && (
          <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Configure profile visibility, project notices, and account settings.</p>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 space-y-6">
                
                {/* 1. Account Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Account Visibility</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">List Profile publicly</p>
                      <p className="text-[11px] text-slate-400 font-medium">Allow other students to find you in the directory search.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* 2. Notifications settings */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Workspace Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Team Applications</p>
                        <p className="text-[10px] text-slate-400">Receive in-app alerts when a classmate requests to join your project.</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Chat & Board Updates</p>
                        <p className="text-[10px] text-slate-400">Receive alerts when teammates leave tasks or messages on collaboration threads.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Interface mock settings */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Preferences</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">High Contrast Mode</p>
                      <p className="text-[11px] text-slate-400 font-medium">Adjust colors for enhanced interface readability.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

              </div>
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100">
                <button className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-xl transition-colors cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={() => alert("Settings saved (Simulated)!")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ============================================== */}
      {/* MOCK PROJECT CREATION MODAL */}
      {/* ============================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Start Collaboration Project</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Study Buddy Matching System"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project Goal & Description</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Write a brief overview describing the goals and target milestones..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. React, Node.js, Tailwind CSS"
                  value={newProject.tags}
                  onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })}
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Your Workspace Role</label>
                  <select
                    value={newProject.role}
                    onChange={(e) => setNewProject({ ...newProject, role: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Lead Developer">Lead Developer</option>
                    <option value="UI Designer">UI Designer</option>
                    <option value="Product Manager">Product Manager</option>
                    <option value="Backend Architect">Backend Architect</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Initial Progress</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0%"
                    value={newProject.progress}
                    onChange={(e) => setNewProject({ ...newProject, progress: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Creating..." : "Create Listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* EDIT PROJECT MODAL OVERLAY */}
      {/* ============================================== */}
      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleEditSave}
        />
      )}

      {/* ============================================== */}
      {/* VIEW DETAILS DRAWER / MODAL OVERLAY */}
      {/* ============================================== */}
      {viewingProject && (
        <ProjectDetailsDrawer
          project={viewingProject}
          onClose={() => setViewingProject(null)}
          onEdit={(proj) => {
            setViewingProject(null);
            setEditingProject(proj);
          }}
          onDelete={async (id) => {
            if (await handleDelete(id)) {
              setViewingProject(null);
            }
          }}
        />
      )}
      
    </div>
  );
}

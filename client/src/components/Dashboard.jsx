import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import MyProjects from "./MyProjects";
import FindTeam from "./FindTeam";
import PendingRequests from "./PendingRequests";
import MyConnections from "./MyConnections";
import Profile from "./Profile";
import Messages from "./Messages";
import { useToast } from "./Toast";

import { getAllProjects, createProject, updateProject, deleteProject, applyToProject, getMyProjectApplications, getReceivedProjectApplications, respondProjectApplication, withdrawProjectApplication } from "../api/projectApi";
import { getPendingRequests, respondConnectionRequest } from "../api/connectionApi";
import { getConversations } from "../api/messageApi";
import ProjectDetailsDrawer from "./ProjectDetailsDrawer";
import ProjectEditModal from "./ProjectEditModal";
import PeerProfileModal from "./PeerProfileModal";
import ActivityFeed from "./ActivityFeed";

export default function Dashboard({ onNavigate }) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "Dashboard";
  });
  const [navHistory, setNavHistory] = useState(() => {
    const savedTab = localStorage.getItem("activeTab") || "Dashboard";
    return savedTab === "Dashboard" ? ["Dashboard"] : ["Dashboard", savedTab];
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);
  const [selectedPeerForChat, setSelectedPeerForChat] = useState(null);
  const [selectedPeerForModal, setSelectedPeerForModal] = useState(null);
  
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [incomingMessages, setIncomingMessages] = useState([]);

  const handleTabChange = (tabName, pushToHistory = true) => {
    if (pushToHistory && tabName !== activeTab) {
      setNavHistory((prev) => [...prev, tabName]);
    }
    setActiveTab(tabName);
    localStorage.setItem("activeTab", tabName);
    if (tabName === "Messages") {
      setUnreadMessagesCount(0);
    }
  };

  const handleGoBack = () => {
    // 1. Close active modal overlays first
    if (viewingProject) {
      setViewingProject(null);
      return;
    }
    if (selectedPeerForModal) {
      setSelectedPeerForModal(null);
      return;
    }
    if (editingProject) {
      setEditingProject(null);
      return;
    }
    if (showCreateModal) {
      setShowCreateModal(false);
      return;
    }

    // 2. Pop previous tab from history stack
    if (navHistory.length > 1) {
      const newHistory = [...navHistory];
      newHistory.pop();
      const previousTab = newHistory[newHistory.length - 1] || "Dashboard";
      setNavHistory(newHistory);
      setActiveTab(previousTab);
      localStorage.setItem("activeTab", previousTab);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      handleGoBack();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [viewingProject, selectedPeerForModal, editingProject, showCreateModal, navHistory, activeTab]);

  const canGoBack = Boolean(
    viewingProject || selectedPeerForModal || editingProject || showCreateModal || (navHistory.length > 1 && activeTab !== "Dashboard")
  );

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = loggedInUser._id || loggedInUser.id;
    if (!userId) return;

    const socket = io("http://localhost:5000");

    socket.on("connect", () => {
      socket.emit("join_room", `user_${userId}`);
    });

    socket.on("new_message_notification", (msg) => {
      const senderObj = typeof msg.sender === "object" ? msg.sender : {};
      const senderName = senderObj.fullName || "Student";
      const senderId = senderObj._id || msg.sender;

      if (String(senderId) !== String(userId)) {
        const preview = msg.content.length > 35 ? msg.content.slice(0, 35) + "..." : msg.content;
        showToast(`💬 New message from ${senderName}: "${preview}"`, "info");
        setUnreadMessagesCount((prev) => prev + 1);
        setIncomingMessages((prev) => [msg, ...prev]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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

  // Helper to parse stored user from localStorage
  const getUserProfileFromStorage = () => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        const name = u.fullName || u.name || "Student";
        return {
          name: name,
          email: u.email || "",
          college: u.college || "",
          major: u.branch || "",
          year: u.year || "",
          bio: u.bio || "",
          skills: Array.isArray(u.skills) ? u.skills : [],
          projectsCount: 0,
          avatarUrl: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
          about: u.bio || "",
          githubUrl: u.github || "",
          linkedinUrl: u.linkedin || "",
          portfolioUrl: u.portfolio || "",
          achievements: Array.isArray(u.achievements) ? u.achievements : [],
          interests: Array.isArray(u.interests) ? u.interests : []
        };
      }
    } catch (e) {
      console.error("Error reading user profile from storage:", e);
    }
    return null;
  };

  // User Data State initialized dynamically
  const [userProfile, setUserProfile] = useState(() => {
    return getUserProfileFromStorage() || {
      name: "Student",
      email: "",
      major: "",
      year: "",
      bio: "",
      skills: [],
      projectsCount: 0,
      avatarUrl: "https://ui-avatars.com/api/?name=Student&background=0D8ABC&color=fff",
      college: "",
      about: "",
      githubUrl: "",
      linkedinUrl: "",
      portfolioUrl: "",
      achievements: [],
      interests: []
    };
  });

  useEffect(() => {
    const updated = getUserProfileFromStorage();
    if (updated) {
      setUserProfile((prev) => ({
        ...prev,
        ...updated,
        projectsCount: prev.projectsCount || 0
      }));
    }
  }, []);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const showToast = useToast();

  const fetchProjects = async (params = {}) => {
    try {
      setLoading(true);
      const data = await getAllProjects(params);
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

  const [appliedProjects, setAppliedProjects] = useState({}); // { [projectId]: status }
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [applyingProjectId, setApplyingProjectId] = useState(null);

  // Notifications states
  const [incomingConnections, setIncomingConnections] = useState([]);
  const [incomingProjectApps, setIncomingProjectApps] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [processingNotificationId, setProcessingNotificationId] = useState(null);

  const handleRespondConnection = async (requestId, action) => {
    try {
      setProcessingNotificationId(requestId);
      await respondConnectionRequest(requestId, action);
      setIncomingConnections((prev) => prev.filter((r) => r._id !== requestId));
      setPendingRequestsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(`Failed to ${action} connection request:`, err);
      const msg = err.response?.data?.message || `Failed to ${action} request`;
      showToast(msg, "error");
    } finally {
      setProcessingNotificationId(null);
    }
  };

  const handleRespondProjectApp = async (applicationId, action) => {
    try {
      setProcessingNotificationId(applicationId);
      await respondProjectApplication(applicationId, action);
      setIncomingProjectApps((prev) => prev.filter((app) => app._id !== applicationId));
      setPendingRequestsCount((prev) => Math.max(0, prev - 1));
      if (action === "accept") {
        fetchProjects();
      }
    } catch (err) {
      console.error(`Failed to ${action} project application:`, err);
      const msg = err.response?.data?.message || `Failed to ${action} application`;
      showToast(msg, "error");
    } finally {
      setProcessingNotificationId(null);
    }
  };

  const renderNotificationBellAndDropdown = (isMobile) => {
    const totalCount = pendingRequestsCount + unreadMessagesCount;
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer focus:outline-none"
          title="Notifications"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {totalCount > 0 && (
            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white ring-2 ring-white">
              {totalCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifications(false)}
            />
            
            <div
              className={`absolute z-50 mt-2 w-80 md:w-96 rounded-2xl bg-white border border-slate-200/80 shadow-2xl shadow-slate-300/40 p-4 transition-all duration-200 ${
                isMobile ? "right-[-50px] origin-top-right" : "right-0 origin-top-right"
              }`}
              style={{ animation: 'slideUpModal 0.18s ease' }}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Notifications</h3>
                  <p className="text-[10px] text-slate-400 font-medium">You have {totalCount} new alerts</p>
                </div>
                {totalCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (unreadMessagesCount > 0) {
                        handleTabChange("Messages");
                      } else {
                        handleTabChange("Pending Requests");
                      }
                      setShowNotifications(false);
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                  >
                    View All
                  </button>
                )}
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {totalCount === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-2.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-slate-700">All caught up!</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">No new requests or applications</p>
                  </div>
                ) : (
                  <>
                    {incomingMessages.map((msgItem) => {
                      const sender = typeof msgItem.sender === "object" ? msgItem.sender : {};
                      const name = sender.fullName || "Student";
                      const avatar = sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;

                      return (
                        <div
                          key={msgItem._id || Math.random()}
                          className="flex items-start gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-100"
                        >
                          <img
                            src={avatar}
                            alt={name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100"
                          />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-800 leading-snug">
                              {name} <span className="font-normal text-slate-400 text-[11px]">sent a message</span>
                            </p>
                            <p className="text-[11px] text-slate-600 italic truncate mt-0.5">
                              "{msgItem.content}"
                            </p>

                            <div className="flex gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (msgItem.chatType === "direct" && sender._id) {
                                    setSelectedPeerForChat(sender);
                                  }
                                  handleTabChange("Messages");
                                  setShowNotifications(false);
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition cursor-pointer"
                              >
                                Reply / Open Chat
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {incomingConnections.map((reqItem) => {
                      const sender = reqItem.sender || {};
                      const name = sender.fullName || sender.name || "Student";
                      const avatar = sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
                      const branchYear = [
                        sender.branch || sender.department,
                        sender.year ? `${sender.year} Year` : null
                      ].filter(Boolean).join(" • ") || "Student";
                      const isProcessing = processingNotificationId === reqItem._id;

                      return (
                        <div
                          key={reqItem._id}
                          className="flex items-start gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-100"
                        >
                          <img
                            src={avatar}
                            alt={name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100"
                          />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-800 leading-snug">
                              {name} <span className="font-normal text-slate-400 text-[11px]">wants to connect</span>
                            </p>
                            <p className="text-[10px] text-blue-600 font-semibold truncate mt-0.5">{branchYear}</p>
                            
                            <div className="flex gap-2 mt-2">
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleRespondConnection(reqItem._id, "accept")}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                              >
                                {isProcessing ? "..." : "Accept"}
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleRespondConnection(reqItem._id, "reject")}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition disabled:opacity-50 cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {incomingProjectApps.map((appItem) => {
                      const applicant = appItem.applicant || {};
                      const project = appItem.project || {};
                      const name = applicant.fullName || applicant.name || "Student";
                      const avatar = applicant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
                      const projTitle = project.title || "Project";
                      const isProcessing = processingNotificationId === appItem._id;

                      return (
                        <div
                          key={appItem._id}
                          className="flex items-start gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-100"
                        >
                          <img
                            src={avatar}
                            alt={name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100"
                          />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-800 leading-snug">
                              {name} <span className="font-normal text-slate-400 text-[11px]">applied to join</span>
                            </p>
                            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded-md font-semibold truncate mt-0.5 inline-block max-w-full">
                              {projTitle}
                            </p>
                            {appItem.message && (
                              <p className="text-[10px] text-slate-500 italic mt-1.5 pl-2 border-l-2 border-slate-200 line-clamp-2">
                                "{appItem.message}"
                              </p>
                            )}
                            
                            <div className="flex gap-2 mt-2.5">
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleRespondProjectApp(appItem._id, "accept")}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                              >
                                {isProcessing ? "..." : "Accept"}
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleRespondProjectApp(appItem._id, "reject")}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition disabled:opacity-50 cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Apply modal state
  const [applyModalProject, setApplyModalProject] = useState(null); // project object or {id, title}
  const [applyMessage, setApplyMessage] = useState("");

  // Build a dynamic pre-filled note from logged-in user profile
  const buildDefaultNote = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const branch = u.branch || userProfile.major || "Software Engineering";
      const skills = (Array.isArray(u.skills) && u.skills.length > 0)
        ? u.skills.slice(0, 4).join(", ")
        : (userProfile.skills || []).slice(0, 4).join(", ") || "Software Development";
      return `Hello. I am writing to express my interest in joining your project team. My technical focus is in ${branch} with skills in ${skills}.`;
    } catch {
      return "Hello. I am writing to express my interest in joining your project team and would appreciate the opportunity to collaborate.";
    }
  };

  const openApplyModal = (project) => {
    setApplyModalProject(project);
    setApplyMessage(buildDefaultNote());
  };

  const closeApplyModal = () => {
    setApplyModalProject(null);
    setApplyMessage("");
  };

  const fetchApplicationsAndRequests = async () => {
    try {
      setLoadingNotifications(true);
      const [sentAppsRes, receivedAppsRes, connRequestsRes, convsRes] = await Promise.allSettled([
        getMyProjectApplications(),
        getReceivedProjectApplications(),
        getPendingRequests(),
        getConversations()
      ]);

      if (sentAppsRes.status === "fulfilled" && sentAppsRes.value?.success) {
        const map = {};
        (sentAppsRes.value.applications || []).forEach((app) => {
          const pId = app.project?._id || app.project;
          if (pId) map[pId] = app.status;
        });
        setAppliedProjects(map);
      }

      let conns = [];
      if (connRequestsRes.status === "fulfilled" && connRequestsRes.value?.success) {
        conns = connRequestsRes.value.requests || [];
        setIncomingConnections(conns);
      }

      let apps = [];
      if (receivedAppsRes.status === "fulfilled" && receivedAppsRes.value?.success) {
        apps = receivedAppsRes.value.applications || [];
        setIncomingProjectApps(apps);
      }

      if (convsRes.status === "fulfilled" && convsRes.value?.success) {
        const direct = convsRes.value.directChats || [];
        const team = convsRes.value.teamChats || [];
        const directUnread = direct.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        const teamUnread = team.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadMessagesCount(directUnread + teamUnread);
      }

      setPendingRequestsCount(conns.length + apps.length);
    } catch (err) {
      console.error("Error loading applications and requests:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchApplicationsAndRequests();
  }, []);

  const handleApplyToProject = async (projectId, message) => {
    try {
      setApplyingProjectId(projectId);
      const response = await applyToProject(projectId, message);
      if (response.success) {
        setAppliedProjects((prev) => ({ ...prev, [projectId]: "pending" }));
        closeApplyModal();
        showToast("Application submitted successfully to the project lead!", "success");
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to apply to project";
      showToast(msg, "error");
    } finally {
      setApplyingProjectId(null);
    }
  };

  const handleWithdrawApplication = async (projectId) => {
    try {
      await withdrawProjectApplication(projectId);
      setAppliedProjects((prev) => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      showToast("Project application withdrawn", "success");
    } catch (err) {
      console.error("Failed to withdraw project application:", err);
      const msg = err.response?.data?.message || "Failed to withdraw application";
      showToast(msg, "error");
    }
  };


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
    { name: "All Projects", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )},
    { name: "Activity Feed", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
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
    { name: "Messages", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

  // Debounced server-side search and skill filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = {
        search: searchQuery,
        skill: selectedTagFilter !== "All" ? selectedTagFilter : undefined
      };
      if (activeTab === "Dashboard") {
        params.limit = 6;
      }
      fetchProjects(params);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedTagFilter, activeTab]);

  // Filtering projects list based on search and tags/skills
  const filteredProjects = projects;

  const userProjects = projects.filter((p) => {
    const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
    const ownerId = p.createdBy && typeof p.createdBy === "object" ? p.createdBy._id : p.createdBy;
    return p.isOwner || (loggedInUser?._id && ownerId === loggedInUser._id);
  });

  // Calculate high-level stats
  const activeCount = userProjects.filter((p) => p.status === "In Progress" || p.status === "Planning" || p.status === "Open" || !p.status).length;
  const completedCount = userProjects.filter((p) => p.status === "Completed").length;

  // Total pending requests combines connection requests and project applications
  const pendingRequests = pendingRequestsCount;

  const totalTeamMembers = userProjects.reduce((sum, p) => sum + (Number(p.teamSize) || 0), 0);
  const averageProgress = userProjects.length > 0 
    ? Math.round(userProjects.reduce((sum, p) => sum + (Number(p.progress) || 0), 0) / userProjects.length)
    : 0;

  // Helper to render individual project card consistently across views
  const renderProjectCard = (project) => {
    const pId = project._id || project.id;
    const appStatus = appliedProjects[pId];
    const isApplying = applyingProjectId === pId;

    return (
      <div
        key={pId}
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
              View Details
            </button>
            {project.isOwner ? (
              <button
                onClick={() => {
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
                title="Toggle Status"
              >
                Update Status
              </button>
            ) : (
              (() => {
                if (appStatus === "pending") {
                  return (
                    <button
                      onClick={() => handleWithdrawApplication(pId)}
                      className="px-3 py-2 bg-amber-50 hover:bg-red-50 text-amber-700 hover:text-red-600 border border-amber-200 hover:border-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 group"
                      title="Click to withdraw application"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-600 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Withdraw App</span>
                    </button>
                  );
                } else if (appStatus === "accepted") {
                  return (
                    <button
                      disabled
                      className="px-3 py-2 bg-green-50 text-green-600 border border-green-200 text-xs font-bold rounded-xl opacity-90 cursor-not-allowed flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Joined
                    </button>
                  );
                } else {
                  return (
                    <button
                      disabled={isApplying}
                      onClick={() => openApplyModal(project)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      {isApplying ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Applying...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Apply to Join
                        </>
                      )}
                    </button>
                  );
                }
              })()
            )}
          </div>
        </div>
      </div>
    );
  };

  // Handle creating a new project
  const handleCreateProjectSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newProject.title || !newProject.description || !newProject.tags) {
      showToast("Please fill in all required fields.", "error");
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

      showToast("Project Created Successfully", "success");
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
      showToast(errorMessage, "error");
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
        showToast("Project updated successfully", "success");
      } else {
        showToast(response.message || "Failed to update project", "error");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      showToast(error.response?.data?.message || "Error updating project. Please try again.", "error");
    }
  };

  const handleDelete = async (projectId) => {
    try {
      const response = await deleteProject(projectId);
      if (response.success) {
        await fetchProjects();
        showToast("Project deleted successfully", "success");
        return true;
      } else {
        showToast(response.message || "Failed to delete project", "error");
        return false;
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      showToast(error.response?.data?.message || "Error deleting project. Please try again.", "error");
      return false;
    }
  };



  // Main UI Render
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 antialiased">
      
      {/* MOBILE HEADER BAR */}
      <header className="md:hidden w-full flex items-center justify-between bg-white px-4 h-16 border-b border-slate-200 sticky top-0 z-40">
        <div
          onClick={() => {
            handleTabChange("Dashboard");
            setSidebarOpen(false);
          }}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5.5 w-5.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            CollabGrad
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg shrink-0 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span>Back</span>
            </button>
          )}
          {renderNotificationBellAndDropdown(true)}
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
        </div>
      </header>

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between fixed h-[calc(100vh-4rem)] md:h-screen z-30 transition-all duration-300 ${
          sidebarOpen ? "left-0" : "-left-64"
        } md:sticky md:top-0`}
      >
        <div>
          {/* Logo - Desktop only */}
          <div
            onClick={() => handleTabChange("Dashboard")}
            className="hidden md:flex items-center gap-2 px-6 h-20 border-b border-slate-100 cursor-pointer select-none"
          >
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
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.name === "Messages" && unreadMessagesCount > 0 && (
                    <span className="bg-red-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full ring-2 ring-white">
                      {unreadMessagesCount}
                    </span>
                  )}
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
        
        {/* DESKTOP HEADER / TOPBAR */}
        <div className="hidden md:flex items-center justify-between mb-8 pb-4 border-b border-slate-200/60 relative">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <button
                type="button"
                onClick={handleGoBack}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span>Back</span>
              </button>
            )}
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">
                {activeTab}
              </h1>
              <p className="text-xs text-slate-400 font-semibold">
                {activeTab === "Dashboard" 
                  ? "Overview & collaboration activity summary"
                  : `Manage and view your ${activeTab.toLowerCase()} space.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 relative">
             {renderNotificationBellAndDropdown(false)}
          </div>
        </div>
        
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
                  Your Workspace 🚀
                </h1>
                <p className="mt-2 text-white/80 text-sm md:text-base font-normal leading-relaxed">
                  {userProjects.length === 0
                    ? "You haven't created any projects yet. Start one and find your dream team!"
                    : <>
                        You are currently leading{" "}
                        <span className="font-bold text-white">
                          {userProjects.length} {userProjects.length === 1 ? "project" : "projects"}
                        </span>{" "}
                        with{" "}
                        <span className="font-bold text-white">
                          {activeCount} active
                        </span>{" "}
                        and{" "}
                        <span className="font-bold text-white">
                          {completedCount} completed
                        </span>.{" "}
                        {pendingRequests > 0 && (
                          <>
                            There {pendingRequests === 1 ? "is" : "are"}{" "}
                            <span className="font-bold text-white">
                              {pendingRequests} pending {pendingRequests === 1 ? "request" : "requests"}
                            </span>{" "}
                            from classmates looking to team up with you.
                          </>
                        )}
                      </>
                  }
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

            {/* 2. 4 Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Stat Card 1: Active Projects */}
              <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Projects</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{activeCount}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-semibold mt-1" style={{ color: completedCount > 0 ? '#16a34a' : '#94a3b8' }}>
                    {completedCount > 0 ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span>{completedCount} completed</span>
                      </>
                    ) : (
                      <span>No completed projects yet</span>
                    )}
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
                    {totalTeamMembers === 0 ? (
                      <span className="text-[10px] font-semibold text-slate-400">No team slots yet</span>
                    ) : (
                      <>
                        {userProjects.slice(0, 4).map((p, i) => {
                          const colors = ['bg-blue-500','bg-indigo-500','bg-violet-500','bg-pink-500'];
                          const initial = (p.title || '?')[0].toUpperCase();
                          return (
                            <span
                              key={i}
                              title={p.title}
                              className={`flex items-center justify-center w-5 h-5 rounded-full ring-2 ring-white text-[8px] font-bold text-white ${colors[i % colors.length]}`}
                            >
                              {initial}
                            </span>
                          );
                        })}
                        {userProjects.length > 4 && (
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 ring-2 ring-white text-[8px] font-bold text-slate-500">
                            +{userProjects.length - 4}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>

              {/* Stat Card 3: Pending Applications */}
              <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Requests</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{pendingRequests}</h3>
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

            {/* 3. Recent Projects Section */}
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
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.slice(0, 6).map((project) => renderProjectCard(project))}
                  </div>

                  {/* View All Projects Button */}
                  <div className="flex justify-center pt-2 pb-2">
                    <button
                      onClick={() => handleTabChange("All Projects")}
                      className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-blue-200 text-blue-600 hover:text-blue-700 font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2 group"
                    >
                      <span>View All Projects</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Live Activity Preview */}
            <ActivityFeed
              isPreview={true}
              onViewAllActivity={() => handleTabChange("Activity Feed")}
              onSelectPeer={(peer) => setSelectedPeerForModal(peer)}
            />
          </div>
        )}

        {/* ============================================== */}
        {/* TAB CONTENT: ALL PROJECTS */}
        {/* ============================================== */}
        {activeTab === "All Projects" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">All Collaboration Projects</h2>
                <p className="text-xs font-semibold text-slate-400 mt-1">Browse, filter, and apply to all active student projects across colleges</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/15 transition-all cursor-pointer self-start sm:self-auto shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="relative w-full md:w-80">
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {["All", "Web Dev", "AI/ML", "Mobile App", "React"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      selectedTagFilter === tag
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm font-medium text-slate-500 animate-pulse">Loading all projects...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center">
                <p className="text-sm font-semibold text-slate-500">No projects found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                {filteredProjects.map((project) => renderProjectCard(project))}
              </div>
            )}
          </div>
        )}

        {/* ============================================== */}
        {/* TAB CONTENT: ACTIVITY FEED */}
        {/* ============================================== */}
        {activeTab === "Activity Feed" && (
          <div className="space-y-6">
            <div className="border-b border-slate-200/60 pb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Platform Activity Feed</h2>
              <p className="text-xs font-semibold text-slate-400 mt-1">Live real-time stream of all collaboration events across the platform</p>
            </div>

            <ActivityFeed isPreview={false} onSelectPeer={(peer) => setSelectedPeerForModal(peer)} />
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
          <FindTeam onSelectPeer={(peer) => setSelectedPeerForModal(peer)} />
        )}

        {/* ============================================== */}
        {/* TAB CONTENT: PENDING REQUESTS */}
        {/* ============================================== */}
        {activeTab === "Pending Requests" && (
          <PendingRequests
            connectionRequests={incomingConnections}
            projectApplications={incomingProjectApps}
            onRespondConnection={handleRespondConnection}
            onRespondProjectApp={handleRespondProjectApp}
            loading={loadingNotifications}
          />
        )}

        {/* ============================================== */}
        {/* TAB CONTENT: MY CONNECTIONS */}
        {/* ============================================== */}
        {activeTab === "My Connections" && (
          <MyConnections
            onNavigateToChat={(peer) => {
              setSelectedPeerForChat(peer);
              handleTabChange("Messages");
            }}
          />
        )}

        {/* ============================================== */}
        {/* TAB CONTENT: MESSAGES */}
        {/* ============================================== */}
        {activeTab === "Messages" && (
          <Messages
            initialPeer={selectedPeerForChat}
            onSelectPeer={(peer) => setSelectedPeerForModal(peer)}
          />
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
                  onClick={() => showToast("Settings saved (Simulated)!", "success")}
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
          appliedStatus={appliedProjects[viewingProject._id || viewingProject.id]}
          onApply={(projectId) => {
            // Route through the modal for the drawer too
            const proj = projects.find(p => (p._id || p.id) === projectId) || viewingProject;
            openApplyModal(proj);
          }}
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
          onSelectPeer={(peer) => setSelectedPeerForModal(peer)}
        />
      )}

      {/* ============================================== */}
      {/* UNIVERSAL PEER PROFILE MODAL */}
      {/* ============================================== */}
      {selectedPeerForModal && (
        <PeerProfileModal
          peer={selectedPeerForModal}
          onClose={() => setSelectedPeerForModal(null)}
          onNavigateToChat={(peer) => {
            setSelectedPeerForModal(null);
            setSelectedPeerForChat(peer);
            setActiveTab("Messages");
          }}
        />
      )}
      
      {/* ============================================== */}
      {/* APPLY TO JOIN PITCH MODAL */}
      {/* ============================================== */}
      {applyModalProject && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeApplyModal(); }}
        >
          <div style={{
            background: '#fff', borderRadius: '1.25rem', width: '100%', maxWidth: '440px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '1.75rem',
            animation: 'slideUpModal 0.22s ease'
          }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-0.5">Apply to Join</p>
                <h2 className="text-lg font-extrabold text-slate-800 leading-tight">
                  {applyModalProject.title || applyModalProject.name || 'Project'}
                </h2>
              </div>
              <button
                onClick={closeApplyModal}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Message label */}
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Your Application Note
              <span className="ml-1 font-normal text-slate-400">(editable)</span>
            </label>
            <textarea
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              rows={5}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              placeholder="Write your application note here..."
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              This note will be sent to the project lead along with your profile.
            </p>

            {/* Buttons */}
            <div className="flex gap-2 mt-5">
              <button
                onClick={closeApplyModal}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={applyingProjectId === (applyModalProject._id || applyModalProject.id) || !applyMessage.trim()}
                onClick={() => handleApplyToProject(applyModalProject._id || applyModalProject.id, applyMessage.trim())}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-md shadow-blue-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {applyingProjectId === (applyModalProject._id || applyModalProject.id) ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </div>
        </div>
      )}



      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes slideUpModal {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

    </div>
  );
}

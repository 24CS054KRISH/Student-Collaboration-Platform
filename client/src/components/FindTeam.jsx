import { useState, useEffect } from "react";
import { getAllUsers } from "../api/authApi";
import {
  sendConnectionRequest,
  getSentRequests,
  cancelConnectionRequest,
  removeConnection,
  respondConnectionRequest
} from "../api/connectionApi";

export default function FindTeam() {
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [experienceFilter, setExperienceFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get currently logged-in user from localStorage
        let currentUser = null;
        try {
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            currentUser = JSON.parse(savedUser);
          }
        } catch (e) {
          console.error("Error parsing user from localStorage:", e);
        }

        const currentUserId = currentUser?._id || currentUser?.id;
        const currentUserEmail = currentUser?.email;

        // Fetch users & connection requests concurrently
        const [usersResponse, sentRequestsResponse] = await Promise.all([
          getAllUsers(),
          currentUserId
            ? getSentRequests(currentUserId).catch(() => ({ requestStatuses: {}, connectionStates: {} }))
            : Promise.resolve({ requestStatuses: {}, connectionStates: {} })
        ]);

        const usersList = usersResponse?.users || (Array.isArray(usersResponse) ? usersResponse : []);
        const requestStatuses = sentRequestsResponse?.requestStatuses || {};
        const connectionStates = sentRequestsResponse?.connectionStates || {};

        // Exclude currently logged-in user and already connected users from the list
        const otherUsers = usersList.filter((user) => {
          const userId = user._id || user.id;
          if (currentUserId && String(userId) === String(currentUserId)) return false;
          if (currentUserEmail && user.email?.toLowerCase() === currentUserEmail.toLowerCase()) return false;

          // Exclude users who are already connected in MongoDB
          const status = requestStatuses[String(userId)];
          if (status === "accepted") return false;

          return true;
        });

        // Format user attributes for student card UI
        const formattedStudents = otherUsers.map((user) => {
          const userId = user._id || user.id;
          const status = requestStatuses[String(userId)];
          const stateObj = connectionStates[String(userId)];

          let connectionState = "Connect";
          let requestId = stateObj?.requestId || null;

          if (status === "accepted") {
            connectionState = "Connected";
          } else if (status === "pending") {
            connectionState = "Requested";
          } else if (status === "received_pending") {
            connectionState = "Respond to Request";
          } else {
            connectionState = "Connect"; // rejected or no relationship
          }

          const name = user.fullName || user.name || "Anonymous Student";

          return {
            ...user,
            id: userId,
            requestId: requestId,
            name: name,
            role: user.role || user.branch || "Student",
            college: user.college || "University Student",
            bio: user.bio || "No bio provided.",
            skills: Array.isArray(user.skills) ? user.skills : [],
            availability: user.availability || "Available",
            availabilityStatus: user.availabilityStatus || "Available",
            experience: user.experience || "Intermediate",
            projectType: user.projectType || "Web App",
            githubUrl: user.githubUrl || (user.github ? (user.github.startsWith("http") ? user.github : `https://${user.github}`) : "https://github.com"),
            avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
            connectionState: connectionState
          };
        });

        setStudents(formattedStudents);
      } catch (error) {
        console.error("Failed to fetch registered users or connection requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Combined Filters Logic
  const filteredStudents = students.filter((s) => {
    // Search filter (searches name, bio, skills, or college)
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.skills.some((sk) => sk.toLowerCase().includes(searchQuery.toLowerCase()));

    // Dropdown filters
    const matchesSkill = skillFilter === "All" || s.skills.some((sk) => sk.toLowerCase() === skillFilter.toLowerCase());
    const matchesRole = roleFilter === "All" || s.role.toLowerCase() === roleFilter.toLowerCase() || (s.branch && s.branch.toLowerCase() === roleFilter.toLowerCase());
    const matchesExperience = experienceFilter === "All" || s.experience === experienceFilter;
    const matchesProject = projectFilter === "All" || s.projectType === projectFilter;

    return matchesSearch && matchesSkill && matchesRole && matchesExperience && matchesProject;
  });

  // Handle Connect Click
  const handleConnectClick = async (studentId) => {
    try {
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Pending" } : s))
      );

      await sendConnectionRequest(studentId);

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Requested" } : s))
      );
    } catch (error) {
      console.error("Error sending connection request:", error);
      const message = error.response?.data?.message || "Failed to send connection request";
      alert(message);

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Connect" } : s))
      );
    }
  };

  // Handle Cancel Request Click
  const handleCancelClick = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to cancel your connection request to ${studentName}?`)) {
      return;
    }

    try {
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Pending" } : s))
      );

      await cancelConnectionRequest(studentId);

      // Immediately revert button to Connect upon successful cancellation
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Connect" } : s))
      );
    } catch (error) {
      console.error("Error cancelling connection request:", error);
      const message = error.response?.data?.message || "Failed to cancel connection request";
      alert(message);

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Requested" } : s))
      );
    }
  };

  // Handle Remove Connection Click
  const handleRemoveConnection = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to remove your connection with ${studentName}?`)) {
      return;
    }

    try {
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Pending" } : s))
      );

      await removeConnection(studentId);

      // Immediately revert button to Connect upon successful removal
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Connect" } : s))
      );
    } catch (error) {
      console.error("Error removing connection:", error);
      const message = error.response?.data?.message || "Failed to remove connection";
      alert(message);

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Connected" } : s))
      );
    }
  };

  // Handle Respond to Request Click (Inline Accept / Reject)
  const handleRespondRequest = async (requestId, action, studentId) => {
    try {
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Pending" } : s))
      );

      // If requestId wasn't pre-saved, call respond with request ID
      await respondConnectionRequest(requestId, action);

      if (action.toLowerCase() === "accept") {
        // Once accepted, exclude the student card completely from Find Team
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
      } else {
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Connect" } : s))
        );
      }
    } catch (error) {
      console.error(`Error responding to request (${action}):`, error);
      const message = error.response?.data?.message || `Failed to ${action} request`;
      alert(message);

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, connectionState: "Respond to Request" } : s))
      );
    }
  };

  // Lists of options extracted from mock data for filters
  const skillsOptions = ["React", "Python", "Figma", "Node.js", "Flutter", "C++", "TypeScript", "PyTorch", "Docker"];
  const rolesOptions = ["UI/UX Designer", "ML Engineer", "Backend Developer", "Frontend Developer", "Mobile Developer", "IoT Engineer"];
  const experienceOptions = ["Beginner", "Intermediate", "Advanced"];
  const projectOptions = ["Web App", "Mobile App", "AI/ML", "Hardware/IoT"];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Section */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Find Team</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Search and filter university peers by tech skills, roles, and project preferences to build your ideal team.
        </p>
      </div>

      {/* 2. Filters & Search Section */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search students by name, college, skills, bio keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 text-sm text-slate-900 border border-slate-200 rounded-xl bg-slate-50 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all"
          />
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {/* Skill Dropdown */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skills</label>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="block w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="All">All Skills</option>
              {skillsOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Role Dropdown */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="All">All Roles</option>
              {rolesOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Experience Dropdown */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Experience</label>
            <select
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
              className="block w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="All">All Levels</option>
              {experienceOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Project Type Dropdown */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Type</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="block w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="All">All Projects</option>
              {projectOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(searchQuery || skillFilter !== "All" || roleFilter !== "All" || experienceFilter !== "All" || projectFilter !== "All") && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchQuery("");
                setSkillFilter("All");
                setRoleFilter("All");
                setExperienceFilter("All");
                setProjectFilter("All");
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* 3. Cards Grid */}
      {loading ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-semibold text-slate-500">Loading student directory...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No peers found</h3>
          <p className="text-xs font-medium text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            We couldn't find any students matching your filters. Try search keywords or loosening up the filter select options.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Header: Photo, Name, Role */}
                <div className="flex items-start gap-4">
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-100 shadow-sm"
                  />
                  <div className="space-y-0.5">
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">{student.name}</h3>
                    <p className="text-xs font-bold text-blue-600">{student.role}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${student.availabilityStatus === "Available"
                        ? "bg-green-50 text-green-600 border border-green-100"
                        : student.availabilityStatus === "Part-Time"
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : "bg-red-50 text-red-600 border border-red-100"
                      }`}>
                      {student.availability}
                    </span>
                  </div>
                </div>

                {/* College Info */}
                <div className="flex items-center gap-1 mt-4 text-[10px] font-semibold text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{student.college}</span>
                </div>

                {/* Bio text */}
                <p className="text-xs text-slate-500 leading-relaxed font-normal mt-3 line-clamp-3">
                  {student.bio}
                </p>

                {/* Skills badges */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {student.skills.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action area based on Connection State Priority */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                {student.connectionState === "Connected" ? (
                  <div className="flex flex-col gap-2 w-full">
                    <p className="text-[11px] font-semibold text-green-600 text-center flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      You are already connected
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={student.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`Opening GitHub profile link: ${student.githubUrl}/${student.name.replace(" ", "").toLowerCase()}`);
                        }}
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                        title="View GitHub"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.436 22 12.017 2 6.484 6.477 2 12 2z" />
                        </svg>
                      </a>
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl bg-green-50 text-green-700 border border-green-200 shadow-sm">
                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span>Connected</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveConnection(student.id, student.name)}
                        className="py-2 px-3 text-xs font-bold text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                        title="Remove connection"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.765Z" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : student.connectionState === "Requested" ? (
                  <div className="flex flex-col gap-2 w-full">
                    <p className="text-[11px] font-semibold text-amber-600 text-center flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Connection request sent
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={student.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`Opening GitHub profile link: ${student.githubUrl}/${student.name.replace(" ", "").toLowerCase()}`);
                        }}
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                        title="View GitHub"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.436 22 12.017 2 6.484 6.477 2 12 2z" />
                        </svg>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCancelClick(student.id, student.name)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl bg-amber-50 hover:bg-red-50 text-amber-700 hover:text-red-600 border border-amber-200 hover:border-red-200 shadow-sm transition-all cursor-pointer"
                        title="Click to cancel request"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Requested
                      </button>
                    </div>
                  </div>
                ) : student.connectionState === "Respond to Request" ? (
                  <div className="flex flex-col gap-2 w-full">
                    <p className="text-[11px] font-semibold text-blue-600 text-center flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      Sent you a connection request
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRespondRequest(student.requestId, 'accept', student.id)}
                        className="flex-1 py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondRequest(student.requestId, 'reject', student.id)}
                        className="py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  </div>
                ) : student.connectionState === "Pending" ? (
                  <div className="flex gap-2.5 w-full">
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl transition-all bg-blue-50 text-blue-400 border border-blue-100 cursor-wait"
                    >
                      <svg className="animate-spin h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2.5 w-full">
                    <a
                      href={student.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        alert(`Opening GitHub profile link: ${student.githubUrl}/${student.name.replace(" ", "").toLowerCase()}`);
                      }}
                      className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                      title="View GitHub"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.436 22 12.017 2 6.484 6.477 2 12 2z" />
                      </svg>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleConnectClick(student.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 hover:shadow-blue-500/15"
                    >
                      Connect
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


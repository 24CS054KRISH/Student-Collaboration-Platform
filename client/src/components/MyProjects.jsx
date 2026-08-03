import { useState, useEffect } from "react";
import { getMyProjects, updateProject, deleteProject } from "../api/projectApi";
import ProjectDetailsDrawer from "./ProjectDetailsDrawer";
import ProjectEditModal from "./ProjectEditModal";

export default function MyProjects({ projects, setProjects, onCreateClick }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  // Modals / Overlays States
  const [editingProject, setEditingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);

  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const fetchUserProjects = async () => {
      if (!user?._id) return;
      try {
        setLoading(true);
        const data = await getMyProjects(user._id);
        const mapped = (data.projects || []).map((p) => ({ ...p, isOwner: true }));
        setMyProjects(mapped);
      } catch (error) {
        console.error("Error fetching user projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProjects();
  }, [user?._id]);

  // Filter projects by status chip and search query
  const filteredProjects = myProjects.filter((p) => {
    const matchesSearch = (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (selectedFilter === "Active") {
      matchesStatus = p.status === "In Progress" || p.status === "Planning" || p.status === "Open";
    } else if (selectedFilter === "Completed") {
      matchesStatus = p.status === "Completed";
    } else if (selectedFilter === "Draft") {
      matchesStatus = p.status === "Draft";
    }

    return matchesSearch && matchesStatus;
  });

  // Handle Edit saving
  const handleEditSave = async (updatedFields) => {
    try {
      const response = await updateProject(editingProject._id || editingProject.id, updatedFields);

      if (response.success) {
        const updated = {
          ...editingProject,
          ...response.project,
          isOwner: true
        };

        setMyProjects(myProjects.map((p) => {
          if (updated._id && p._id === updated._id) return updated;
          if (updated.id && p.id === updated.id) return updated;
          return p;
        }));

        if (setProjects && projects) {
          setProjects(projects.map((p) => {
            if (updated._id && p._id === updated._id) return updated;
            if (updated.id && p.id === updated.id) return updated;
            return p;
          }));
        }

        setEditingProject(null);
        if (viewingProject && (viewingProject._id === updated._id || viewingProject.id === updated.id)) {
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
        // Remove from local myProjects state
        setMyProjects(myProjects.filter((p) => p._id !== projectId && p.id !== projectId));

        // Remove from global projects state if it exists
        if (setProjects && projects) {
          setProjects(projects.filter((p) => p._id !== projectId && p.id !== projectId));
        }

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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">My Projects</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Manage, edit, and keep track of all your active academic collaborations.
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-bold shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Create New Project
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search your projects by keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 text-sm text-slate-900 border border-slate-200 rounded-xl bg-slate-50 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Filter status:</span>
          {["All", "Active", "Completed", "Draft"].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedFilter === filter
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Projects Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm font-semibold text-slate-500 animate-pulse">Loading your projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No projects found</h3>
          <p className="text-xs font-medium text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            No listings match your search criteria or selected filter status. Try checking other filter categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id || project._id}
              className="group bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase ${project.status === "Completed"
                      ? "bg-green-50 text-green-600 border border-green-100"
                      : project.status === "In Progress"
                        ? "bg-amber-50 text-amber-600 border border-amber-100"
                        : project.status === "Planning" || project.status === "Open"
                          ? "bg-blue-50 text-blue-600 border border-blue-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>
                    {project.status || "Open"}
                  </span>

                  {project.isOwner && (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-100 rounded">
                      Lead
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                  {project.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal mt-2 line-clamp-3">
                  {project.description}
                </p>

                {/* Tech tags */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {(project.requiredSkills || project.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progress and Actions footer */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                {/* Team size bubble and progress info */}
                <div className="flex items-center justify-between text-xs font-semibold mb-3">
                  <div className="flex items-center gap-1.5">
                    {/* User Avatars or default icon */}
                    <div className="flex -space-x-1.5">
                      {project.teamAvatars && project.teamAvatars.map((url, idx) => (
                        <img
                          key={idx}
                          className="w-5.5 h-5.5 rounded-full border border-white object-cover"
                          src={url}
                          alt="Contributor"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold ml-1">
                      {project.teamSize} member{project.teamSize > 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-slate-500 font-bold text-xs">{project.progress || 0}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-4">
                  <div
                    className={`h-1.5 rounded-full ${project.status === "Completed"
                        ? "bg-green-500"
                        : project.status === "Draft"
                          ? "bg-slate-400"
                          : "bg-blue-600"
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
                  <button
                    onClick={() => {
                      setEditingProject({
                        ...project,
                        tags: (project.requiredSkills || project.tags || []).join(", ")
                      });
                    }}
                    className="px-3.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project._id || project.id)}
                    className="px-3.5 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>

              </div>
            </div>
          ))}
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

import React from "react";

export default function ProjectDetailsDrawer({ project, appliedStatus, onApply, onClose, onEdit, onDelete }) {
  if (!project) return null;

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  
  // Determine ownership
  const isOwner = project.isOwner || 
                  project.createdBy === loggedInUser._id || 
                  project.createdBy?._id === loggedInUser._id;

  // Resolve creator details
  let creatorName = "Academic Peer";
  let creatorEmail = "";

  if (project.createdBy) {
    if (typeof project.createdBy === "object") {
      creatorName = project.createdBy.fullName || creatorName;
      creatorEmail = project.createdBy.email || creatorEmail;
    } else if (project.createdBy === loggedInUser._id) {
      creatorName = loggedInUser.fullName || creatorName;
      creatorEmail = loggedInUser.email || creatorEmail;
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-end">
      {/* Backdrop Clicker */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white h-full max-w-lg w-full shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-y-auto z-10 animate-slideLeft">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                project.status === "Completed" 
                  ? "bg-green-50 text-green-600 border border-green-100" 
                  : "bg-blue-50 text-blue-600 border border-blue-100"
              }`}>
                {project.status || "Open"}
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2">{project.title}</h2>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                Workspace Role: {project.role || (isOwner ? "Lead" : "Contributor")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/40">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-500">Project Completion</span>
              <span className="text-slate-800 font-bold">{project.progress || 0}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${project.progress || 0}%` }} />
            </div>
          </div>

          {/* Category */}
          {project.category && (
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Category</h4>
              <p className="text-xs text-slate-700 font-bold bg-blue-50/50 px-3 py-1.5 border border-blue-100/50 rounded-xl inline-block">
                {project.category}
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Description</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-normal bg-slate-50/50 p-3.5 border border-slate-100 rounded-xl">
              {project.description}
            </p>
          </div>

          {/* Technology Tags */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Technologies Used</h4>
            <div className="flex flex-wrap gap-2">
              {(project.requiredSkills || project.tags || []).map((tag) => (
                <span key={tag} className="px-3 py-1 bg-blue-50/50 text-blue-600 font-semibold text-xs border border-blue-100/50 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Team Members ({project.teamSize || 1})</h4>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {project.teamAvatars && project.teamAvatars.length > 0 ? (
                project.teamAvatars.map((url, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                    <img src={url} alt="Member" className="w-7 h-7 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {i === 0 ? (isOwner ? "You (Lead)" : creatorName) : `Teammate #${i}`}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">{i === 0 ? "Lead Developer" : "Contributor"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{isOwner ? "You" : creatorName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Lead Developer</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Created By */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Created By</h4>
            <div className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
              <div className="h-8 w-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                {(creatorName || "U")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{creatorName}</p>
                {creatorEmail && <p className="text-[10px] text-slate-400 font-semibold">{creatorEmail}</p>}
              </div>
            </div>
          </div>

          {/* Mock Roadmap Milestones */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Milestones & Roadmap</h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px] font-bold">✓</span>
                <span className="text-xs text-slate-500 font-medium line-through">Define project structure and goals</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px] font-bold">✓</span>
                <span className="text-xs text-slate-500 font-medium line-through">Develop primary web interface templates</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  (project.progress || 0) >= 70 ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                }`}>
                  {(project.progress || 0) >= 70 ? "✓" : "2"}
                </span>
                <span className={`text-xs font-medium ${(project.progress || 0) >= 70 ? "text-slate-500 line-through" : "text-slate-700"}`}>
                  Integrate dynamic task tracking boards
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-bold">3</span>
                <span className="text-xs text-slate-400 font-medium">Final review and deployment validation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Actions */}
        <div className="pt-6 border-t border-slate-100 flex gap-3 mt-6">
          {isOwner ? (
            <>
              <button
                onClick={() => onEdit(project)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer text-center"
              >
                Edit Project
              </button>
              <button
                onClick={() => onDelete(project._id || project.id)}
                className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
              >
                Delete
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </>
          ) : (
            <>
              {appliedStatus === "pending" ? (
                <button
                  disabled
                  className="flex-1 py-3 bg-amber-50 text-amber-600 border border-amber-200 text-xs font-bold rounded-xl opacity-90 cursor-not-allowed text-center"
                >
                  Application Pending
                </button>
              ) : appliedStatus === "accepted" ? (
                <button
                  disabled
                  className="flex-1 py-3 bg-green-50 text-green-600 border border-green-200 text-xs font-bold rounded-xl opacity-90 cursor-not-allowed text-center"
                >
                  Joined Team
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onApply) onApply(project._id || project.id);
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer text-center"
                >
                  Apply to Join Project
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

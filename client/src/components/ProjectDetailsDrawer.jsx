import React, { useState, useEffect } from "react";
import { getTeammateRecommendations } from "../api/connectionApi";

export default function ProjectDetailsDrawer({ project, appliedStatus, onApply, onClose, onEdit, onDelete, onSelectPeer }) {
  if (!project) return null;

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  
  // Determine ownership
  const isOwner = project.isOwner || 
                  project.createdBy === loggedInUser._id || 
                  project.createdBy?._id === loggedInUser._id;

  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    const pId = project._id || project.id;
    if (isOwner && pId) {
      setLoadingRecs(true);
      getTeammateRecommendations(pId)
        .then((data) => {
          if (data.success && Array.isArray(data.recommendations)) {
            setRecommendations(data.recommendations);
          }
        })
        .catch((err) => console.error("Error loading recommendations:", err))
        .finally(() => setLoadingRecs(false));
    }
  }, [project, isOwner]);

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

  // Resolve real team members list
  const teamMembers = Array.isArray(project.members) && project.members.length > 0
    ? project.members
    : [
        {
          _id: (typeof project.createdBy === "object" ? project.createdBy._id : project.createdBy) || "owner",
          fullName: creatorName,
          email: creatorEmail,
          role: "Lead Developer",
          isOwner: true,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorName)}&background=0D8ABC&color=fff`
        }
      ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Backdrop Clicker */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-y-auto z-10 animate-scaleIn">
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition cursor-pointer"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span>Back</span>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Team Members ({teamMembers.length})</h4>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {teamMembers.map((member, i) => {
                const name = member.fullName || member.name || creatorName;
                const avatar = member.avatar || member.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
                const role = member.role || (member.isOwner ? "Lead Developer" : "Contributor");
                const info = member.branch || member.college || member.email || "";

                return (
                  <div
                    key={member._id || i}
                    onClick={() => {
                      if (onSelectPeer) onSelectPeer(member);
                    }}
                    className="flex items-center gap-3 p-2 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xl transition cursor-pointer group"
                    title="Click to view profile"
                  >
                    <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition truncate">{name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold truncate">
                        {role} {info ? `• ${info}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition">View Profile →</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Teammates (Only visible to Project Lead) */}
          {isOwner && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-amber-500">⚡</span> Recommended Teammates ({recommendations.length})
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">Smart Skill Match</span>
              </div>

              {loadingRecs ? (
                <p className="text-xs text-slate-400 italic">Finding matching student connections...</p>
              ) : recommendations.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                  No connected peers found matching this project's skills yet. Connect with students in Find Team to get recommendations!
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {recommendations.map((rec) => {
                    const recName = rec.fullName || rec.name || "Student";
                    const recAvatar = rec.avatar || rec.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(recName)}&background=0D8ABC&color=fff`;

                    return (
                      <div
                        key={rec._id}
                        className="flex items-center justify-between p-3 bg-blue-50/30 hover:bg-blue-50/60 border border-blue-100/60 rounded-xl transition gap-3"
                      >
                        <div
                          onClick={() => {
                            if (onSelectPeer) onSelectPeer(rec);
                          }}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <img src={recAvatar} alt={recName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900 truncate">{recName}</p>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-700 shrink-0">
                                {rec.matchScore}% Match
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium truncate">
                              Matches: {(rec.matchingSkills || rec.skills || []).slice(0, 3).join(", ") || "General Skills"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectPeer) onSelectPeer(rec);
                          }}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer shrink-0 shadow-sm"
                        >
                          Invite / Profile
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
        </div>

        {/* Modal Actions */}
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

import React from "react";

export default function PeerProfileModal({ peer, onClose, onNavigateToChat }) {
  if (!peer) return null;

  const name = peer.fullName || peer.name || "Student";
  const avatar = peer.avatar || peer.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
  const branchYear = [
    peer.branch || peer.department || peer.major,
    peer.year ? `${peer.year} Year` : null
  ].filter(Boolean).join(" • ") || "Student";
  const college = peer.college || "University Student";
  const bio = peer.bio || peer.about || "No bio provided.";
  const skills = Array.isArray(peer.skills) ? peer.skills : [];
  const achievements = Array.isArray(peer.achievements) ? peer.achievements : [];
  const interests = Array.isArray(peer.interests) ? peer.interests : [];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Backdrop Clicker */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-lg w-full max-h-[85vh] shadow-2xl overflow-hidden flex flex-col z-10 animate-scaleIn">
        
        {/* Banner Header */}
        <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-600 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 pt-0 overflow-y-auto space-y-5 scrollbar-thin">
          
          {/* Avatar & Header Info */}
          <div className="flex items-end gap-4 -mt-12 mb-2">
            <img
              src={avatar}
              alt={name}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white shrink-0"
            />
            <div className="space-y-0.5 pb-1">
              <h2 className="text-lg font-extrabold text-slate-900 leading-snug">{name}</h2>
              <p className="text-xs font-bold text-blue-600">{branchYear}</p>
              <p className="text-[10px] font-semibold text-slate-400">{college}</p>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Bio</h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {bio}
            </p>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Achievements</h4>
              <ul className="space-y-1.5">
                {achievements.map((ach, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-amber-50/60 border border-amber-100 p-2 rounded-xl">
                    <span className="text-amber-500 font-bold">🏆</span>
                    <span>{ach}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Interests</h4>
              <div className="flex flex-wrap gap-1.5">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    💡 {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {(peer.github || peer.linkedin || peer.portfolio || peer.githubUrl || peer.linkedinUrl) && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Links</h4>
              <div className="flex flex-wrap gap-2">
                {(peer.github || peer.githubUrl) && (
                  <a
                    href={peer.github || peer.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    GitHub
                  </a>
                )}
                {(peer.linkedin || peer.linkedinUrl) && (
                  <a
                    href={peer.linkedin || peer.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={() => {
              onClose();
              if (onNavigateToChat) onNavigateToChat(peer);
            }}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message Student
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

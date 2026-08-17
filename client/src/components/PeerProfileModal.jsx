import React, { useState, useEffect } from "react";
import { getUserById } from "../api/authApi";

export default function PeerProfileModal({ peer, onClose, onNavigateToChat }) {
  const [fullPeerData, setFullPeerData] = useState(peer);

  useEffect(() => {
    setFullPeerData(peer);
    const peerId = peer?._id || peer?.id;
    if (peerId) {
      let isMounted = true;
      getUserById(peerId)
        .then((res) => {
          if (isMounted && res.success && res.user) {
            setFullPeerData((prev) => ({ ...prev, ...res.user }));
          }
        })
        .catch((err) => {
          console.error("Error fetching peer profile details:", err);
        });
      return () => { isMounted = false; };
    }
  }, [peer]);

  if (!peer) return null;

  const displayPeer = fullPeerData || peer;
  const name = displayPeer.fullName || displayPeer.name || "Student";
  const avatar =
    displayPeer.avatar ||
    displayPeer.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3B82F6&color=fff&bold=true`;

  const formatYear = (yr) => {
    if (!yr) return null;
    const str = String(yr).trim();
    return str.toLowerCase().includes("year") ? str : `${str} Year`;
  };

  const branchYear = [
    displayPeer.branch || displayPeer.department || displayPeer.major,
    formatYear(displayPeer.year),
  ]
    .filter(Boolean)
    .join(" • ") || "";

  const college     = displayPeer.college || "University Student";
  const bio         = displayPeer.bio || displayPeer.about || "No bio provided.";
  const skills      = Array.isArray(displayPeer.skills)       ? displayPeer.skills       : [];
  const achievements= Array.isArray(displayPeer.achievements) ? displayPeer.achievements : [];
  const interests   = Array.isArray(displayPeer.interests)    ? displayPeer.interests    : [];
  const github      = displayPeer.github    || displayPeer.githubUrl;
  const linkedin    = displayPeer.linkedin  || displayPeer.linkedinUrl;
  const portfolio   = displayPeer.portfolio || displayPeer.portfolioUrl;

  return (
    <div
      style={{ animation: "ppmFadeIn 0.2s ease-out forwards" }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden"
    >
      <style>{`
        @keyframes ppmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ppmSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .ppm-card {
          animation: ppmSlideUp 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .ppm-scroll::-webkit-scrollbar { width: 4px; }
        .ppm-scroll::-webkit-scrollbar-track { background: transparent; }
        .ppm-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
      `}</style>

      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal card */}
      <div className="ppm-card relative bg-white rounded-2xl w-full max-w-[520px] max-h-[88vh] shadow-2xl flex flex-col z-10 overflow-hidden">

        {/* ── Banner (Cover image or professional backdrop, holds close button) ── */}
        <div className="relative shrink-0 h-24 w-full bg-slate-900 overflow-hidden flex items-start justify-end p-3">
          {displayPeer.coverImage ? (
            <img
              src={displayPeer.coverImage}
              alt={`${name}'s Cover`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-slate-900">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px), radial-gradient(#94a3b8 1px, #0f172a 1px)`,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 10px 10px'
                }}
              />
            </div>
          )}
          <button
            onClick={onClose}
            title="Close"
            className="relative z-10 text-white/90 hover:text-white bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-full border border-white/10 transition-colors cursor-pointer shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Identity panel (avatar left, info right) — NO overlap ── */}
        <div className="shrink-0 px-5 pt-4 pb-4 border-b border-slate-100 flex items-center gap-4 bg-white">
          <img
            src={avatar}
            alt={name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-100 shadow-md bg-white shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900 leading-tight truncate">{name}</h2>
            {branchYear && (
              <p className="text-[13px] font-semibold text-blue-600 mt-0.5 truncate">{branchYear}</p>
            )}
            <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">{college}</p>
          </div>
        </div>

        {/* ── Scrollable profile body ── */}
        <div className="ppm-scroll flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">

          {/* Bio */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Bio</h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 whitespace-pre-line break-words">
              {bio}
            </p>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Achievements</h4>
              <ul className="space-y-1.5">
                {achievements.map((ach, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs font-medium text-slate-700 bg-amber-50/70 border border-amber-100 px-3 py-2 rounded-xl break-words"
                  >
                    <span className="shrink-0 text-amber-500">🏆</span>
                    <span className="leading-relaxed">{ach}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Interests</h4>
              <div className="flex flex-wrap gap-1.5">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    💡 {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {(github || linkedin || portfolio) && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Links</h4>
              <div className="flex flex-wrap gap-2">
                {github && (
                  <a
                    href={github.startsWith("http") ? github : `https://${github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    GitHub
                  </a>
                )}
                {linkedin && (
                  <a
                    href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    LinkedIn
                  </a>
                )}
                {portfolio && (
                  <a
                    href={portfolio.startsWith("http") ? portfolio : `https://${portfolio}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── Footer actions ── */}
        <div className="shrink-0 px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={() => {
              onClose();
              if (onNavigateToChat) onNavigateToChat(displayPeer);
            }}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow shadow-blue-500/20 transition cursor-pointer flex items-center justify-center gap-2"
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

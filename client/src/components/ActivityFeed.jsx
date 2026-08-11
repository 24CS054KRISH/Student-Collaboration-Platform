import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:5000";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default function ActivityFeed({ onSelectPeer }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial fetch of recent activity log
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/activity/recent")
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.activities)) {
          setActivities(res.data.activities);
        }
      })
      .catch((err) => console.error("Error fetching activity feed:", err))
      .finally(() => setLoading(false));
  }, []);

  // Listen for real-time activity socket broadcasts
  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);

    socket.on("new_activity_event", (newAct) => {
      if (newAct && newAct._id) {
        setActivities((prev) => [newAct, ...prev.filter((a) => a._id !== newAct._id)].slice(0, 15));
      }
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            Live Platform Activity Stream
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          Real-time
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400 font-medium animate-pulse">
          Loading platform activity feed...
        </div>
      ) : activities.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 font-medium italic bg-slate-50 rounded-xl border border-slate-100">
          No platform activities logged yet. Launch a project or connect with peers to get started!
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
          {activities.map((act) => {
            const user = act.user || {};
            const name = user.fullName || "Student";
            const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;

            let icon = "🚀";
            let badgeBg = "bg-blue-50 text-blue-600 border-blue-100";

            if (act.type === "team_joined") {
              icon = "👥";
              badgeBg = "bg-green-50 text-green-600 border-green-100";
            } else if (act.type === "connection_made") {
              icon = "🤝";
              badgeBg = "bg-purple-50 text-purple-600 border-purple-100";
            }

            return (
              <div
                key={act._id}
                className="flex items-start gap-3 p-3 hover:bg-slate-50/80 border border-slate-100 rounded-xl transition duration-200 group"
              >
                {/* Event Icon Badge */}
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border shrink-0 ${badgeBg}`}>
                  {icon}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectPeer) onSelectPeer(user);
                      }}
                      className="text-xs font-extrabold text-slate-900 hover:text-blue-600 transition truncate text-left cursor-pointer flex items-center gap-1.5"
                    >
                      <img src={avatar} alt={name} className="w-4 h-4 rounded-full object-cover shrink-0 inline" />
                      <span>{name}</span>
                    </button>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-snug">
                    {act.title}
                  </p>

                  {act.description && (
                    <p className="text-[11px] text-slate-400 font-normal line-clamp-1">
                      {act.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

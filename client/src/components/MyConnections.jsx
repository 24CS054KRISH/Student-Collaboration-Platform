import { useState, useEffect } from "react";
import { getAcceptedConnections, removeConnection } from "../api/connectionApi";
import { useToast } from "./Toast";

export default function MyConnections({ onNavigateToChat }) {
  const [connections, setConnections] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const showToast = useToast();

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setLoading(true);
        const data = await getAcceptedConnections();
        if (data && data.success && Array.isArray(data.connections)) {
          setConnections(data.connections);
        }
      } catch (err) {
        console.error("Failed to load accepted connections:", err);
        setError("Failed to load your connections");
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, []);

  const handleRemove = async (peerId) => {
    try {
      await removeConnection(peerId);
      // Immediately remove connection from state without requiring a page refresh
      setConnections((prev) => prev.filter((c) => (c._id || c.id) !== peerId));
      showToast("Connection removed", "success");
    } catch (err) {
      console.error("Failed to remove connection:", err);
      const msg = err.response?.data?.message || "Failed to remove connection";
      showToast(msg, "error");
    }
  };

  // Filter connections by name search query
  const filteredConnections = connections.filter((conn) => {
    const name = conn.fullName || conn.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Section */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Connections
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          View and interact with university peers who have accepted your connection requests.
        </p>
      </div>

      {/* 2. Search Section */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search connections by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 text-sm text-slate-900 border border-slate-200 rounded-xl bg-slate-50 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* 3. Connections Grid */}
      {loading ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-semibold text-slate-500">Loading your connections...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm font-medium">
          {error}
        </div>
      ) : filteredConnections.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            {searchQuery ? "No matching connections found" : "No connections yet"}
          </h3>
          <p className="text-xs font-medium text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? "Try typing a different name in the search bar above."
              : "When you send connection requests and peers accept them, they will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConnections.map((conn) => {
            const peerId = conn._id || conn.id;
            const name = conn.fullName || conn.name || "Anonymous Student";
            const avatar = conn.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
            const college = conn.college || "University Student";
            const branchYear = [
              conn.branch || conn.department,
              conn.year ? `${conn.year} Year` : null
            ].filter(Boolean).join(" • ") || "Student";
            const bio = conn.bio || "No bio provided.";
            const skills = Array.isArray(conn.skills) ? conn.skills : [];

            return (
              <div
                key={peerId}
                className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Header: Photo, Name, Branch/Year */}
                  <div className="flex items-start gap-4">
                    <img
                      src={avatar}
                      alt={name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-100 shadow-sm"
                    />
                    <div className="space-y-0.5">
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">{name}</h3>
                      <p className="text-xs font-bold text-blue-600">{branchYear}</p>
                    </div>
                  </div>

                  {/* College Info */}
                  <div className="flex items-center gap-1 mt-4 text-[10px] font-semibold text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{college}</span>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-500 leading-relaxed font-normal mt-3 line-clamp-3">
                    {bio}
                  </p>

                  {/* Skills tags */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {skills.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons: Message & Remove Connection */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToChat) {
                        onNavigateToChat(conn);
                      } else {
                        showToast(`Messaging ${name}`, "info");
                      }
                    }}
                    className="flex-1 py-2.5 px-3 text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-1.012-.89 6.22 6.22 0 00.916-2.56 8.784 8.784 0 01-2.314-5.52C3 7.444 7.03 3.75 12 3.75s9 3.694 9 8.25z" />
                    </svg>
                    Message
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(peerId, name)}
                    className="py-2.5 px-3 text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    title="Remove Connection"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.765Z" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


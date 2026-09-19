import { useState, useEffect, useRef } from "react";
import { getGlobalSearch } from "../api/searchApi";

export default function GlobalSearch({
  onSelectProject,
  onSelectStudent,
  onSelectConnection,
  onSelectChat,
  className = ""
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({
    projects: [],
    students: [],
    connections: [],
    chats: []
  });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Debounced search trigger (300ms)
  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults({ projects: [], students: [], connections: [], chats: [] });
      setLoading(false);
      return;
    }

    setLoading(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const data = await getGlobalSearch(trimmed);
        if (data && data.success) {
          setResults({
            projects: data.projects || [],
            students: data.students || [],
            connections: data.connections || [],
            chats: data.chats || []
          });
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Keyboard shortcut (Ctrl+K or Cmd+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        if (query.trim()) {
          setIsOpen(true);
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [query]);

  // Click outside listener to dismiss popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalResults =
    results.projects.length +
    results.students.length +
    results.connections.length +
    results.chats.length;

  const handleClear = () => {
    setQuery("");
    setResults({ projects: [], students: [], connections: [], chats: [] });
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = (callback, item) => {
    setIsOpen(false);
    if (callback) {
      callback(item);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-md ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
          {loading ? (
            <svg
              className="animate-spin h-4 w-4 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim()) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (query.trim() && (totalResults > 0 || loading)) {
              setIsOpen(true);
            }
          }}
          placeholder="Search projects, students, chats..."
          className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-800 text-xs md:text-sm pl-10 pr-16 py-2 rounded-xl border border-slate-200/90 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-xs">
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {/* Results Popover Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 max-h-[75vh] flex flex-col animate-fadeIn">
          {/* Header Summary */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              {loading ? (
                "Searching..."
              ) : (
                <>
                  Found <strong className="text-slate-800 font-bold">{totalResults}</strong> results for &ldquo;{query}&rdquo;
                </>
              )}
            </span>
            <span className="text-[10px] text-slate-400">Esc to close</span>
          </div>

          {/* Scrollable Results Area */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 p-2 space-y-3">
            {/* Loading Indicator */}
            {loading && totalResults === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                <svg
                  className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Searching across projects, students, and channels...</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && totalResults === 0 && (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-700">No results found for &ldquo;{query}&rdquo;</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Try searching with different keywords, project titles, tech stack, or student names.
                </p>
              </div>
            )}

            {/* 1. PROJECTS SECTION */}
            {results.projects.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>Projects</span>
                  </div>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {results.projects.length}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  {results.projects.map((proj) => (
                    <button
                      key={proj._id}
                      onClick={() => handleSelect(onSelectProject, proj)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50/60 transition-colors flex items-start justify-between gap-3 group cursor-pointer"
                    >
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                            {proj.title}
                          </p>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                            {proj.category || "Project"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {proj.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                          {proj.createdBy && (
                            <span>By {proj.createdBy.fullName || "Student"}</span>
                          )}
                          {(proj.requiredSkills || []).slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-blue-600 bg-blue-50 group-hover:bg-blue-100 shrink-0">
                        View
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. STUDENTS / USERS SECTION */}
            {results.students.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    <span>Students</span>
                  </div>
                  <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {results.students.length}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  {results.students.map((student) => (
                    <button
                      key={student._id}
                      onClick={() => handleSelect(onSelectStudent, student)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/60 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <img
                          src={
                            student.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName || "Student")}&background=0D8ABC&color=fff`
                          }
                          alt={student.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div className="overflow-hidden flex-1">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                            {student.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {[student.branch, student.college].filter(Boolean).join(" • ") || "Academic Peer"}
                          </p>
                          {student.skills && student.skills.length > 0 && (
                            <div className="flex gap-1 mt-1 overflow-hidden">
                              {student.skills.slice(0, 3).map((sk, idx) => (
                                <span key={idx} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100 shrink-0">
                        Profile
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. CONNECTIONS SECTION */}
            {results.connections.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>My Connections</span>
                  </div>
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {results.connections.length}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  {results.connections.map((conn) => (
                    <button
                      key={conn._id}
                      onClick={() => handleSelect(onSelectConnection, conn)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50/60 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <img
                          src={
                            conn.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(conn.fullName || "Student")}&background=0D8ABC&color=fff`
                          }
                          alt={conn.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div className="overflow-hidden flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                              {conn.fullName}
                            </p>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                              Connected
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {[conn.branch, conn.college].filter(Boolean).join(" • ") || "Connected Peer"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100 shrink-0">
                        View
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. CHATS / CONVERSATIONS SECTION */}
            {results.chats.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Chats & Channels</span>
                  </div>
                  <span className="bg-violet-50 text-violet-600 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {results.chats.length}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  {results.chats.map((chat) => (
                    <button
                      key={`${chat.type}-${chat.id}`}
                      onClick={() => handleSelect(onSelectChat, chat)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-violet-50/60 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {chat.type === "direct" ? (
                          <img
                            src={chat.avatar}
                            alt={chat.title}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-xs shrink-0">
                            #
                          </div>
                        )}
                        <div className="overflow-hidden flex-1">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-violet-600 transition-colors truncate">
                            {chat.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {chat.subtitle}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-violet-600 bg-violet-50 group-hover:bg-violet-100 shrink-0">
                        Chat
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

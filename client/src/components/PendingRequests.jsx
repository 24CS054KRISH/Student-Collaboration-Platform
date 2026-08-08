import { useState, useEffect } from "react";
import { getPendingRequests, respondConnectionRequest } from "../api/connectionApi";

export default function PendingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPending = async () => {
      try {
        setLoading(true);
        const data = await getPendingRequests();
        if (data && data.success && Array.isArray(data.requests)) {
          setRequests(data.requests);
        }
      } catch (err) {
        console.error("Failed to load pending connection requests:", err);
        setError("Failed to load pending connection requests");
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
  }, []);

  const handleRespond = async (requestId, action) => {
    try {
      setProcessingId(requestId);
      await respondConnectionRequest(requestId, action);
      // Immediately remove the request from the list without requiring a page refresh
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (err) {
      console.error(`Failed to ${action} connection request:`, err);
      const msg = err.response?.data?.message || `Failed to ${action} request`;
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Section */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Pending Requests
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Review and manage incoming connection requests from university peers interested in collaborating.
        </p>
      </div>

      {/* 2. Content / Grid */}
      {loading ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-semibold text-slate-500">Loading pending requests...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm font-medium">
          {error}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No pending requests</h3>
          <p className="text-xs font-medium text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            You currently have no incoming connection requests. Explore the Find Team section to connect with university peers!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((reqItem) => {
            const sender = reqItem.sender || {};
            const name = sender.fullName || sender.name || "Anonymous Student";
            const avatar = sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
            const college = sender.college || "University Student";
            const branchYear = [
              sender.branch || sender.department,
              sender.year ? `${sender.year} Year` : null
            ].filter(Boolean).join(" • ") || "Student";
            const bio = sender.bio || "No bio provided.";
            const skills = Array.isArray(sender.skills) ? sender.skills : [];
            const isProcessing = processingId === reqItem._id;

            return (
              <div
                key={reqItem._id}
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

                {/* Action Buttons: Accept & Reject */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2.5">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleRespond(reqItem._id, "accept")}
                    className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Accepting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Accept
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleRespond(reqItem._id, "reject")}
                    className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
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

